# nsh-form

Typed forms for [Native Shell](https://nsh.dev) apps: one value type, field-level rules, async checks, dirty
tracking, server errors and focus on the first invalid field. Everything a screen reads is a signal. NSH has no
styled components, so this library owns behavior and your UI module owns the look.

There are two versions with the same behavior:

| Version | Path | For |
|---|---|---|
| Rust crate | `crates/nsh-form` | Rust and Rust-with-TSX apps |
| TypeScript package | `packages/nsh-form` | TSX apps, signed packages, anything with no Rust crate |

## Why two versions

The Rust crate reuses [`gpui-form`](https://github.com/freeoxide/gpui-form)'s GPUI-free core, published as
`freeoxide-gpui-form-core`: `FormState` for baseline and dirty tracking, `FieldPath` for naming fields, and its
numeric checks. The rest of `gpui-form` could not be reused: `#[derive(GpuiForm)]` generates GPUI entities and
`gpui_kit::component` widgets. So `field!` and `Field` replace the derive with NSH signals.

TSX runs on NSH's prebuilt runtime in QuickJS with no crate of its own, so it gets a TypeScript version.

Requires NSH 0.4.0.

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
    let password = field!(form, password).rule(rules::min_length(8, "Too short"));
    view()
        .child(email.bind(input().placeholder("Email")))
        .child(text(move || email.error().unwrap_or_default()))
        .child(password.bind(input().masked(true)))
        .child(text("Sign in").on_press(move || {
            form.submit(|values: SignIn| async move {
                api::sign_in(values).await.map_err(|_| SubmitError::field("email", "Unknown account"))
            })
        }))
}
```

## TypeScript

```sh
mkdir -p node_modules && ln -s ../../nsh-form/packages/nsh-form node_modules/nsh-form
```

```tsx
import { Text, View } from "nsh";
import { Input } from "nsh/base";
import { createForm, email, minLength, required } from "nsh-form";

export function SignIn() {
  const form = createForm({
    initial: { email: "", password: "" },
    onSubmit: async (values) => {
      const ok = await signIn(values);
      if (!ok) return { fields: { email: "Unknown account" } };
    },
  });
  const address = form.field("email", { rules: [required("Enter your email"), email("That is not an email")] });
  const password = form.field("password", { rules: [minLength(8, "Too short")] });
  return (
    <View>
      <Input placeholder="Email" {...address.inputProps()} />
      <If when={address.error()}>{(message) => <Text>{message()}</Text>}</If>
      <Input placeholder="Password" masked {...password.inputProps()} />
      <Text role="button" onPress={() => form.submit()}>Sign in</Text>
    </View>
  );
}
```

## Behavior

- An error shows once the user left the field or tried to submit, so nobody is told off while typing.
- A rule sees the whole form, so "must match the password" is one line.
- An async rule waits for its debounce and a newer edit drops an older answer. The form stays invalid meanwhile.
- A successful submit makes the values the baseline, so the form reads clean. `reset` and `load` clear feedback.
- A server error lands on its field by path (`"address.city"`) and clears when the user edits that field.
- A failed submit focuses the first invalid field that has a bound input.
- TypeScript also has typed dotted paths and `form.array("items")`, with row keys stable across removals.

## Test

```sh
cargo test
cd packages/nsh-form && nsh check && nsh build && nsh test
```
