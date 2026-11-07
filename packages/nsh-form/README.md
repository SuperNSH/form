# nsh-form

TanStack Form for Native Shell (NSH) TSX apps. This is `@tanstack/form-core` 1.33.5, unchanged, with a thin NSH adapter on top: `createForm`, `createField`, groups, bindings for every value-holding control in `nsh/base`, and `createFormHook`. The option names, state fields and behaviour are TanStack Form's. For the API, read the [TanStack Form docs](https://tanstack.com/form/latest); this README shows the NSH parts and the additions that come from gpui-form.

## Install

This package is not on a registry yet. Link a checkout into the app's `node_modules`:

```sh
mkdir -p node_modules && ln -s /path/to/nsh-form/packages/nsh-form node_modules/nsh-form
```

Then import from `"nsh-form"`. Its only dependency, `@tanstack/form-core` 1.33.5, is installed with the checkout (`bun install` in `packages/nsh-form`).

## A form with a field

```tsx
import { mount, Text, View } from "nsh";
import { Input } from "nsh/base";
import { createForm, inputProps } from "nsh-form";

function SignUp() {
  const form = createForm(() => ({
    defaultValues: { email: "" },
    onSubmit: ({ value }) => {
      console.log("saved", value.email);
    },
  }));

  return (
    <View class="gap-2 p-4">
      <form.Field
        name="email"
        validators={{
          onChange: ({ value }) => (value === "" || value.includes("@") ? undefined : "Needs an @"),
        }}
      >
        {(field) => (
          <View class="gap-1">
            <Input testID="email" accessibilityLabel="Email" {...inputProps(field)} />
            <If when={field().state.meta.errors[0]}>
              {(message) => <Text testID="email-error">{String(message())}</Text>}
            </If>
          </View>
        )}
      </form.Field>
      <Text role="button" onPress={() => form.handleSubmit()}>
        Save
      </Text>
    </View>
  );
}

mount(SignUp);
```

A component runs once. Read a field through the accessor the child receives: `field().state.value` and `field().state.meta.isTouched` are reactive, one memo per key. A binding reruns only when the value it reads changes, so `field().state.value` does not wake on a blur. `inputProps(field)` spreads getters, so the input follows the value. `<If>`, `<Each>` and `<Subscribe>`-style children are TSX's own. The form object's `form.state` is TanStack's plain object and is not reactive: read a form slice with `form.Subscribe`, `form.useStore` or `useStore(form.store, selector)`, which rerun a binding only when the selected value changes.

## Async validation

Validators are TanStack's. An async check waits its debounce, and an edit cancels the check it replaces:

```tsx
<form.Field
  name="handle"
  validators={{
    onChangeAsyncDebounceMs: 300,
    onChangeAsync: async ({ value, signal }) => {
      const response = await fetch(`https://api.example.com/handles/${value}`, { signal });
      return response.ok ? "Taken" : undefined;
    },
  }}
>
  {(field) => <Input testID="handle" {...inputProps(field)} />}
</form.Field>
```

Add this field to the `form` that the first example creates. `field().state.meta.isValidating` is `true` while the check waits or runs.

Validation logic decides which validators run on which event. `revalidateLogic({ mode: "blur" })` adds `onDynamic` and `onDynamicAsync` on blur, and `defaultValidationLogic` runs every validator on its own event. A custom `ValidationLogicFn` must always call `runValidation`, even when it runs nothing:

```tsx
const submitOnly: ValidationLogicFn = (props) => {
  if (props.event.type !== "submit") return props.runValidation({ validators: [], form: props.form });
  return defaultValidationLogic(props);
};
```

## An array field

Rows are rendered from the array's length, keyed by index, so each row's `name` stays fixed. Array row names type-check as template literals, without a cast. `Each` is a global in TSX, so it is not imported. Changes go through TanStack's array methods on the form:

```tsx
import { computed, mount, Text, View } from "nsh";
import { Input } from "nsh/base";
import { createForm, inputProps, useStore } from "nsh-form";

function Tags() {
  const form = createForm(() => ({ defaultValues: { tags: [{ name: "first" }] } }));
  const count = useStore(form.store, (state) => state.values.tags.length);
  const rows = computed(() => Array.from({ length: count() }, (_, i) => i));

  return (
    <View class="gap-2 p-4">
      <Each of={rows()} key={(i) => i}>
        {(row) => (
          <form.Field name={`tags[${row()}].name`}>
            {(field) => <Input testID={`tag-${row()}`} {...inputProps(field)} />}
          </form.Field>
        )}
      </Each>
      <Text role="button" onPress={() => form.pushFieldValue("tags", { name: "" })}>
        Add tag
      </Text>
      <Text role="button" onPress={() => void form.removeFieldValue("tags", 0)}>
        Remove first
      </Text>
    </View>
  );
}

mount(Tags);
```

`useStore(form.store, selector)` reads a slice of the form state; `form.useStore(selector)` is the same bound to the form, and `useSelector` is the name `solid-form` uses for it.

## Groups

`createFieldGroup` covers a path of the form's data, and its `Field` takes names relative to that path. The names and the values are typed from the form, so a wrong name or a wrong value type is an error under `nsh check`:

```tsx
const address = createFieldGroup(() => ({ form, fields: "address" }));

