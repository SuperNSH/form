# Brief: nsh-form Rust to TanStack Form parity

Read `docs/brief-common.md` in this worktree first.

## Goal

Bring the Rust crate `crates/nsh-form` to feature parity with TanStack Form, in snake_case Rust, on top of `gpui-form`'s GPUI-free core (`freeoxide-gpui-form-core`: `FormState`, `FieldPath`, numeric checks). Someone who knows TanStack Form must find the same concepts under the same names, with the same behavior. `@tanstack/form-core` cannot run in a Rust app, so this is a port of behavior: read `~/fo/.refs/tanstack-form/packages/form-core/src/FormApi.ts`, `FieldApi.ts`, `ValidationLogic.ts` and `metaHelper.ts`, and match what they do. Read `~/fo/.refs/gpui-form/docs/form-feature-parity-plan.md` for what our GPUI version already judged and why.

## Your paths

Worktree: `~/fo/.worktrees/nsh-form-tanstack`. You may edit only `crates/nsh-form/**` and `docs/parity-rust.md`.

Set this for every cargo command, because a build cache is already prepared there:

```bash
export CARGO_TARGET_DIR=/private/tmp/claude-501/-Users-hmziq--claude-spares-spare-NGupus/5378586f-1e26-4b17-89e9-b3eb305cfd38/scratchpad/verify/target-form
```

## Do not break existing callers

Other projects already use this crate. Every public name on `main` stays and keeps working: `use_form`, `field!`, `Form::{field, values, values_untracked, set_values, is_dirty, is_valid, is_submitting, submit_count, error, reset, mark_saved, load, validate, submit}`, `Field::{rule, async_rule, path, value, value_untracked, set, error, touched, dirty, is_validating, blur}`, `BindField::bind`, `SubmitError` and its constructors, and everything in `rules`. All 10 existing tests must still pass unchanged.

One decision is already made. TanStack's `isDirty` stays true after a value returns to its default, and ours compares against the baseline. Keep `Form::is_dirty` and `Field::dirty` as they are, since saved forms rely on it. Add `is_default_value()` with the same meaning, and add `was_changed()` for TanStack's persistent `isDirty`. Say this in the parity file.

## Required additions

### Validation model

- `ValidationCause::{Change, Blur, Submit, Mount, Server, Dynamic}`, and a `ValidationError = String`.
- `FieldValidators<H, T>` with `on_mount`, `on_change`, `on_change_async` with `on_change_async_debounce`, `on_blur`, `on_blur_async` with `on_blur_async_debounce`, `on_submit`, `on_submit_async`, `on_change_listen_to`, `on_blur_listen_to`. Builder methods on `Field`: `on_change(rule)`, `on_blur(rule)`, and so on. `Field::rule` stays and means "checked on change, on blur and on submit", and `Field::async_rule` stays.
- `FormValidators<H>` with the same names, on `use_form_with(FormOptions)`. A form validator returns `FormValidationResult { form: Option<String>, fields: Vec<(String, String)> }`, which puts errors on fields, as TanStack's `{ fields }` does.
- `error_map()` on field and form, keyed by cause, and `errors()`, the flat list. Errors of a cause clear when that cause reruns and passes, as `FormApi.ts` does.
- A `validate(cause)` method on the field, `validate_field(path, cause)` and `validate_all_fields(cause)` on the form.
- Linked fields: changing a field reruns the validators of fields that listen to it.

### Field state

Tracked methods on `Field`: `is_touched`, `is_blurred`, `is_dirty_persistent` named `was_changed`, `is_pristine`, `is_default_value`, `is_valid`, `errors`, `error_map`, `is_validating` (exists). `handle_change(value)` as a synonym for `set` that also runs `on_change` and listeners. `handle_blur()` as a synonym for `blur` that also runs `on_blur` and listeners. `get_value()`, `set_value()`.

### Form state

Tracked methods on `Form`: `can_submit`, `is_submitted`, `is_submit_successful`, `submission_attempts` (same as `submit_count`), `is_validating`, `is_form_valid`, `is_fields_valid`, `is_fields_validating`, `is_touched`, `is_blurred`, `is_pristine`, `is_default_value`, `was_changed`, `errors`, `error_map`, `field_meta(path)`.

`can_submit` follows TanStack exactly: read `canSubmit` in `FormApi.ts`, including the rule that a pristine form that was never submitted can submit.

### Form methods

`handle_submit(save)` as a synonym for `submit`, `handle_submit_with_meta(meta, save)`, `on_submit_invalid(hook)`, `can_submit_when_invalid(bool)`, `async_debounce(Duration)`, `async_always(bool)`, `get_field_value(path)` returning text or a typed read where possible, `set_field_value` through the field, `reset_with(values)`, `reset_field(path)`, `reset_field_meta(path)`, `set_field_meta(path, change)`, `delete_field(path)`, `set_error_map`, `get_all_errors`.

### Array fields

`array_field!(form, items)` gives a `FieldArray<H, I>` with tracked `len()`, `keys()` (stable across moves and removals) and `items()`, and methods `push_value`, `insert_value`, `replace_value`, `remove_value`, `swap_values`, `move_value`, `clear_values`. These shift the meta of later rows, as `metaHelper.ts` does, so errors stay with their row. `item_field(index)` or a keyed equivalent gives a `Field` for one row's sub-value.

### Listeners

`FieldListeners` and `FormListeners` with `on_change`, `on_blur`, `on_mount`, `on_submit`, with `on_change_debounce`, as in TanStack.

### Reactive slices

`Form::select(|state| ..)` and `Field::select(|meta| ..)` return a `Memo`, so a binding reruns only when its slice changes. This is what `form.Subscribe` is for.

### Bindings

