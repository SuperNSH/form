# Brief: nsh-form TypeScript on @tanstack/form-core

Read `docs/brief-common.md` in this worktree first.

## Goal

Replace the hand-written form state in `packages/nsh-form` with a thin NSH adapter over the real `@tanstack/form-core`, the same way `@tanstack/solid-form` adapts it to Solid. Anyone who knows TanStack Form must be able to use `nsh-form` from the TanStack docs, with the same option names, the same state fields and the same behavior. TanStack's core does validation, async debouncing, array fields and submission, so write none of that yourself. NSH has no DOM, so the adapter adds bindings for NSH's `nsh/base` controls.

## Your paths

Worktree: `~/fo/.worktrees/nsh-form-tanstack`. You may edit only `packages/nsh-form/**` and `docs/parity-typescript.md`. Delete the old `src/form.ts`, `path.ts` and `rules.ts` once replaced.

## Setup

```bash
cd ~/fo/.worktrees/nsh-form-tanstack/packages/nsh-form
bun add --ignore-scripts --exact @tanstack/form-core@1.33.5
```

Read every file in `~/fo/.refs/tanstack-form/packages/solid-form/src` and `packages/form-core/src/{FormApi,FieldApi,formOptions,standardSchemaValidator,metaHelper}.ts` before writing code. `@tanstack/store` is a dependency of form-core, and its `Store` is what you subscribe to. Read its `.d.ts` under `node_modules/@tanstack/store` for how `subscribe` and unsubscribing work on this version. Do not import `solid-js`.

## Required public API

Export these from `src/index.ts`:

- Everything from `@tanstack/form-core`, by `export *`. This gives `FormApi`, `FieldApi`, `formOptions`, `mergeForm`, `standardSchemaValidators`, and the types.
- `useStore(store, selector?)`, returning an accessor over a `computed`, so a binding reruns only when its selected slice changes.
- `createForm(() => options)`, returning a form with everything `FormApi` has, plus `form.Field`, `form.Subscribe` and `form.useStore`. It mounts the form and unmounts it through `cleanup`. Port `createForm.tsx`.
- `createField(() => options)` and the `Field` component, with a render-function child: `<form.Field name="email" validators={{ onChange: ... }}>{(field) => <Input ... />}</form.Field>`. The field object is an accessor or has getters, whichever `solid-form` shows, and stays current. Port `createField.tsx`.
- `createFormHook` and `createFormHookContexts`, with `withForm`. Port `createFormHook.tsx`, on `context` from `nsh`.
- `createFieldGroup` and `createFormGroup`, if `solid-form` exports them on this version, or `not done` in the parity file with the reason.

### NSH bindings

TanStack leaves binding to the host framework, and on NSH that means `nsh/base`. Add one small file, `src/bind.ts`:

- `inputProps(field)` for `Input`: `value`, `onChange({ value })` calling `field.handleChange`, `onBlur` calling `field.handleBlur`, and a `ref` that records the input. Getters stay getters, so `{...inputProps(field)}` keeps following the value.
- `toggleProps(field)` for `Switch` and `Checkbox`: `checked`, `onChange({ checked })`.
- `selectProps(field)` for `Select` and `Combobox`: `value`, `onChange({ value })`.
- `numberInputProps(field)` for `NumberInput`, using its real prop names from `.nsh/types/nsh/base.d.ts`.
- `focusFirstInvalid(form)`, focusing the first field with errors that has a recorded `ref`. It runs when `handleSubmit` fails validation, using `onSubmitInvalid`.

## Required behavior, each with a test

Put tests in `tests/` and screens in the root `App.tsx`. Use `{ clock: {} }` for anything with time. All of these must exist by name and pass:

