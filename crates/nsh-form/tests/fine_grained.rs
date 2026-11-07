//! NSH's rule: only the bindings that read a changed signal run again. Each counter
//! counts the runs of one binding, so a test fails if a binding wakes for a value it never read.

use std::sync::atomic::{AtomicUsize, Ordering};
use std::time::{Duration, SystemTime};

use nsh_base::input;
use nsh_core::prelude::*;
use nsh_engine::{Clock, EngineConfig, Root};
use nsh_form::{BindField, array_field, field, rules, use_form};
use nsh_testing::Headless;

fn start(root: Root) -> Headless {
    let mut config = EngineConfig::new(root);
    config.clock = Clock::manual(SystemTime::UNIX_EPOCH + Duration::from_secs(1_767_258_000));
    let mut app = Headless::start(config).unwrap();
    app.wait_for("text:ready").unwrap();
    app
}

fn runs(counter: &AtomicUsize) -> usize {
    counter.load(Ordering::SeqCst)
}

fn tick(counter: &AtomicUsize) {
    counter.fetch_add(1, Ordering::SeqCst);
}

#[derive(Clone, Debug, Default, PartialEq)]
struct Pair {
    email: String,
    name: String,
    tags: Vec<String>,
}

static EMAIL_VALUE: AtomicUsize = AtomicUsize::new(0);
static NAME_VALUE: AtomicUsize = AtomicUsize::new(0);
static NAME_ERROR: AtomicUsize = AtomicUsize::new(0);
static NAME_TOUCHED: AtomicUsize = AtomicUsize::new(0);
static NAME_DIRTY: AtomicUsize = AtomicUsize::new(0);

#[component]
pub fn OtherFieldApp() -> impl IntoElement {
    let form = use_form(Pair::default());
    let email = field!(form, email);
    let name = field!(form, name).rule(rules::required("Name needed"));
    view()
        .child(text(move || {
            tick(&EMAIL_VALUE);
            format!("email {}", email.value())
        }))
        .child(text(move || {
            tick(&NAME_VALUE);
            format!("name {}", name.value())
        }))
        .child(text(move || {
            tick(&NAME_ERROR);
            format!("name error {}", name.error().unwrap_or_default())
        }))
        .child(text(move || {
            tick(&NAME_TOUCHED);
            format!("name touched {}", name.is_touched())
        }))
        .child(text(move || {
            tick(&NAME_DIRTY);
            format!("name dirty {}", name.dirty())
        }))
        .child(email.bind(input().test_id("email")))
        .child(text("ready"))
}

#[test]
fn typing_in_one_field_does_not_wake_bindings_of_another() {
    let mut app = start(Root::of::<OtherFieldApp>());
    let (value, error, touched, dirty) = (
        runs(&NAME_VALUE),
        runs(&NAME_ERROR),
        runs(&NAME_TOUCHED),
        runs(&NAME_DIRTY),
    );
    let email_value = runs(&EMAIL_VALUE);
    app.type_text("id:email", "a").unwrap();
    app.wait_for("text:email a").unwrap();
    assert_eq!(runs(&EMAIL_VALUE), email_value + 1);
    assert_eq!(runs(&NAME_VALUE), value, "name's value did not change");
    assert_eq!(runs(&NAME_ERROR), error, "name's error did not change");
    assert_eq!(runs(&NAME_TOUCHED), touched, "name was not touched");
    assert_eq!(runs(&NAME_DIRTY), dirty, "name did not change");
}

static OWN_VALUE: AtomicUsize = AtomicUsize::new(0);
static OWN_TOUCHED: AtomicUsize = AtomicUsize::new(0);
static OWN_ERROR: AtomicUsize = AtomicUsize::new(0);
static OWN_DIRTY: AtomicUsize = AtomicUsize::new(0);

#[component]
pub fn OwnFieldApp() -> impl IntoElement {
    let form = use_form(Pair::default());
    let email = field!(form, email).rule(rules::required("Email needed"));
    view()
        .child(text(move || {
            tick(&OWN_VALUE);
            format!("value {}", email.value())
        }))
        .child(text(move || {
            tick(&OWN_TOUCHED);
            format!("touched {}", email.is_touched())
        }))
        .child(text(move || {
            tick(&OWN_ERROR);
            format!("error {}", email.error().unwrap_or_default())
        }))
        .child(text(move || {
            tick(&OWN_DIRTY);
            format!("dirty {}", email.dirty())
        }))
        .child(email.bind(input().test_id("email")))
        .child(text("blur").on_press(move || email.blur()))
        .child(text("ready"))
}

