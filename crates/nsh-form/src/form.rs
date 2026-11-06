use std::future::Future;
use std::rc::Rc;

use gpui_form_core::{FieldPath, FormState};
use nsh_core::prelude::*;

use crate::field::{AnyField, Field};

/// What a failed submit reports: a message for the form, and messages for fields.
#[derive(Clone, Debug, Default, PartialEq)]
pub struct SubmitError {
    pub form: Option<String>,
    pub fields: Vec<(String, String)>,
}

impl SubmitError {
    /// A message for the form as a whole.
    pub fn form(message: impl Into<String>) -> Self {
        Self {
            form: Some(message.into()),
            fields: Vec::new(),
        }
    }

    /// A message for one field, named by its path: `"address.city"`.
    pub fn field(path: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            form: None,
            fields: vec![(path.into(), message.into())],
        }
    }

    /// Adds a message for another field.
    pub fn and_field(mut self, path: impl Into<String>, message: impl Into<String>) -> Self {
        self.fields.push((path.into(), message.into()));
        self
    }
}

/// A form over the value type `H`. `Copy`; reads are tracked. Owned by the
/// component that made it.
pub struct Form<H: 'static> {
    pub(crate) state: Stored<FormState<H>>,
    pub(crate) version: Signal<u64>,
    pub(crate) submitted: Signal<bool>,
    fields: Stored<Vec<Rc<dyn AnyField>>>,
    submitting: Signal<bool>,
    submit_count: Signal<u32>,
    form_error: Signal<Option<String>>,
}

impl<H> Clone for Form<H> {
    fn clone(&self) -> Self {
        *self
    }
}

impl<H> Copy for Form<H> {}

/// A form starting from `initial`, which is also the baseline for dirty tracking.
pub fn use_form<H: Clone + PartialEq + 'static>(initial: H) -> Form<H> {
    Form {
        state: stored(FormState::new(initial)),
        version: signal(0),
        submitted: signal(false),
        fields: stored(Vec::new()),
        submitting: signal(false),
        submit_count: signal(0),
        form_error: signal(None),
    }
}

impl<H: Clone + PartialEq + 'static> Form<H> {
    /// Registers a field. Prefer the [`crate::field!`] macro, which writes this call.
    pub fn field<T: Clone + PartialEq + 'static>(
        &self,
        path: &[&'static str],
        get: fn(&H) -> &T,
        get_mut: fn(&mut H) -> &mut T,
    ) -> Field<H, T> {
        let field = Field::new(*self, FieldPath::new(path), get, get_mut);
        self.fields.with(|fields| fields.push(Rc::new(field)));
        field
    }

    pub(crate) fn touch_version(&self) {
        self.version.update(|v| *v = v.wrapping_add(1));
    }

    /// The current values. Tracked.
    pub fn values(&self) -> H {
        self.version.get();
        self.state.with(|s| s.current().clone())
    }

    pub fn values_untracked(&self) -> H {
        self.state.with(|s| s.current().clone())
    }

    /// Replaces every value at once and clears errors. The baseline stays.
    pub fn set_values(&self, values: H) {
        self.state.with(|s| s.replace_current(values));
        self.clear_feedback();
        self.touch_version();
    }

    /// Whether the values differ from the baseline.
    pub fn is_dirty(&self) -> bool {
        self.version.get();
        self.state.with(|s| s.is_dirty())
    }

    /// Whether no field reports an error, shown or not, and none is still validating.
    pub fn is_valid(&self) -> bool {
        self.fields
            .with(|f| f.clone())
            .iter()
            .all(|field| field.is_clean())
    }

    pub fn is_submitting(&self) -> bool {
        self.submitting.get()
    }

    pub fn submit_count(&self) -> u32 {
        self.submit_count.get()
    }

    /// The form-level message from the last submit.
    pub fn error(&self) -> Option<String> {
        self.form_error.get()
    }

    fn clear_feedback(&self) {
        for field in self.fields.with(|f| f.clone()) {
            field.clear();
        }
        self.submitted.set(false);
        self.form_error.set(None);
    }

    /// Back to the baseline, with errors and touched flags cleared.
    pub fn reset(&self) {
        self.state.with(FormState::reset_to_baseline);
        self.clear_feedback();
        self.touch_version();
    }

    /// Makes the current values the baseline, so the form reads clean. A
    /// successful submit does this for you.
    pub fn mark_saved(&self) {
        self.state.with(FormState::sync_baseline);
        self.touch_version();
    }

    /// Replaces values and baseline, for data that loaded after the form was made.
    pub fn load(&self, values: H) {
        self.state.with(|s| *s = FormState::new(values));
        self.clear_feedback();
        self.touch_version();
    }

    /// Shows every field's error, focuses the first invalid field that has a
    /// bound input, and says whether the form is valid.
    pub fn validate(&self) -> bool {
        self.submitted.set(true);
        let fields = self.fields.with(|f| f.clone());
        let first_invalid = fields.iter().find(|field| !untracked(|| field.is_clean()));
        match first_invalid {
            Some(field) => {
                field.focus();
                false
            }
            None => true,
        }
    }

    /// Validates, then runs `save` with the values. Does nothing while a submit
    /// runs. On success the values become the baseline; on failure the errors
    /// show on their fields, cleared when the user edits that field.
    pub fn submit<F, Fut>(&self, save: F)
    where
        F: FnOnce(H) -> Fut + 'static,
        Fut: Future<Output = Result<(), SubmitError>> + 'static,
    {
        if self.submitting.get_untracked() {
            return;
        }
        self.submit_count.update(|n| *n += 1);
        self.form_error.set(None);
        if !self.validate() {
            return;
        }
        self.submitting.set(true);
        let form = *self;
        let values = self.values_untracked();
        spawn(async move {
            match save(values).await {
                Ok(()) => form.mark_saved(),
                Err(error) => {
                    form.form_error.set(error.form);
                    let fields = form.fields.with(|f| f.clone());
                    for (path, message) in error.fields {
                        if let Some(field) = fields.iter().find(|f| f.path().to_string() == path) {
                            field.set_server_error(message);
                        }
                    }
                }
            }
            form.submitting.set(false);
        });
    }
}
