use std::future::Future;
use std::pin::Pin;
use std::rc::Rc;
use std::time::Duration;

use gpui_form_core::FieldPath;
use nsh_core::prelude::*;

use crate::form::Form;

type Rule<H, T> = Rc<dyn Fn(&T, &H) -> Option<String>>;
type AsyncRule<T> = Rc<dyn Fn(T) -> Pin<Box<dyn Future<Output = Option<String>>>>>;

pub(crate) trait AnyField {
    fn path(&self) -> FieldPath;
    fn is_clean(&self) -> bool;
    fn clear(&self);
    fn focus(&self);
    fn set_server_error(&self, message: String);
}

/// One value of a form. `Copy`; reads are tracked. Call `field!(form, name)` to
/// make one in the component that shows it.
pub struct Field<H: 'static, T: 'static> {
    form: Form<H>,
    path: Stored<FieldPath>,
    get: fn(&H) -> &T,
    get_mut: fn(&mut H) -> &mut T,
    rules: Stored<Vec<Rule<H, T>>>,
    async_rule: Stored<Option<(Duration, AsyncRule<T>)>>,
    pending: Stored<Option<Spawned<()>>>,
    generation: Stored<u64>,
    touched: Signal<bool>,
    server_error: Signal<Option<String>>,
    async_error: Signal<Option<String>>,
    validating: Signal<bool>,
    pub(crate) input: Stored<Option<ElementRef>>,
}

impl<H, T> Clone for Field<H, T> {
    fn clone(&self) -> Self {
        *self
    }
}

impl<H, T> Copy for Field<H, T> {}

impl<H: Clone + PartialEq + 'static, T: Clone + PartialEq + 'static> Field<H, T> {
    pub(crate) fn new(
        form: Form<H>,
        path: FieldPath,
        get: fn(&H) -> &T,
        get_mut: fn(&mut H) -> &mut T,
    ) -> Self {
        Self {
            form,
            path: stored(path),
            get,
            get_mut,
            rules: stored(Vec::new()),
            async_rule: stored(None),
            pending: stored(None),
            generation: stored(0),
            touched: signal(false),
            server_error: signal(None),
            async_error: signal(None),
            validating: signal(false),
            input: stored(None),
        }
    }

    /// Adds a rule. The first one that fails gives the field's error. A rule sees
    /// the whole form, so "must match the password" works.
    pub fn rule(self, rule: impl Fn(&T, &H) -> Option<String> + 'static) -> Self {
        self.rules.with(|rules| rules.push(Rc::new(rule)));
        self
    }

    /// Adds a check that runs `debounce` after the last edit, once the sync rules
    /// pass. A newer edit drops an older answer.
    pub fn async_rule<Fut>(self, debounce: Duration, rule: impl Fn(T) -> Fut + 'static) -> Self
    where
        Fut: Future<Output = Option<String>> + 'static,
    {
        self.async_rule
            .with(|slot| *slot = Some((debounce, Rc::new(move |value| Box::pin(rule(value))))));
        self
    }

    pub fn path(&self) -> FieldPath {
        self.path.get()
    }

    /// The value. Tracked.
    pub fn value(&self) -> T {
        self.form.version.get();
        self.form.state.with(|s| (self.get)(s.current()).clone())
    }

    pub fn value_untracked(&self) -> T {
        self.form.state.with(|s| (self.get)(s.current()).clone())
    }

    /// Sets the value and clears an error the server gave this field.
    pub fn set(&self, value: T) {
        if self.form.state.with(|s| (self.get)(s.current()) == &value) {
            return;
        }
        self.form
            .state
            .with(|s| *(self.get_mut)(s.current_mut()) = value);
        self.server_error.set(None);
        self.form.touch_version();
        self.schedule_async_rule();
    }

    fn sync_error(&self) -> Option<String> {
        self.form.version.get();
        let rules = self.rules.get();
        self.form.state.with(|s| {
            let values = s.current();
            rules
                .iter()
                .find_map(|rule| rule((self.get)(values), values))
        })
    }

    fn schedule_async_rule(&self) {
        let Some((debounce, rule)) = self.async_rule.with(|slot| slot.clone()) else {
            return;
        };
        self.async_error.set(None);
        let generation = self.generation.with(|g| {
            *g += 1;
            *g
        });
        if let Some(previous) = self.pending.replace(None) {
            previous.cancel();
        }
        if untracked(|| self.sync_error()).is_some() {
            self.validating.set(false);
            return;
        }
        self.validating.set(true);
        let field = *self;
        let value = self.value_untracked();
        let task = spawn(async move {
            timer(debounce).await;
            let answer = rule(value).await;
            if field.generation.get() == generation {
                field.async_error.set(answer);
                field.validating.set(false);
            }
        });
        self.pending.replace(Some(task));
    }

    /// The message to show: the first failing rule, once the user has left the
    /// field or tried to submit, or an error the server gave.
    pub fn error(&self) -> Option<String> {
        if let Some(message) = self.server_error.get() {
            return Some(message);
        }
        if !self.touched.get() && !self.form.submitted.get() {
            return None;
        }
        self.sync_error().or_else(|| self.async_error.get())
    }

    pub fn touched(&self) -> bool {
        self.touched.get()
    }

    /// Whether this value differs from the baseline.
    pub fn dirty(&self) -> bool {
        self.form.version.get();
        self.form
            .state
            .with(|s| (self.get)(s.current()) != (self.get)(s.baseline()))
    }

    /// Whether an async rule is running or waiting for its debounce.
    pub fn is_validating(&self) -> bool {
        self.validating.get()
    }

    /// Marks the field as visited, which lets its error show.
    pub fn blur(&self) {
        self.touched.set(true);
    }
}

impl<H: Clone + PartialEq + 'static, T: Clone + PartialEq + 'static> AnyField for Field<H, T> {
    fn path(&self) -> FieldPath {
        self.path.get()
    }

    fn is_clean(&self) -> bool {
        self.server_error.get().is_none()
            && self.sync_error().is_none()
            && self.async_error.get().is_none()
            && !self.validating.get()
    }

    fn clear(&self) {
        self.generation.with(|g| *g += 1);
        if let Some(previous) = self.pending.replace(None) {
            previous.cancel();
        }
        self.touched.set(false);
        self.server_error.set(None);
        self.async_error.set(None);
        self.validating.set(false);
    }

    fn focus(&self) {
        if let Some(input) = self.input.get() {
            input.focus();
        }
    }

    fn set_server_error(&self, message: String) {
        self.server_error.set(Some(message));
    }
}
