use std::sync::Mutex;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::time::{Duration, SystemTime};

use nsh_base::input;
use nsh_core::prelude::*;
use nsh_engine::{Clock, EngineConfig, Root};
use nsh_form::{
    BindField, FieldListeners, FieldValidators, FormListeners, FormOptions, FormValidationResult,
    FormValidators, ValidationCause, ValidationLogic, field, rules, use_form, use_form_with,
};
use nsh_testing::Headless;

fn start(root: Root) -> Headless {
    let mut config = EngineConfig::new(root);
    config.clock = Clock::manual(SystemTime::UNIX_EPOCH + Duration::from_secs(1_767_258_000));
    let mut app = Headless::start(config).unwrap();
    app.wait_for("text:ready").unwrap();
    app
}

#[derive(Clone, Debug, Default, PartialEq)]
struct Nick {
    nick: String,
}

static CHANGE_RUNS: AtomicUsize = AtomicUsize::new(0);

#[component]
pub fn ChangeCountApp() -> impl IntoElement {
    let form = use_form(Nick::default());
    let nick = field!(form, nick).on_change(|_: &String, _: &Nick| {
        CHANGE_RUNS.fetch_add(1, Ordering::SeqCst);
        None
    });
    view()
        .child(nick.bind(input().test_id("nick")))
        .child(text("blur").on_press(move || nick.handle_blur()))
        .child(text("ready"))
}

#[test]
fn on_change_runs_on_edit_only() {
    let mut app = start(Root::of::<ChangeCountApp>());
    assert_eq!(CHANGE_RUNS.load(Ordering::SeqCst), 0);
    app.type_text("id:nick", "ab").unwrap();
    let edits = CHANGE_RUNS.load(Ordering::SeqCst);
    assert!(edits > 0);
    app.press("text:blur").unwrap();
    assert_eq!(CHANGE_RUNS.load(Ordering::SeqCst), edits);
}

static BLUR_RUNS: AtomicUsize = AtomicUsize::new(0);

#[component]
pub fn BlurCountApp() -> impl IntoElement {
    let form = use_form(Nick::default());
    let nick = field!(form, nick).on_blur(|_: &String, _: &Nick| {
        BLUR_RUNS.fetch_add(1, Ordering::SeqCst);
        None
    });
    view()
        .child(nick.bind(input().test_id("nick")))
        .child(text("blur").on_press(move || nick.handle_blur()))
        .child(text("ready"))
}

#[test]
fn on_blur_runs_on_blur_only() {
    let mut app = start(Root::of::<BlurCountApp>());
    app.type_text("id:nick", "ab").unwrap();
    assert_eq!(BLUR_RUNS.load(Ordering::SeqCst), 0);
    app.press("text:blur").unwrap();
    assert_eq!(BLUR_RUNS.load(Ordering::SeqCst), 1);
}

static SUBMIT_RUNS: AtomicUsize = AtomicUsize::new(0);

#[component]
pub fn SubmitCountApp() -> impl IntoElement {
    let form = use_form(Nick::default());
    let nick = field!(form, nick).on_submit(|_: &String, _: &Nick| {
        SUBMIT_RUNS.fetch_add(1, Ordering::SeqCst);
        None
    });
    view()
        .child(nick.bind(input().test_id("nick")))
        .child(text("blur").on_press(move || nick.handle_blur()))
        .child(text("submit").on_press(move || form.submit(|_: Nick| async { Ok(()) })))
        .child(text("ready"))
}

#[test]
fn on_submit_runs_on_submit_only() {
    let mut app = start(Root::of::<SubmitCountApp>());
    app.type_text("id:nick", "ab").unwrap();
    app.press("text:blur").unwrap();
    assert_eq!(SUBMIT_RUNS.load(Ordering::SeqCst), 0);
    app.press("text:submit").unwrap();
    assert_eq!(SUBMIT_RUNS.load(Ordering::SeqCst), 1);
}

