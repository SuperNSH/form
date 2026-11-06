use std::sync::atomic::{AtomicUsize, Ordering};
use std::time::{Duration, SystemTime};

use nsh_base::input;
use nsh_core::prelude::*;
use nsh_engine::{Clock, EngineConfig, Root};
use nsh_form::{BindField, Field, SubmitError, field, rules, use_form};
use nsh_testing::Headless;

fn start(root: Root) -> Headless {
    let mut config = EngineConfig::new(root);
    config.clock = Clock::manual(SystemTime::UNIX_EPOCH + Duration::from_secs(1_767_258_000));
    let mut app = Headless::start(config).unwrap();
    app.wait_for("text:submit").unwrap();
    app
}

#[derive(Clone, Debug, Default, PartialEq)]
struct Address {
    city: String,
}

#[derive(Clone, Debug, Default, PartialEq)]
struct SignUp {
    email: String,
    password: String,
    confirm: String,
    age: String,
    address: Address,
}

fn row(id: &'static str, field: Field<SignUp, String>) -> impl IntoElement {
    view()
        .child(field.bind(input().test_id(id)))
        .child(text(move || field.error().unwrap_or_default()))
}

static SAVED: AtomicUsize = AtomicUsize::new(0);

#[component]
pub fn SignUpApp() -> impl IntoElement {
    let form = use_form(SignUp::default());
    let email = field!(form, email)
        .rule(rules::required("Enter your email"))
        .rule(rules::email("That is not an email"));
    let password = field!(form, password)
        .rule(rules::required("Enter a password"))
        .rule(rules::min_length(8, "Too short"));
    let confirm =
        field!(form, confirm).rule(rules::matches(|v: &SignUp| &v.password, "Passwords differ"));
    let age = field!(form, age).rule(rules::unsigned_number::<u32, _>("Not a number"));
    let city = field!(form, address.city);
    view()
        .child(row("email", email))
        .child(row("password", password))
        .child(row("confirm", confirm))
        .child(row("age", age))
        .child(row("city", city))
        .child(text(move || format!("dirty {}", form.is_dirty())))
        .child(text(move || format!("city dirty {}", city.dirty())))
        .child(text(move || format!("valid {}", form.is_valid())))
        .child(text(move || format!("path {}", city.path())))
        .child(text(move || format!("submits {}", form.submit_count())))
        .child(text(move || {
            format!("form error {}", form.error().unwrap_or_default())
        }))
        .child(text("submit").on_press(move || {
            form.submit(|values: SignUp| async move {
                if values.email == "taken@example.com" {
                    return Err(SubmitError::field("email", "Already registered"));
                }
                if values.email == "down@example.com" {
                    return Err(SubmitError::form("Try again later"));
                }
                SAVED.fetch_add(1, Ordering::SeqCst);
                Ok(())
            })
        }))
        .child(text("reset").on_press(move || form.reset()))
        .child(text("load").on_press(move || {
            form.load(SignUp {
                email: "loaded@example.com".to_owned(),
                ..SignUp::default()
            })
        }))
}

fn fill(app: &mut Headless, email: &str) {
    app.type_text("id:email", email).unwrap();
    app.type_text("id:password", "correct-horse").unwrap();
    app.type_text("id:confirm", "correct-horse").unwrap();
}

#[test]
fn errors_wait_for_a_submit() {
    let mut app = start(Root::of::<SignUpApp>());
    app.type_text("id:email", "nope").unwrap();
    assert!(!app.shows("That is not an email"));
    app.press("text:submit").unwrap();
    app.wait_for("text:That is not an email").unwrap();
    app.wait_for("text:Enter a password").unwrap();
    assert!(app.shows("submits 1"));
}

#[test]
fn a_rule_can_read_other_values() {
    let mut app = start(Root::of::<SignUpApp>());
    app.type_text("id:password", "correct-horse").unwrap();
    app.type_text("id:confirm", "wrong").unwrap();
    app.press("text:submit").unwrap();
    app.wait_for("text:Passwords differ").unwrap();
}

