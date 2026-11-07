//! One test per nsh-base value control, driven the way the TypeScript binding tests drive it: a
//! typed value, a press, a drag, or typing into the editor.

use std::time::{Duration, SystemTime};

use nsh_base::rich_editor::view::rich_editor;
use nsh_base::{
    ColorChannel, ColorSpace, calendar, color_picker, color_slider, date_picker, otp_input, radio,
    slider, time_field, toggle, toggle_group,
};
use nsh_base::{SliderValue, TimeOfDay};
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
    otp: Option<SharedString>,
    colors: Vec<SharedString>,
    size: SharedString,
    volume: Option<SliderValue>,
    day: nsh_base::Date,
    range: nsh_base::DateTime,
    time: Option<TimeOfDay>,
    swatch: Option<Hsla>,
    notes: Option<nsh_core::JsonValue>,
}

#[component]
pub fn OtpApp() -> impl IntoElement {
    let form = use_form(Controls::default());
    let otp = field!(form, otp);
    view()
        .child(
            view().child(
                otp.bind_otp_input(
                    otp_input()
                        .length(6u32)
                        .accessibility_label("Code")
                        .cell_style(|s| s.w(px(30.0)).h(px(40.0))),
                ),
            ),
        )
        .child(text(move || {
            format!(
                "otp {}",
                otp.value().map(|v| v.to_string()).unwrap_or_default()
            )
        }))
        .child(text("ready"))
}

#[test]
fn bind_otp_input_takes_typed_digits() {
    let mut app = start(Root::of::<OtpApp>());
    app.type_text("label:Code", "12").unwrap();
    app.wait_for("text:otp 12").unwrap();
}

#[component]
pub fn ToggleGroupApp() -> impl IntoElement {
    let form = use_form(Controls::default());
    let colors = field!(form, colors);
    view()
        .child(
            toggle_group()
                .child(colors.bind_toggle_item(
                    "red".into(),
                    toggle().accessibility_label("Red").child(text("Red")),
                ))
                .child(colors.bind_toggle_item(
                    "green".into(),
                    toggle().accessibility_label("Green").child(text("Green")),
                )),
        )
        .child(text(move || {
            format!(
                "colors {}",
                colors
                    .value()
                    .iter()
                    .map(|c| c.to_string())
                    .collect::<Vec<_>>()
                    .join(",")
            )
        }))
        .child(text("ready"))
}

#[test]
fn bind_toggle_item_each_item_toggles_its_own_value() {
    let mut app = start(Root::of::<ToggleGroupApp>());
    app.press("label:Red").unwrap();
    app.press("label:Green").unwrap();
    app.wait_for("text:colors red,green").unwrap();
    app.press("label:Red").unwrap();
    app.wait_for("text:colors green").unwrap();
}

#[component]
pub fn RadioApp() -> impl IntoElement {
    let form = use_form(Controls::default());
    let size = field!(form, size);
    view()
        .child(size.bind_radio(
            "s".into(),
            radio().accessibility_label("Small").child(text("Small")),
        ))
        .child(size.bind_radio(
            "l".into(),
            radio().accessibility_label("Large").child(text("Large")),
        ))
        .child(text(move || format!("size {}", size.value())))
        .child(text("ready"))
}

#[test]
fn bind_radio_pressing_a_radio_sets_its_option() {
    let mut app = start(Root::of::<RadioApp>());
    app.press("label:Large").unwrap();
    app.wait_for("text:size l").unwrap();
}

#[component]
pub fn SliderApp() -> impl IntoElement {
    let form = use_form(Controls {
        volume: Some(SliderValue::Single(40.0)),
        ..Controls::default()
    });
    let volume = field!(form, volume);
    view()
        .child(
            volume.bind_slider(
                slider()
                    .step(5.0)
                    .accessibility_label("Volume")
                    .track_style(|s| s.w(px(200.0)).h(px(20.0)).justify_center())
                    .indicator_style(|s| s.h(px(4.0)))
                    .thumb_style(|s| s.size(px(10.0))),
            ),
        )
        .child(text(move || format!("volume {:?}", volume.value())))
        .child(text("ready"))
}

