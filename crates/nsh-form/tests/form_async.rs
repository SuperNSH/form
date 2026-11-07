//! Form-level async validators: `on_blur_async` runs when a field blurs and reports on the field
//! it names, and `on_dynamic_async` reruns after a submit attempt and reports on the form.

use std::time::{Duration, SystemTime};

use nsh_base::input;
use nsh_core::prelude::*;
use nsh_engine::{Clock, EngineConfig, Root};
use nsh_form::{
    BindField, FormOptions, FormValidationResult, FormValidators, ValidationLogic, field,
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
struct Account {
    nick: String,
    email: String,
}

#[component]
pub fn FormBlurAsyncApp() -> impl IntoElement {
    let validators = FormValidators::new().on_blur_async(|values: Account| async move {
        if values.nick == "taken" {
            FormValidationResult::field("nick", "nick taken")
        } else {
            FormValidationResult::ok()
        }
    });
    let form = use_form_with(FormOptions::new(Account::default()).validators(validators));
    let nick = field!(form, nick);
    view()
        .child(nick.bind(input().test_id("nick")))
        .child(text(move || {
            format!("nick errors {}", nick.errors().join("|"))
        }))
        .child(text("blur").on_press(move || nick.handle_blur()))
        .child(text("ready"))
}

#[test]
fn form_blur_async_reports_on_the_field_it_names() {
    let mut app = start(Root::of::<FormBlurAsyncApp>());
    app.type_text("id:nick", "taken").unwrap();
    app.press("text:blur").unwrap();
    app.wait_for("text:nick errors nick taken").unwrap();
}

#[component]
pub fn FormDynamicAsyncApp() -> impl IntoElement {
    let validators = FormValidators::new().on_dynamic_async(|values: Account| async move {
        if values.email == "used" {
            FormValidationResult::form("email in use")
        } else {
            FormValidationResult::ok()
        }
    });
    let form = use_form_with(
        FormOptions::new(Account::default())
            .validators(validators)
            .validation_logic(ValidationLogic::revalidate()),
    );
    let email = field!(form, email);
    view()
        .child(email.bind(input().test_id("email")))
        .child(text(move || {
            format!("form error {}", form.error().unwrap_or_default())
        }))
        .child(text("submit").on_press(move || form.submit(|_: Account| async { Ok(()) })))
        .child(text("ready"))
}

#[test]
fn form_dynamic_async_reruns_after_a_submit_and_reports_on_the_form() {
    let mut app = start(Root::of::<FormDynamicAsyncApp>());
    app.type_text("id:email", "used").unwrap();
    app.press("text:submit").unwrap();
    app.wait_for("text:form error email in use").unwrap();
}
