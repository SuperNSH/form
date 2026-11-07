# nsh-form (Rust) parity with TanStack Form

Status of each TanStack Form name in `crates/nsh-form`. Each `done` row names
a test in `crates/nsh-form/tests/` that covers it. Behavior follows
`@tanstack/form-core` 1.33.x (`FormApi.ts`, `FieldApi.ts`, `ValidationLogic.ts`,
`metaHelper.ts`), ported to snake_case Rust on top of `gpui-form`'s
`FormState` and `FieldPath`.

## Decisions

- **`is_dirty` and `dirty` keep their meaning**: the value differs from the
  baseline. The TanStack `isDirty` flag, which stays true after the value
  returns to its default, is `was_changed` (on `Field` and `Form`). The
  TanStack `isDefaultValue` is `is_default_value` (the value equals the
  baseline). `Form::is_dirty` is the inverse of `Form::is_default_value`.
- **Validation runs on events and keeps its results.** `rule` used to be
  checked on every read. Now it runs on change, blur and submit, and each
  cause keeps its own error. An error of a cause clears when that cause runs
  again and passes, as `FormApi.ts` does. Consequence: a fresh form with
  required fields reads as valid until a validator has run. TanStack behaves
  the same way.
- **Errors show after a blur or a submit, not while typing.** The existing
  tests require this (`errors_wait_for_a_submit`). `Field::error()` keeps that
  rule. `error_map()`, `errors()` and `get_all_errors()` show the raw results
  at all times. A server error and a mount error show at once.
- **`rule` is `on_change`, `on_blur` and `on_submit` together.** `errors()`
  lists each distinct message once, so the same message from two causes shows
  once. `error_map()` keeps both.
- **A first submit validates every field even when `can_submit` is false.**
  TanStack returns early on a first submit that cannot submit, and then shows
  no new errors. The existing test `errors_wait_for_a_submit` needs every
  error to show on the first submit, so this port validates first.
- **Submit runs the async checks after the sync checks pass**, unless
  `async_always` is set. The async checks run together, each in its own task,
  as `Promise.all` does (test `submit_checks_run_together`). A check whose
  field failed is skipped.
- **Stale async answers are dropped.** Starting a new run cancels the running
  task, and a generation number drops any answer that still arrives.
- **Form-level results win over a field's own result for the same cause**, as
  `determineFieldLevelErrorSourceAndValue` does.
- **Server errors clear on the next change, blur or submit** (TanStack's
  `onServer` cause).
- **`set` and `blur` are kept.** `set` is `set_value`, except that an equal
  value is not a change, as on `main`, so an effect may write back what it reads
  (`set_with_an_equal_value_changes_nothing`). `set_value` and `handle_change`
  follow TanStack `setFieldValue`: an equal value still marks the field touched
  and changed and runs the validators (`handle_change_with_an_equal_value_counts_as_a_change`).
  `blur` is `handle_blur`. Both run
  the validators and listeners. `Field::touched()` is
  kept as it was: it reports the blur flag, which is `is_blurred()`.
- **Mount validators run when they are added** and again on `mount()`. A mount
  error shows at once and blocks `can_submit` until the field changes.
- **`delete_field` keeps the value.** A typed field cannot be absent, so
  `Field::delete_value` puts the type's default in place and clears the
  field's metadata.
- **Array rows have keys.** A row's field stays with its row through moves and
  removals. Reading a row field after its row was removed panics with a clear
  message. The row's metadata moves with the row, as `metaHelper.ts` does.
- **Listeners take one callback per event.** A second call replaces the first.
- **`SubmitError` is an alias of `FormValidationResult`.** It has the same
  fields and constructors (`form`, `field`, `and_field`).
- **Controls.** `bind_switch` and `bind_checkbox` take `Field<H, bool>`.
  `bind_select` takes `Field<H, Option<SharedString>>`. `bind_number_input`
  takes `Field<H, Option<f64>>`, where `None` is an empty field. Each returns
  the control with the value bound, as the existing `bind` does for text.
- **Time** comes from `nsh_core` (`timer`, `spawn`). The source has no
  `std::thread::sleep`, `std::time::Instant` or `SystemTime::now`.

## Standard rules (`rules`)

