//! Tests for the TanStack names that the named tests reach only indirectly.

use std::sync::atomic::AtomicUsize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, SystemTime};

use nsh_base::input;
use nsh_core::prelude::*;
use nsh_engine::{Clock, EngineConfig, Root};
use nsh_form::{
    BindField, ErrorMap, FieldValidators, FormOptions, FormValidationResult, FormValidators,
    ValidationCause, ValidationLogic, array_field, field, rules, use_form, use_form_with,
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

#[component]
pub fn AsyncAlwaysApp() -> impl IntoElement {
    let runs = signal(0usize);
    let form = use_form_with(FormOptions::new(Nick::default()).async_always(true));
    let nick = field!(form, nick)
        .rule(rules::required::<String, Nick>("Enter nick"))
        .on_change_async(move |_: String| async move {
            runs.update(|count| *count += 1);
            None
        });
    view()
        .child(nick.bind(input().test_id("nick")))
        .child(text(move || format!("runs {}", runs.get())))
        .child(text("ready"))
}

#[test]
fn async_always_runs_async_after_a_sync_failure() {
    let mut app = start(Root::of::<AsyncAlwaysApp>());
    app.type_text("id:nick", "a").unwrap();
    app.wait_for("text:runs 1").unwrap();
    app.clear("id:nick").unwrap();
    app.wait_for("text:runs 2").unwrap();
}

#[component]
pub fn FormAsyncDebounceApp() -> impl IntoElement {
    let runs = signal(0usize);
    let form =
        use_form_with(FormOptions::new(Nick::default()).async_debounce(Duration::from_millis(300)));
    let nick = field!(form, nick).on_change_async(move |_: String| async move {
        runs.update(|count| *count += 1);
        None
    });
    view()
        .child(nick.bind(input().test_id("nick")))
        .child(text(move || format!("runs {}", runs.get())))
        .child(text("ready"))
}

#[test]
fn form_async_debounce_applies_to_validators_without_their_own() {
    let mut app = start(Root::of::<FormAsyncDebounceApp>());
    app.type_text("id:nick", "abc").unwrap();
    app.run_for(Duration::from_millis(299)).unwrap();
    assert!(app.shows("runs 0"));
    app.run_for(Duration::from_millis(1)).unwrap();
    app.wait_for("text:runs 1").unwrap();
}

#[component]
pub fn FormAsyncChangeApp() -> impl IntoElement {
    let validators = FormValidators::new()
        .on_change_async(|values: Nick| async move {
            if values.nick == "taken" {
                FormValidationResult::field("nick", "Taken")
            } else {
                FormValidationResult::ok()
            }
        })
        .on_change_async_debounce(Duration::from_millis(300));
    let form = use_form_with(FormOptions::new(Nick::default()).validators(validators));
    let nick = field!(form, nick);
    view()
        .child(nick.bind(input().test_id("nick")))
        .child(text(move || format!("errors {}", nick.errors().join("|"))))
        .child(text(move || {
            format!("form validating {}", form.is_form_validating())
        }))
        .child(text("ready"))
}

#[test]
fn form_async_change_validator_debounces() {
    let mut app = start(Root::of::<FormAsyncChangeApp>());
    app.type_text("id:nick", "taken").unwrap();
    app.wait_for("text:form validating true").unwrap();
    app.run_for(Duration::from_millis(299)).unwrap();
    assert!(!app.shows("errors Taken"));
    app.run_for(Duration::from_millis(1)).unwrap();
    app.wait_for("text:errors Taken").unwrap();
    app.wait_for("text:form validating false").unwrap();
}

#[component]
pub fn BlurSubmitAsyncApp() -> impl IntoElement {
    let form = use_form(Nick::default());
    let nick = field!(form, nick)
        .on_blur_async(
            |value: String| async move { (value == "bad").then(|| "bad on blur".to_owned()) },
        )
        .on_blur_async_debounce(Duration::from_millis(300))
        .on_submit_async(|value: String| async move {
            (value == "bad").then(|| "bad on submit".to_owned())
        });
    view()
        .child(nick.bind(input().test_id("nick")))
        .child(text(move || format!("errors {}", nick.errors().join("|"))))
        .child(text("blur").on_press(move || nick.handle_blur()))
        .child(text("submit").on_press(move || form.submit(|_: Nick| async { Ok(()) })))
        .child(text("ready"))
}

#[test]
fn field_blur_and_submit_async_checks_run_at_their_events() {
    let mut app = start(Root::of::<BlurSubmitAsyncApp>());
    app.type_text("id:nick", "bad").unwrap();
    assert!(!app.shows("errors bad on blur"));
    app.press("text:blur").unwrap();
    app.run_for(Duration::from_millis(299)).unwrap();
    assert!(!app.shows("errors bad on blur"));
    app.run_for(Duration::from_millis(1)).unwrap();
    app.wait_for("text:errors bad on blur").unwrap();
    app.press("text:submit").unwrap();
    app.run_for(Duration::from_millis(300)).unwrap();
    app.wait_for("text:errors bad on blur|bad on submit")
        .unwrap();
}

#[derive(Clone, Debug, Default, PartialEq)]
struct Draft {
    title: String,
}

#[component]
pub fn FormDynamicApp() -> impl IntoElement {
    let validators = FormValidators::new().on_dynamic(|values: &Draft| {
        if values.title.is_empty() {
            FormValidationResult::form("form dynamic")
        } else {
            FormValidationResult::ok()
        }
    });
    let options = FormOptions::new(Draft::default())
        .validators(validators)
        .validation_logic(ValidationLogic::revalidate());
    let form = use_form_with(options);
    let title = field!(form, title);
    view()
        .child(title.bind(input().test_id("title")))
        .child(text(move || format!("form {}", form.errors().join("|"))))
        .child(text(move || format!("form valid {}", form.is_form_valid())))
        .child(text("submit").on_press(move || form.submit(|_: Draft| async { Ok(()) })))
        .child(text("ready"))
}

#[test]
fn form_level_dynamic_validators_report_on_the_form() {
    let mut app = start(Root::of::<FormDynamicApp>());
    app.press("text:submit").unwrap();
    app.wait_for("text:form form dynamic").unwrap();
    app.wait_for("text:form valid false").unwrap();
}

#[component]
pub fn DynamicAsyncApp() -> impl IntoElement {
    let form = use_form_with(
        FormOptions::new(Nick::default()).validation_logic(ValidationLogic::revalidate()),
    );
    let nick = field!(form, nick).validators(
        FieldValidators::new()
            .on_dynamic_async(|value: String| async move {
                (value == "x").then(|| "dynamic async".to_owned())
            })
            .on_dynamic_async_debounce(Duration::from_millis(300)),
    );
    view()
        .child(nick.bind(input().test_id("nick")))
        .child(text(move || format!("errors {}", nick.errors().join("|"))))
        .child(text("submit").on_press(move || form.submit(|_: Nick| async { Ok(()) })))
        .child(text("ready"))
}

#[test]
fn dynamic_async_validators_run_after_submit() {
    let mut app = start(Root::of::<DynamicAsyncApp>());
    app.type_text("id:nick", "x").unwrap();
    app.press("text:submit").unwrap();
    app.run_for(Duration::from_millis(300)).unwrap();
    app.wait_for("text:errors dynamic async").unwrap();
}

#[derive(Clone, Debug, Default, PartialEq)]
struct Pair {
    password: String,
    confirm: String,
}

#[component]
pub fn LinkedBlurApp() -> impl IntoElement {
    let form = use_form(Pair::default());
    let password = field!(form, password);
    let confirm = field!(form, confirm).validators(
        FieldValidators::new()
            .on_blur(|value: &String, values: &Pair| {
                (value != &values.password).then(|| "blur mismatch".to_owned())
            })
            .on_blur_listen_to(&["password"]),
    );
    view()
        .child(password.bind(input().test_id("password")))
        .child(confirm.bind(input().test_id("confirm")))
        .child(text(move || {
            format!("confirm errors {}", confirm.errors().join("|"))
        }))
        .child(text(move || format!("pw {}", password.value())))
        .child(text("set password").on_press(move || password.set_value("xyz".to_owned())))
        .child(text("set confirm").on_press(move || confirm.set_value("abc".to_owned())))
        .child(text("blur password").on_press(move || password.handle_blur()))
        .child(text("ready"))
}

#[test]
fn linked_field_revalidates_when_its_source_is_blurred() {
    let mut app = start(Root::of::<LinkedBlurApp>());
    app.press("text:set password").unwrap();
    app.press("text:set confirm").unwrap();
    app.wait_for("text:pw xyz").unwrap();
    assert!(!app.shows("confirm errors blur mismatch"));
    app.press("text:blur password").unwrap();
    app.wait_for("text:confirm errors blur mismatch").unwrap();
}

#[component]
pub fn WritersApp() -> impl IntoElement {
    let form = use_form(Draft::default());
    let title = field!(form, title).rule(rules::required::<String, Draft>("Title needed"));
    let touched = form.select(|state| state.is_touched);
    view()
        .child(title.bind(input().test_id("title")))
        .child(text(move || format!("form touched {}", touched.get())))
        .child(text(move || {
            format!(
                "meta touched {}",
                form.field_meta(&title.path())
                    .map(|meta| meta.is_touched)
                    .unwrap_or(false)
            )
        }))
        .child(text(move || {
            format!("form error {}", form.error().unwrap_or_default())
        }))
        .child(text(move || format!("value {}", title.get_value())))
        .child(text(move || format!("changed {}", title.was_changed())))
        .child(text(move || {
            format!(
                "form changed {} pristine {} default {} blurred {}",
                form.was_changed(),
                form.is_pristine(),
                form.is_default_value(),
                form.is_blurred()
            )
        }))
        .child(text("blur title").on_press(move || title.handle_blur()))
        .child(text(move || format!("can {}", form.can_submit())))
        .child(text(move || {
            format!("all {}", form.get_all_errors().form.messages().len())
        }))
        .child(
            text("set meta").on_press(move || {
                form.set_field_meta(&title.path(), |meta| meta.is_touched = true)
            }),
        )
        .child(text("reset meta").on_press(move || form.reset_field_meta(&title.path())))
        .child(text("set error").on_press(move || {
            form.set_error_map(ErrorMap::new().with(ValidationCause::Submit, "form wide"));
        }))
        .child(text("set changed").on_press(move || title.set_meta(|meta| meta.was_changed = true)))
        .child(text("allow invalid").on_press(move || form.can_submit_when_invalid(true)))
        .child(text("handle").on_press(move || form.handle_submit(|_: Draft| async { Ok(()) })))
        .child(text(move || format!("submitted {}", form.is_submitted())))
        .child(text("ready"))
}

#[test]
fn form_writers_and_selectors_round_trip() {
    let mut app = start(Root::of::<WritersApp>());
    app.press("text:set meta").unwrap();
    app.wait_for("text:meta touched true").unwrap();
    app.wait_for("text:form touched true").unwrap();
    app.press("text:reset meta").unwrap();
    app.wait_for("text:meta touched false").unwrap();
    app.press("text:set error").unwrap();
    app.wait_for("text:form error form wide").unwrap();
    app.wait_for("text:all 1").unwrap();
    app.press("text:set changed").unwrap();
    app.wait_for("text:changed true").unwrap();
    app.wait_for("text:form changed true pristine false default true blurred false")
        .unwrap();
    app.press("text:blur title").unwrap();
    app.wait_for("text:form changed true pristine false default true blurred true")
        .unwrap();
    app.press("text:set meta").unwrap();
    app.wait_for("text:can false").unwrap();
    app.press("text:allow invalid").unwrap();
    app.wait_for("text:can true").unwrap();
    app.type_text("id:title", "a").unwrap();
    app.wait_for("text:value a").unwrap();
    app.press("text:handle").unwrap();
    app.wait_for("text:submitted true").unwrap();
}

static LIMIT: AtomicBool = AtomicBool::new(false);
static ROW_CHECKS: AtomicUsize = AtomicUsize::new(0);

#[derive(Clone, Debug, Default, PartialEq)]
struct Words {
    words: Vec<String>,
}

#[component]
pub fn ValidateFromApp() -> impl IntoElement {
    let form = use_form(Words {
        words: vec!["alpha".to_owned(), "beta".to_owned()],
    });
    let words = array_field!(form, words);
    let first = words.item_field(0).rule(|value: &String, _: &Words| {
        ROW_CHECKS.fetch_add(1, Ordering::SeqCst);
        (LIMIT.load(Ordering::SeqCst) && value.len() > 1).then(|| "too long".to_owned())
    });
    let second = words.item_field(1);
    view()
        .child(text(move || format!("first {}", first.errors().join("|"))))
        .child(text(move || {
            format!("second {}", second.errors().join("|"))
        }))
        .child(text("touch").on_press(move || first.handle_blur()))
        .child(text("limit").on_press(move || LIMIT.store(true, Ordering::SeqCst)))
        .child(text("validate").on_press(move || words.validate_from(0, ValidationCause::Submit)))
        .child(text("ready"))
}

#[test]
fn validate_from_revalidates_touched_rows() {
    let mut app = start(Root::of::<ValidateFromApp>());
    app.press("text:touch").unwrap();
    app.wait_for("text:first ").unwrap();
    let before = ROW_CHECKS.load(Ordering::SeqCst);
    app.press("text:limit").unwrap();
    app.press("text:validate").unwrap();
    app.wait_for("text:first too long").unwrap();
    assert!(ROW_CHECKS.load(Ordering::SeqCst) > before);
    assert!(!app.shows("second too long"));
}

#[test]
fn standard_rules_min_max_and_one_of_fail_outside_their_bounds() {
    let min = rules::min::<u32, ()>(3, "too small");
    let max = rules::max::<u32, ()>(10, "too big");
    let one_of = rules::one_of::<&str, ()>(vec!["red", "blue"], "not a colour");
    assert_eq!(min(&2, &()), Some("too small".to_owned()));
    assert_eq!(min(&3, &()), None);
    assert_eq!(max(&11, &()), Some("too big".to_owned()));
    assert_eq!(max(&10, &()), None);
    assert_eq!(one_of(&"green", &()), Some("not a colour".to_owned()));
    assert_eq!(one_of(&"blue", &()), None);
}

static SAME_VALUE_RUNS: AtomicUsize = AtomicUsize::new(0);

#[component]
pub fn SameValueApp() -> impl IntoElement {
    let form = use_form(Nick {
        nick: "ada".to_owned(),
    });
    let nick = field!(form, nick).on_change(|_, _| {
        SAME_VALUE_RUNS.fetch_add(1, Ordering::SeqCst);
        None
    });
    // An effect that writes back what it reads settles only if an equal value is not a change.
    effect(move || {
        let trimmed = nick.value().trim().to_owned();
        nick.set(trimmed);
    });
    view()
        .child(text(move || format!("changed {}", nick.was_changed())))
        .child(text("same").on_press(move || nick.set("ada".to_owned())))
        .child(text("other").on_press(move || nick.set("bea".to_owned())))
        .child(text("ready"))
}

#[test]
fn set_with_an_equal_value_changes_nothing() {
    let mut app = start(Root::of::<SameValueApp>());
    app.press("text:same").unwrap();
    app.wait_for("text:changed false").unwrap();
    assert_eq!(SAME_VALUE_RUNS.load(Ordering::SeqCst), 0);
    app.press("text:other").unwrap();
    app.wait_for("text:changed true").unwrap();
    assert_eq!(SAME_VALUE_RUNS.load(Ordering::SeqCst), 1);
}