static MOUNT_RUNS: AtomicUsize = AtomicUsize::new(0);

#[component]
pub fn MountCountApp() -> impl IntoElement {
    let form = use_form(Nick::default());
    let nick = field!(form, nick).on_mount(|_: &String, _: &Nick| {
        MOUNT_RUNS.fetch_add(1, Ordering::SeqCst);
        None
    });
    view()
        .child(nick.bind(input().test_id("nick")))
        .child(text("ready"))
}

#[test]
fn on_mount_runs_when_the_field_mounts() {
    let _app = start(Root::of::<MountCountApp>());
    assert_eq!(MOUNT_RUNS.load(Ordering::SeqCst), 1);
}

static FORM_MOUNT_RUNS: AtomicUsize = AtomicUsize::new(0);

#[component]
pub fn FormMountApp() -> impl IntoElement {
    let validators = FormValidators::new().on_mount(|_: &Nick| {
        FORM_MOUNT_RUNS.fetch_add(1, Ordering::SeqCst);
        FormValidationResult::ok()
    });
    let _form = use_form_with(FormOptions::new(Nick::default()).validators(validators));
    view().child(text("ready"))
}

#[test]
fn form_on_mount_runs_when_the_form_is_made() {
    let _app = start(Root::of::<FormMountApp>());
    assert_eq!(FORM_MOUNT_RUNS.load(Ordering::SeqCst), 1);
}

#[component]
pub fn CauseMapApp() -> impl IntoElement {
    let form = use_form(Nick::default());
    let nick = field!(form, nick)
        .on_change(|value: &String, _: &Nick| (value.len() < 3).then(|| "short".to_owned()))
        .on_blur(|value: &String, _: &Nick| value.is_empty().then(|| "empty".to_owned()));
    let show = move || {
        let map = nick.error_map();
        format!(
            "change {} blur {}",
            map.get(ValidationCause::Change).unwrap_or("-"),
            map.get(ValidationCause::Blur).unwrap_or("-")
        )
    };
    view()
        .child(nick.bind(input().test_id("nick")))
        .child(text(show))
        .child(text("blur").on_press(move || nick.handle_blur()))
        .child(text("ready"))
}

#[test]
fn error_map_is_keyed_by_cause_and_clears_on_pass() {
    let mut app = start(Root::of::<CauseMapApp>());
    app.type_text("id:nick", "ab").unwrap();
    app.wait_for("text:change short blur -").unwrap();
    app.press("text:blur").unwrap();
    app.wait_for("text:change short blur -").unwrap();
    app.clear("id:nick").unwrap();
    app.wait_for("text:change short blur -").unwrap();
    app.press("text:blur").unwrap();
    app.wait_for("text:change short blur empty").unwrap();
    app.type_text("id:nick", "abc").unwrap();
    app.wait_for("text:change - blur empty").unwrap();
    app.press("text:blur").unwrap();
    app.wait_for("text:change - blur -").unwrap();
}

static ASYNC_RUNS: AtomicUsize = AtomicUsize::new(0);

#[component]
pub fn AsyncNickApp() -> impl IntoElement {
    let form = use_form(Nick::default());
    let nick =
        field!(form, nick).async_rule(Duration::from_millis(300), |value: String| async move {
            ASYNC_RUNS.fetch_add(1, Ordering::SeqCst);
            if value == "slow" {
                timer(Duration::from_millis(200)).await;
                return Some("too slow".to_owned());
            }
            None
        });
    view()
        .child(nick.bind(input().test_id("nick")))
        .child(text(move || format!("errors {}", nick.errors().join("|"))))
        .child(text(move || format!("checking {}", nick.is_validating())))
        .child(text("ready"))
}