| Rule name | Rust name | status | test | note |
|---|---|---|---|---|
| min | `rules::min` | done | `standard_rules_min_max_and_one_of_fail_outside_their_bounds` | The lower bound of `range`. |
| max | `rules::max` | done | `standard_rules_min_max_and_one_of_fail_outside_their_bounds` | The upper bound of `range`. |
| one_of | `rules::one_of` | done | `standard_rules_min_max_and_one_of_fail_outside_their_bounds` | |
| pattern | `rules::pattern` | done | `pattern_rejects_a_value_that_does_not_match` | `rules::pattern` uses the `regex` crate, which NSH already pulls in. An empty value passes; pair it with `required`. |

## FormOptions

| TanStack name | Rust name | status | test | note |
|---|---|---|---|---|
| formId | `FormOptions::form_id`, `Form::form_id` | done | `form_id_is_read_back` | `FormOptions::form_id`, read with `Form::form_id`. Defaults to `"form"`. |
| defaultValues | `FormOptions::new`, `use_form` | done | `is_default_value_follows_the_baseline` | The value given is the baseline. |
| defaultState | `FormOptions::default_state`, `Form::save_state` | done | `default_state_restores_values_errors_and_submission_state`, `save_state_captures_values_and_flags` | `FormOptions::default_state` and `Form::save_state`. Difference from TanStack: the saved values replace `defaultValues` as the starting values, as the finish brief asks. TanStack takes the values from `defaultValues`. `defaultValues` stays the baseline. |
| asyncAlways | `FormOptions::async_always`, `Form::async_always` | done | `async_always_runs_async_after_a_sync_failure` | |
| asyncDebounceMs | `FormOptions::async_debounce`, `Form::async_debounce` | done | `form_async_debounce_applies_to_validators_without_their_own` | The default for async validators that set no debounce of their own. |
| canSubmitWhenInvalid | `FormOptions::can_submit_when_invalid`, `Form::can_submit_when_invalid` | done | `can_submit_when_invalid_allows_a_submit` | |
| validators | `FormOptions::validators` | done | `form_validator_puts_errors_on_fields` | |
| validationLogic | `FormOptions::validation_logic`, `ValidationLogic` | done | `revalidate_logic_runs_dynamic_validators_after_submit` | `ValidationLogic::revalidate()` gives TanStack's defaults. |
| listeners | `FormOptions::listeners`, `FormListeners` | done | `listeners_run_with_debounce` | |
| onSubmit | `FormOptions::on_submit`, `Form::submit_with_options` | done | `form_options_on_submit_runs_with_options` | `submit` and `handle_submit` still take their own save. |
| onSubmitInvalid | `FormOptions::on_submit_invalid`, `Form::on_submit_invalid` | done | `on_submit_invalid_runs_with_the_values` | |
| onSubmitMeta | `FormOptions::on_submit_meta`, `Form::handle_submit_meta` | done | `on_submit_meta_is_the_default_meta` | `FormOptions::on_submit_meta` sets the default. `Form::handle_submit_meta` passes it, or `M::default()` when none is set. |
| transform | `FormOptions::transform` | done | `transform_changes_the_initial_state` | `FormOptions::transform` runs on the initial state, as TanStack runs it on the first store value. |

## Validators (field and form)

