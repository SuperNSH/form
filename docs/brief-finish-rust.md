# Finish brief: nsh-form Rust

Read `docs/brief-finish-common.md` first. You own `crates/nsh-form/**` and `docs/parity-rust.md`, with the same `CARGO_TARGET_DIR` as before. The root `Cargo.lock` may change when you add a dependency.

## 1. Fine-grained state (do this first)

Today `form.version` wakes every binding in the form on every change: one edit reran an unrelated `len()` binding 12 extra times. `tests/fine_grained.rs` fails in all 4 tests.

Replace it. Requirements:

- `Field::value`, `is_touched`, `is_blurred`, `was_changed`, `dirty`, `is_pristine`, `is_default_value`, `is_valid`, `error`, `errors`, `error_map`, `is_validating` each wake only for their own value.
- `Form::is_dirty`, `is_valid`, `can_submit`, `is_submitting`, `submit_count`, `errors` and the other flags wake only when their result changes. `computed` is the tool, as `references/rust.md` says: "a memo to narrow a large value to the part a binding needs".
- `FieldArray::len` and `keys` wake only when the rows change. A row's field wakes only for its own row.
- Paths nest. Writing `address.city` wakes a binding on `address` and on `address.city`, and not one on `address.street`. `set_values`, `load`, `reset` and `reset_with` wake only what changed.
- Metadata survives the field's component, so it lives under the form's owner. Do not make signals inside a row or a binding.

`Field::select` and `Form::select` stay.

## 2. Close the open rows

- `pattern`: `regex` is already in this crate's dependency tree through NSH (`cargo tree` shows `regex v1.13.1`), so the "heavy dependency" reason is wrong. Implement it.
- `defaultState`: implement it. Restoring a saved form state includes values, errors, metadata and submission state.
- `onSubmitMeta`: a default meta, used by `handle_submit`, without breaking `use_form`.
- `getFieldValue`: a typed read by path, `form.get_field_value::<T>(path) -> Option<T>`.

## 3. Reopen these `not applicable` rows

- `formId`: `FormOptions::form_id`, with a getter.
- `transform`: read how `FormApi.ts` uses it, implement `FormOptions::transform`, and add `merge_form` and shared options like `formOptions`.
- `getFieldInfo`, `getInfo`, `getLinkedFields`: read APIs for path, registration and the linked fields.
- `update` on form and field: change validators and options at run time.
- `validationMetaMap`, `fieldMetaBase`: read APIs, if these have any public meaning in TanStack. Otherwise keep `not applicable` with the reason.
- Standard Schema, `parseValuesWithSchema(Async)`, `parseValueWithSchema(Async)`: add a `Schema<T>` trait returning issues with a path and a message, with `on_change_schema` and the like on fields and forms, and `parse_values_with_schema` and `parse_value_with_schema`, plain and async. A hand-written schema in a test proves it. Do not add a schema dependency.

Also fix this difference: async submit checks run one after another, and TanStack runs them together with `Promise.all`. Run them concurrently and test it on the manual clock.

## 4. Everything `gpui-form` has

Add a second table to `docs/parity-rust.md`: gpui-form name, Rust name, status, test, note. Go through `~/fo/.refs/gpui-form/crates/gpui-form-core/src`, `docs/form-feature-parity-plan.md` and `gpui-form-derive/tests`. At least:

- `rules::phone` behind a `phone` feature, reusing `gpui_form_core::phone`
- `rules::url`, `rules::slug`, `rules::uuid`
- `changed_paths()` and a patch of changed values, as `gpui-form-derive/tests/patch_diff.rs` shows
- Values persistence: a `persist` feature with `serde` that saves and restores through NSH's `Storage`
- `SubmitTracker`'s `last_error`, `set_error`, `clear_error`, `take_last_error`
- Nested forms and arrays of structs with their own fields
- Conditional requiredness, or field dependency metadata, if the derive offers it
- `diagnostics()`, like gpui-query's, for a debug panel
- Keep `not applicable` for `#[derive(GpuiForm)]` (it generates GPUI entities, and `field!` fills this role here), for GPUI widgets, and for localized rule text if messages are already the caller's. Say so.

## 5. Bindings for every control

Add `bind_*` for every control in `nsh_base` that holds a value. Look each one up in `~/.cargo/registry/src/*/nsh-base-0.4.0/src`: `input`, `number_input`, `otp_input`, `checkbox`, `switch`, `toggle`, `toggle_group`, `radio_group`, `select`, `combobox`, `slider`, `date_picker`, `calendar`, `time_field`, `color_field`, `color_picker`, `editor`, `rich_editor`. Test each through a real press or typed value. If one has no value API, say so in the note.

## Finish conditions

1. `cargo fmt --all -- --check` exits 0.
2. `cargo clippy -p nsh-form --all-targets --all-features -- -D warnings` exits 0.
3. `cargo test -p nsh-form --all-features --no-fail-fast` and `cargo test -p nsh-form --no-fail-fast` exit 0. `tests/form.rs` and `tests/fine_grained.rs` are unedited.
4. `grep -n "not done" docs/parity-rust.md` finds no table row.
5. A script confirms that every `done` row in both tables names a test that exists.
6. `form.version` is gone, or no public read method subscribes to it. Show the grep.
7. No `std::thread::sleep`, `std::time::Instant` or `SystemTime::now` in `src`.
8. You broke the code once per group (state signals, schema, gpui-form names, bindings), saw the test fail and restored it. Say how.
