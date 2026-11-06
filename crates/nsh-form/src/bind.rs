use nsh_base::Input;
use nsh_core::prelude::*;

use crate::field::Field;

/// Connects a field to a text input: its value, edits, blur and the focus a
/// failed submit moves to it.
pub trait BindField {
    fn bind(self, input: Input) -> Input;
}

impl<H: Clone + PartialEq + 'static> BindField for Field<H, String> {
    fn bind(self, input: Input) -> Input {
        let reference = element_ref();
        self.input.replace(Some(reference));
        input
            .element_ref(&reference)
            .value(move || self.value())
            .on_change(move |text: &str| self.set(text.to_owned()))
            .on_blur(move || self.blur())
    }
}