| TanStack name | Rust name | status | test | note |
|---|---|---|---|---|
| onMount | `on_mount` (field and form) | done | `on_mount_runs_when_the_field_mounts`, `form_on_mount_runs_when_the_form_is_made` | |
| onChange | `on_change` | done | `on_change_runs_on_edit_only` | |
| onChangeAsync | `on_change_async`, `async_rule` | done | `async_validator_debounces_once_and_drops_old_answers`, `form_async_change_validator_debounces` | The second test is the form-level variant. |
| onChangeAsyncDebounceMs | `on_change_async_debounce` | done | `async_validator_debounces_once_and_drops_old_answers`, `form_async_change_validator_debounces` | |
| onBlur | `on_blur` | done | `on_blur_runs_on_blur_only` | |
| onBlurAsync | `on_blur_async` | done | `field_blur_and_submit_async_checks_run_at_their_events` | The form-level variant runs through the same job as the form-level change check. It has no test of its own. |
| onBlurAsyncDebounceMs | `on_blur_async_debounce` | done | `field_blur_and_submit_async_checks_run_at_their_events` | |
| onSubmit | `on_submit` | done | `on_submit_runs_on_submit_only` | |
| onSubmitAsync | `on_submit_async` | done | `field_blur_and_submit_async_checks_run_at_their_events`, `form_on_submit_async_gives_server_errors` | |
| onDynamic | `on_dynamic` (field and form) | done | `revalidate_logic_runs_dynamic_validators_after_submit`, `form_level_dynamic_validators_report_on_the_form` | |
| onDynamicAsync | `on_dynamic_async` | done | `dynamic_async_validators_run_after_submit` | The form-level variant has no test of its own. |
| onDynamicAsyncDebounceMs | `on_dynamic_async_debounce` | done | `dynamic_async_validators_run_after_submit` | |
| onChangeListenTo | `on_change_listen_to` | done | `linked_field_revalidates_when_its_source_changes` | Field-level. Form validators see the whole form, so they need no list. |
| onBlurListenTo | `on_blur_listen_to` | done | `linked_field_revalidates_when_its_source_is_blurred` | Field-level, as above. |

## Form state

