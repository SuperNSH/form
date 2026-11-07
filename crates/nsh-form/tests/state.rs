//! Tests for default state, save and restore, transform, runtime update and merge.

use std::sync::Mutex;
use std::time::{Duration, SystemTime};

use nsh_base::input;
use nsh_core::prelude::*;
use nsh_engine::{Clock, EngineConfig, Root};
use nsh_form::{
    BindField, ErrorMap, FieldListeners, FieldValidators, FormOptions, FormStateSnapshot,
    FormValidationResult, FormValidators, ValidationCause, field, form_options, use_form,
    use_form_with,
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
struct Profile {
    nick: String,
}

static SAVED: Mutex<Option<FormStateSnapshot<Profile>>> = Mutex::new(None);

#[component]
pub fn SaveRestoreApp() -> impl IntoElement {
    let saved_state = FormStateSnapshot {
        values: Profile {
            nick: "ada".to_owned(),
        },
        error_map: ErrorMap::new().with(ValidationCause::Submit, "saved error"),
        field_meta: Vec::new(),
        submission_attempts: 3,
        is_submitted: false,
        is_submit_successful: false,
    };
    let form = use_form_with(FormOptions::new(Profile::default()).default_state(saved_state));
    let nick = field!(form, nick);
    view()
        .child(nick.bind(input().test_id("nick")))
        .child(text(move || {
            format!(
                "restored {} error {}",
                nick.value(),
                form.error().unwrap_or_default()
            )
        }))
        .child(text(move || {
            format!("attempts {}", form.submission_attempts())
        }))
        .child(text(move || format!("dirty {}", form.is_dirty())))
        .child(text("save").on_press(move || *SAVED.lock().unwrap() = Some(form.save_state())))
        .child(text("ready"))
}

#[test]
fn default_state_restores_values_errors_and_submission_state() {
    let mut app = start(Root::of::<SaveRestoreApp>());
    app.wait_for("text:restored ada error saved error").unwrap();
    app.wait_for("text:attempts 3").unwrap();
    app.wait_for("text:dirty true").unwrap();
}

#[test]
fn save_state_captures_values_and_flags() {
    let mut app = start(Root::of::<SaveRestoreApp>());
    app.clear("id:nick").unwrap();
    app.type_text("id:nick", "grace").unwrap();
    app.press("text:save").unwrap();
    let saved = SAVED.lock().unwrap().clone().unwrap();
    assert_eq!(saved.values.nick, "grace");
    assert_eq!(saved.submission_attempts, 3);
}

#[component]
pub fn TransformApp() -> impl IntoElement {
    let options = FormOptions::new(Profile {
        nick: "ada".to_owned(),
    })
    .transform(|mut state| {
        state.values.nick = state.values.nick.to_uppercase();
        state
    });
    let form = use_form_with(options);
    let nick = field!(form, nick);
    view()
        .child(nick.bind(input().test_id("nick")))
        .child(text(move || format!("nick {}", nick.value())))
        .child(text("ready"))
}

#[test]
fn transform_changes_the_initial_state() {
    let mut app = start(Root::of::<TransformApp>());
    app.wait_for("text:nick ADA").unwrap();
}

#[component]
pub fn FormUpdateApp() -> impl IntoElement {
    let form = use_form(Profile::default());
    let nick = field!(form, nick);
    view()
        .child(nick.bind(input().test_id("nick")))
        .child(text(move || {
            format!("error {}", form.error().unwrap_or_default())
        }))
        .child(text("update").on_press(move || {
            form.update(FormOptions::new(Profile::default()).validators(
                FormValidators::new().on_submit(|values: &Profile| {
                    if values.nick.is_empty() {
                        FormValidationResult::form("nick needed")
                    } else {
                        FormValidationResult::ok()
                    }
                }),
            ));
        }))
        .child(text("submit").on_press(move || form.submit(|_: Profile| async { Ok(()) })))
        .child(text("ready"))
}

#[test]
fn form_update_changes_validators_at_run_time() {
    let mut app = start(Root::of::<FormUpdateApp>());
    app.press("text:submit").unwrap();
    app.run_for(Duration::from_millis(1)).unwrap();
    assert!(!app.shows("error nick needed"));
    app.press("text:update").unwrap();
    app.press("text:submit").unwrap();
    app.wait_for("text:error nick needed").unwrap();
}

#[component]
pub fn FieldUpdateApp() -> impl IntoElement {
    let form = use_form(Profile::default());
    let nick = field!(form, nick);
    view()
        .child(nick.bind(input().test_id("nick")))
        .child(text(move || format!("errors {}", nick.errors().join("|"))))
        .child(text("update").on_press(move || {
            nick.update(
                FieldValidators::new().rule(|value: &String, _: &Profile| {
                    (value.len() < 3).then(|| "too short".to_owned())
                }),
                FieldListeners::new(),
            );
        }))
        .child(text("ready"))
}

#[test]
fn field_update_replaces_validators() {
    let mut app = start(Root::of::<FieldUpdateApp>());
    app.press("text:update").unwrap();
    app.type_text("id:nick", "ab").unwrap();
    app.wait_for("text:errors too short").unwrap();
}

#[component]
pub fn MergeApp() -> impl IntoElement {
    let form = use_form(Profile::default());
    let nick = field!(form, nick);
    view()
        .child(nick.bind(input().test_id("nick")))
        .child(text(move || format!("nick {}", nick.value())))
        .child(text("merge").on_press(move || {
            form.merge_form(FormStateSnapshot::from_values(Profile {
                nick: "merged".to_owned(),
            }));
        }))
        .child(text("ready"))
}

#[test]
fn merge_form_replaces_the_values() {
    let mut app = start(Root::of::<MergeApp>());
    app.press("text:merge").unwrap();
    app.wait_for("text:nick merged").unwrap();
}

#[component]
pub fn SharedOptionsApp() -> impl IntoElement {
    let shared = form_options(FormOptions::new(Profile {
        nick: "shared".to_owned(),
    }));
    let form = use_form_with(shared);
    let nick = field!(form, nick);
    view()
        .child(text(move || format!("nick {}", nick.value())))
        .child(text("ready"))
}

#[test]
fn shared_options_are_reusable() {
    let mut app = start(Root::of::<SharedOptionsApp>());
    app.wait_for("text:nick shared").unwrap();
}

#[component]
pub fn EqualChangeApp() -> impl IntoElement {
    let form = use_form(Profile {
        nick: "ada".to_owned(),
    });
    let nick = field!(form, nick).validators(FieldValidators::new().on_change(
        |value: &String, _: &Profile| (value == "ada").then(|| "same value checked".to_owned()),
    ));
    view()
        .child(nick.bind(input().test_id("nick")))
        .child(text(move || {
            format!(
                "state touched {} changed {} errors {}",
                nick.is_touched(),
                nick.was_changed(),
                nick.errors().join("|")
            )
        }))
        .child(text("same").on_press(move || nick.handle_change("ada".to_owned())))
        .child(text("ready"))
}

#[test]
fn handle_change_with_an_equal_value_counts_as_a_change() {
    // TanStack setValue calls setFieldValue, which always sets isTouched and isDirty and validates.
    let mut app = start(Root::of::<EqualChangeApp>());
    app.wait_for("text:state touched false changed false errors ")
        .unwrap();
    app.press("text:same").unwrap();
    app.wait_for("text:state touched true changed true errors same value checked")
        .unwrap();
}
