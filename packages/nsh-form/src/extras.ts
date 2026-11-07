import type { AnyFormApi } from "@tanstack/form-core";
import { type StorageModule, Storage } from "nsh";

/** The TanStack field paths whose value differs from the default: `"email"`, `"address.city"`. */
export function changedPaths(form: AnyFormApi): string[] {
  return Object.keys(form.state.fieldMeta).filter((path) => form.getFieldMeta(path)?.isDirty === true);
}

/** The changed values only, keyed by TanStack field path: the body of a PATCH. */
export function patch(form: AnyFormApi): Record<string, unknown> {
  return Object.fromEntries(changedPaths(form).map((path) => [path, form.getFieldValue(path)]));
}

/** What a debug panel needs: values, defaults, validity, submission, and each field's meta. Plain data, not reactive. */
export function diagnostics(form: AnyFormApi): Record<string, unknown> {
  const state = form.state;
  const fields = Object.fromEntries(
    Object.keys(state.fieldMeta).map((path) => {
      const meta = form.getFieldMeta(path);
      return [
        path,
        {
          value: form.getFieldValue(path),
          isTouched: meta?.isTouched ?? false,
          isDirty: meta?.isDirty ?? false,
          isValid: meta?.isValid ?? true,
          errors: meta?.errors ?? [],
        },
      ];
    }),
  );
  return {
    values: state.values,
    isDirty: state.isDirty,
    isValid: state.isValid,
    isSubmitting: state.isSubmitting,
    isSubmitted: state.isSubmitted,
    submissionAttempts: state.submissionAttempts,
    errors: state.errors,
    fields,
  };
}

/**
 * Saves the form's values under `key` in NSH's `Storage`, which keeps them on the device. Resolves when
 * the write is done.
 */
export function saveForm(form: AnyFormApi, key: string, storage: StorageModule = Storage): Promise<void> {
  return storage.setItem(key, JSON.stringify(form.state.values));
}

/**
 * Restores values saved by `saveForm`. They become the form's defaults, so the form reads clean; a draft
 * that should stay dirty sets each field with `setFieldValue` instead. Resolves `false` when nothing was saved.
 */
export async function restoreForm(form: AnyFormApi, key: string, storage: StorageModule = Storage): Promise<boolean> {
  const saved = await storage.getItem(key);
  if (saved === null) return false;
  form.reset(JSON.parse(saved));
  return true;
}
