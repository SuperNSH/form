# Parity: nsh-form on @tanstack/form-core (TypeScript)

This file has two tables. Table 1 is TanStack Form's names (form-core 1.33.5, with the React and Solid adapter names). Table 2 is gpui-form's names. Status: `done` = a test in `packages/nsh-form/tests/` covers it; `not applicable` = a type, a core internal, a control with no value, or a concept NSH 0.4.0 cannot provide (the note says which); `not done` = none remain.
# Parity: nsh-form on @tanstack/form-core (TypeScript)

Reference: TanStack Form 1.33.5 (`@tanstack/form-core`, `@tanstack/solid-form`, `@tanstack/react-form` names). Test IDs are the number prefix of `test("…")` in `packages/nsh-form/tests/*.test.tsx` (for example `17b`, `b4`, `gp12`, `23d-3`); `fine_grained` and `types` name their files.

Table 1 rows: 291. done: 145. not applicable: 146. not done: 0.

## Table 1: TanStack names


### FormOptions

| Name | Status | Test | Note |
|---|---|---|---|
| `formId` | done | f1 | Passed to FormApi; the test reads the id the form was given (form._formId). |
| `defaultValues` | done | 2, 15, 17, u1 | Used by every form screen; array and nested defaults in 15 and 16; updates at run time in u1. |
| `defaultState` | done | f2 | defaultState sets values, submissionAttempts and isSubmitted at creation. |
| `asyncAlways` | done | 12 | Form-level asyncAlways decides whether onSubmitAsync runs after a failing sync onSubmit. |
| `asyncDebounceMs` | done | 12 | Form-level async check waits 199 ms, then runs at 200 ms, on the manual clock. |
| `canSubmitWhenInvalid` | done | 12 | canSubmit stays true for the invalid form that sets it. |
| `validators` | done | 6, 7, 8, 12, r1–r6, f3 | Form-level onMount, onBlur, onChange and their async and dynamic forms. |
| `validationLogic` | done | f4, f5, f6 | revalidateLogic, a custom ValidationLogicFn, and defaultValidationLogic each run in their own test. |
| `listeners` | done | 18 | Form onMount, onChange, onBlur and onSubmit listeners. |
| `onSubmit` | done | 9, 12 | Runs only when the form is valid. |
| `onSubmitInvalid` | done | 9, 23 | Runs on a failed submit; createForm also focuses the first invalid input before it. |
| `onSubmitMeta` | done | 10 | The default meta is used by handleSubmit() with no argument. |
| `transform` | done | f3 | Core applies transform once, at construction, to the error state (errorMap). Changes to values are dropped by core; see Findings. |

### Form validators

| Name | Status | Test | Note |
|---|---|---|---|
| `onMount` | done | r1 | Form-level onMount puts its error on the field at mount. |
| `onChange` | done | 6 | Returns { fields } so the error lands on the field. |
| `onChangeAsync` | done | 12, r6 | Form-level async check runs after the debounce. |
| `onChangeAsyncDebounceMs` | done | r6 | Waits 299 ms, then runs at 300 ms. |
| `onBlur` | done | r2 | Form-level onBlur runs when a field loses focus. |
| `onBlurAsync` | done | r3 | Runs after the blur, once the debounce has passed. |
| `onBlurAsyncDebounceMs` | done | r3 | Waits 199 ms, then runs at 200 ms. |
| `onSubmit` | done | 12 | A sync form-level rule blocks submit; the async check after it does not run without asyncAlways. |
| `onSubmitAsync` | done | 7 | Returns { form, fields }; the field error lands on email, the form error on the form. |
| `onDynamic` | done | r4 | Runs only when revalidateLogic adds it: on blur, not on change. |
| `onDynamicAsync` | done | r5 | Runs on blur under revalidateLogic. |
| `onDynamicAsyncDebounceMs` | done | r5 | Waits 149 ms, then runs at 150 ms. |

### Field validators

| Name | Status | Test | Note |
|---|---|---|---|
| `onMount` | done | 3 | Error keyed under onMount on mount. |
| `onChange` | done | 1, 2, 21 | Length rule; errors show on screen while typing. |
| `onChangeAsync` | done | 4, 4b | Runs once after the debounce; an edit drops the older answer. |
| `onChangeAsyncDebounceMs` | done | 4 | Debounce of 300 ms on the manual clock. |
| `onBlur` | done | 3 | Error keyed under onBlur after the field loses focus. |
| `onBlurAsync` | done | r7 | Runs after the blur, no sooner than the debounce (measured inside the app with Date.now()). |
| `onBlurAsyncDebounceMs` | done | r7 | Measured gap between the blur and the check is at least 250 ms. |
| `onSubmit` | done | 3, 9 | Error keyed under onSubmit on submit. |
| `onSubmitAsync` | done | 7 | Field-level async check on submit. |
| `onDynamic` | done | r8 | Runs under revalidateLogic on blur. |
| `onDynamicAsync` | done | r8 | Runs after its debounce; measured gap at least 100 ms. |
| `onDynamicAsyncDebounceMs` | done | r8 | As onDynamicAsync. |
| `onChangeListenTo` | done | 5 | Changing password revalidates confirm. |
| `onBlurListenTo` | done | r9 | A blur of the password revalidates confirm on blur. |

