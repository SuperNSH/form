# Finish brief: nsh-form TypeScript

Read `docs/brief-finish-common.md` first. You own `packages/nsh-form/**` and `docs/parity-typescript.md`. Another agent owns `crates/`. Keep building on TanStack's own code, and write no validation, debounce or path logic of your own.

## 1. Fine-grained state (do this first)

`tests/fine_grained.test.tsx` fails. `liveField` in `src/createField.ts` makes one accessor that reads 11 `useStore` slices, so a binding on `field().state.value` wakes on a blur.

Replace it, keeping the TanStack shape. `field().state.value` and `field().state.meta.isTouched` must read as now, with `state` and `state.meta` as objects of getters over one memo per key, the way `packages/nsh-query/src/result.ts` does. Make the memos once when the field is made, not in a binding. Every other `FieldApi` member stays reachable from `field()`, and `field.TextField` still works. The same holds for `createFieldGroup` and `createFormGroup`.

## 2. Close the open rows

Each needs a real test: `formId`, `defaultState`, `validationLogic`, `transform`, `revalidateLogic`, `defaultValidationLogic`, `onMount` and `onBlur` at form level, `onChangeAsyncDebounceMs`, `onBlurAsync`, `onBlurAsyncDebounceMs`, `onDynamic`, `onDynamicAsync`, `onDynamicAsyncDebounceMs` on field and form, `onBlurListenTo`, `parseValuesWithSchemaAsync`, `parseValueWithSchemaAsync`, `update` on form and field through options that change at run time, `validateArrayFieldsStartingFrom`, `form.useSelector`, `group.Subscribe`, `group.AppField`, `group.AppForm`, `AppForm`, `useFormContext`, and the validation logic type rows.

## 3. Precise types

Your decision notes say the group APIs use loose `any` generics. Port the precise generics from `solid-form` for `createFieldGroup`, `createFormGroup`, `FormGroup` and `withFieldGroup`. Prove it with `// @ts-expect-error` lines in a test: a wrong field name and a wrong value type must be type errors under `nsh check`. In your earlier tests, `as never` on a field name appears in the array sample in `README.md`. Make array row names type-check without it, if TanStack's types allow, and otherwise say why.

## 4. Names from the other adapters

`react-form` exports `useForm`, `useField`, `useFieldGroup`, `useFormGroup`. Export these as aliases, as `nsh-query` does for `useQuery` and `createQuery`, with one test each. Also export `useSelector` as `solid-form` does.

## 5. Bindings for every control

Add `*Props` helpers for every control in `nsh/base` that holds a value, using the real prop names from `.nsh/types/nsh/base.d.ts`: `Input`, `NumberInput`, `OtpInput`, `Checkbox`, `Switch`, `Toggle`, `ToggleGroup`, `RadioGroup`, `Select`, `Combobox`, `Slider`, `DatePicker`, `Calendar`, `TimeField`, `ColorField`, `ColorPicker`, `Editor`, `RichEditor`. Test each through a real press or typed value. If one has no value prop, say so. Each helper keeps getters as getters.

`focusFirstInvalid` should work for every control with a focus method. Test that the focus-move fix in `bind.ts` (test 23c) covers every control that reports a blur.

## 6. What `gpui-form` has

Add a second table to `docs/parity-typescript.md`: gpui-form name, TypeScript name, status, test, note. Go through `~/fo/.refs/gpui-form/crates/gpui-form-core/src` and `docs/form-feature-parity-plan.md`. Most map to TanStack's names. Add what TanStack lacks and gpui-form has, with no new dependency: `changedPaths(form)` and a patch of changed values; `diagnostics(form)` for a debug panel; rule helpers `required`, `email`, `url`, `slug`, `uuid`, `minLength`, `maxLength`, `min`, `max`, `pattern`, `oneOf` as plain validator functions; values saved and restored through NSH's `Storage`. Phone validation has no parser in TypeScript without a new dependency, so `not applicable` with that reason is acceptable. Mark GPUI-only items `not applicable`.

## Docs

Update `packages/nsh-form/README.md` with the new names. Do not edit the repository README; the owner will.

## Finish conditions

1. In `packages/nsh-form`: `nsh check` exits 0.
2. `nsh build` exits 0, with no `warn` line.
3. `nsh test` exits 0, with `tests/fine_grained.test.tsx` unedited and passing.
4. `grep -rn "setTimeout\|deepEqual\|writePath" packages/nsh-form/src` finds no hand-written debounce or path logic.
5. `nsh build --release` output is recorded in the parity file, with the bundle's size.
6. `nsh test tests/smoke.test.tsx --target macos` passes on a real window, with real keyboard input.
7. `grep -c "| not done" docs/parity-typescript.md` prints 0.
8. Every `done` row in both tables names a test that exists.
9. You broke the code once per group (fine-grained field state, group types, bindings, gpui-form names), saw the test fail and restored it. Say how.
