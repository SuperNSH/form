//! Typed forms for Native Shell Rust apps. Values live in one struct, snapshot
//! dirty tracking and field paths come from `gpui-form`'s GPUI-free core, and
//! everything a screen reads is a signal, so its bindings update by themselves.

mod bind;
mod field;
mod form;
pub mod rules;

pub use bind::BindField;
pub use field::Field;
pub use form::{Form, SubmitError, use_form};
pub use gpui_form_core::FieldPath;

/// A field from a path of the form's value: `field!(form, address.city)`.
#[macro_export]
macro_rules! field {
    ($form:expr, $($segment:ident).+) => {
        $form.field(
            &[$(stringify!($segment)),+],
            |values| &values.$($segment).+,
            |values| &mut values.$($segment).+,
        )
    };
}