#[test]
fn async_validator_debounces_once_and_drops_old_answers() {
    let mut app = start(Root::of::<AsyncNickApp>());
    app.type_text("id:nick", "abc").unwrap();
    assert_eq!(ASYNC_RUNS.load(Ordering::SeqCst), 0);
    app.run_for(Duration::from_millis(300)).unwrap();
    assert_eq!(ASYNC_RUNS.load(Ordering::SeqCst), 1);

    app.clear("id:nick").unwrap();
    app.type_text("id:nick", "slow").unwrap();
    app.run_for(Duration::from_millis(300)).unwrap();
    assert_eq!(ASYNC_RUNS.load(Ordering::SeqCst), 2);
    app.wait_for("text:checking true").unwrap();

    app.type_text("id:nick", "fine").unwrap();
    app.run_for(Duration::from_millis(200)).unwrap();
    assert!(!app.shows("errors too slow"));
    app.run_for(Duration::from_millis(300)).unwrap();
    app.wait_for("text:checking false").unwrap();
    assert!(!app.shows("errors too slow"));
    assert_eq!(ASYNC_RUNS.load(Ordering::SeqCst), 3);
}

#[derive(Clone, Debug, Default, PartialEq)]
struct Passwords {
    password: String,
    confirm: String,
}

#[component]
pub fn LinkedApp() -> impl IntoElement {
    let form = use_form(Passwords::default());
    let password = field!(form, password);
    let confirm = field!(form, confirm).validators(
        FieldValidators::new()
            .on_change(|value: &String, values: &Passwords| {
                (value != &values.password).then(|| "mismatch".to_owned())
            })
            .on_change_listen_to(&["password"]),
    );
    view()
        .child(password.bind(input().test_id("password")))
        .child(confirm.bind(input().test_id("confirm")))
        .child(text(move || {
            format!("confirm errors {}", confirm.errors().join("|"))
        }))
        .child(text(move || format!("pw {}", password.value())))
        .child(text("ready"))
}

#[test]
fn linked_field_revalidates_when_its_source_changes() {
    let mut app = start(Root::of::<LinkedApp>());
    app.type_text("id:confirm", "abc").unwrap();
    app.wait_for("text:confirm errors mismatch").unwrap();
    app.type_text("id:password", "abc").unwrap();
    app.wait_for("text:pw abc").unwrap();
    assert!(!app.shows("confirm errors mismatch"));
}

#[derive(Clone, Debug, Default, PartialEq)]
struct Signup {
    name: String,
    email: String,
}

#[component]
pub fn FormFieldErrorsApp() -> impl IntoElement {
    let validators = FormValidators::new().on_submit(|values: &Signup| {
        if values.name.is_empty() {
            FormValidationResult::field("name", "Name is required")
        } else {
            FormValidationResult::ok()
        }
    });
    let form = use_form_with(FormOptions::new(Signup::default()).validators(validators));
    let name = field!(form, name);
    view()
        .child(name.bind(input().test_id("name")))
        .child(text(move || {
            format!("name errors {}", name.errors().join("|"))
        }))
        .child(text("submit").on_press(move || form.submit(|_: Signup| async { Ok(()) })))
        .child(text("ready"))
}

#[test]
fn form_validator_puts_errors_on_fields() {
    let mut app = start(Root::of::<FormFieldErrorsApp>());
    app.press("text:submit").unwrap();
    app.wait_for("text:name errors Name is required").unwrap();
}

static SERVER_SAVES: AtomicUsize = AtomicUsize::new(0);

#[component]
pub fn FormServerApp() -> impl IntoElement {
    let validators = FormValidators::new().on_submit_async(|values: Signup| async move {
        if values.email == "taken@example.com" {
            FormValidationResult::field("email", "Already registered")
        } else {
            FormValidationResult::ok()
        }
    });
    let form = use_form_with(FormOptions::new(Signup::default()).validators(validators));
    let email = field!(form, email);
    view()
        .child(email.bind(input().test_id("email")))
        .child(text(move || {
            format!("email errors {}", email.errors().join("|"))
        }))
        .child(text(move || format!("saved {}", form.is_submitted())))
        .child(text("submit").on_press(move || {
            form.submit(|_: Signup| async {
                SERVER_SAVES.fetch_add(1, Ordering::SeqCst);
                Ok(())
            })
        }))
        .child(text("ready"))
}

