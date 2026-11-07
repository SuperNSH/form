//! Tests for the gpui-form names the finish brief lists: the url, slug, uuid and required_when
//! rules, changed paths, the submit tracker's error accessors, diagnostics, and the optional
//! phone and persist features.

use std::time::{Duration, SystemTime};

use nsh_base::input;
use nsh_core::prelude::*;
use nsh_engine::{Clock, EngineConfig, Root};
use nsh_form::{BindField, SubmitError, field, rules, use_form};
#[cfg(feature = "persist")]
use nsh_form::{FormOptions, use_form_with};
use nsh_testing::Headless;

fn start(root: Root) -> Headless {
    let mut config = EngineConfig::new(root);
    config.clock = Clock::manual(SystemTime::UNIX_EPOCH + Duration::from_secs(1_767_258_000));
    let mut app = Headless::start(config).unwrap();
    app.wait_for("text:ready").unwrap();
    app
}

#[derive(Clone, Debug, Default, PartialEq)]
#[cfg_attr(feature = "persist", derive(serde::Serialize, serde::Deserialize))]
struct Site {
    url: String,
    slug: String,
    uuid: String,
    newsletter: bool,
    email: String,
}

#[component]
pub fn RulesApp() -> impl IntoElement {
    let form = use_form(Site::default());
    let url = field!(form, url).rule(rules::url::<Site>("bad url"));
    let slug = field!(form, slug).rule(rules::slug::<Site>("bad slug"));
    let uuid = field!(form, uuid).rule(rules::uuid::<Site>("bad uuid"));
    let newsletter = field!(form, newsletter);
    let email = field!(form, email).rule(rules::required_when::<String, Site>(
        |site| site.newsletter,
        "email needed",
    ));
    view()
        .child(url.bind(input().test_id("url")))
        .child(slug.bind(input().test_id("slug")))
        .child(uuid.bind(input().test_id("uuid")))
        .child(email.bind(input().test_id("email")))
        .child(text(move || format!("url {}", url.errors().join("|"))))
        .child(text(move || format!("slug {}", slug.errors().join("|"))))
        .child(text(move || format!("uuid {}", uuid.errors().join("|"))))
        .child(text(move || format!("email {}", email.errors().join("|"))))
        .child(text(move || {
            format!("changed {}", form.changed_paths().len())
        }))
        .child(text(move || {
            format!(
                "diag {} {}",
                form.diagnostics().field_paths.len(),
                form.diagnostics().changed_paths.len()
            )
        }))
        .child(text("newsletter on").on_press(move || newsletter.set_value(true)))
        .child(text("check").on_press(move || {
            form.validate_all_fields(nsh_form::ValidationCause::Submit);
        }))
        .child(text("ready"))
}

#[test]
fn url_slug_uuid_and_required_when_report_their_messages() {
    let mut app = start(Root::of::<RulesApp>());
    app.type_text("id:url", "nope").unwrap();
    app.wait_for("text:url bad url").unwrap();
    app.clear("id:url").unwrap();
    app.type_text("id:url", "https://example.com/a").unwrap();
    app.run_for(Duration::from_millis(1)).unwrap();
    assert!(!app.shows("url bad url"));
    app.type_text("id:slug", "Bad_slug").unwrap();
    app.wait_for("text:slug bad slug").unwrap();
    app.type_text("id:uuid", "not-a-uuid").unwrap();
    app.wait_for("text:uuid bad uuid").unwrap();
    app.press("text:check").unwrap();
    app.run_for(Duration::from_millis(1)).unwrap();
    assert!(!app.shows("email email needed"));
    app.press("text:newsletter on").unwrap();
    app.press("text:check").unwrap();
    app.wait_for("text:email email needed").unwrap();
}

#[test]
fn changed_paths_list_only_the_fields_that_differ_from_the_baseline() {
    let mut app = start(Root::of::<RulesApp>());
    app.wait_for("text:changed 0").unwrap();
    app.type_text("id:slug", "ok").unwrap();
    app.wait_for("text:changed 1").unwrap();
    app.wait_for("text:diag 5 1").unwrap();
}