#[test]
fn one_fields_bindings_wake_only_for_what_they_read() {
    let mut app = start(Root::of::<OwnFieldApp>());
    app.type_text("id:email", "a").unwrap();
    app.wait_for("text:value a").unwrap();
    app.wait_for("text:dirty true").unwrap();
    let (value, touched, error, dirty) = (
        runs(&OWN_VALUE),
        runs(&OWN_TOUCHED),
        runs(&OWN_ERROR),
        runs(&OWN_DIRTY),
    );

    app.type_text("id:email", "b").unwrap();
    app.wait_for("text:value ab").unwrap();
    assert_eq!(runs(&OWN_VALUE), value + 1);
    assert_eq!(runs(&OWN_DIRTY), dirty, "still dirty, so no wake");
    assert_eq!(runs(&OWN_ERROR), error, "still no error, so no wake");

    let (value, touched_now) = (runs(&OWN_VALUE), runs(&OWN_TOUCHED));
    assert!(touched_now - touched <= 1, "touched flips at most once");
    app.press("text:blur").unwrap();
    app.run_for(Duration::from_millis(1)).unwrap();
    assert_eq!(runs(&OWN_VALUE), value, "a blur does not change the value");
}

static FORM_SUBMITTING: AtomicUsize = AtomicUsize::new(0);
static FORM_COUNT: AtomicUsize = AtomicUsize::new(0);
static FORM_DIRTY: AtomicUsize = AtomicUsize::new(0);
static FORM_CAN_SUBMIT: AtomicUsize = AtomicUsize::new(0);

#[component]
pub fn FormFlagsApp() -> impl IntoElement {
    let form = use_form(Pair::default());
    let email = field!(form, email);
    view()
        .child(text(move || {
            tick(&FORM_SUBMITTING);
            format!("submitting {}", form.is_submitting())
        }))
        .child(text(move || {
            tick(&FORM_COUNT);
            format!("count {}", form.submit_count())
        }))
        .child(text(move || {
            tick(&FORM_DIRTY);
            format!("form dirty {}", form.is_dirty())
        }))
        .child(text(move || {
            tick(&FORM_CAN_SUBMIT);
            format!("can submit {}", form.can_submit())
        }))
        .child(text(move || format!("value {}", email.value())))
        .child(email.bind(input().test_id("email")))
        .child(text("ready"))
}

#[test]
fn form_flags_wake_only_when_they_change() {
    let mut app = start(Root::of::<FormFlagsApp>());
    let (submitting, count, can_submit) = (
        runs(&FORM_SUBMITTING),
        runs(&FORM_COUNT),
        runs(&FORM_CAN_SUBMIT),
    );
    app.type_text("id:email", "a").unwrap();
    app.wait_for("text:form dirty true").unwrap();
    let dirty = runs(&FORM_DIRTY);
    app.type_text("id:email", "b").unwrap();
    app.wait_for("text:value ab").unwrap();
    assert_eq!(runs(&FORM_DIRTY), dirty, "already dirty, so no wake");
    assert_eq!(
        runs(&FORM_SUBMITTING),
        submitting,
        "typing is not submitting"
    );
    assert_eq!(runs(&FORM_COUNT), count, "typing is not a submit");
    assert_eq!(
        runs(&FORM_CAN_SUBMIT),
        can_submit,
        "can_submit did not change"
    );
}

static ARRAY_LEN: AtomicUsize = AtomicUsize::new(0);
static ARRAY_KEYS: AtomicUsize = AtomicUsize::new(0);
static ROW_ZERO: AtomicUsize = AtomicUsize::new(0);

#[component]
pub fn ArrayFlagsApp() -> impl IntoElement {
    let form = use_form(Pair {
        tags: vec!["a".to_owned(), "b".to_owned()],
        ..Pair::default()
    });
    let tags = array_field!(form, tags);
    let first = tags.item_field(0);
    let second = tags.item_field(1);
    view()
        .child(text(move || {
            tick(&ARRAY_LEN);
            format!("len {}", tags.len())
        }))
        .child(text(move || {
            tick(&ARRAY_KEYS);
            format!("keys {}", tags.keys().len())
        }))
        .child(text(move || {
            tick(&ROW_ZERO);
            format!("row zero {}", first.value())
        }))
        .child(text(move || format!("row one {}", second.value())))
        .child(text("edit one").on_press(move || second.set("z".to_owned())))
        .child(text("ready"))
}

#[test]
fn editing_one_row_does_not_wake_the_length_or_another_row() {
    let mut app = start(Root::of::<ArrayFlagsApp>());
    let (len, keys, row) = (runs(&ARRAY_LEN), runs(&ARRAY_KEYS), runs(&ROW_ZERO));
    app.press("text:edit one").unwrap();
    app.wait_for("text:row one z").unwrap();
    assert_eq!(runs(&ARRAY_LEN), len, "the length did not change");
    assert_eq!(runs(&ARRAY_KEYS), keys, "the keys did not change");
    assert_eq!(runs(&ROW_ZERO), row, "row zero did not change");
}
