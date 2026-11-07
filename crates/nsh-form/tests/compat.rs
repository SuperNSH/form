//! Compiles and runs every public name the existing callers use. If one of
//! these stops compiling, a caller on `main` breaks.

use std::time::{Duration, SystemTime};

use nsh_base::input;
use nsh_core::prelude::*;
use nsh_engine::{Clock, EngineConfig, Root};
use nsh_form::rules::{self, Blank};
use nsh_form::{BindField, Field, FieldPath, Form, SubmitError, field, use_form};
use nsh_testing::Headless;

#[derive(Clone, Debug, Default, PartialEq)]
struct Address {
    city: String,
}

#[derive(Clone, Debug, Default, PartialEq)]
struct Account {
    email: String,
    password: String,
    confirm: String,
    age: String,
    address: Address,
}

fn touch_every_name(form: Form<Account>, email: Field<Account, String>) {
    let _: Form<Account> = form;
    let _ = form.values();
    let _ = form.values_untracked();
    form.set_values(Account::default());
    let _ = form.is_dirty();
    let _ = form.is_valid();
    let _ = form.is_submitting();
    let _ = form.submit_count();
    let _: Option<String> = form.error();
    form.reset();
    form.mark_saved();
    form.load(Account::default());
    let _ = form.validate();
    form.submit(|_: Account| async { Ok(()) });

    let _ = email.value();
    let _ = email.value_untracked();
    email.set("a@b.co".to_owned());
    let _: Option<String> = email.error();
    let _: bool = email.touched();
    let _: bool = email.dirty();
    let _: bool = email.is_validating();
    email.blur();
    let _: FieldPath = email.path();
}

fn rules_still_compile(form: Form<Account>) {
    let _ = form;
    let _ = rules::required::<String, Account>("required");
    let _ = rules::min_length::<Account>(2, "short");
    let _ = rules::max_length::<Account>(20, "long");
    let _ = rules::email::<Account>("email");
    let _ = rules::matches(|values: &Account| &values.password, "differs");
    let _ = rules::range::<u32, Account>(1, 10, "range");
    let _ = rules::signed_number::<i64, Account>("number");
    let _ = rules::unsigned_number::<u32, Account>("number");
    assert!(String::new().is_blank());
}

fn submit_errors() -> SubmitError {
    SubmitError::form("try again")
        .and_field("address.city", "unknown")
        .and_field("email", "taken")
}

#[component]
pub fn CompatApp() -> impl IntoElement {
    let form = use_form(Account::default());
    let email = field!(form, email)
        .rule(rules::required::<String, Account>("Enter your email"))
        .rule(rules::email("That is not an email"))
        .async_rule(Duration::from_millis(300), |value: String| async move {
            (value == "taken").then(|| "Already taken".to_owned())
        });
    let password = field!(form, password).rule(rules::min_length(8, "Too short"));
    let confirm = field!(form, confirm).rule(rules::matches(
        |values: &Account| &values.password,
        "Passwords differ",
    ));
    let age = field!(form, age).rule(rules::unsigned_number::<u32, Account>("Not a number"));
    let city = field!(form, address.city).rule(rules::max_length(100, "Too long"));
    let _ = (password, confirm, age, city, submit_errors());
    touch_every_name(form, email);
    rules_still_compile(form);
    view()
        .child(email.bind(input().test_id("email")))
        .child(text("ready"))
}

#[test]
fn every_existing_public_name_still_works() {
    let mut config = EngineConfig::new(Root::of::<CompatApp>());
    config.clock = Clock::manual(SystemTime::UNIX_EPOCH + Duration::from_secs(1_767_258_000));
    let mut app = Headless::start(config).unwrap();
    app.wait_for("text:ready").unwrap();
    app.type_text("id:email", "ada@example.com").unwrap();
    assert!(app.shows("ready"));
}