### FormApi

| Name | Status | Test | Note |
|---|---|---|---|
| `clearFieldValues` | done | 15 | Clear button empties the array. |
| `deleteField` | done | 17 | Called last in 17. It drops the field registration (see Findings). |
| `getAllErrors` | done | 17b |  |
| `getFieldInfo` | done | 17b | Field registered is true while the input is mounted. |
| `getFieldMeta` | done | 17 |  |
| `getFieldValue` | done | 17 |  |
| `handleSubmit` | done | 9, 10 |  |
| `insertFieldValue` | done | 15 |  |
| `mount` | done | 25 | Called by createForm on every form; cleanup unmounts it. |
| `moveFieldValues` | done | 15 |  |
| `parseValuesWithSchema` | done | 17b | Hand-written Standard Schema; returns issues on the form values. |
| `parseValuesWithSchemaAsync` | done | p1 | Async Standard Schema on the whole form; returns the issues. |
| `pushFieldValue` | done | 15 |  |
| `removeFieldValue` | done | 15 | Rows keep their values through a removal. |
| `replaceFieldValue` | done | 15 |  |
| `reset` | done | 17 | Reset to the defaults; reset(values) sets new defaults. |
| `resetField` | done | 17 |  |
| `resetFieldMeta` | done | 17b | Pure helper: returns the default meta for the keys it is given; it does not write the store. |
| `setErrorMap` | done | 17b |  |
| `setFieldMeta` | done | 17 |  |
| `setFieldValue` | done | 17 |  |
| `swapFieldValues` | done | 15 |  |
| `update` | done | u1 | createForm calls update from an effect; u1 changes the defaults at run time and the form reads them. |
| `validateAllFields` | done | 17 |  |
| `validateArrayFieldsStartingFrom` | done | a1 | Validates the rows from index 1 on; row 0 keeps no error. |
| `validateField` | done | 17 |  |

### FieldApi

| Name | Status | Test | Note |
|---|---|---|---|
| `clearValues` | done | 27 |  |
| `getInfo` | done | 27 | Its instance is the FieldApi; compared by its store (field() is a view of it). |
| `getLinkedFields` | done | 27 | Covered for the empty result only. |
| `getMeta` | done | 27 |  |
| `getValue` | done | 27 |  |
| `handleBlur` | done | 1, 21 |  |
| `handleChange` | done | 1, 21 |  |
| `insertValue` | done | 27 |  |
| `mount` | done | 1 | Called by createField; cleanup unmounts the field. |
| `moveValue` | done | 27 |  |
| `parseValueWithSchema` | done | 27 | Returns issues for a value that fails the schema. |
| `parseValueWithSchemaAsync` | done | p2 | Async Standard Schema on one field; returns the issues. |
| `pushValue` | done | 27 |  |
| `removeValue` | done | 27 |  |
| `replaceValue` | done | 27 |  |
| `setErrorMap` | done | 27 |  |
| `setMeta` | done | 27 |  |
| `setValue` | done | 27 |  |
| `swapValues` | done | 27 |  |
| `update` | done | u2 | The field validators come from props; u2 changes them at run time and the new minimum applies. |
| `validate` | done | 27 | Returns the errors of the submit validator. |

### NSH adapter exports