#[component]
pub fn TrackerApp() -> impl IntoElement {
    let form = use_form(Site::default());
    view()
        .child(text(move || {
            format!(
                "last {}",
                form.last_error()
                    .and_then(|error| error.form)
                    .unwrap_or_else(|| "none".to_owned())
            )
        }))
        .child(text("set").on_press(move || form.set_error(SubmitError::form("boom"))))
        .child(text("take").on_press(move || {
            let taken = form
                .take_last_error()
                .and_then(|error| error.form)
                .unwrap_or_default();
            let _ = taken;
        }))
        .child(text("clear").on_press(move || form.clear_error()))
        .child(text(move || {
            format!(
                "form error {}",
                form.error().unwrap_or_else(|| "none".to_owned())
            )
        }))
        .child(text("ready"))
}

#[test]
fn submit_tracker_accessors_set_take_and_clear_the_error() {
    let mut app = start(Root::of::<TrackerApp>());
    app.press("text:set").unwrap();
    app.wait_for("text:last boom").unwrap();
    app.wait_for("text:form error boom").unwrap();
    app.press("text:take").unwrap();
    app.wait_for("text:last none").unwrap();
    app.press("text:set").unwrap();
    app.press("text:clear").unwrap();
    app.wait_for("text:form error none").unwrap();
}

#[cfg(feature = "phone")]
#[component]
pub fn PhoneApp() -> impl IntoElement {
    let form = use_form(Site::default());
    let email = field!(form, email).rule(rules::phone::<Site>("bad phone"));
    view()
        .child(email.bind(input().test_id("email")))
        .child(text(move || format!("phone {}", email.errors().join("|"))))
        .child(text("ready"))
}

#[cfg(feature = "phone")]
#[test]
fn phone_rule_uses_gpui_forms_phone_check() {
    let mut app = start(Root::of::<PhoneApp>());
    app.type_text("id:email", "not a phone").unwrap();
    app.wait_for("text:phone bad phone").unwrap();
    app.clear("id:email").unwrap();
    app.type_text("id:email", "+14155552671").unwrap();
    app.wait_for("text:phone ").unwrap();
    assert!(!app.shows("phone bad phone"));
}

#[cfg(feature = "persist")]
static STORED: std::sync::Mutex<String> = std::sync::Mutex::new(String::new());

#[cfg(feature = "persist")]
#[component]
pub fn PersistApp() -> impl IntoElement {
    // The saved value is seeded here, as a previous run would have left it.
    let _ = nsh_core::storage::Storage::set_item(
        "gpui-form-persist-test",
        "{\"url\":\"https://seeded.example\",\"slug\":\"\",\"uuid\":\"\",\"newsletter\":false,\"email\":\"\"}",
    );
    let form = use_form_with(FormOptions::new(Site::default()).persist("gpui-form-persist-test"));
    let url = field!(form, url);
    view()
        .child(url.bind(input().test_id("url")))
        .child(text(move || format!("url {}", url.value())))
        // Reads the stored copy on press, after the debounced save has run.
        .child(text("check").on_press(move || {
            *STORED.lock().unwrap() =
                nsh_core::storage::Storage::get_item("gpui-form-persist-test").unwrap_or_default();
        }))
        .child(text("ready"))
}

#[cfg(feature = "persist")]
#[test]
fn persist_restores_saved_values_and_saves_changes() {
    let mut app = start(Root::of::<PersistApp>());
    app.wait_for("text:url https://seeded.example").unwrap();
    app.clear("id:url").unwrap();
    app.type_text("id:url", "https://typed.example").unwrap();
    app.run_for(Duration::from_millis(400)).unwrap();
    app.press("text:check").unwrap();
    assert!(STORED.lock().unwrap().contains("https://typed.example"));
}

#[cfg(feature = "persist")]
static WRITES: std::sync::Mutex<usize> = std::sync::Mutex::new(0);

#[cfg(feature = "persist")]
const DEBOUNCE_KEY: &str = "gpui-form-debounce-test";

