import type { AnyFieldApi, AnyFormApi } from "@tanstack/form-core";
import { type Accessor, untracked } from "nsh";

/** A field, read through the accessor `form.Field` and `AppField` give. The bindings read it inside getters. */
export type FieldRef = Accessor<AnyFieldApi>;

/** A control's focus method, which is all `focusFirstInvalid` needs from a ref. */
export type FocusRef = { focus(): void };

/**
 * Per form-field store: the control that holds the input (`focusFirstInvalid` focuses it). Keyed by the
 * store, which the field view shares with the `FieldApi`, so any view of a field finds the same entry.
 */
const inputs = new WeakMap<object, FocusRef>();
/** The field whose control has focus, per form. */
const focused = new WeakMap<object, AnyFieldApi>();
/** A form-level submit error to put back after the blur that `focusFirstInvalid` causes. */
const carried = new WeakMap<object, unknown>();
/** The latest request per field for a rich-editor document, so a slower answer is dropped. */
const latest = new WeakMap<object, number>();

/** Focus and blur for a control: the focus it takes is tracked, and a blur keeps a form-level submit error. */
function focusHandlers(field: FieldRef) {
  return {
    onFocus() {
      const owner = untracked(field);
      focused.set(owner.form.store, owner);
    },
    onBlur() {
      const owner = untracked(field);
      if (focused.get(owner.form.store) === owner) focused.delete(owner.form.store);
      owner.handleBlur();
      // Core clears a form-level submit error on any blur that passes, and this blur was not the user's doing.
      if (carried.has(owner.store)) {
        owner.form.setErrorMap({ onSubmit: carried.get(owner.store) });
        carried.delete(owner.store);
      }
    },
  };
}

/** A `ref` that records the control for `focusFirstInvalid`, and forgets it when it goes. */
function recordRef(field: FieldRef) {
  return (node: FocusRef | null) => {
    const store = untracked(field).store;
    if (node) inputs.set(store, node);
    else inputs.delete(store);
  };
}

/** Props for an NSH `Input`: `value` follows the field, edits go to `handleChange`, and blur to `handleBlur`. */
export function inputProps(field: FieldRef) {
  return {
    get value(): string {
      return field().state.value as string;
    },
    onChange(event: { value: string }) {
      field().handleChange(event.value);
    },
    ...focusHandlers(field),
    ref: recordRef(field),
  };
}

/** Props for an NSH `NumberInput`: `value` is a number or `null`. */
export function numberInputProps(field: FieldRef) {
  return {
    get value(): number | null {
      return field().state.value as number | null;
    },
    onChange(event: { value: number | null }) {
      field().handleChange(event.value);
    },
    ...focusHandlers(field),
    ref: recordRef(field),
  };
}

/** Props for an NSH `OtpInput`: `value` is the typed code, and `ref` focuses it. */
export function otpInputProps(field: FieldRef) {
  return {
    get value(): string | null {
      return field().state.value as string | null;
    },
    onChange(event: { value: string }) {
      field().handleChange(event.value);
    },
    ...focusHandlers(field),
    ref: recordRef(field),
  };
}

/** Props for an NSH `Switch` or `Checkbox`: both take `checked` and `onChange({ checked })`. */
export function toggleProps(field: FieldRef) {
  return {
    get checked(): boolean {
      return field().state.value as boolean;
    },
    onChange(event: { checked: boolean }) {
      field().handleChange(event.checked);
    },
  };
}

/** Props for an NSH `Checkbox`: the same props as `toggleProps`, named for the control. */
export const checkboxProps = toggleProps;

/** Props for an NSH `Switch`: the same props as `toggleProps`, named for the control. */
export const switchProps = toggleProps;

/**
 * Props for an NSH `Toggle` (a pressed button). With no `item`, the field is a boolean. With `item`, the
 * field is a list and the toggle is pressed while the list holds `item`, as in a `ToggleGroup`.
 */
export function toggleButtonProps<T = string>(field: FieldRef, item?: T) {
  return {
    get pressed(): boolean {
      const value = field().state.value as unknown;
      if (item === undefined) return value === true;
      return Array.isArray(value) && value.includes(item);
    },
    onChange(event: { pressed: boolean }) {
      const owner = untracked(field);
      if (item === undefined) {
        owner.handleChange(event.pressed);
        return;
      }
      const current = (owner.state.value as unknown[] | null) ?? [];
      const next = event.pressed ? [...current.filter((v) => v !== item), item] : current.filter((v) => v !== item);
      owner.handleChange(next);
    },
  };
}

/**
 * Props for an NSH `Radio`, one per option. The radio is checked while the field holds `option`, and a
 * press asks for it: `onChange` with `checked: true` sets the field to `option`.
 */