#[test]
fn bind_slider_a_drag_changes_the_value() {
    let mut app = start(Root::of::<SliderApp>());
    app.wait_for("text:volume Some(Single(40.0))").unwrap();
    app.drag("label:Volume", nsh_core::Point::new(px(60.0), px(0.0)))
        .unwrap();
    app.wait_for_gone("text:volume Some(Single(40.0))", Duration::from_secs(5))
        .unwrap();
}

#[component]
pub fn CalendarApp() -> impl IntoElement {
    let form = use_form(Controls::default());
    let day = field!(form, day);
    view()
        .child(day.bind_calendar(calendar()))
        .child(text(move || format!("day {:?}", day.value())))
        .child(text("ready"))
}

#[test]
fn bind_calendar_a_press_on_a_day_sets_the_date() {
    let mut app = start(Root::of::<CalendarApp>());
    app.press("text:15 >> nth=0").unwrap();
    // The calendar opens on January 2026, so the day pressed is 15 January.
    app.wait_for_within("text:day Single(Some(2026-01-15))", Duration::from_secs(5))
        .unwrap();
}

#[component]
pub fn DatePickerApp() -> impl IntoElement {
    let form = use_form(Controls::default());
    let range = field!(form, range);
    view()
        .child(range.bind_date_picker(date_picker().range(true).trigger(text("Pick range"))))
        .child(text(move || match range.value() {
            nsh_base::DateTime::Range(Some(start), Some(end)) => {
                format!(
                    "range {} {}",
                    start.format("%Y-%m-%d"),
                    end.format("%Y-%m-%d")
                )
            }
            other => format!("range {other:?}"),
        }))
        .child(text("ready"))
}

#[test]
fn bind_date_picker_two_picks_set_the_range() {
    let mut app = start(Root::of::<DatePickerApp>());
    app.press("text:Pick range").unwrap();
    app.press("text:10 >> nth=0").unwrap();
    app.press("text:20 >> nth=0").unwrap();
    app.wait_for("text:range 2026-01-10 2026-01-20").unwrap();
}

#[component]
pub fn TimeApp() -> impl IntoElement {
    let form = use_form(Controls::default());
    let time = field!(form, time);
    view()
        .child(time.bind_time_field(time_field().accessibility_label("Time")))
        .child(text(move || format!("time {:?}", time.value())))
        .child(text("ready"))
}

#[test]
fn bind_time_field_typed_digits_set_the_time() {
    let mut app = start(Root::of::<TimeApp>());
    app.type_text("label:Time", "0930").unwrap();
    app.wait_for("text:time Some(TimeOfDay(09:30:00))").unwrap();
}

#[component]
pub fn ColorApp() -> impl IntoElement {
    let form = use_form(Controls::default());
    let swatch = field!(form, swatch);
    let hue = color_slider()
        .color_space(ColorSpace::Hsb)
        .channel(ColorChannel::Hue)
        .accessibility_label("Hue")
        .w(px(200.0))
        .h(px(20.0))
        .justify_center()
        .track_style(|s| s.h(px(10.0)))
        .thumb_style(|s| s.size(px(10.0)));
    view()
        .child(swatch.bind_color_picker(color_picker().child(hue)))
        .child(text(move || format!("swatch {:?}", swatch.value())))
        .child(text("ready"))
}

#[test]
fn bind_color_picker_a_hue_drag_changes_the_colour() {
    let mut app = start(Root::of::<ColorApp>());
    app.wait_for("text:swatch None").unwrap();
    app.drag("label:Hue", nsh_core::Point::new(px(60.0), px(0.0)))
        .unwrap();
    app.wait_for_gone("text:swatch None", Duration::from_secs(5))
        .unwrap();
}

#[component]
pub fn RichApp() -> impl IntoElement {
    let form = use_form(Controls::default());
    let notes = field!(form, notes);
    view()
        .child(
            view()
                .test_id("b-rich")
                .w(px(600.0))
                .h(px(400.0))
                .child(notes.bind_rich_editor(rich_editor())),
        )
        .child(text(move || format!("notes {}", notes.value().is_some())))
        .child(text("ready"))
}

#[test]
fn bind_rich_editor_typing_stores_the_document() {
    let mut app = start(Root::of::<RichApp>());
    app.type_text("id:b-rich", "hi").unwrap();
    app.wait_for("text:notes true").unwrap();
}