#[cfg(feature = "persist")]
#[component]
pub fn DebounceApp() -> impl IntoElement {
    const KEY: &str = DEBOUNCE_KEY;
    // Starts empty, as a first run would.
    let _ = nsh_core::storage::Storage::set_item(
        KEY,
        "{\"url\":\"\",\"slug\":\"\",\"uuid\":\"\",\"newsletter\":false,\"email\":\"\"}",
    );
    let form = use_form_with(
        FormOptions::new(Site::default())
            .persist(KEY)
            .persist_debounce(Duration::from_millis(300)),
    );
    let email = field!(form, email);
    view()
        .child(email.bind(input().test_id("email")))
        .child(text(move || format!("email {}", email.value())))
        .child(text("save").on_press(move || form.save_values()))
        .child(text("restore").on_press(move || form.restore_values()))
        .child(text("forget").on_press(move || nsh_core::storage::Storage::remove_item(KEY)))
        .child(text("check").on_press(move || {
            *STORED.lock().unwrap() = nsh_core::storage::Storage::get_item(KEY).unwrap_or_default();
        }))
        .child(text("count").on_press(move || {
            *WRITES.lock().unwrap() = form.diagnostics().persist_writes;
        }))
        .child(text("ready"))
}

#[cfg(feature = "persist")]
#[test]
fn persist_debounce_writes_once_and_save_and_restore_hold() {
    let writes = || *WRITES.lock().unwrap();
    let mut app = start(Root::of::<DebounceApp>());
    app.wait_for("text:email ").unwrap();

    // A burst of edits with no time between them writes once, after the debounce.
    app.type_text("id:email", "abc").unwrap();
    app.wait_for("text:email abc").unwrap();
    app.press("text:count").unwrap();
    assert_eq!(writes(), 0, "nothing written before the debounce ends");
    app.run_for(Duration::from_millis(400)).unwrap();
    app.press("text:count").unwrap();
    assert_eq!(writes(), 1, "the burst writes once");

    // Save writes now, without waiting for the debounce.
    app.type_text("id:email", "d").unwrap();
    app.press("text:save").unwrap();
    app.press("text:count").unwrap();
    assert_eq!(writes(), 2, "save writes at once");

    // A pending save is dropped by restore, so the saved value comes back and stays.
    app.type_text("id:email", "e").unwrap();
    app.press("text:restore").unwrap();
    app.wait_for("text:email abcd").unwrap();
    app.run_for(Duration::from_millis(400)).unwrap();
    app.press("text:count").unwrap();
    assert_eq!(writes(), 2, "the stale save did not write");

    // With nothing saved, restore keeps the values but still drops the pending save.
    app.press("text:forget").unwrap();
    app.type_text("id:email", "x").unwrap();
    app.press("text:restore").unwrap();
    app.run_for(Duration::from_millis(400)).unwrap();
    app.press("text:count").unwrap();
    assert_eq!(
        writes(),
        2,
        "a pending save is dropped when nothing is saved"
    );
    app.press("text:check").unwrap();
    assert!(STORED.lock().unwrap().is_empty(), "nothing was written");
}

#[cfg(feature = "persist")]
const GONE_KEY: &str = "gpui-form-gone-test";

#[cfg(feature = "persist")]
fn gone_form() -> impl IntoElement {
    let form = use_form_with(
        FormOptions::new(Site::default())
            .persist(GONE_KEY)
            .persist_debounce(Duration::from_millis(300)),
    );
    let email = field!(form, email);
    email.bind(input().test_id("email"))
}

#[cfg(feature = "persist")]
#[component]
pub fn GoneApp() -> impl IntoElement {
    nsh_core::storage::Storage::remove_item(GONE_KEY);
    let shown = signal(true);
    let stored = signal(String::new());
    view()
        .child(when(move || shown.get(), gone_form))
        .child(text("hide").on_press(move || shown.set(false)))
        .child(text("check").on_press(move || {
            let saved = nsh_core::storage::Storage::get_item(GONE_KEY);
            stored.set(saved.unwrap_or_else(|| "none".to_owned()));
        }))
        .child(text(move || format!("stored {}", stored.get())))
        .child(text("ready"))
}

#[cfg(feature = "persist")]
#[test]
fn a_pending_save_is_dropped_when_the_form_goes() {
    let mut app = start(Root::of::<GoneApp>());
    app.type_text("id:email", "abc").unwrap();
    app.press("text:hide").unwrap();
    app.run_for(Duration::from_millis(400)).unwrap();
    app.press("text:check").unwrap();
    app.wait_for("text:stored none").unwrap();
}