`BindField::bind` stays. Add bindings for `nsh_base` controls, using their real signatures in `~/.cargo/registry/src/*/nsh-base-0.4.0/src`: `bind_switch` and `bind_checkbox` for `Field<H, bool>`, `bind_select` for `Field<H, Option<SharedString>>`, `bind_number_input` for a numeric field. `focus_first_invalid` already happens in `validate`, and must keep working.

### Standard rules

`rules` keeps its functions. Add `pattern` only if it needs no new heavy dependency, or mark it `not done`. Add `min`, `max` as numeric synonyms of `range`'s bounds, and `one_of`.

## Required tests

Add these to `crates/nsh-form/tests/`, using `Headless` on a manual clock. Each must exist by this name and pass:

`field_meta_tracks_touched_blurred_pristine_changed`, `was_changed_stays_true_after_returning_to_default`, `is_default_value_follows_the_baseline`, `on_change_runs_on_edit_only`, `on_blur_runs_on_blur_only`, `on_submit_runs_on_submit_only`, `on_mount_runs_when_the_field_mounts`, `error_map_is_keyed_by_cause_and_clears_on_pass`, `async_validator_debounces_once_and_drops_old_answers`, `linked_field_revalidates_when_its_source_changes`, `form_validator_puts_errors_on_fields`, `form_on_submit_async_gives_server_errors`, `can_submit_matches_tanstack_rules`, `can_submit_when_invalid_allows_a_submit`, `on_submit_invalid_runs_with_the_values`, `handle_submit_with_meta_passes_meta`, `submission_state_flags_follow_a_submit`, `reset_with_values_sets_a_new_baseline`, `reset_field_restores_one_field`, `delete_field_removes_value_and_meta`, `validate_all_fields_shows_every_error`, `listeners_run_with_debounce`, `select_reruns_only_for_its_slice`, `array_push_insert_replace_remove_swap_move_clear`, `array_row_errors_stay_with_their_row_after_removal`, `array_keys_are_stable_through_moves`, `bind_switch_and_checkbox`, `bind_select`, `failed_submit_focuses_the_first_invalid_input`.

## Docs

- `docs/parity-rust.md`: one row for every name in these lists, giving the Rust name. Columns: TanStack name, Rust name, status (`done`, `not applicable`, or `not done`), the test that covers it, a note.
  - `FormOptions`: `formId`, `defaultValues`, `defaultState`, `asyncAlways`, `asyncDebounceMs`, `canSubmitWhenInvalid`, `validators`, `validationLogic`, `listeners`, `onSubmit`, `onSubmitInvalid`, `onSubmitMeta`, `transform`.
  - Validators: `onMount`, `onChange`, `onChangeAsync`, `onChangeAsyncDebounceMs`, `onBlur`, `onBlurAsync`, `onBlurAsyncDebounceMs`, `onSubmit`, `onSubmitAsync`, `onDynamic`, `onDynamicAsync`, `onDynamicAsyncDebounceMs`, `onChangeListenTo`, `onBlurListenTo`.
  - Form state: `values`, `errorMap`, `validationMetaMap`, `fieldMetaBase`, `isSubmitting`, `isSubmitted`, `isValidating`, `submissionAttempts`, `isSubmitSuccessful`, `isFormValidating`, `isFormValid`, `errors`, `isFieldsValidating`, `isFieldsValid`, `isTouched`, `isBlurred`, `isDirty`, `isPristine`, `isDefaultValue`, `isValid`, `canSubmit`, `fieldMeta`.
  - `FormApi`: `clearFieldValues`, `deleteField`, `getAllErrors`, `getFieldInfo`, `getFieldMeta`, `getFieldValue`, `handleSubmit`, `insertFieldValue`, `mount`, `moveFieldValues`, `parseValuesWithSchema`, `parseValuesWithSchemaAsync`, `pushFieldValue`, `removeFieldValue`, `replaceFieldValue`, `reset`, `resetField`, `resetFieldMeta`, `setErrorMap`, `setFieldMeta`, `setFieldValue`, `swapFieldValues`, `update`, `validateAllFields`, `validateArrayFieldsStartingFrom`, `validateField`.
  - `FieldApi`: `clearValues`, `getInfo`, `getLinkedFields`, `getMeta`, `getValue`, `handleBlur`, `handleChange`, `insertValue`, `mount`, `moveValue`, `parseValueWithSchema`, `parseValueWithSchemaAsync`, `pushValue`, `removeValue`, `replaceValue`, `setErrorMap`, `setMeta`, `setValue`, `swapValues`, `update`, `validate`.
- Standard Schema and `parseValuesWithSchema` are `not applicable` in Rust, since `rules` and typed values fill that role. Say so.
- Do not edit the repository README; the agent that started you will.

## Finish conditions

You are finished only when all of these hold. Run them yourself and paste the output in your report.

1. `cargo fmt --all -- --check` exits 0.
2. `cargo clippy -p nsh-form --all-targets -- -D warnings` exits 0.
3. `cargo test -p nsh-form` exits 0, with the original 10 tests unchanged and every test named above present and passing.
4. A small `tests/compat.rs` uses every public name listed under "Do not break existing callers", and compiles.
5. `docs/parity-rust.md` has every required row, and every row marked `done` names a test that exists.
6. You broke the code once on purpose for each of `can_submit_matches_tanstack_rules`, `array_row_errors_stay_with_their_row_after_removal` and `async_validator_debounces_once_and_drops_old_answers`, and saw each fail. Say how in your report.
7. No `std::thread::sleep`, no `std::time::Instant` and no `SystemTime::now` in `crates/nsh-form/src`. Time comes from `nsh_core`.
8. `freeoxide-gpui-form-core` is still used: `FormState` for values and baseline, `FieldPath` for names.