#[test]
fn form_on_submit_async_gives_server_errors() {
    let mut app = start(Root::of::<FormServerApp>());
    app.type_text("id:email", "taken@example.com").unwrap();
    app.press("text:submit").unwrap();
    app.wait_for("text:email errors Already registered")
        .unwrap();
    assert_eq!(SERVER_SAVES.load(Ordering::SeqCst), 0);
    app.type_text("id:email", "ada@example.com").unwrap();
    app.press("text:submit").unwrap();
    app.wait_for("text:saved true").unwrap();
    assert_eq!(SERVER_SAVES.load(Ordering::SeqCst), 1);
}

#[derive(Clone, Debug, Default, PartialEq)]
struct Draft {
    title: String,
}

#[component]
pub fn CanSubmitApp() -> impl IntoElement {
    let form = use_form(Draft::default());
    let title = field!(form, title)
        .rule(rules::required("Title needed"))
        .async_rule(Duration::from_millis(300), |value: String| async move {
            (value == "taken").then(|| "Already used".to_owned())
        });
    view()
        .child(title.bind(input().test_id("title")))
        .child(text(move || format!("can {}", form.can_submit())))
        .child(text(move || {
            format!(
                "form valid {} fields valid {}",
                form.is_valid(),
                form.is_fields_valid()
            )
        }))
        .child(text(move || {
            format!("fields validating {}", form.is_fields_validating())
        }))
        .child(text("ready"))
}

#[test]
fn can_submit_matches_tanstack_rules() {
    let mut app = start(Root::of::<CanSubmitApp>());
    assert!(app.shows("can true"));
    app.type_text("id:title", "a").unwrap();
    app.wait_for("text:can false").unwrap();
    app.wait_for("text:fields validating true").unwrap();
    app.run_for(Duration::from_millis(300)).unwrap();
    app.wait_for("text:can true").unwrap();
    app.wait_for("text:fields validating false").unwrap();
    app.wait_for("text:form valid true fields valid true")
        .unwrap();
    app.clear("id:title").unwrap();
    app.wait_for("text:can false").unwrap();
    app.wait_for("text:form valid false fields valid false")
        .unwrap();
    app.type_text("id:title", "ok").unwrap();
    app.wait_for("text:can false").unwrap();
    app.run_for(Duration::from_millis(300)).unwrap();
    app.wait_for("text:can true").unwrap();
}

#[component]
pub fn MountBlockedApp() -> impl IntoElement {
    let form = use_form(Draft {
        title: "boot".to_owned(),
    });
    let title = field!(form, title).on_mount(|value: &String, _: &Draft| {
        (value == "boot").then(|| "Unsaved draft".to_owned())
    });
    view()
        .child(title.bind(input().test_id("title")))
        .child(text(move || format!("can {}", form.can_submit())))
        .child(text("ready"))
}

#[test]
fn can_submit_is_false_while_a_mount_error_stands() {
    let mut app = start(Root::of::<MountBlockedApp>());
    assert!(app.shows("can false"));
    app.type_text("id:title", "boot2").unwrap();
    app.wait_for("text:can true").unwrap();
}

static WHEN_INVALID_HOOKS: AtomicUsize = AtomicUsize::new(0);

#[component]
pub fn WhenInvalidApp() -> impl IntoElement {
    let options = FormOptions::new(Draft::default())
        .can_submit_when_invalid(true)
        .on_submit_invalid(|_: &Draft| {
            WHEN_INVALID_HOOKS.fetch_add(1, Ordering::SeqCst);
        });
    let form = use_form_with(options);
    let title = field!(form, title).rule(rules::required("Title needed"));
    view()
        .child(title.bind(input().test_id("title")))
        .child(text(move || format!("can {}", form.can_submit())))
        .child(text(move || {
            format!("attempts {}", form.submission_attempts())
        }))
        .child(text("submit").on_press(move || form.submit(|_: Draft| async { Ok(()) })))
        .child(text("ready"))
}