| Name | Status | Test | Note |
|---|---|---|---|
| `useStore` | done | 14 | Rerenders only for its slice (render counter). |
| `createForm` | done | 1, 2, 9, 12, 17, 22, 25, 26, 27 | Mounts the form; unmounts through cleanup; focuses the first invalid input on failed submit. |
| `createField` | done | 1, 4, 5, 15, fine_grained | Field options are read live; field().state is reactive per key. |
| `Field` | done | 1, 3, 15 | The form.Field component; children receive the live field accessor. |
| `createFieldGroup` | done | 26, g1, g2, types | Typed group names and values; group state reactive per key. |
| `createFormGroup` | done | 26, al4, types | Group accessor reruns a binding only when the group meta it reads changes. |
| `FormGroup` | done | 26, al4, types | The form.FormGroup component; a wrong name is a type error. |
| `createFormHook` | done | 20, types |  |
| `createFormHookContexts` | done | 20 |  |
| `withForm` | done | 20 |  |
| `withFieldGroup` | done | 26, types | Typed fields prop: a path that is not an object is a type error. |
| `AppField` | done | 20, g1 | Children get the field accessor and the bound components (field.TextField). |
| `AppForm` | done | g3 | Provides the form to its children. |
| `useFieldContext` | done | 20 | Reads the field context inside an AppField child. |
| `useFormContext` | done | g4 | Reads the form inside an AppForm. |
| `group.Field` | done | 26, types | Name is relative to the group data; wrong names are errors. |
| `group.AppField` | done | g1 | Field of the group, through the form components. |
| `group.Subscribe` | done | g2 | Group slice with a selector. |
| `group.AppForm` | done | g3 | Provides the form to its children. |
| `form.Subscribe` | done | 13 | Selector slice with a render counter. |
| `form.useStore` | done | 14 |  |
| `form.useSelector` | done | s1, al5 | Same function as form.useStore. |
| `form.FormGroup` | done | 26, al4, types |  |
| `form.Field` | done | 1 |  |
| `useForm` | done | al1 | react-form name for createForm. |
| `useField` | done | al2 | react-form name for createField. |
| `useFieldGroup` | done | al3 | react-form name for createFieldGroup. |
| `useFormGroup` | done | al4 | react-form name for createFormGroup. |
| `useSelector` | done | al5 | solid-form name for useStore. |
| `inputProps` | done | 1, 15, 21 | value getter follows the field; onChange, onFocus, onBlur, ref. |
| `numberInputProps` | done | 22, 23e-2 | value is a number or null. focusFirstInvalid reaches its wrapper only (see N/A row below). |
| `otpInputProps` | done | b1, 23d-3, 23e-3 |  |
| `toggleProps` | done | 22 | Switch and Checkbox share it; checked and onChange({ checked }). |
| `checkboxProps` | done | b2 | Same props as toggleProps. |
| `switchProps` | done | 22 | Same props as toggleProps. |
| `toggleButtonProps` | done | b3, b4 | Boolean with no item; a list with item. |
| `radioProps` | done | b5 | Checked while the field holds the option; a press sets it. |
| `selectProps` | done | 22 | Select is covered; Combobox uses comboboxProps. |
| `comboboxProps` | done | b6 | A list of chosen values. |
| `sliderProps` | done | b7 | A number; a drag on the thumb changes it. |
| `datePickerProps` | done | b9 | A range: two picks set [start, end]. |
| `calendarProps` | done | b8 | A press on a day sets the date. |
| `timeFieldProps` | done | b10 | Typed digits set the time. |
| `colorPickerProps` | done | b11 | Dragging the hue channel changes the color. |
| `editorProps` | done | b12, 23d-4, 23e-4 |  |
| `richEditorProps` | done | b13, 23d-5, 23e-5 | The document is read with docJson; only the newest read is stored (revision). |
| `focusFirstInvalid` | done | 23, 23b, 23e-1, 23e-3, 23e-4, 23e-5 | Focuses the first invalid field whose control has a focus method. |
| `focus carry (form error survives the focus move)` | done | 23c, 23d-1 … 23d-5 | Every control that reports a blur keeps the form-level submit error. |
| `mergeProps (adapter internal)` | not applicable | - | Not exported from src/index.ts; used by the adapter to merge props with live getters. |

### Controls with no value to bind

| Name | Status | Test | Note |
|---|---|---|---|
| `ToggleGroup (no helper)` | not applicable | b4 | nsh/base ToggleGroup props are disabled and children. The value sits on its Toggle items, bound with toggleButtonProps(list, item). |
| `RadioGroup (no helper)` | not applicable | b5 | nsh/base RadioGroup props are children only. The value sits on its Radio items, bound with radioProps(field, option). |
| `ColorField (no helper)` | not applicable | - | nsh/base ColorField props are channel, colorSpace, format, disabled, placeholder and accessibilityLabel. It holds no value in NSH 0.4.0, so there is nothing to bind; ColorPicker is the value control. |
| `focusFirstInvalid on NumberInput` | not applicable | 23e-2 | NSH 0.4.0 NumberInput has no ref to its text field. Its ref.focus() focuses the wrapper view, so typed digits do not reach the field. The test asserts this. |

### form-core index exports (re-exported unchanged)