export function radioProps<T = string>(field: FieldRef, option: T) {
  return {
    get checked(): boolean {
      return field().state.value === option;
    },
    onChange(event: { checked: boolean }) {
      if (event.checked) field().handleChange(option as never);
    },
  };
}

/** Props for an NSH `Select` or `Combobox`: `value` follows the field. */
export function selectProps<T = string | null>(field: FieldRef) {
  return {
    get value(): T {
      return field().state.value as T;
    },
    onChange(event: { value: T }) {
      field().handleChange(event.value as never);
    },
  };
}

/** Props for an NSH `Combobox`: `value` is the list of chosen values, and `onChange({ value })` sets it. */
export function comboboxProps(field: FieldRef) {
  return {
    get value(): string[] | null {
      return field().state.value as string[] | null;
    },
    onChange(event: { value: string[] }) {
      field().handleChange(event.value);
    },
    ...focusHandlers(field),
  };
}

/** Props for an NSH `Slider`: a number, or a `[low, high]` pair for a range. */
export function sliderProps(field: FieldRef) {
  return {
    get value(): number | [number, number] | null {
      return field().state.value as number | [number, number] | null;
    },
    onChange(event: { value: number | [number, number] }) {
      field().handleChange(event.value as never);
    },
  };
}

/** Props for an NSH `DatePicker`: a date string, a `[start, end]` range, or `null`. */
export function datePickerProps(field: FieldRef) {
  return {
    get value(): string | [string | null, string | null] | null {
      return field().state.value as string | [string | null, string | null] | null;
    },
    onChange(event: { value: string | [string | null, string | null] | null }) {
      field().handleChange(event.value as never);
    },
  };
}

/** Props for an NSH `Calendar`: the same value shape as `DatePicker`. */
export function calendarProps(field: FieldRef) {
  return {
    get value(): string | [string | null, string | null] | null {
      return field().state.value as string | [string | null, string | null] | null;
    },
    onChange(event: { value: string | [string | null, string | null] | null }) {
      field().handleChange(event.value as never);
    },
  };
}

/** Props for an NSH `TimeField`: a time string, or `null`. */
export function timeFieldProps(field: FieldRef) {
  return {
    get value(): string | null {
      return field().state.value as string | null;
    },
    onChange(event: { value: string }) {
      field().handleChange(event.value);
    },
  };
}

/** Props for an NSH `ColorPicker`: a color string, or `null`. */
export function colorPickerProps(field: FieldRef) {
  return {
    get value(): string | null {
      return field().state.value as string | null;
    },
    onChange(event: { value: string }) {
      field().handleChange(event.value);
    },
  };
}

/** Props for an NSH `Editor` (code): `value` is the text, and `ref` focuses it. */
export function editorProps(field: FieldRef) {
  return {
    get value(): string | null {
      return field().state.value as string | null;
    },
    onChange(event: { value: string }) {
      field().handleChange(event.value);
    },
    ...focusHandlers(field),
    ref: recordRef(field),
  };
}

/**
 * Props for an NSH `RichEditor`. Its change event carries only a revision, so the document is read
 * with `docJson()` and stored. Only the newest read is stored; a slower one is dropped.
 */
export function richEditorProps(field: FieldRef) {
  return {
    get content(): unknown {
      return field().state.value;
    },
    onChange() {
      const owner = untracked(field);
      const node = richEditors.get(owner.store);
      if (!node) return;
      const revision = (latest.get(owner.store) ?? 0) + 1;
      latest.set(owner.store, revision);
      void node.docJson().then((doc) => {
        if (latest.get(owner.store) === revision) owner.handleChange(doc as never);
      });
    },
    ...focusHandlers(field),
    ref: (node: (FocusRef & { docJson(): Promise<unknown> }) | null) => {
      const store = untracked(field).store;
      if (node) {
        richEditors.set(store, node);
        inputs.set(store, node);
      } else {
        richEditors.delete(store);
        inputs.delete(store);
      }
    },
  };
}

/** A rich editor's ref, per field store, for `richEditorProps`. */
const richEditors = new WeakMap<object, FocusRef & { docJson(): Promise<unknown> }>();

/**
 * Focuses the first field, in registration order, that has an error and a recorded control.
 * A field with no control is skipped, so a submit never throws for it.
 */
export function focusFirstInvalid(form: AnyFormApi): void {
  for (const info of Object.values(form.fieldInfo)) {
    const field = info?.instance as AnyFieldApi | null | undefined;
    if (!field || field.state.meta.isValid) continue;
    const node = inputs.get(field.store);
    if (node) {
      const current = focused.get(form.store);
      if (current && current.store !== field.store && form.state.errorMap.onSubmit !== undefined) {
        carried.set(current.store, form.state.errorMap.onSubmit);
      }
      node.focus();
      return;
    }
  }
}