#[test]
fn can_submit_when_invalid_allows_a_submit() {
    let mut app = start(Root::of::<WhenInvalidApp>());
    app.type_text("id:title", "a").unwrap();
    app.clear("id:title").unwrap();
    app.wait_for("text:can true").unwrap();
    app.press("text:submit").unwrap();
    app.wait_for("text:attempts 1").unwrap();
    assert_eq!(WHEN_INVALID_HOOKS.load(Ordering::SeqCst), 1);
}

static SEEN_INVALID: Mutex<Vec<String>> = Mutex::new(Vec::new());

#[component]
pub fn InvalidHookApp() -> impl IntoElement {
    let options = FormOptions::new(Draft::default()).on_submit_invalid(|values: &Draft| {
        SEEN_INVALID.lock().unwrap().push(values.title.clone());
    });
    let form = use_form_with(options);
    let title = field!(form, title)
        .rule(|value: &String, _: &Draft| (value.len() < 5).then(|| "too short".to_owned()));
    view()
        .child(title.bind(input().test_id("title")))
        .child(text("submit").on_press(move || form.submit(|_: Draft| async { Ok(()) })))
        .child(text("ready"))
}

#[test]
fn on_submit_invalid_runs_with_the_values() {
    let mut app = start(Root::of::<InvalidHookApp>());
    app.type_text("id:title", "abc").unwrap();
    app.press("text:submit").unwrap();
    assert_eq!(*SEEN_INVALID.lock().unwrap(), vec!["abc".to_owned()]);
}

static SEEN_META: Mutex<Vec<String>> = Mutex::new(Vec::new());

#[component]
pub fn MetaSubmitApp() -> impl IntoElement {
    let form = use_form(Draft::default());
    view()
        .child(text("submit").on_press(move || {
            form.handle_submit_with_meta(
                "from-button".to_owned(),
                |_: Draft, meta: String| async move {
                    SEEN_META.lock().unwrap().push(meta);
                    Ok(())
                },
            )
        }))
        .child(text(move || format!("saved {}", form.is_submitted())))
        .child(text("ready"))
}

#[test]
fn handle_submit_with_meta_passes_meta() {
    let mut app = start(Root::of::<MetaSubmitApp>());
    app.press("text:submit").unwrap();
    app.wait_for("text:saved true").unwrap();
    assert_eq!(*SEEN_META.lock().unwrap(), vec!["from-button".to_owned()]);
}

#[component]
pub fn SubmissionStateApp() -> impl IntoElement {
    let form = use_form(Draft::default());
    let title = field!(form, title).rule(rules::required("Title needed"));
    view()
        .child(title.bind(input().test_id("title")))
        .child(text(move || format!("busy {}", form.is_submitting())))
        .child(text(move || {
            format!(
                "state sub {} ok {} n {}",
                form.is_submitted(),
                form.is_submit_successful(),
                form.submission_attempts()
            )
        }))
        .child(text("submit").on_press(move || {
            form.submit(|_: Draft| async {
                timer(Duration::from_millis(100)).await;
                Ok(())
            })
        }))
        .child(text("ready"))
}

#[test]
fn submission_state_flags_follow_a_submit() {
    let mut app = start(Root::of::<SubmissionStateApp>());
    app.press("text:submit").unwrap();
    app.wait_for("text:state sub false ok false n 1").unwrap();
    app.type_text("id:title", "a").unwrap();
    app.press("text:submit").unwrap();
    app.wait_for("text:busy true").unwrap();
    app.run_for(Duration::from_millis(100)).unwrap();
    app.wait_for("text:state sub true ok true n 2").unwrap();
    app.wait_for("text:busy false").unwrap();
}

