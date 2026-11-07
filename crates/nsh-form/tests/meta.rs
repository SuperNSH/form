use std::time::{Duration, SystemTime};

use nsh_base::input;
use nsh_core::prelude::*;
use nsh_engine::{Clock, EngineConfig, Root};
use nsh_form::{BindField, field, use_form};
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
    name: String,
}

#[component]
pub fn MetaApp() -> impl IntoElement {
    let form = use_form(Account::default());
    let name = field!(form, name);
    view()
        .child(name.bind(input().test_id("name")))
        .child(text(move || format!("touched {}", name.is_touched())))
        .child(text(move || format!("blurred {}", name.is_blurred())))
        .child(text(move || format!("pristine {}", name.is_pristine())))
        .child(text(move || format!("changed {}", name.was_changed())))
        .child(text(move || format!("default {}", name.is_default_value())))
        .child(text("blur").on_press(move || name.handle_blur()))
        .child(text("rebase").on_press(move || {
            form.reset_with(Account {
                name: "a".to_owned(),
            })
        }))
        .child(text("ready"))
}

#[test]
fn field_meta_tracks_touched_blurred_pristine_changed() {
    let mut app = start(Root::of::<MetaApp>());
    assert!(app.shows("touched false"));
    assert!(app.shows("blurred false"));
    assert!(app.shows("pristine true"));
    app.type_text("id:name", "a").unwrap();
    app.wait_for("text:pristine false").unwrap();
    assert!(app.shows("touched true"));
    assert!(app.shows("changed true"));
    assert!(app.shows("blurred false"));
    app.press("text:blur").unwrap();
    app.wait_for("text:blurred true").unwrap();
}

#[test]
fn was_changed_stays_true_after_returning_to_default() {
    let mut app = start(Root::of::<MetaApp>());
    app.type_text("id:name", "a").unwrap();
    app.wait_for("text:default false").unwrap();
    app.clear("id:name").unwrap();
    app.wait_for("text:default true").unwrap();
    assert!(app.shows("changed true"));
    assert!(app.shows("pristine false"));
}

#[test]
fn is_default_value_follows_the_baseline() {
    let mut app = start(Root::of::<MetaApp>());
    app.type_text("id:name", "b").unwrap();
    app.wait_for("text:default false").unwrap();
    app.press("text:rebase").unwrap();
    app.wait_for("text:default true").unwrap();
    app.type_text("id:name", "ab").unwrap();
    app.wait_for("text:default false").unwrap();
}