1. `field.state.value`, `field.handleChange`, `field.handleBlur`, updated in a binding
2. field meta: `isTouched`, `isBlurred`, `isDirty`, `isPristine`, `isDefaultValue`, `isValid`, `errors`, `errorMap`
3. field `validators.onChange`, `onBlur`, `onSubmit`, `onMount`, with the validation cause telling which ran
4. field `onChangeAsync` with `onChangeAsyncDebounceMs`: runs once after the debounce, `isValidating` during it, and a newer edit drops the older answer
5. linked fields: `onChangeListenTo`, so changing a password revalidates its confirmation
6. form `validators.onChange` returning `{ fields: { email: "..." } }` puts errors on fields
7. form `validators.onSubmitAsync` for server errors, on the form and on fields
8. Standard Schema: a small hand-written schema object with `~standard`, as a form and as a field validator, with no new dependency
9. `form.handleSubmit()` runs `onSubmit` only when valid, and `onSubmitInvalid` otherwise
10. `form.handleSubmit(meta)` passes `onSubmitMeta`
11. form state: `canSubmit`, `isSubmitting`, `isSubmitted`, `isSubmitSuccessful`, `submissionAttempts`, `isValidating`, `isFormValid`, `isFieldsValid`, `isDirty`, `isPristine`, `isTouched`, `isBlurred`, `isDefaultValue`, `errors`
12. `canSubmitWhenInvalid`, `asyncAlways`, `asyncDebounceMs` at form level
13. `form.Subscribe` with a `selector` rerenders only for its slice, proved with a render counter
14. `form.useStore` and `useStore`, same proof
15. array fields: `pushValue`, `insertValue`, `replaceValue`, `removeValue`, `swapValues`, `moveValue`, `clearValues`, with an `Each` of rows that keep their inputs' values through a removal
16. nested paths: `address.city` and `items[0].name`, typed
17. `form.reset()`, `form.reset(values)`, `form.resetField`, `form.setFieldValue`, `form.getFieldValue`, `form.setFieldMeta`, `form.getFieldMeta`, `form.deleteField`, `form.validateField`, `form.validateAllFields`
18. `listeners` on form and field: `onChange`, `onBlur`, `onMount`, `onSubmit`, and debounced `onChange`
19. `formOptions` shared between two forms, and `mergeForm`
20. `createFormHook` with an app-bound `TextField` component and `withForm`
21. `inputProps` through a real `Input` on the keyboard flow: `app.type`, blur, and error display
22. `toggleProps` on `Switch`, `selectProps` on `Select`
23. `focusFirstInvalid` runs on a failed submit, and does not throw when a field has no ref
24. a field made inside `Each` stops validating after its row goes
25. `tests/smoke.test.tsx`: one small form end to end, with no options that only a headless run allows

## Docs

- `packages/nsh-form/README.md` shows install through `node_modules`, a form with a field, async validation, an array field and `createFormHook`, in TanStack's vocabulary. Say plainly that this is TanStack Form on NSH, and link TanStack's docs as the reference.
- `docs/parity-typescript.md`: one row for every name in these lists, and every export of `form-core`'s `index.ts`. Columns: name, status (`done`, `not applicable`, or `not done`), the test that covers it, a note.
  - `FormOptions`: `formId`, `defaultValues`, `defaultState`, `asyncAlways`, `asyncDebounceMs`, `canSubmitWhenInvalid`, `validators`, `validationLogic`, `listeners`, `onSubmit`, `onSubmitInvalid`, `onSubmitMeta`, `transform`.
  - Form validators: `onMount`, `onChange`, `onChangeAsync`, `onChangeAsyncDebounceMs`, `onBlur`, `onBlurAsync`, `onBlurAsyncDebounceMs`, `onSubmit`, `onSubmitAsync`, `onDynamic`, `onDynamicAsync`, `onDynamicAsyncDebounceMs`.
  - Field validators: the same, plus `onChangeListenTo`, `onBlurListenTo`.
  - `FormApi`: `clearFieldValues`, `deleteField`, `getAllErrors`, `getFieldInfo`, `getFieldMeta`, `getFieldValue`, `handleSubmit`, `insertFieldValue`, `mount`, `moveFieldValues`, `parseValuesWithSchema`, `parseValuesWithSchemaAsync`, `pushFieldValue`, `removeFieldValue`, `replaceFieldValue`, `reset`, `resetField`, `resetFieldMeta`, `setErrorMap`, `setFieldMeta`, `setFieldValue`, `swapFieldValues`, `update`, `validateAllFields`, `validateArrayFieldsStartingFrom`, `validateField`.
  - `FieldApi`: `clearValues`, `getInfo`, `getLinkedFields`, `getMeta`, `getValue`, `handleBlur`, `handleChange`, `insertValue`, `mount`, `moveValue`, `parseValueWithSchema`, `parseValueWithSchemaAsync`, `pushValue`, `removeValue`, `replaceValue`, `setErrorMap`, `setMeta`, `setValue`, `swapValues`, `update`, `validate`.

## Finish conditions

You are finished only when all of these hold. Run them yourself and paste the output in your report.

1. In `packages/nsh-form`: `nsh check` exits 0.
2. `nsh build` exits 0, and its output has no `warn` line.
3. `nsh test` exits 0, with every test named above present.
4. `grep -rn "setTimeout\|deepEqual\|writePath" packages/nsh-form/src` finds no hand-written debounce or path logic. Anything left has a stated reason.
5. `nsh build --release` output is recorded in the parity file, with the bundle's size.
6. A consumer works. In a new folder under `/private/tmp/claude-501/-Users-hmziq--claude-spares-spare-NGupus/5378586f-1e26-4b17-89e9-b3eb305cfd38/scratchpad/verify/work/`, run `nsh init . --template ts`, link the package with `mkdir -p node_modules && ln -s ~/fo/.worktrees/nsh-form-tanstack/packages/nsh-form node_modules/nsh-form`, write a test that imports `createForm` from `"nsh-form"`, and show that `nsh check`, `nsh build` and `nsh test` pass.
7. `nsh test tests/smoke.test.tsx --target macos` passes on a real window, with real keyboard input.
8. `docs/parity-typescript.md` has every required row, and every row marked `done` names a test that exists.
9. You broke the code once on purpose for each of tests 4, 13, 15 and 21, and saw each fail. Say how in your report.