#[component]
pub fn ResetWithApp() -> impl IntoElement {
    let form = use_form(Draft::default());
    let title = field!(form, title);
    view()
        .child(title.bind(input().test_id("title")))
        .child(text(move || format!("title {}", title.value())))
        .child(text(move || format!("default {}", form.is_default_value())))
        .child(text("rebase").on_press(move || {
            form.reset_with(Draft {
                title: "loaded".to_owned(),
            })
        }))
        .child(text("reset").on_press(move || form.reset()))
        .child(text("ready"))
}

#[test]
fn reset_with_values_sets_a_new_baseline() {
    let mut app = start(Root::of::<ResetWithApp>());
    app.press("text:rebase").unwrap();
    app.wait_for("text:title loaded").unwrap();
    app.wait_for("text:default true").unwrap();
    app.type_text("id:title", "edited").unwrap();
    app.wait_for("text:default false").unwrap();
    app.press("text:reset").unwrap();
    app.wait_for("text:title loaded").unwrap();
    app.wait_for("text:default true").unwrap();
}

#[derive(Clone, Debug, Default, PartialEq)]
struct Pair {
    email: String,
    password: String,
}

#[component]
pub fn ResetFieldApp() -> impl IntoElement {
    let form = use_form(Pair::default());
    let email = field!(form, email);
    let password = field!(form, password);
    view()
        .child(email.bind(input().test_id("email")))
        .child(password.bind(input().test_id("password")))
        .child(text(move || {
            format!("pair {}|{}", email.value(), password.value())
        }))
        .child(text("reset email").on_press(move || form.reset_field(&email.path())))
        .child(text("ready"))
}

#[test]
fn reset_field_restores_one_field() {
    let mut app = start(Root::of::<ResetFieldApp>());
    app.type_text("id:email", "a").unwrap();
    app.type_text("id:password", "b").unwrap();
    app.wait_for("text:pair a|b").unwrap();
    app.press("text:reset email").unwrap();
    app.wait_for("text:pair |b").unwrap();
}

#[component]
pub fn DeleteFieldApp() -> impl IntoElement {
    let form = use_form(Draft::default());
    let title = field!(form, title);
    view()
        .child(title.bind(input().test_id("title")))
        .child(text(move || {
            format!("registered {}", form.field_meta(&title.path()).is_some())
        }))
        .child(text(move || format!("changed {}", title.was_changed())))
        .child(text("drop field").on_press(move || form.delete_field(&title.path())))
        .child(text("drop value").on_press(move || title.delete_value()))
        .child(text("ready"))
}

#[test]
fn delete_field_removes_value_and_meta() {
    let mut app = start(Root::of::<DeleteFieldApp>());
    app.type_text("id:title", "abc").unwrap();
    app.wait_for("text:changed true").unwrap();
    app.press("text:drop field").unwrap();
    app.wait_for("text:registered false").unwrap();
    assert_eq!(app.screen().input_text("id:title").unwrap(), Some("abc"));
    app.press("text:drop value").unwrap();
    app.wait_for("text:changed false").unwrap();
    assert_eq!(app.screen().input_text("id:title").unwrap(), Some(""));
}

#[component]
pub fn ValidateAllApp() -> impl IntoElement {
    let form = use_form(Pair::default());
    let one = signal(0usize);
    let form_one = signal(0usize);
    let email = field!(form, email).rule(rules::required("Enter email"));
    let password = field!(form, password).rule(rules::required("Enter password"));
    view()
        .child(email.bind(input().test_id("email")))
        .child(text(move || email.error().unwrap_or_default()))
        .child(password.bind(input().test_id("password")))
        .child(text(move || password.error().unwrap_or_default()))
        .child(text(move || format!("one {}", one.get())))
        .child(text(move || format!("form one {}", form_one.get())))
        .child(text("form one").on_press(move || {
            form_one.set(
                form.validate_field(&password.path(), ValidationCause::Submit)
                    .len(),
            );
        }))
        .child(text("validate").on_press(move || form.validate_all_fields(ValidationCause::Submit)))
        .child(text("one").on_press(move || {
            password.handle_blur();
            one.set(password.validate(ValidationCause::Submit).len());
        }))
        .child(text("ready"))
}

