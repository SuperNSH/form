use std::time::{Duration, SystemTime};

use nsh_base::{SelectEntry, SelectItem, checkbox, number_input, select, switch};
use nsh_core::prelude::*;
use nsh_engine::{Clock, EngineConfig, Root};
use nsh_form::{field, use_form};
use nsh_testing::Headless;

fn start(root: Root) -> Headless {
    let mut config = EngineConfig::new(root);
    config.clock = Clock::manual(SystemTime::UNIX_EPOCH + Duration::from_secs(1_767_258_000));
    let mut app = Headless::start(config).unwrap();
    app.wait_for("text:ready").unwrap();
    app
}

#[derive(Clone, Debug, Default, PartialEq)]
struct Settings {
    notify: bool,
    terms: bool,
    fruit: Option<SharedString>,
    count: Option<f64>,
}

#[component]
pub fn SwitchCheckboxApp() -> impl IntoElement {
    let form = use_form(Settings::default());
    let notify = field!(form, notify);
    let terms = field!(form, terms);
    view()
        .child(notify.bind_switch(switch().accessibility_label("Notify").child(text("Notify"))))
        .child(terms.bind_checkbox(checkbox().accessibility_label("Terms").child(text("Terms"))))
        .child(text(move || format!("notify {}", notify.value())))
        .child(text(move || format!("terms {}", terms.value())))
        .child(text("ready"))
}

#[test]
fn bind_switch_and_checkbox() {
    let mut app = start(Root::of::<SwitchCheckboxApp>());
    app.wait_for("text:notify false").unwrap();
    app.press("label:Notify").unwrap();
    app.wait_for("text:notify true").unwrap();
    app.press("label:Terms").unwrap();
    app.wait_for("text:terms true").unwrap();
}

#[component]
pub fn SelectApp() -> impl IntoElement {
    let form = use_form(Settings::default());
    let fruit = field!(form, fruit);
    view()
        .child(
            fruit.bind_select(
                select()
                    .items(vec![
                        SelectItem::new("apple", "Apple"),
                        SelectItem::new("pear", "Pear"),
                    ])
                    .trigger(
                        view()
                            .test_id("trigger")
                            .w(px(160.0))
                            .h(px(30.0))
                            .child(text("Pick")),
                    )
                    .render_item(|entry: &SelectEntry| text(entry.title.clone())),
            ),
        )
        .child(text(move || {
            format!(
                "fruit {}",
                fruit
                    .value()
                    .map(|name| name.to_string())
                    .unwrap_or_default()
            )
        }))
        .child(text("ready"))
}

#[test]
fn bind_select() {
    let mut app = start(Root::of::<SelectApp>());
    app.press("id:trigger").unwrap();
    app.press("text:Pear").unwrap();
    app.wait_for("text:fruit pear").unwrap();
}

#[component]
pub fn NumberApp() -> impl IntoElement {
    let form = use_form(Settings::default());
    let count = field!(form, count);
    view()
        .child(count.bind_number_input(number_input().accessibility_label("Count")))
        .child(text(move || {
            format!(
                "count {}",
                count.value().map(|n| n.to_string()).unwrap_or_default()
            )
        }))
        .child(text("ready"))
}

#[test]
fn bind_number_input_writes_the_number() {
    let mut app = start(Root::of::<NumberApp>());
    app.type_text("label:Count", "42").unwrap();
    app.wait_for("text:count 42").unwrap();
}