| TanStack name | Rust name | status | test | note |
|---|---|---|---|---|
| values | `Form::values`, `values_untracked` | done | `on_submit_invalid_runs_with_the_values` | |
| errorMap | `Form::error_map`, `Field::error_map` | done | `error_map_is_keyed_by_cause_and_clears_on_pass`, `form_writers_and_selectors_round_trip` | |
| validationMetaMap | `ValidationMetaMap` | done | `inspection_reads_report_pending_linked_and_base_state` | `Field::validation_meta_map` and `Form::get_field_info`: which causes have an async run in flight. |
| fieldMetaBase | `FieldMetaBase` | done | `inspection_reads_report_pending_linked_and_base_state` | `Field::meta_base` and `Form::field_meta_base`: the stored flags, own errors and form errors, apart. |
| isSubmitting | `Form::is_submitting` | done | `submission_state_flags_follow_a_submit` | |
| isSubmitted | `Form::is_submitted` | done | `submission_state_flags_follow_a_submit` | |
| isValidating | `Form::is_validating` | done | `can_submit_matches_tanstack_rules` | |
| submissionAttempts | `Form::submission_attempts`, `submit_count` | done | `submission_state_flags_follow_a_submit` | |
| isSubmitSuccessful | `Form::is_submit_successful` | done | `submission_state_flags_follow_a_submit` | |
| isFormValidating | `Form::is_form_validating` | done | `form_async_change_validator_debounces` | |
| isFormValid | `Form::is_form_valid` | done | `form_level_dynamic_validators_report_on_the_form` | |
| errors | `Form::errors` | done | `form_level_dynamic_validators_report_on_the_form` | |
| isFieldsValidating | `Form::is_fields_validating` | done | `can_submit_matches_tanstack_rules` | |
| isFieldsValid | `Form::is_fields_valid` | done | `can_submit_matches_tanstack_rules` | |
| isTouched | `Form::is_touched` | done | `form_writers_and_selectors_round_trip` | |
| isBlurred | `Form::is_blurred` | done | `form_writers_and_selectors_round_trip` | |
| isDirty | `Form::was_changed` (TanStack's persistent flag); `Form::is_dirty` (values differ from baseline) | done | `form_writers_and_selectors_round_trip`, `nested_paths_write_and_report_dirty_alone` | See Decisions. |
| isPristine | `Form::is_pristine` | done | `form_writers_and_selectors_round_trip` | |
| isDefaultValue | `Form::is_default_value` | done | `form_writers_and_selectors_round_trip` | |
| isValid | `Form::is_valid` | done | `can_submit_matches_tanstack_rules` | Kept as it was: it is also false while a field validates, which `an_async_rule_debounces_and_keeps_the_form_invalid_meanwhile` requires. |
| canSubmit | `Form::can_submit` | done | `can_submit_matches_tanstack_rules`, `can_submit_is_false_while_a_mount_error_stands`, `can_submit_when_invalid_allows_a_submit` | |
| fieldMeta | `Form::field_meta`, `Field::meta` | done | `form_writers_and_selectors_round_trip` | |

## FormApi

| TanStack name | Rust name | status | test | note |
|---|---|---|---|---|
| clearFieldValues | `FieldArray::clear_values` | done | `array_push_insert_replace_remove_swap_move_clear` | The array is reached through its handle, not a path. |
| deleteField | `Form::delete_field` | done | `delete_field_removes_value_and_meta` | Removes metadata, errors and registration. The value stays; `Field::delete_value` puts the default in place. |
| getAllErrors | `Form::get_all_errors` | done | `form_writers_and_selectors_round_trip` | |
| getFieldInfo | `Form::get_field_info`, `FieldInfo` | done | `inspection_reads_report_pending_linked_and_base_state` | `Form::get_field_info(path)` returns the path, whether it is registered, and its pending validations. |
| getFieldMeta | `Form::field_meta` | done | `form_writers_and_selectors_round_trip` | |
| getFieldValue | `Form::get_field_value` | done | `get_field_value_reads_a_typed_value_by_path` | `Form::get_field_value::<T>(path)`. Tracked. `None` when no field is there or the type differs. |
| handleSubmit | `Form::handle_submit`, `Form::submit` | done | `form_writers_and_selectors_round_trip` | |
| insertFieldValue | `FieldArray::insert_value` | done | `array_push_insert_replace_remove_swap_move_clear` | |
| mount | `Form::mount` | done | `form_on_mount_runs_when_the_form_is_made` | |
| moveFieldValues | `FieldArray::move_value` | done | `array_keys_are_stable_through_moves`, `array_push_insert_replace_remove_swap_move_clear` | |
| parseValuesWithSchema | `Form::parse_values_with_schema` | done | `parse_values_with_schema_reports_issues_now` | `Form::parse_values_with_schema(&dyn Schema<H>)`: issues go to fields and the form. |
| parseValuesWithSchemaAsync | `Form::parse_values_with_schema_async` | done | `parse_values_with_schema_async_waits_for_the_server` | `Form::parse_values_with_schema_async(&AsyncSchema)`. |
| pushFieldValue | `FieldArray::push_value` | done | `array_push_insert_replace_remove_swap_move_clear` | |
| removeFieldValue | `FieldArray::remove_value` | done | `array_row_errors_stay_with_their_row_after_removal`, `array_push_insert_replace_remove_swap_move_clear` | |
| replaceFieldValue | `FieldArray::replace_value` | done | `array_push_insert_replace_remove_swap_move_clear` | |
| reset | `Form::reset`, `Form::reset_with` | done | `reset_goes_back_to_the_baseline`, `reset_with_values_sets_a_new_baseline` | |
| resetField | `Form::reset_field` | done | `reset_field_restores_one_field` | |
| resetFieldMeta | `Form::reset_field_meta` | done | `form_writers_and_selectors_round_trip` | |
| setErrorMap | `Form::set_error_map` | done | `form_writers_and_selectors_round_trip` | Sets the form-level errors. |
| setFieldMeta | `Form::set_field_meta` | done | `form_writers_and_selectors_round_trip` | |
| setFieldValue | `Field::set_value` | done | `linked_field_revalidates_when_its_source_is_blurred` | A path-only setter cannot take a typed value. The setter is on the field. |
| swapFieldValues | `FieldArray::swap_values` | done | `array_push_insert_replace_remove_swap_move_clear` | |
| update | `Form::update`, `Field::update` | done | `form_update_changes_validators_at_run_time`, `field_update_replaces_validators` | `Form::update` replaces the settings and moves values and state only while untouched. `Field::update` replaces validators and listeners. |
| validateAllFields | `Form::validate_all_fields` | done | `validate_all_fields_shows_every_error` | |
| validateArrayFieldsStartingFrom | `FieldArray::validate_from` | done | `validate_from_revalidates_touched_rows` | |
| validateField | `Form::validate_field` | done | `validate_all_fields_shows_every_error` | |

## FieldApi

| TanStack name | Rust name | status | test | note |
|---|---|---|---|---|
| clearValues | `FieldArray::clear_values` | done | `array_push_insert_replace_remove_swap_move_clear` | |
| getInfo | `Field::get_info`, `FieldInfo` | done | `inspection_reads_report_pending_linked_and_base_state` | `Field::get_info`. |
| getLinkedFields | `Field::get_linked_fields` | done | `inspection_reads_report_pending_linked_and_base_state` | `Field::get_linked_fields(cause)`: the fields that listen to this one for `cause`. |
| getMeta | `Field::meta` | done | `select_reruns_only_for_its_slice` | `Field::select` reads it. |
| getValue | `Field::get_value` | done | `form_writers_and_selectors_round_trip` | |
| handleBlur | `Field::handle_blur` (`blur` kept) | done | `field_meta_tracks_touched_blurred_pristine_changed` | |
| handleChange | `Field::handle_change` (`set` kept) | done | `field_meta_tracks_touched_blurred_pristine_changed` | Typing goes through `handle_change` in `bind`. |
| insertValue | `FieldArray::insert_value` | done | `array_push_insert_replace_remove_swap_move_clear` | |
| mount | `Field::mount` | done | `on_mount_runs_when_the_field_mounts` | |
| moveValue | `FieldArray::move_value` | done | `array_keys_are_stable_through_moves`, `array_push_insert_replace_remove_swap_move_clear` | |
| parseValueWithSchema | `Field::parse_value_with_schema` | done | `parse_value_with_schema_checks_one_field` | `Field::parse_value_with_schema(&dyn Schema<T>)`. The issues become the field's submit error. |
| parseValueWithSchemaAsync | `Field::parse_value_with_schema_async` | done | `parse_value_with_schema_async_checks_one_field_after_a_delay` | `Field::parse_value_with_schema_async`. |
| pushValue | `FieldArray::push_value` | done | `array_push_insert_replace_remove_swap_move_clear` | |
| removeValue | `FieldArray::remove_value` | done | `array_row_errors_stay_with_their_row_after_removal` | |
| replaceValue | `FieldArray::replace_value` | done | `array_push_insert_replace_remove_swap_move_clear` | |
| setErrorMap | `Field::set_error_map` | done | `array_row_errors_stay_with_their_row_after_removal` | |
| setMeta | `Field::set_meta` | done | `form_writers_and_selectors_round_trip` | Writes back the touched, blurred and changed flags and the error map. |
| setValue | `Field::set_value` | done | `linked_field_revalidates_when_its_source_is_blurred` | |
| swapValues | `FieldArray::swap_values` | done | `array_push_insert_replace_remove_swap_move_clear` | |
| update | `Form::update`, `Field::update` | done | `form_update_changes_validators_at_run_time`, `field_update_replaces_validators` | `Form::update` replaces the settings and moves values and state only while untouched. `Field::update` replaces validators and listeners. |
| validate | `Field::validate` | done | `validate_all_fields_shows_every_error` | Does nothing until the field is touched, as in TanStack. |

## Shared options (finish brief, section 3)

| TanStack name | Rust name | status | test | note |
|---|---|---|---|---|
| mergeForm | `Form::merge_form` | done | `merge_form_replaces_the_values` | Typed values are replaced as a whole. TanStack deep-merges each key, which a typed struct does not need. |
| formOptions | `form_options` | done | `shared_options_are_reusable` | Returns the options unchanged. In Rust it only names a shared set; TanStack uses it for type inference. |

## gpui-form (finish brief, section 4)

Items come from `gpui-form-core/src`, `docs/form-feature-parity-plan.md` and
`gpui-form-derive/tests`. `url`, `slug` and `uuid` are not in gpui-form; they
are written here from first principles.

| gpui-form name | Rust name | status | test | note |
|---|---|---|---|---|
| rules::phone (phone feature) | `rules::phone` | done | `phone_rule_uses_gpui_forms_phone_check` | Uses `gpui_form_core::phone::validate_optional_phone_number`. Needs `--features phone`. |
| rules::url | `rules::url` | done | `url_slug_uuid_and_required_when_report_their_messages` | Checks the scheme and host; does not resolve DNS. |
| rules::slug | `rules::slug` | done | `url_slug_uuid_and_required_when_report_their_messages` | |
| rules::uuid | `rules::uuid` | done | `url_slug_uuid_and_required_when_report_their_messages` | |
| changed_paths() / patch | `Form::changed_paths`, `Field::changed_value`, `Form::is_field_dirty` | done | `changed_paths_list_only_the_fields_that_differ_from_the_baseline` | `patch_diff.rs` generates a typed patch struct per form. Here each field gives its changed value as an `Option`. |
| persist (serde, Storage) | `FormOptions::persist`, `persist_debounce`, `Form::save_values`, `Form::restore_values` (feature `persist`) | done | `persist_restores_saved_values_and_saves_changes`, `persist_debounce_writes_once_and_save_and_restore_hold` | Changes write after a 300 ms debounce by default, so a burst writes once. `save_values` writes now. `restore_values` drops a pending save and loads the saved values. Saves values, not the whole state. |
| SubmitTracker::last_error | `Form::last_error` | done | `submit_tracker_accessors_set_take_and_clear_the_error` | |
| SubmitTracker::set_error | `Form::set_error` | done | `submit_tracker_accessors_set_take_and_clear_the_error` | |
| SubmitTracker::clear_error | `Form::clear_error` | done | `submit_tracker_accessors_set_take_and_clear_the_error` | |
| SubmitTracker::take_last_error | `Form::take_last_error` | done | `submit_tracker_accessors_set_take_and_clear_the_error` | |
| SubmitTracker::is_submitting / submit_count / is_submitted / is_submit_successful / can_submit / reset | `Form` methods of the same names | done | `submission_state_flags_follow_a_submit` | |
| SubmitTracker::begin / finish / abandon | — | not applicable | — | The steps `Form::submit` runs itself. Calling them by hand would skip the validation steps, so the public entry is `submit`. |
| SubmitAction | `Form::submit` (save closure) | done | `a_valid_submit_makes_the_values_the_baseline` | |
| TouchedFields (bitset) | — | not applicable | — | Indexes fields by position for GPUI. Fields here are keyed by `FieldPath`, and each carries its own touched flag. |
| FormFieldErrors / error_for / field_errors | `Form::get_all_errors`, `Field::errors` | done | `validate_all_fields_shows_every_error` | |
| ValidationCache | — | not applicable | — | Validation runs on events and stores its result. Nothing is recomputed on read, so there is nothing to cache. |
| required_when / field dependencies | `rules::required_when`, `Field::on_change_listen_to`, `Field::on_blur_listen_to` | done | `url_slug_uuid_and_required_when_report_their_messages`, `linked_field_revalidates_when_its_source_changes` | |
| numeric (signed / unsigned) | `rules::signed_number`, `rules::unsigned_number` | done | `numeric_text_uses_the_gpui_form_check` | |
| path (FieldPath, PathSegment) | `FieldPath`, `PathSegment` re-export | done | `nested_paths_write_and_report_dirty_alone`, `row_field_reads_and_writes_one_part_of_a_row` | |
| state (FormState) | `FormState` (values and baseline) | done | `reset_goes_back_to_the_baseline` | |
| async_validation (AsyncFieldValidation) | `Field::on_change_async` and the blur and submit variants | done | `async_validator_debounces_once_and_drops_old_answers` | |
| schema (gpui-form-schema registry) | — | not applicable | — | Describes the GPUI component layout of a form: sections, widths, component kinds. NSH builds its UI in code. |
| koruma validation | — | not applicable | — | koruma is gpui-form's validation engine. `rules` and `Schema` do the same job here. |
| i18n | — | not applicable | — | The messages are plain strings the caller passes in. No localisation layer is needed here. |
| #[derive(GpuiForm)] | `field!`, `array_field!`, `Form` | not applicable | — | The derive generates GPUI entities. `field!` gives the same path binding without generated code. |
| GPUI widgets (gpui-component) | `bind_*` for nsh-base controls | not applicable | — | GPUI widgets are not used. See the bindings table. |
| nested forms (component nested) | nested struct paths, `FieldArray::field_of` | done | `nested_paths_write_and_report_dirty_alone`, `row_field_reads_and_writes_one_part_of_a_row` | Nested struct fields are paths; arrays of structs have their own fields per row. |
| list fields and list paths | `array_field!`, `FieldArray` | done | `array_push_insert_replace_remove_swap_move_clear`, `array_keys_are_stable_through_moves` | |
| value holder conversions (from / into) | `bind_number_input` converts `Option<f64>` | done | `bind_number_input_writes_the_number` | Conversions happen at the binding. The field keeps its typed value. |
| form state facade (generated) | `Form` | done | `submission_state_flags_follow_a_submit` | `Form` is the one handle, so no generated facade is needed. |
| validation and form state with serde round trip | `FormOptions::persist`, `Form::save_state` / `FormOptions::default_state` | done | `persist_restores_saved_values_and_saves_changes`, `default_state_restores_values_errors_and_submission_state` | |
| schema export | — | not applicable | — | Same as the schema registry row. |
| UI snapshots (ui.rs) | — | not applicable | — | GPUI rendering tests. |
| diagnostics() (gpui-query style) | `Form::diagnostics`, `FormDiagnostics` | done | `changed_paths_list_only_the_fields_that_differ_from_the_baseline` | |

## Bindings for nsh-base controls (finish brief, section 5)

| nsh-base control | Rust name | status | test | note |
|---|---|---|---|---|
| input | `BindField::bind` | done | `typing_in_one_field_does_not_wake_bindings_of_another` (and the original suite) | |
| number_input | `bind_number_input` | done | `bind_number_input_writes_the_number` | |
| checkbox | `bind_checkbox` | done | `bind_switch_and_checkbox` | |
| switch | `bind_switch` | done | `bind_switch_and_checkbox` | |
| toggle | `bind_toggle` | done | `bind_toggle_follows_a_press` | |
| select | `bind_select` | done | `bind_select` | |
| combobox | `bind_combobox` | done | `bind_combobox_follows_a_chosen_item` | |
| editor | `bind_editor` | done | `bind_editor_follows_typed_text` | |
| otp_input | `bind_otp_input` | done | `bind_otp_input_takes_typed_digits` | Value is `Option<SharedString>`. The cells need a size, or the input cannot be hit. |
| radio_group | `bind_radio` | done | `bind_radio_pressing_a_radio_sets_its_option` | One binding per radio, with its option, as `radioProps(field, option)`. |
| toggle_group | `bind_toggle_item` | done | `bind_toggle_item_each_item_toggles_its_own_value` | One binding per item, as `toggleButtonProps(field, item)`. |
| slider | `bind_slider` | done | `bind_slider_a_drag_changes_the_value` | Single value tested. Range values are bound the same way but not tested. |
| date_picker | `bind_date_picker` | done | `bind_date_picker_two_picks_set_the_range` | Range mode tested. The single-date mode is not tested. |
| calendar | `bind_calendar` | done | `bind_calendar_a_press_on_a_day_sets_the_date` | Value is a `Date`. |
| time_field | `bind_time_field` | done | `bind_time_field_typed_digits_set_the_time` | Typed digits "0930" give 09:30. |
| color_field | — | not applicable | — | NSH 0.4.0 `ColorFieldProps` holds no value. It reads and writes the enclosing ColorPicker's colour, and its only events are `NoEvent`. Bind the color_picker instead. |
| color_picker | `bind_color_picker` | done | `bind_color_picker_a_hue_drag_changes_the_colour` | Hue slider drag works. A drag on the colour area does not change the colour, as in the TypeScript test. Not bound. |
| editor (rich) | `bind_rich_editor` | done | `bind_rich_editor_typing_stores_the_document` | Reads the document through the component ref (`RichEditorApi::doc_json`) with a revision guard. |

## Open rows (not done)

None. Every row is `done` or `not applicable`, with the reason in the note.

## Not applicable

Each `not applicable` row lists its reason in the note. The owner reviews them.
Rows that the finish brief reopened and that are now `done` are not repeated here.

## Not verified

- Owner disposal drops a persist save that is still waiting for its debounce
  (`a_pending_save_is_dropped_when_the_form_goes`). Call `Form::save_values`
  before the form goes when a pending edit must be kept.
- `persist` saves values, not the whole state (errors and metadata are not saved).
- `url` does not resolve DNS; it checks the scheme and host text only.
- The UI of each bound control was tested through the headless engine only.