#[test]
fn validate_all_fields_shows_every_error() {
    let mut app = start(Root::of::<ValidateAllApp>());
    app.press("text:validate").unwrap();
    app.wait_for("text:Enter email").unwrap();
    app.wait_for("text:Enter password").unwrap();
    app.press("text:one").unwrap();
    app.wait_for("text:one 1").unwrap();
    app.press("text:form one").unwrap();
    app.wait_for("text:form one 1").unwrap();
}

static HEARD: Mutex<Vec<String>> = Mutex::new(Vec::new());
static FORM_HEARD: Mutex<Vec<String>> = Mutex::new(Vec::new());

#[component]
pub fn ListenApp() -> impl IntoElement {
    let options = FormOptions::new(Nick::default()).listeners(
        FormListeners::new()
            .on_change(|values: &Nick| FORM_HEARD.lock().unwrap().push(values.nick.clone()))
            .on_change_debounce(Duration::from_millis(300)),
    );
    let form = use_form_with(options);
    let nick = field!(form, nick).listeners(
        FieldListeners::new()
            .on_change(|value: &String| HEARD.lock().unwrap().push(value.clone()))
            .on_change_debounce(Duration::from_millis(300)),
    );
    view()
        .child(nick.bind(input().test_id("nick")))
        .child(text("ready"))
}

#[test]
fn listeners_run_with_debounce() {
    let mut app = start(Root::of::<ListenApp>());
    app.type_text("id:nick", "abc").unwrap();
    assert!(HEARD.lock().unwrap().is_empty());
    assert!(FORM_HEARD.lock().unwrap().is_empty());
    app.run_for(Duration::from_millis(300)).unwrap();
    assert_eq!(*HEARD.lock().unwrap(), vec!["abc".to_owned()]);
    assert_eq!(*FORM_HEARD.lock().unwrap(), vec!["abc".to_owned()]);
}

static LOG: Mutex<Vec<&'static str>> = Mutex::new(Vec::new());

#[component]
pub fn ListenerEventsApp() -> impl IntoElement {
    let options = FormOptions::new(Nick::default()).listeners(
        FormListeners::new()
            .on_mount(|_: &Nick| LOG.lock().unwrap().push("form mount"))
            .on_blur(|_: &Nick| LOG.lock().unwrap().push("form blur"))
            .on_submit(|_: &Nick| LOG.lock().unwrap().push("form submit")),
    );
    let form = use_form_with(options);
    let nick = field!(form, nick).listeners(
        FieldListeners::new()
            .on_mount(|_: &String| LOG.lock().unwrap().push("field mount"))
            .on_blur(|_: &String| LOG.lock().unwrap().push("field blur"))
            .on_submit(|_: &String| LOG.lock().unwrap().push("field submit")),
    );
    view()
        .child(nick.bind(input().test_id("nick")))
        .child(text(move || format!("saved {}", form.is_submitted())))
        .child(text("blur").on_press(move || nick.handle_blur()))
        .child(text("submit").on_press(move || form.submit(|_: Nick| async { Ok(()) })))
        .child(text("ready"))
}

#[test]
fn form_and_field_listeners_fire_on_blur_submit_and_mount() {
    let mut app = start(Root::of::<ListenerEventsApp>());
    assert_eq!(*LOG.lock().unwrap(), vec!["form mount", "field mount"]);
    app.press("text:blur").unwrap();
    assert_eq!(LOG.lock().unwrap()[2..], ["field blur", "form blur"]);
    app.press("text:submit").unwrap();
    app.wait_for("text:saved true").unwrap();
    assert_eq!(LOG.lock().unwrap()[4..], ["field submit", "form submit"]);
}

static RENDERS: AtomicUsize = AtomicUsize::new(0);