#[test]
fn numeric_text_uses_the_gpui_form_check() {
    let mut app = start(Root::of::<SignUpApp>());
    app.type_text("id:age", "01").unwrap();
    app.press("text:submit").unwrap();
    app.wait_for("text:Not a number").unwrap();
}

#[test]
fn a_valid_submit_makes_the_values_the_baseline() {
    let mut app = start(Root::of::<SignUpApp>());
    let before = SAVED.load(Ordering::SeqCst);
    fill(&mut app, "ada@example.com");
    assert!(app.shows("dirty true"));
    app.press("text:submit").unwrap();
    app.wait_for("text:dirty false").unwrap();
    assert!(SAVED.load(Ordering::SeqCst) > before);
}

#[test]
fn server_errors_land_on_their_field_and_clear_on_edit() {
    let mut app = start(Root::of::<SignUpApp>());
    fill(&mut app, "taken@example.com");
    app.press("text:submit").unwrap();
    app.wait_for("text:Already registered").unwrap();
    assert!(app.shows("dirty true"));
    app.type_text("id:email", "x").unwrap();
    app.wait_for_gone("text:Already registered", Duration::from_secs(1))
        .unwrap();
}

#[test]
fn a_form_level_error_shows_on_the_form() {
    let mut app = start(Root::of::<SignUpApp>());
    fill(&mut app, "down@example.com");
    app.press("text:submit").unwrap();
    app.wait_for("text:form error Try again later").unwrap();
}

#[test]
fn reset_goes_back_to_the_baseline() {
    let mut app = start(Root::of::<SignUpApp>());
    app.type_text("id:email", "x").unwrap();
    app.press("text:submit").unwrap();
    app.wait_for("text:That is not an email").unwrap();
    app.press("text:reset").unwrap();
    app.wait_for("text:dirty false").unwrap();
    assert!(!app.shows("That is not an email"));
}

#[test]
fn load_replaces_values_and_baseline() {
    let mut app = start(Root::of::<SignUpApp>());
    app.press("text:load").unwrap();
    app.wait_for("text:dirty false").unwrap();
    app.press("text:submit").unwrap();
    app.wait_for("text:Enter a password").unwrap();
    assert!(!app.shows("Enter your email"));
}

#[test]
fn nested_paths_write_and_report_dirty_alone() {
    let mut app = start(Root::of::<SignUpApp>());
    assert!(app.shows("path address.city"));
    assert!(app.shows("city dirty false"));
    app.type_text("id:city", "Lahore").unwrap();
    app.wait_for("text:city dirty true").unwrap();
}

#[derive(Clone, Debug, Default, PartialEq)]
struct Handle {
    name: String,
}

static CHECKS: AtomicUsize = AtomicUsize::new(0);

#[component]
pub fn HandleApp() -> impl IntoElement {
    let form = use_form(Handle::default());
    let name = field!(form, name)
        .rule(rules::required("Pick a name"))
        .async_rule(Duration::from_millis(300), |value: String| async move {
            CHECKS.fetch_add(1, Ordering::SeqCst);
            (value == "taken").then(|| "Already taken".to_owned())
        });
    view()
        .child(name.bind(input().test_id("name")))
        .child(text(move || {
            format!("error {}", name.error().unwrap_or_default())
        }))
        .child(text(move || format!("checking {}", name.is_validating())))
        .child(text(move || format!("valid {}", form.is_valid())))
        .child(text("submit").on_press(move || {
            form.submit(|_: Handle| async { Ok(()) });
        }))
}

#[test]
fn an_async_rule_debounces_and_keeps_the_form_invalid_meanwhile() {
    let mut app = start(Root::of::<HandleApp>());
    let before = CHECKS.load(Ordering::SeqCst);
    app.type_text("id:name", "taken").unwrap();
    assert!(app.shows("checking true"));
    assert!(app.shows("valid false"));
    assert_eq!(CHECKS.load(Ordering::SeqCst), before);
    app.run_for(Duration::from_millis(350)).unwrap();
    app.wait_for("text:checking false").unwrap();
    assert_eq!(CHECKS.load(Ordering::SeqCst), before + 1);
    app.press("text:submit").unwrap();
    app.wait_for("text:error Already taken").unwrap();
}