| Name | Status | Test | Note |
|---|---|---|---|
| `AllObjectKeys` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `AllTupleKeys` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `AnyBaseFormState` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `AnyDeepKeyAndValue` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `AnyFieldApi` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `AnyFieldGroupApi` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `AnyFieldLikeMeta` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `AnyFieldLikeMetaBase` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `AnyFieldMeta` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `AnyFormApi` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `AnyFormGroupApi` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `AnyFormGroupMeta` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `AnyFormOptions` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `AnyFormState` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `ArrayAccessor` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `ArrayDeepKeyAndValue` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `AsyncValidator` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `BaseFormOptions` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `BaseFormState` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `BroadcastFormApi` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `BroadcastFormId` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `BroadcastFormState` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `BroadcastFormSubmissionState` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `DeepKeyAndValueArray` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `DeepKeyAndValueObject` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `DeepKeyAndValueTuple` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `DeepKeys` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `DeepKeysAndValues` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `DeepKeysAndValuesImpl` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `DeepKeysOfType` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `DeepRecord` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `DeepValue` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `DerivedFormState` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `EventClientEventMap` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `EventClientEventNames` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `ExtractGlobalFormError` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FieldApi` | done | 1, 9, 13, 26 | The classes behind every form, field and group above. |
| `FieldApiOptions` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FieldAsyncValidateOrFn` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FieldErrorMapFromValidator` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FieldGroupApi` | done | 1, 9, 13, 26 | The classes behind every form, field and group above. |
| `FieldGroupOptions` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FieldGroupState` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FieldInfo` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FieldLikeAPI` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FieldLikeApiOptions` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FieldLikeMeta` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FieldLikeMetaBase` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FieldLikeMetaDerived` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FieldLikeOptions` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FieldLikeState` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FieldListenerFn` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FieldListeners` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FieldOptions` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FieldValidateAsyncFn` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FieldValidateFn` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FieldValidateOrFn` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FieldValidators` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FieldsMap` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FormApi` | done | 1, 9, 13, 26 | The classes behind every form, field and group above. |
| `FormAsyncValidateOrFn` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FormGroupApi` | done | 1, 9, 13, 26 | The classes behind every form, field and group above. |
| `FormGroupApiOptions` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FormGroupAsyncValidateOrFn` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FormGroupListenerFn` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FormGroupListeners` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FormGroupMeta` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FormGroupOptions` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FormGroupState` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FormGroupStoreState` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FormGroupValidateAsyncFn` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FormGroupValidateFn` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FormGroupValidateOrFn` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FormGroupValidators` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FormLikeAPI` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FormListeners` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FormListenersPropsField` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FormListenersPropsGroup` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FormOptions` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FormState` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FormTransform` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FormValidateAsyncFn` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FormValidateFn` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FormValidateOrFn` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FormValidationError` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FormValidationErrorMap` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FormValidator` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `FormValidators` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `GlobalFormValidationError` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `ListenerCause` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `Narrow` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `Nullable` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `ObjectAccessor` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `ObjectDeepKeyAndValue` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `ObjectValue` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `RejectPromiseValidator` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `StandardSchemaV1` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `StandardSchemaV1Issue` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `SyncValidator` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `TStandardSchemaValidatorIssue` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `TStandardSchemaValidatorValue` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `TupleAccessor` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `TupleDeepKeyAndValue` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `UnknownAccessor` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `UnknownDeepKeyAndValue` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `UnwrapFieldAsyncValidateOrFn` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `UnwrapFieldValidateOrFn` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `UnwrapFormAsyncValidateOrFn` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `UnwrapFormValidateOrFn` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `UnwrapOneLevelOfArray` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `UpdateMetaOptions` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `Updater` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `UpdaterFn` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `ValidationCause` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `ValidationError` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `ValidationErrorMap` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `ValidationErrorMapKeys` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `ValidationErrorMapSource` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `ValidationLogicFn` | done | f5 | Type of the custom logic in f5: it reads props.event and calls props.runValidation({ validators, form }). |
| `ValidationLogicProps` | done | f5 | Type of the custom logic in f5: it reads props.event and calls props.runValidation({ validators, form }). |
| `ValidationLogicValidatorsFn` | done | f5 | Type of the custom logic in f5: it reads props.event and calls props.runValidation({ validators, form }). |
| `ValidationMeta` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `ValidationSource` | not applicable | - | Type only, re-exported unchanged by the form-core index. |
| `concatenatePaths` | not applicable | - | Internal helper of form-core, re-exported unchanged. The behaviour that uses it is covered by the APIs above. |
| `createFieldMap` | not applicable | - | Internal helper of form-core, re-exported unchanged. The behaviour that uses it is covered by the APIs above. |
| `deepCopy` | not applicable | - | Internal helper of form-core, re-exported unchanged. The behaviour that uses it is covered by the APIs above. |
| `defaultValidationLogic` | done | f4, f6 | Passed as validationLogic; each test runs its behaviour. |
| `deleteBy` | not applicable | - | Internal helper of form-core, re-exported unchanged. The behaviour that uses it is covered by the APIs above. |
| `determineFieldLevelErrorSourceAndValue` | not applicable | - | Internal helper of form-core, re-exported unchanged. The behaviour that uses it is covered by the APIs above. |
| `determineFormLevelErrorSourceAndValue` | not applicable | - | Internal helper of form-core, re-exported unchanged. The behaviour that uses it is covered by the APIs above. |
| `evaluate` | not applicable | - | Internal helper of form-core, re-exported unchanged. The behaviour that uses it is covered by the APIs above. |
| `formEventClient` | not applicable | - | Internal helper of form-core, re-exported unchanged. The behaviour that uses it is covered by the APIs above. |
| `formOptions` | done | 19 | Shared formOptions between two forms; mergeForm merges a partial state. |
| `functionalUpdate` | not applicable | - | Internal helper of form-core, re-exported unchanged. The behaviour that uses it is covered by the APIs above. |
| `getAsyncValidatorArray` | not applicable | - | Internal helper of form-core, re-exported unchanged. The behaviour that uses it is covered by the APIs above. |
| `getBy` | not applicable | - | Internal helper of form-core, re-exported unchanged. The behaviour that uses it is covered by the APIs above. |
| `getDefaultFormGroupMeta` | not applicable | - | Internal helper of form-core, re-exported unchanged. The behaviour that uses it is covered by the APIs above. |
| `getSyncValidatorArray` | not applicable | - | Internal helper of form-core, re-exported unchanged. The behaviour that uses it is covered by the APIs above. |
| `isFieldInGroup` | not applicable | - | Internal helper of form-core, re-exported unchanged. The behaviour that uses it is covered by the APIs above. |
| `isGlobalFormValidationError` | not applicable | - | Internal helper of form-core, re-exported unchanged. The behaviour that uses it is covered by the APIs above. |
| `isNonEmptyArray` | not applicable | - | Internal helper of form-core, re-exported unchanged. The behaviour that uses it is covered by the APIs above. |
| `isStandardSchemaValidator` | not applicable | - | Internal helper of form-core, re-exported unchanged. The behaviour that uses it is covered by the APIs above. |
| `makePathArray` | not applicable | - | Internal helper of form-core, re-exported unchanged. The behaviour that uses it is covered by the APIs above. |
| `mergeAndUpdate` | not applicable | - | Internal helper of form-core, re-exported unchanged. The behaviour that uses it is covered by the APIs above. |
| `mergeForm` | done | 19 | Shared formOptions between two forms; mergeForm merges a partial state. |
| `mergeOpts` | not applicable | - | Internal helper of form-core, re-exported unchanged. The behaviour that uses it is covered by the APIs above. |
| `mutateMergeDeep` | not applicable | - | Internal helper of form-core, re-exported unchanged. The behaviour that uses it is covered by the APIs above. |
| `revalidateLogic` | done | f4, f6 | Passed as validationLogic; each test runs its behaviour. |
| `setBy` | not applicable | - | Internal helper of form-core, re-exported unchanged. The behaviour that uses it is covered by the APIs above. |
| `standardSchemaValidators` | not applicable | 8 | Core uses it internally to run Standard Schema validators; test 8 covers it through the API. |
| `throttleFormState` | not applicable | - | Internal helper of form-core, re-exported unchanged. The behaviour that uses it is covered by the APIs above. |
| `uuid` | not applicable | - | Internal helper of form-core, re-exported unchanged. The behaviour that uses it is covered by the APIs above. |

Table 2 rows: 55. done: 45. not applicable: 10. not done: 0.


## Table 2: gpui-form names

Source: `~/fo/.refs/gpui-form/docs/form-feature-parity-plan.md`, sections 1 (every matrix row) and the crates it names. "gpui-form name" is the feature as the plan titles it; "TypeScript name" is what nsh-form exposes.

| gpui-form name | TypeScript name | Status | Test | Note |
|---|---|---|---|---|
| Typed form values model | `form.state.values, typed by DeepKeys` | done | 16, types | Typed nested paths; a wrong path is a type error (types test). |
| Default values | `defaultValues` | done | 2, 17 | Defaults seed the form; reset returns to them. |
| Whole-form dirty tracking | `form.state.isDirty` | done | 11 | Whole-form dirty; per-field dirty is in changedPaths (gp9). |
| Reset form | `form.reset()` | done | 17 | Back to the defaults; errors cleared. |
| Mark clean after save | `form.reset(values)` | done | 17 | A reset with values makes them the defaults, so the form reads clean. TanStack does not do this after a submit by itself. |
| Reset with new values (non-reactive) | `form.reset(values)` | done | 17 | Replaces values and defaults. |
| Values persistence (save/restore) | `saveForm / restoreForm over NSH Storage` | done | gp11, gp12 | Saves JSON to Storage; restore makes the saved values the defaults. |
| Typed field identifiers (flat) | `DeepKeys paths, typed names` | done | types, 16 | Wrong names are type errors. |
| Per-field validation rules | `field validators` | done | 1, 2, 3, 21 | onChange, onBlur, onSubmit, onMount per field. |
| Collect ALL errors per field | `field.state.meta.errors` | done | 3 | Every cause that fails is in errorMap; errors lists them all. |
| Built-in validators: required, email, length, numeric range, non-empty | `required, email, minLength, maxLength, min, max` | done | gp1, gp5, gp6 | Plain validator functions in src/rules.ts. |
| Phone-number validation (parser-backed) | `not in TanStack` | not applicable | - | Needs a phone parser (libphonenumber-class) that is a new dependency. This package takes none. |
| Localized error messages | `messages passed as strings` | not applicable | - | gpui-form uses Fluent through koruma. Messages here are the app's own strings; no localization dependency. |
| Controlled-component integration escape hatch | `inputProps and the *Props helpers` | done | 1, b1–b13 | Each control has its own helper. |
| Programmatic get/set values | `getFieldValue / setFieldValue` | done | 17 | Also form.state.values for reads. |
| Numeric input validation discipline | `numberInputProps and min / max` | done | 22, gp6 | The number helper gives a number or null. |
| Prototyping/introspection registry | `diagnostics(form)` | done | gp10 | Plain data for a debug panel; the registry of shapes is gpui-form's derive output and has no TypeScript equivalent. |
| Per-field typed error access | `field().state.meta.errors` | done | 2, 3 | Typed by the field value. |
| Manual validation trigger | `validateField / validateAllFields / validateArrayFieldsStartingFrom` | done | 17, a1 | Single field, all fields, or from an index. |
| Typed dynamic paths (nested/array names) | `DeepKeys with template paths` | done | 16, types | tags[${n}].name type-checks without a cast. |
| Section/grouped forms | `createFieldGroup, createFormGroup, form.FormGroup` | done | 26, al4, types | Typed group names; group state reactive. |
| Cross-field validation | `form-level validators and onChangeListenTo / onBlurListenTo` | done | 5, r9 | Confirmation revalidates when the password changes. |
| External schema resolver | `Standard Schema on validators` | done | 8, p1, p2 | Hand-written Standard Schema, sync and async. |
| Watch / value subscription | `form.Subscribe, form.useStore, useStore` | done | 13, 14, s1 | Rerender only for the selected slice. |
| Single-field reset to defaults | `resetField` | done | 17 | Resets one field. |
| Async default values / isLoading | `form.reset(values) or update when data arrives` | done | u1 | The defaults update while the form is untouched. The loading flag is the app's resource, not a form field. |
| Runtime validation engine vs derive-time wiring | `TanStack runtime validators per cause` | done | 1–8, r1–r9 | Validators are runtime functions per cause. |
| Reactive state observation vs entity observation | `NSH signals and memos` | done | 13, 14, fine_grained | Bindings wake only for what they read. |
| Headless library + renderer | `NSH bindings over nsh/base` | done | b1–b13 | Every value control has a helper. |
| Type-safety of paths/values | `DeepKeys and DeepValue` | done | types | Wrong paths and value types are compile errors. |
| Reusable form presets | `formOptions` | done | 19 | Shared options for two forms. |
| Field arrays with typed add/remove/reorder | `push, insert, replace, remove, swap, move, clear` | done | 15, 27 | Typed; the field API has the same methods. |
| Nested forms / nested object fields | `nested paths, FieldGroupApi, FormGroupApi` | done | 16, 26 | address.city and items[0].name. |
| Submit lifecycle state | `isSubmitting, isSubmitted, isSubmitSuccessful, submissionAttempts` | done | 9, 10, 11 | canSubmit follows isValid unless canSubmitWhenInvalid is set. |
| Field-level diff / per-field dirty / patch | `changedPaths, patch, field isDirty` | done | gp9, 2 | Patch is keyed by TanStack path (flat), not by nested object. |
| Error-state helpers incl. server errors | `setErrorMap, getAllErrors, onSubmitAsync` | done | 7, 17b | Server errors land on the form and on fields. |
| Focus management | `focusFirstInvalid` | done | 23, 23b, 23c, 23d-1 … 23d-5, 23e-1 … 23e-5 | Covers every control with a focus method except NumberInput (see Table 1). |
| Validation modes / live isValid | `validationLogic, revalidateLogic, isValid` | done | f4, f5, f6, 11 | Live isValid is form.state.isValid. |
| Touched-field tracking | `isTouched, isBlurred` | done | 2, 21 | Set on blur; the blur of a control the focus move causes still marks touched. |
| Async validation | `onChangeAsync, onBlurAsync, onDynamicAsync and their debounces` | done | 4, 4b, r3, r5, r6, r7, r8 | Debounces run on the manual clock. |
| Partial holders / PATCH payload | `patch(form)` | done | gp9 | Changed values only. Tri-state clear-versus-unchanged is not expressible in TypeScript without a holder type. |
| Field dependency metadata / conditional requiredness | `validators reading other fields; onChangeListenTo` | done | 5, r9 | Revalidation follows the dependency. |
| Schema export (zod / JSON Schema) | `not in TanStack` | not applicable | - | Needs a JSON Schema generator, which is a new dependency. Standard Schema input is covered (8). |
| Wizard / step metadata | `not in TanStack` | not applicable | - | A step is app state in NSH (a signal), not a form concept. The form has nothing to add beyond validateField / validateAllFields. |
| Serde attribute passthrough | `JSON.stringify in saveForm` | not applicable | - | serde rename and skip are Rust attributes on a holder. TypeScript values are plain JSON already; saveForm stores the keys as they are. |
| Devtools / debug introspection | `diagnostics(form)` | done | gp10 | Plain data; render it inside form.Subscribe to follow changes. |
| Remaining text-domain validation (email/URL/slug/UUID) | `email, url, slug, uuid` | done | gp1, gp2, gp3, gp4 | Plain functions; no new dependency. |
| shouldUnregister / unregister / mount-lifecycle registration | `field mount cleanup` | done | 24 | A field made inside a row stops validating when the row goes. |
| Dynamic schema fields at runtime (add whole new fields) | `not offered` | not applicable | - | gpui-form rejects it by design (compile-time field set). TanStack allows field names that are mounted at run time; this package does not add a separate API for it. |
| Native HTML validation bridge | `not applicable in NSH` | not applicable | - | DOM and HTML constraint API. NSH has no DOM. |
| isLoading async-defaults pipeline | `update on arrival (u1)` | done | u1 | Covered by the defaults update; the loading flag is the app's resource. |
| Undo/redo stack | `not offered` | not applicable | - | Out of scope in gpui-form as well. |
| Component runtime UI state persistence | `not offered` | not applicable | - | Out of scope in gpui-form (only holder data persists there). NSH keeps component state in signals. |
| SSR/server-action merge (mergeForm, onServer) | `mergeForm, onSubmitAsync` | done | 19, 7 | mergeForm merges a partial state; server errors are onSubmitAsync (no SSR). |
| Form-level disabled propagation | `per-control disabled prop` | not applicable | - | nsh/base controls take disabled per control; a form-wide switch would be app state. gpui-form marks it low value. |

## State standards: what each public read wakes

Every reactive read below is backed by a memo or a computed of a signal the component owns. Every subscription ends through `cleanup`. The memos are made once, when the field, group or subscription is made, never inside a binding.

| Public read | Owner | What it subscribes to | Wakes a binding when | Test that fails if it regresses |
|---|---|---|---|---|
| `field().state.value` (createField, Field, AppField) | the component that calls `createField` | a memo over `useStore(api.store)`; the snapshot signal is written by the TanStack store subscription | the value changes (`===`) | fine_grained: "a binding on field().state.value does not wake on a blur" |
| `field().state.meta.<key>` (isTouched, isBlurred, isDirty, errors, errorMap, …) | same | one memo per meta key, built from the meta keys present at creation | that key changes | fine_grained (isTouched does not wake on typing); 2 |
| every other `FieldApi` member on `field()` (`getMeta()`, `getValue()`, `handleChange`, …) | the `FieldApi` | none: a plain call, as in TanStack | never; read it inside a binding through `state` if it must follow | 27 (getMeta, getValue) |
| `inputProps`, `numberInputProps`, every `*Props` getter | the field's accessor | the same memos, read inside the getter | as the field read it | 1, 15, b1–b13 |
| `form.Subscribe`, `form.useStore`, `form.useSelector`, `useStore(store, selector)` | the component that calls it | a computed over a signal written by `store.subscribe`; the computed compares with `===` | the selected value changes | 13, 14, s1, al5 |
| `form.state` | the form | TanStack's plain object, not reactive, as in solid-form | not at all; use `Subscribe` or `useStore` | 11 reads it through `Subscribe` |
| `group().state.meta.*` and group `Subscribe` (createFieldGroup, createFormGroup, FormGroup) | the component that makes the group | the same memo pattern over the group store | the key read changes | g2, al4, 26 |
| `changedPaths`, `patch`, `diagnostics` | plain functions | none: they read `form.state` and `getFieldMeta` once | never; call them inside `Subscribe` to follow changes | gp9, gp10 |
| `richEditorProps` document | the field's accessor | `docJson()` read on each change, with a revision that drops a slower answer | the stored document changes | b13 |

## Fixes the tests forced

1. `liveField` returned one accessor that read eleven store slices, so a `field().state.value` binding woke on a blur. Replaced by `reactiveState`: one memo per key, read through a view of the `FieldApi` whose `state` is replaced (`src/reactive.ts`, `src/createField.ts`). Test: fine_grained, both tests.
2. Once `field()` became a view, the focus maps keyed by the field object stopped matching the `FieldApi` the form returns, so `focusFirstInvalid` could not find the input (23 and 23c failed). The maps are now keyed by the field's `store`, which the view and the `FieldApi` share (`src/bind.ts`). Tests: 23, 23c.
3. A `getInfo().instance === field()` identity check in test 27 compared the `FieldApi` with the view. The check now compares the stores, and the difference is listed in Table 1. Test: 27.
4. The groups (`createFieldGroup`, `createFormGroup`) now return views with reactive state, as `createField` does. Test: fine_grained (the same rule), 26, al4.
5. Each control's helper now records its control for `focusFirstInvalid` and tracks focus and blur, so a focus move blurs any of them and the form error is carried back (23d-1 … 23d-5, 23e-1, 23e-3, 23e-4, 23e-5).
6. `richEditorProps`: the rich editor's change event carries only a revision, so the document is read with `docJson()`, and a slower read is dropped by revision (b13).
7. The group types were `any` and did not reject a wrong name or value type. They are now typed from the form, with `@ts-expect-error` proofs in `tests/types.test.tsx`. Two type errors surfaced while doing it (`form.FormGroup` and `withFieldGroup` generics), both fixed in `src/`.
8. Test 23e-2 was first written as an expectation that typed digits reach a `NumberInput` after focus. NSH 0.4.0's `NumberInput` ref focuses its wrapper, so the test now asserts the limit (see the N/A rows).

## Decisions

- `field()` returns a view of the `FieldApi`: `Object.create(api)` with a reactive `state`. Methods and properties come from the `FieldApi` itself. A `FieldApi` method that writes `this.x = …` would write to the view; in form-core 1.33.5 the only such methods are the `private` validation helpers, which the arrow properties call on the `FieldApi`, so the views never write their own properties.
- The `fields` option of `createFieldGroup` accepts a path (`"address"`) or a map (`{ town: "address.city" }`). Both are typed. `withFieldGroup` types its `fields` prop the same way (types test).
- `createFieldGroup`'s returned object is the view with its extras, as the `FieldGroupApi` is in solid-form.
- The validation logic for `onDynamic` is `revalidateLogic`: core runs `onDynamic` only when the logic adds it.
- Aliases are `export const useForm = createForm` and so on, as `nsh-query` does for `createQuery` (`src/aliases.ts`).
- Helper names follow the control: `checkboxProps` and `switchProps` are `toggleProps` under their own names, because the three share the same props.
- `saveForm` / `restoreForm` take the `Storage` as an argument with NSH's `Storage` as the default, so the test and any other store can be passed in. `restoreForm` makes the saved values the defaults, because TanStack has no "dirty draft" operation.

## Findings from these runs

- Core's `transform` applies once, at construction, to the error state. Changes to `values` in it are dropped (`f3` asserts the error state). Listed as a real difference from what the option name suggests.
- `revalidateLogic` never defers `onChange`. It adds `onDynamic` (and `onDynamicAsync`) on the event it watches. `f4` tests both.
- `onDynamic` does not run under `defaultValidationLogic`; `validateAllFields("dynamic")` throws `Unknown validation event type: dynamic`. Dynamic validators need a logic that adds them.
- A custom `ValidationLogicFn` must always call `runValidation`, even when it runs nothing; otherwise core fails with `cannot read property 'Symbol.iterator' of undefined`.
- `NumberInput`'s ref focuses the wrapper view in NSH 0.4.0, so the keyboard does not reach its text field after `focusFirstInvalid` (23e-2).
- `ColorField` and the two group controls (`ToggleGroup`, `RadioGroup`) have no value prop in `nsh/base`, so they have no helper.
- `Keyboard.dismiss()` is the blur used by the screens: Tab does not blur an input headless.
- `ColorPicker` is driven through its parts (`ColorArea`, `ColorSlider`) as children, sized with `panelClass` and `trackClass`.
- Measuring a debounce from outside the app is unreliable: the blur is delivered after the press returns, so the gap is measured inside the app with `Date.now()`, which follows the manual clock.

## Gates

Run in `packages/nsh-form` on this worktree. Output is pasted in the report.

- `nsh check`: exit 0.
- `nsh build`: exit 0, no `warn` line: `built App.tsx into .nsh/out (238.0 KB js, 768.6 KB bytecode, 66ms)`.
- `nsh test`: `100 tests: 100 passed, 0 failed (3.4s)`.
- `grep -rn "setTimeout\|deepEqual\|writePath" packages/nsh-form/src`: no matches.
- `nsh build --release`: exit 0. Bundle of `App.tsx`, which includes every test screen (an upper bound for the adapter alone): `built App.tsx into .nsh/out (115.3 KB js, 140.9 KB bytecode, 149ms)`.
- `nsh test tests/smoke.test.tsx --target macos`: exit 0, 1 test passed.
- Consumer project (`nsh init . --template ts`, `node_modules/nsh-form` linked): check, build and test exit 0.
- Deliberate breaks, one per group, each restored byte-identical: fine-grained field state (the view reads the whole snapshot: fine_grained fails, `expected 3 to be 2`); group types (the group `Field` name becomes `any`: `Unused '@ts-expect-error' directive`, twice); bindings (`toggleButtonProps` never adds an item: b4 fails, `expected [] to equal ["red","green"]`); gpui-form names (`email()` always passes: gp1 and gp10 fail).