#[derive(Clone, Debug, Default, PartialEq)]
struct Profile {
    name: String,
    age: String,
}

#[component]
pub fn SliceApp() -> impl IntoElement {
    let form = use_form(Profile::default());
    let name = field!(form, name);
    let age = field!(form, age);
    let name_touched = name.select(|meta| meta.is_touched);
    view()
        .child(name.bind(input().test_id("name")))
        .child(age.bind(input().test_id("age")))
        .child(text(move || {
            RENDERS.fetch_add(1, Ordering::SeqCst);
            format!("name touched {}", name_touched.get())
        }))
        .child(text("ready"))
}

#[test]
fn select_reruns_only_for_its_slice() {
    let mut app = start(Root::of::<SliceApp>());
    let before = RENDERS.load(Ordering::SeqCst);
    app.type_text("id:age", "5").unwrap();
    app.type_text("id:age", "50").unwrap();
    assert_eq!(RENDERS.load(Ordering::SeqCst), before);
    app.type_text("id:name", "a").unwrap();
    app.wait_for("text:name touched true").unwrap();
    let after_touch = RENDERS.load(Ordering::SeqCst);
    assert_eq!(after_touch, before + 1);
    app.type_text("id:name", "ab").unwrap();
    app.type_text("id:age", "6").unwrap();
    assert_eq!(RENDERS.load(Ordering::SeqCst), after_touch);
}

#[component]
pub fn FocusApp() -> impl IntoElement {
    let form = use_form(Profile::default());
    let email = field!(form, name).rule(rules::required("Enter name"));
    let age = field!(form, age).rule(rules::required("Enter age"));
    view()
        .child(email.bind(input().test_id("name")))
        .child(text(move || email.error().unwrap_or_default()))
        .child(age.bind(input().test_id("age")))
        .child(text(move || age.error().unwrap_or_default()))
        .child(text("submit").on_press(move || form.submit(|_: Profile| async { Ok(()) })))
        .child(text("ready"))
}

#[test]
fn failed_submit_focuses_the_first_invalid_input() {
    let mut app = start(Root::of::<FocusApp>());
    app.press("text:submit").unwrap();
    app.wait_for("text:Enter name").unwrap();
    app.press_key("x").unwrap();
    assert_eq!(app.screen().input_text("id:name").unwrap(), Some("x"));
    assert_eq!(app.screen().input_text("id:age").unwrap(), Some(""));
}

#[component]
pub fn OptionsSubmitApp() -> impl IntoElement {
    let options = FormOptions::new(Draft::default()).on_submit(|_: Draft| async { Ok(()) });
    let form = use_form_with(options);
    view()
        .child(text(move || format!("saved {}", form.is_submitted())))
        .child(text("submit").on_press(move || form.submit_with_options()))
        .child(text("ready"))
}

#[test]
fn form_options_on_submit_runs_with_options() {
    let mut app = start(Root::of::<OptionsSubmitApp>());
    app.press("text:submit").unwrap();
    app.wait_for("text:saved true").unwrap();
}

#[component]
pub fn ValidationLogicApp() -> impl IntoElement {
    let options =
        FormOptions::new(Draft::default()).validation_logic(ValidationLogic::revalidate());
    let form = use_form_with(options);
    let title = field!(form, title).validators(FieldValidators::new().on_dynamic(
        |value: &String, _: &Draft| (value.len() < 2).then(|| "dynamic short".to_owned()),
    ));
    view()
        .child(title.bind(input().test_id("title")))
        .child(text(move || format!("errors {}", title.errors().join("|"))))
        .child(text("submit").on_press(move || form.submit(|_: Draft| async { Ok(()) })))
        .child(text("ready"))
}

#[test]
fn revalidate_logic_runs_dynamic_validators_after_submit() {
    let mut app = start(Root::of::<ValidationLogicApp>());
    app.type_text("id:title", "a").unwrap();
    app.press("text:submit").unwrap();
    app.wait_for("text:errors dynamic short").unwrap();
}