<address.Field name="city">{(field) => <Input {...inputProps(field)} />}</address.Field>;
```

`createFormGroup` and `form.FormGroup` take a `name` path into the form, and their group accessor is reactive:

```tsx
<form.FormGroup name="address">
  {(group) => <Text>{`touched ${group().state.meta.isTouched}`}</Text>}
</form.FormGroup>
```

`createFormHook` binds your own components to a form type. `withForm` and `withFieldGroup` make components that take the form (or the group) as a prop:

```tsx
import { createFormHook, createFormHookContexts, inputProps } from "nsh-form";
import { Input } from "nsh/base";
import { Text, View } from "nsh";

const hooks = createFormHookContexts();

const { useAppForm, withForm } = createFormHook({
  fieldComponents: {
    TextField(props: { testID: string; label: string }) {
      const field = hooks.useFieldContext<string>();
      return (
        <View class="gap-1">
          <Input testID={props.testID} accessibilityLabel={props.label} {...inputProps(field)} />
          <Text>{`${props.label}: ${field().state.value}`}</Text>
        </View>
      );
    },
  },
  formComponents: {},
  fieldContext: hooks.fieldContext,
  formContext: hooks.formContext,
});

const SignUpFields = withForm<{ email: string }, { title: string }>({
  defaultValues: { email: "" },
  render: ({ form, title }) => (
    <View class="gap-2 p-4">
      <Text>{title}</Text>
      <form.AppField name="email">
        {(field) => <field.TextField testID="email" label="Email" />}
      </form.AppField>
    </View>
  ),
});

export function SignUp() {
  const form = useAppForm(() => ({ defaultValues: { email: "" } }));
  return <SignUpFields form={form} title="Sign up" />;
}
```

## Controls

Each value-holding control in `nsh/base` has a helper that returns its props with getters that follow the field:

| Control | Helper | Notes |
|---|---|---|
| `Input` | `inputProps(field)` | Focus and blur are tracked for `focusFirstInvalid`. |
| `NumberInput` | `numberInputProps(field)` | |
| `OtpInput` | `otpInputProps(field)` | Give it a sized cell style, as the example does. |
| `Checkbox` | `checkboxProps(field)` | Same props as `toggleProps`. |
| `Switch` | `switchProps(field)` | Same props as `toggleProps`. |
| `Toggle` | `toggleButtonProps(field)` or `toggleButtonProps(list, item)` | With `item`, the field is a list. |
| `ToggleGroup` | none | The group holds no value; bind its `Toggle` items with `toggleButtonProps(list, item)`. |
| `RadioGroup` | none | The group holds no value; bind its `Radio` items with `radioProps(field, option)`. |
| `Radio` | `radioProps(field, option)` | |
| `Select` | `selectProps(field)` | |
| `Combobox` | `comboboxProps(field)` | A list of chosen values. |
| `Slider` | `sliderProps(field)` | A number or a `[low, high]` pair. |
| `DatePicker` | `datePickerProps(field)` | A date string or a range. |
| `Calendar` | `calendarProps(field)` | |
| `TimeField` | `timeFieldProps(field)` | |
| `ColorField` | none | `nsh/base` gives it no value prop; it has channel, colorSpace, format, disabled, placeholder and accessibilityLabel. |
| `ColorPicker` | `colorPickerProps(field)` | Children are its parts, such as `ColorArea` and `ColorSlider`. |
| `Editor` | `editorProps(field)` | |
| `RichEditor` | `richEditorProps(field)` | Its change event carries a revision only, so the document is read with `docJson()`. |

`focusFirstInvalid(form)` runs on every failed submit, before your `onSubmitInvalid`, and focuses the first invalid field whose control has a focus method. A focus move blurs the control the user typed in; the form-level submit error survives that blur.

## Rules

Rule helpers are plain validator functions that return a message or `undefined`. Use them in `validators`:

```tsx
import { email, maxLength, minLength, required } from "nsh-form";

const nameRules = ({ value }: { value: string }) =>
  required("Name needed")({ value }) ?? minLength(2, "Too short")({ value }) ?? maxLength(10, "Too long")({ value });
```

`required`, `email`, `url`, `slug`, `uuid`, `minLength`, `maxLength`, `min`, `max`, `pattern` and `oneOf` are exported. Phone numbers are not: a parser needs a dependency this package does not take.

## Changes, diagnostics, and saved drafts

- `changedPaths(form)` lists the TanStack field paths whose value differs from its default, and `patch(form)` returns those values keyed by path.
- `diagnostics(form)` returns plain data for a debug panel: values, validity, submission state, and each field's value, flags and errors. It is not reactive; render it inside `form.Subscribe` to follow changes.
- `saveForm(form, key)` writes the values to NSH's `Storage`. `restoreForm(form, key)` reads them back and makes them the form's defaults, so the form reads clean. A draft that should stay dirty sets each field with `setFieldValue`.

## Aliases

`useForm`, `useField`, `useFieldGroup` and `useFormGroup` are the names `react-form` uses for `createForm`, `createField`, `createFieldGroup` and `createFormGroup`. `useSelector` is `useStore`. Each is the same function.

## Tests

Tests run on a manual clock. Open an app with `open("../App.tsx", { clock: {} })`, then move time with `app.clock!.runFor(ms)`. The package's own tests are in `tests/`, and the screens they open are in `App.tsx`.

## Status

The API surface and its status are in `docs/parity-typescript.md` at the repository root, with a second table for gpui-form's names. Read it before relying on a name.
