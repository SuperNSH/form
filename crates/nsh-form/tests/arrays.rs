use std::time::{Duration, SystemTime};

use nsh_base::input;
use nsh_core::prelude::*;
use nsh_engine::{Clock, EngineConfig, Root};
use nsh_form::{BindField, ErrorMap, ValidationCause, array_field, use_form};
use nsh_testing::Headless;

fn start(root: Root) -> Headless {
    let mut config = EngineConfig::new(root);
    config.clock = Clock::manual(SystemTime::UNIX_EPOCH + Duration::from_secs(1_767_258_000));
    let mut app = Headless::start(config).unwrap();
    app.wait_for("text:ready").unwrap();
    app
}

#[derive(Clone, Debug, Default, PartialEq)]
struct Lists {
    tags: Vec<String>,
}

#[component]
pub fn ArrayOpsApp() -> impl IntoElement {
    let form = use_form(Lists::default());
    let tags = array_field!(form, tags);
    view()
        .child(text(move || {
            format!("[{}] len {}", tags.items().join(","), tags.len())
        }))
        .child(text(move || format!("empty {}", tags.is_empty())))
        .child(text("push a").on_press(move || tags.push_value("a".to_owned())))
        .child(text("push b").on_press(move || tags.push_value("b".to_owned())))
        .child(text("insert z").on_press(move || tags.insert_value(0, "z".to_owned())))
        .child(text("replace y").on_press(move || tags.replace_value(1, "y".to_owned())))
        .child(text("remove first").on_press(move || tags.remove_value(0)))
        .child(text("swap").on_press(move || tags.swap_values(0, 1)))
        .child(text("move").on_press(move || tags.move_value(0, 1)))
        .child(text("clear").on_press(move || tags.clear_values()))
        .child(text("ready"))
}

#[test]
fn array_push_insert_replace_remove_swap_move_clear() {
    let mut app = start(Root::of::<ArrayOpsApp>());
    app.press("text:push a").unwrap();
    app.wait_for("text:[a] len 1").unwrap();
    app.press("text:push b").unwrap();
    app.wait_for("text:[a,b] len 2").unwrap();
    app.press("text:insert z").unwrap();
    app.wait_for("text:[z,a,b] len 3").unwrap();
    app.press("text:replace y").unwrap();
    app.wait_for("text:[z,y,b] len 3").unwrap();
    app.press("text:remove first").unwrap();
    app.wait_for("text:[y,b] len 2").unwrap();
    app.press("text:swap").unwrap();
    app.wait_for("text:[b,y] len 2").unwrap();
    app.press("text:move").unwrap();
    app.wait_for("text:[y,b] len 2").unwrap();
    app.press("text:clear").unwrap();
    app.wait_for("text:[] len 0").unwrap();
    app.wait_for("text:empty true").unwrap();
}

#[component]
pub fn RowErrorsApp() -> impl IntoElement {
    let form = use_form(Lists {
        tags: vec!["a".to_owned(), "bb".to_owned(), "c".to_owned()],
    });
    let tags = array_field!(form, tags);
    let second = tags.item_field(1);
    let third = tags.item_field(2);
    third.set_error_map(ErrorMap::new().with(ValidationCause::Mount, "c is broken"));
    view()
        .child(text(move || format!("rows {}", tags.items().join(","))))
        .child(text(move || {
            format!("second {}", second.errors().join("|"))
        }))
        .child(text(move || format!("third {}", third.errors().join("|"))))
        .child(text("remove first").on_press(move || tags.remove_value(0)))
        .child(text("ready"))
}

#[test]
fn array_row_errors_stay_with_their_row_after_removal() {
    let mut app = start(Root::of::<RowErrorsApp>());
    app.wait_for("text:third c is broken").unwrap();
    app.press("text:remove first").unwrap();
    app.wait_for("text:rows bb,c").unwrap();
    assert!(app.shows("third c is broken"));
    assert!(!app.shows("second c is broken"));
}

#[component]
pub fn KeysApp() -> impl IntoElement {
    let form = use_form(Lists {
        tags: vec!["a".to_owned(), "b".to_owned(), "c".to_owned()],
    });
    let tags = array_field!(form, tags);
    view()
        .child(text(move || format!("keys {:?}", tags.keys())))
        .child(text("move first to last").on_press(move || tags.move_value(0, 2)))
        .child(text("ready"))
}

#[test]
fn array_keys_are_stable_through_moves() {
    let mut app = start(Root::of::<KeysApp>());
    app.wait_for("text:keys [0, 1, 2]").unwrap();
    app.press("text:move first to last").unwrap();
    app.wait_for("text:keys [1, 2, 0]").unwrap();
}

#[derive(Clone, Debug, Default, PartialEq)]
struct Item {
    name: String,
}

#[derive(Clone, Debug, Default, PartialEq)]
struct Shelf {
    items: Vec<Item>,
}

#[component]
pub fn RowPartApp() -> impl IntoElement {
    let form = use_form(Shelf {
        items: vec![Item {
            name: "first".to_owned(),
        }],
    });
    let items = array_field!(form, items);
    items.push_value(Item {
        name: "second".to_owned(),
    });
    let name = items.field_of(
        1,
        "name",
        |item: &Item| &item.name,
        |item: &mut Item| &mut item.name,
    );
    view()
        .child(name.bind(input().test_id("name")))
        .child(text(move || format!("name {}", name.value())))
        .child(text("ready"))
}

#[test]
fn row_field_reads_and_writes_one_part_of_a_row() {
    let mut app = start(Root::of::<RowPartApp>());
    app.wait_for("text:name second").unwrap();
    app.clear("id:name").unwrap();
    app.type_text("id:name", "third").unwrap();
    app.wait_for("text:name third").unwrap();
}

#[component]
pub fn RenderedRowsApp() -> impl IntoElement {
    let form = use_form(Lists {
        tags: vec!["a".to_owned(), "b".to_owned(), "c".to_owned()],
    });
    let tags = array_field!(form, tags);
    view()
        .child(each(
            move || tags.keys(),
            |key: &u64| *key,
            move |_key, index| {
                let row = tags.item_field(index.get_untracked());
                view()
                    .child(text(move || format!("row {}", row.value())))
                    .child(text(move || format!("touched {}", row.is_touched())))
                    .child(row.bind(input().test_id(&format!("row-{}", index.get_untracked()))))
            },
        ))
        .child(text("remove last").on_press(move || tags.remove_value(tags.len() - 1)))
        .child(text("remove first").on_press(move || tags.remove_value(0)))
        .child(text("clear").on_press(move || tags.clear_values()))
        .child(text("ready"))
}

#[test]
fn rows_rendered_in_each_outlive_a_removal_and_a_clear() {
    let mut app = start(Root::of::<RenderedRowsApp>());
    app.wait_for("text:row c").unwrap();
    app.press("text:remove last").unwrap();
    app.wait_for_gone("text:row c", Duration::from_secs(1))
        .unwrap();
    assert!(app.shows("row a") && app.shows("row b"));
    app.press("text:remove first").unwrap();
    app.wait_for_gone("text:row a", Duration::from_secs(1))
        .unwrap();
    assert!(app.shows("row b"));
    app.type_text("id:row-1", "!").unwrap();
    app.wait_for("text:row b!").unwrap();
    app.press("text:clear").unwrap();
    app.wait_for_gone("text:row b!", Duration::from_secs(1))
        .unwrap();
}
