//! Tests for the bindings of nsh-base value controls: toggle, combobox and editor.

use std::time::{Duration, SystemTime};

use nsh_base::{SelectEntry, SelectItem, combobox, editor, toggle};
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
struct Controls {
    bold: bool,
    tags: Option<Vec<SharedString>>,
    code: Option<SharedString>,
}

#[component]
pub fn ToggleApp() -> impl IntoElement {
    let form = use_form(Controls::default());
    let bold = field!(form, bold);
    view()
        .child(bold.bind_toggle(toggle().accessibility_label("Bold").child(text("Bold"))))
        .child(text(move || format!("bold {}", bold.value())))
        .child(text("ready"))
}

#[test]
fn bind_toggle_follows_a_press() {
    let mut app = start(Root::of::<ToggleApp>());
    app.wait_for("text:bold false").unwrap();
    app.press("label:Bold").unwrap();
    app.wait_for("text:bold true").unwrap();
}

#[component]
pub fn ComboApp() -> impl IntoElement {
    let form = use_form(Controls::default());
    let tags = field!(form, tags);
    view()
        .child(
            tags.bind_combobox(
                combobox()
                    .items(vec![
                        SelectItem::new("rust", "Rust"),
                        SelectItem::new("swift", "Swift"),
                    ])
                    .multiple(true)
                    .accessibility_label("Tags")
                    .trigger_button(text("Pick"))
                    .render_item(|entry: &SelectEntry| text(entry.title.clone())),
            ),
        )
        .child(text(move || {
            let chosen: Vec<String> = tags
                .value()
                .unwrap_or_default()
                .iter()
                .map(|tag| tag.to_string())
                .collect();
            format!("tags {}", chosen.join(","))
        }))
        .child(text("ready"))
}

#[test]
fn bind_combobox_follows_a_chosen_item() {
    let mut app = start(Root::of::<ComboApp>());
    app.press("text:Pick").unwrap();
    app.press("role:option[Swift]").unwrap();
    app.wait_for("text:tags swift").unwrap();
}

#[component]
pub fn EditorApp() -> impl IntoElement {
    let form = use_form(Controls::default());
    let code = field!(form, code);
    view()
        .child(
            view()
                .test_id("code")
                .w(px(600.0))
                .h(px(400.0))
                .child(code.bind_editor(editor())),
        )
        .child(text(move || {
            format!(
                "code {}",
                code.value().map(|v| v.to_string()).unwrap_or_default()
            )
        }))
        .child(text("ready"))
}

#[test]
fn bind_editor_follows_typed_text() {
    let mut app = start(Root::of::<EditorApp>());
    app.type_text("id:code", "let x").unwrap();
    app.wait_for("text:code let x").unwrap();
}
