//! Tests for schemas: sync and async checks of the whole value, field-level schemas, and the
//! parse methods. The schemas are hand-written; no schema library is involved.

use std::future::Future;
use std::pin::Pin;
use std::time::{Duration, SystemTime};

use nsh_base::input;
use nsh_core::prelude::*;
use nsh_engine::{Clock, EngineConfig, Root};
use nsh_form::{
    AsyncSchema, BindField, FormOptions, FormValidators, Schema, SchemaIssue, field, use_form_with,
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

/// Whole-value rules: the nick needs three characters, reported on the field `nick`.
struct ProfileSchema;

impl Schema<Profile> for ProfileSchema {
    fn check(&self, value: &Profile) -> Vec<SchemaIssue> {
        if value.nick.chars().count() < 3 {
            vec![SchemaIssue::field("nick", "too short")]
        } else {
            Vec::new()
        }
    }
}

/// A string rule for one field.
struct NickLength;

impl Schema<String> for NickLength {
    fn check(&self, value: &String) -> Vec<SchemaIssue> {
        if value.len() < 3 {
            vec![SchemaIssue::form("short")]
        } else {
            Vec::new()
        }
    }
}

/// An async rule: a nick the server already has.
struct Taken;

impl AsyncSchema<Profile> for Taken {
    fn check(&self, value: Profile) -> Pin<Box<dyn Future<Output = Vec<SchemaIssue>>>> {
        Box::pin(async move {
            timer(Duration::from_millis(200)).await;
            if value.nick == "taken" {
                vec![SchemaIssue::field("nick", "taken")]
            } else {
                Vec::new()
            }
        })
    }
}

#[component]
pub fn SchemaApp() -> impl IntoElement {
    let validators = FormValidators::new().on_submit_schema(ProfileSchema);
    let form = use_form_with(FormOptions::new(Profile::default()).validators(validators));
    let nick = field!(form, nick).on_change_schema(NickLength);
    let parsed = signal(String::from("none"));
    view()
        .child(nick.bind(input().test_id("nick")))
        .child(text(move || format!("errors {}", nick.errors().join("|"))))
        .child(text(move || format!("parsed {}", parsed.get())))
        .child(text("submit").on_press(move || form.submit(|_: Profile| async { Ok(()) })))
        .child(text("parse").on_press(move || {
            let outcome = form.parse_values_with_schema(&ProfileSchema);
            parsed.set(format!("sync {}", outcome.is_err()));
        }))
        .child(text("parse async").on_press(move || {
            spawn(async move {
                let outcome = form.parse_values_with_schema_async(&Taken).await;
                parsed.set(format!("async {}", outcome.is_err()));
            });
        }))
        .child(text("field parse").on_press(move || {
            let outcome = nick.parse_value_with_schema(&NickLength);
            parsed.set(format!("field {}", outcome.is_err()));
        }))
        .child(text("ready"))
}

#[test]
fn field_schema_runs_on_change() {
    let mut app = start(Root::of::<SchemaApp>());
    app.type_text("id:nick", "ab").unwrap();
    app.wait_for("text:errors short").unwrap();
}

#[test]
fn form_schema_puts_issues_on_fields_on_submit() {
    let mut app = start(Root::of::<SchemaApp>());
    app.type_text("id:nick", "ab").unwrap();
    app.press("text:submit").unwrap();
    app.wait_for("text:errors short|too short").unwrap();
}

#[test]
fn parse_values_with_schema_reports_issues_now() {
    let mut app = start(Root::of::<SchemaApp>());
    app.type_text("id:nick", "ab").unwrap();
    app.press("text:parse").unwrap();
    app.wait_for("text:parsed sync true").unwrap();
}

#[test]
fn parse_values_with_schema_async_waits_for_the_server() {
    let mut app = start(Root::of::<SchemaApp>());
    app.type_text("id:nick", "taken").unwrap();
    app.press("text:parse async").unwrap();
    app.run_for(Duration::from_millis(200)).unwrap();
    app.wait_for("text:parsed async true").unwrap();
}

#[test]
fn parse_value_with_schema_checks_one_field() {
    let mut app = start(Root::of::<SchemaApp>());
    app.type_text("id:nick", "ab").unwrap();
    app.press("text:field parse").unwrap();
    app.wait_for("text:parsed field true").unwrap();
}

/// An async string rule: a nick the server already has.
struct TakenNick;

impl AsyncSchema<String> for TakenNick {
    fn check(&self, value: String) -> Pin<Box<dyn Future<Output = Vec<SchemaIssue>>>> {
        Box::pin(async move {
            timer(Duration::from_millis(100)).await;
            if value == "taken" {
                vec![SchemaIssue::form("taken")]
            } else {
                Vec::new()
            }
        })
    }
}

#[component]
pub fn FieldAsyncParseApp() -> impl IntoElement {
    let form = use_form_with(FormOptions::new(Profile::default()));
    let nick = field!(form, nick);
    let outcome = signal(String::from("none"));
    view()
        .child(nick.bind(input().test_id("nick")))
        .child(text(move || format!("async field {}", outcome.get())))
        .child(text("check").on_press(move || {
            spawn(async move {
                let result = nick.parse_value_with_schema_async(&TakenNick).await;
                outcome.set(format!("{}", result.is_err()));
            });
        }))
        .child(text("ready"))
}

#[test]
fn parse_value_with_schema_async_checks_one_field_after_a_delay() {
    let mut app = start(Root::of::<FieldAsyncParseApp>());
    app.type_text("id:nick", "taken").unwrap();
    app.press("text:check").unwrap();
    app.run_for(Duration::from_millis(100)).unwrap();
    app.wait_for("text:async field true").unwrap();
}
