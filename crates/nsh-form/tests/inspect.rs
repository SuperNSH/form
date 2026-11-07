//! Tests for the registration and validation reads: getInfo, getLinkedFields,
//! validationMetaMap, fieldMetaBase and getFieldInfo.

use std::time::{Duration, SystemTime};

use nsh_base::input;
use nsh_core::prelude::*;
use nsh_engine::{Clock, EngineConfig, Root};
use nsh_form::{BindField, FieldValidators, ValidationCause, field, use_form};
use nsh_testing::Headless;

fn start(root: Root) -> Headless {
    let mut config = EngineConfig::new(root);
    config.clock = Clock::manual(SystemTime::UNIX_EPOCH + Duration::from_secs(1_767_258_000));
    let mut app = Headless::start(config).unwrap();
    app.wait_for("text:ready").unwrap();
    app
}

#[derive(Clone, Debug, Default, PartialEq)]
struct Pair {
    password: String,
    confirm: String,
}

#[component]
pub fn InspectApp() -> impl IntoElement {
    let form = use_form(Pair::default());
    let password = field!(form, password).on_change_async(|_: String| async {
        timer(Duration::from_millis(300)).await;
        None
    });
    let confirm =
        field!(form, confirm).validators(FieldValidators::new().on_change_listen_to(&["password"]));
    let linked = password.get_linked_fields(ValidationCause::Change);
    view()
        .child(password.bind(input().test_id("password")))
        .child(confirm.bind(input().test_id("confirm")))
        .child(text(move || {
            format!(
                "pending {}",
                password
                    .get_info()
                    .validation
                    .is_pending(ValidationCause::Change)
            )
        }))
        .child(text(move || {
            format!(
                "linked {}",
                linked
                    .iter()
                    .map(|path| path.to_string())
                    .collect::<Vec<_>>()
                    .join(",")
            )
        }))
        .child(text(move || {
            let info = form.get_field_info(&password.path()).unwrap();
            format!(
                "registered {} dirty {}",
                info.registered,
                password.meta_base().is_dirty
            )
        }))
        .child(text("ready"))
}

#[test]
fn inspection_reads_report_pending_linked_and_base_state() {
    let mut app = start(Root::of::<InspectApp>());
    app.wait_for("text:linked confirm").unwrap();
    app.wait_for("text:registered true dirty false").unwrap();
    app.type_text("id:password", "a").unwrap();
    app.wait_for("text:pending true").unwrap();
    app.wait_for("text:registered true dirty true").unwrap();
    app.run_for(Duration::from_millis(300)).unwrap();
    app.wait_for("text:pending false").unwrap();
}
