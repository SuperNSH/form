//! Rules for `Field::rule`. Each returns the message when the value fails.

use std::fmt::Display;
use std::str::FromStr;

use gpui_form_core::numeric::{validate_signed_numeric, validate_unsigned_numeric};

/// Something a person left blank: empty after trimming, or `None`.
pub trait Blank {
    fn is_blank(&self) -> bool;
}

impl Blank for String {
    fn is_blank(&self) -> bool {
        self.trim().is_empty()
    }
}

impl<T> Blank for Option<T> {
    fn is_blank(&self) -> bool {
        self.is_none()
    }
}

impl<T> Blank for Vec<T> {
    fn is_blank(&self) -> bool {
        self.is_empty()
    }
}

pub fn required<T: Blank, H>(message: impl Display) -> impl Fn(&T, &H) -> Option<String> {
    let message = message.to_string();
    move |value, _| value.is_blank().then(|| message.clone())
}

/// Counts characters, not bytes. An empty value passes, so pair it with `required`.
pub fn min_length<H>(min: usize, message: impl Display) -> impl Fn(&String, &H) -> Option<String> {
    let message = message.to_string();
    move |value, _| (!value.is_empty() && value.chars().count() < min).then(|| message.clone())
}

pub fn max_length<H>(max: usize, message: impl Display) -> impl Fn(&String, &H) -> Option<String> {
    let message = message.to_string();
    move |value, _| (value.chars().count() > max).then(|| message.clone())
}

/// One `@` with something on both sides and a dot after it. A mail server decides
/// the rest. An empty value passes, so pair it with `required`.
pub fn email<H>(message: impl Display) -> impl Fn(&String, &H) -> Option<String> {
    let message = message.to_string();
    move |value, _| {
        if value.is_empty() {
            return None;
        }
        let valid = value.split_once('@').is_some_and(|(local, domain)| {
            !local.is_empty()
                && !domain.contains('@')
                && domain.split('.').count() >= 2
                && domain.split('.').all(|part| !part.is_empty())
        });
        (!valid).then(|| message.clone())
    }
}

/// The value must equal another value of the form, such as a password's confirmation.
pub fn matches<T: PartialEq, H>(
    other: fn(&H) -> &T,
    message: impl Display,
) -> impl Fn(&T, &H) -> Option<String> {
    let message = message.to_string();
    move |value, values| (value != other(values)).then(|| message.clone())
}

pub fn range<T: PartialOrd, H>(
    min: T,
    max: T,
    message: impl Display,
) -> impl Fn(&T, &H) -> Option<String> {
    let message = message.to_string();
    move |value, _| (*value < min || *value > max).then(|| message.clone())
}

/// Text that parses as `T`, signed or decimal, using gpui-form's numeric check.
pub fn signed_number<T: FromStr, H>(
    message: impl Display,
) -> impl Fn(&String, &H) -> Option<String> {
    let message = message.to_string();
    move |value, _| (!validate_signed_numeric::<T>(value, true)).then(|| message.clone())
}

/// Text that parses as an unsigned `T`, using gpui-form's numeric check.
pub fn unsigned_number<T: FromStr, H>(
    message: impl Display,
) -> impl Fn(&String, &H) -> Option<String> {
    let message = message.to_string();
    move |value, _| (!validate_unsigned_numeric::<T>(value, true)).then(|| message.clone())
}
