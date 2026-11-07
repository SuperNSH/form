# nsh-form

Forms for [Native Shell](https://nsh.dev) apps, based on [TanStack Form](https://tanstack.com/form/latest). If you know TanStack Form, you already know the names and how they behave, so its documentation is the main reference. NSH has no styled components, so this library owns behavior and your UI module owns the look.

There are two versions:

| Version | Path | What it is | For |
|---|---|---|---|
| TypeScript package | `packages/nsh-form` | `@tanstack/form-core` 1.33.5, unchanged, with a thin NSH adapter | TSX apps, signed packages, anything with no Rust crate |
| Rust crate | `crates/nsh-form` | A hand-written port of TanStack Form's behavior, in snake_case | Rust and Rust-with-TSX apps |

## Why two versions

TSX runs on NSH's prebuilt runtime in QuickJS, and TanStack's JavaScript core runs there unmodified. The TypeScript package adds only what NSH needs: signals, components, and bindings for `nsh/base` controls.

A Rust app cannot run that core, so the crate ports its behavior. It builds on [`gpui-form`](https://github.com/freeoxide/gpui-form)'s GPUI-free core, published as `freeoxide-gpui-form-core`: `FormState` for values and baseline, and `FieldPath` for names. The rest of `gpui-form` could not be reused, because `#[derive(GpuiForm)]` generates GPUI entities and widgets.

Requires NSH 0.4.0.

## TypeScript

```sh
mkdir -p node_modules && ln -s /path/to/nsh-form/packages/nsh-form node_modules/nsh-form
(cd /path/to/nsh-form/packages/nsh-form && bun install --ignore-scripts)
```

```tsx
import { mount, Text, View } from "nsh";
import { Input } from "nsh/base";
import { createForm, inputProps } from "nsh-form";

function SignIn() {
  const form = createForm(() => ({
    defaultValues: { email: "", password: "" },
    onSubmit: ({ value }) => {
      console.log("signed in", value.email);
    },
  }));
  return (
    <View class="gap-2 p-4">
      <form.Field
        name="email"
        validators={{ onChange: ({ value }) => (value.includes("@") ? undefined : "That is not an email") }}
      >
        {(field) => (
          <View class="gap-1">
            <Input placeholder="Email" {...inputProps(field)} />
            <If when={field().state.meta.errors[0]}>{(message) => <Text>{String(message())}</Text>}</If>
          </View>
        )}
      </form.Field>
      <form.Field
        name="password"
        validators={{ onBlur: ({ value }) => (value.length < 8 ? "Too short" : undefined) }}
      >
        {(field) => <Input placeholder="Password" masked {...inputProps(field)} />}
      </form.Field>
      <Text role="button" onPress={() => form.handleSubmit()}>
        Sign in
      </Text>
    </View>
  );
}

mount(SignIn);
```

[`packages/nsh-form/README.md`](packages/nsh-form/README.md) covers async validation, array fields and `createFormHook`.

## Rust

```toml
[dependencies]
nsh-form = { path = "../nsh-form/crates/nsh-form" }
```

```rust
use nsh_base::input;
use nsh_core::prelude::*;
use nsh_form::{BindField, SubmitError, field, rules, use_form};

#[derive(Clone, Default, PartialEq)]
struct SignIn {
    email: String,
    password: String,
}

#[component]
pub fn SignInForm() -> impl IntoElement {
    let form = use_form(SignIn::default());
    let email = field!(form, email)
        .rule(rules::required("Enter your email"))
        .rule(rules::email("That is not an email"));
    let password = field!(form, password).on_blur(|value, _| {
        (value.len() < 8).then(|| "Too short".to_owned())
    });
    view()
        .child(email.bind(input().placeholder("Email")))
        .child(text(move || email.error().unwrap_or_default()))
        .child(password.bind(input().masked(true)))
        .child(text("Sign in").on_press(move || {
            form.handle_submit(|values: SignIn| async move {
                api::sign_in(values).await.map_err(|_| SubmitError::field("email", "Unknown account"))
            })
        }))
}
```

## The same concepts in both

| TanStack Form | Rust | TypeScript |
|---|---|---|
| `validators.onChange`, `onBlur`, `onSubmit`, `onMount` | `.on_change(rule)`, `.on_blur`, `.on_submit`, `.on_mount` | The same names |
| `onChangeAsync`, `onChangeAsyncDebounceMs` | `.on_change_async(rule)`, `.on_change_async_debounce(delay)` | The same names |
| `onChangeListenTo` | `.on_change_listen_to(&["password"])` | The same name |
| Form-level validators | `use_form_with(FormOptions)` | `validators` on `createForm` |
| `handleSubmit` | `handle_submit`, `handle_submit_with_meta` | The same name |
| `canSubmit`, `isSubmitting`, `isDirty` and the rest | Tracked methods: `can_submit()`, `is_submitting()`, `was_changed()` | `form.state`, `useStore`, `form.Subscribe` |
| `form.Subscribe` | `form.select(\|state\| ..)` | The same name |
| Array fields | `array_field!(form, tags)`, then `push_value`, `remove_value` and so on | `pushFieldValue`, `field().pushValue` and so on |
| Binding to controls (ours, not TanStack's) | `bind` and `bind_*` for number input, OTP, checkbox, switch, toggle, toggle item, radio, select, combobox, slider, date picker, calendar, time field, color picker, editor and rich editor | `inputProps` and `*Props` for the same controls |
| Standard Schema | The `Schema<T>` and `AsyncSchema<T>` traits, and `parse_values_with_schema` | TanStack's own |
| `update`, `mergeForm`, `formOptions` | `Form::update`, `Field::update`, `merge_form`, `form_options` | The same names |
| Changed fields and a patch (from `gpui-form`) | `changed_paths()`, `changed_value()` | `changedPaths(form)`, `patch(form)` |
| Data for a debug panel (from `gpui-form`) | `diagnostics()` | `diagnostics(form)` |
| Saved values (from `gpui-form`) | `persist`, `save_values()`, `restore_values()`, behind the `persist` feature | `saveForm`, `restoreForm` |
| Rule helpers (from `gpui-form`) | `rules::required`, `email`, `url`, `slug`, `uuid`, `pattern`, `one_of`, `min`, `max`, `required_when` and more, plus `phone` behind the `phone` feature | `required`, `email`, `url`, `slug`, `uuid`, `pattern`, `oneOf`, `min`, `max` and more |

A failed submit moves focus to the first invalid field that has a bound input, in both versions.

## State

Both versions follow NSH's rule that only the bindings that read a changed value run again. Typing in one field does not rerun a binding on another, and a binding on a field's value does not rerun when the field loses focus. Tests with run counters prove this: `crates/nsh-form/tests/fine_grained.rs` for Rust, and `packages/nsh-form/tests/fine_grained.test.tsx` for TypeScript.

## Where it differs from TanStack

**TypeScript:** an `nsh-form` form is TanStack's own code, so its behavior is TanStack's, with these additions and limits:

- A row of an array field is keyed by index, because a field's name is fixed when its options are read.
- `field()` is a view of the `FieldApi`, so `getInfo().instance` is not the same object as `field()`. Both share one `store`.
- NSH 0.4.0 limits two controls: `ColorField` holds no value, and focusing a `NumberInput` focuses its wrapper, so typed digits don't reach it.
- `restoreForm` makes the saved values the new defaults, so a restored draft doesn't read as changed.

**Rust:** these are deliberate:

- `is_dirty()` and `dirty()` compare with the baseline, as they did before this crate followed TanStack. `was_changed()` is TanStack's `isDirty`, which stays true once set.
- A first submit validates every field even when `can_submit()` is false, so all the errors show. TanStack returns early.
- Errors from `Field::error()` show after a blur or a submit. `errors()` and `error_map()` show the raw results at all times.
- `set()` with an equal value does nothing, so an effect can write back what it reads. `handle_change()` and `set_value()` follow TanStack and always count as a change.
- `delete_field` keeps the value, because a typed field cannot be absent. `Field::delete_value` puts the type's default in place.

A fresh form with required fields reads as valid until a validator has run, in both versions. This is TanStack's behavior, and it changed the Rust crate's earlier `is_valid()`, which checked the rules on every read.

`docs/parity-typescript.md` and `docs/parity-rust.md` list every TanStack and `gpui-form` name, with its status and the test that covers it. Rows marked `not applicable` say why.

## Test

```sh
cargo test
cd packages/nsh-form && nsh check && nsh build && nsh test
```
