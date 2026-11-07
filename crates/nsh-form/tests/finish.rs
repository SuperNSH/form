//! Tests for the names the finish brief reopened: pattern, form_id, get_field_value and
//! the default submit meta.

use std::sync::Mutex;
use std::time::{Duration, SystemTime};

use nsh_base::input;
use nsh_core::prelude::*;
use nsh_engine::{Clock, EngineConfig, Root};
use nsh_form::{BindField, FormOptions, field, rules, use_form_with};
use nsh_testing::Headless;

fn start(root: Root) -> Headless {
    let mut config = EngineConfig::new(root);
    config.clock = Clock::manual(SystemTime::UNIX_EPOCH + Duration::from_secs(1_767_258_000));
    let mut app = Headless::start(config).unwrap();
    app.wait_for("text:ready").unwrap();
    app
}

#[derive(Clone, Debug, Default, PartialEq)]
struct Profile {
    nick: String,
}

static SAVED_META: Mutex<Vec<String>> = Mutex::new(Vec::new());

#[component]
pub fn FinishApp() -> impl IntoElement {
    let options = FormOptions::new(Profile::default())
        .form_id("profile-form")
        .on_submit_meta("default meta".to_owned());
    let form = use_form_with(options);
    let nick = field!(form, nick).rule(rules::pattern::<Profile>("^[a-z]+$", "lowercase only"));
    view()
        .child(nick.bind(input().test_id("nick")))
        .child(text(move || format!("errors {}", nick.errors().join("|"))))
        .child(text(move || format!("id {}", form.form_id())))
        .child(text(move || {
            format!(
                "typed {}",
                form.get_field_value::<String>(&nick.path())
                    .unwrap_or_default()
            )
        }))
        .child(text(move || {
            format!(
                "wrong type {}",
                form.get_field_value::<u32>(&nick.path()).is_some()
            )
        }))
        .child(text("submit").on_press(move || {
            form.handle_submit_meta(|_: Profile, meta: String| async move {
                SAVED_META.lock().unwrap().push(meta);
                Ok(())
            })
        }))
        .child(text("ready"))
}

#[test]
fn pattern_rejects_a_value_that_does_not_match() {
    let mut app = start(Root::of::<FinishApp>());
    app.type_text("id:nick", "ab1").unwrap();
    app.wait_for("text:errors lowercase only").unwrap();
    app.clear("id:nick").unwrap();
    app.type_text("id:nick", "abc").unwrap();
    app.wait_for("text:errors ").unwrap();
    assert!(!app.shows("errors lowercase only"));
}

#[test]
fn form_id_is_read_back() {
    let mut app = start(Root::of::<FinishApp>());
    app.wait_for("text:id profile-form").unwrap();
}

#[test]
fn get_field_value_reads_a_typed_value_by_path() {
    let mut app = start(Root::of::<FinishApp>());
    app.type_text("id:nick", "ada").unwrap();
    app.wait_for("text:typed ada").unwrap();
    app.wait_for("text:wrong type false").unwrap();
}

#[test]
fn on_submit_meta_is_the_default_meta() {
    let mut app = start(Root::of::<FinishApp>());
    app.press("text:submit").unwrap();
    app.run_for(Duration::from_millis(1)).unwrap();
    assert_eq!(*SAVED_META.lock().unwrap(), vec!["default meta".to_owned()]);
}

static CHECKS_DONE: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(0);

#[component]
pub fn ConcurrentChecksApp() -> impl IntoElement {
    let validators = nsh_form::FormValidators::new().on_submit_async(|_: Profile| async {
        timer(Duration::from_millis(200)).await;
        CHECKS_DONE.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
        nsh_form::FormValidationResult::ok()
    });
    let form = use_form_with(FormOptions::new(Profile::default()).validators(validators));
    let nick = field!(form, nick).on_submit_async(|_: String| async {
        timer(Duration::from_millis(200)).await;
        CHECKS_DONE.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
        None
    });
    view()
        .child(nick.bind(input().test_id("nick")))
        .child(text("submit").on_press(move || form.submit(|_: Profile| async { Ok(()) })))
        .child(text("ready"))
}

#[test]
fn submit_checks_run_together() {
    use std::sync::atomic::Ordering;
    let mut app = start(Root::of::<ConcurrentChecksApp>());
    app.press("text:submit").unwrap();
    app.run_for(Duration::from_millis(200)).unwrap();
    // Two checks of 200ms each finish together when they run together. One after
    // another, only one would have finished.
    assert_eq!(CHECKS_DONE.load(Ordering::SeqCst), 2);
}
