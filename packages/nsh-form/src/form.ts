import { type Accessor, cleanup, computed, signal, untracked } from "nsh";
import { deepEqual, type Path, type PathValue, readPath, writePath } from "./path";
import type { Rule } from "./rules";

/** Checks a value away from the UI, such as a server asking whether a name is free. */
export interface AsyncRule<T> {
  /** Waits this long after the last edit. Default 300. */
  debounceMs?: number;
  /** Returns the message when the value fails. `signal` fires when a newer edit replaces this check. */
  check: (value: T, context: { signal: AbortSignal }) => Promise<string | null | undefined>;
}

export interface FieldOptions<T, V> {
  rules?: readonly Rule<T, V>[];
  asyncRule?: AsyncRule<T>;
}

/** What a failed submit reports. Resolve `onSubmit` with it, or throw it. */
export interface SubmitErrors {
  form?: string;
  fields?: Record<string, string>;
}

export interface FormOptions<V> {
  initial: V;
  onSubmit?: (values: V) => Promise<SubmitErrors | void> | SubmitErrors | void;
}

/** One value of a form. Reads are tracked. */
export interface Field<T> {
  readonly path: string;
  value: Accessor<T>;
  set(value: T): void;
  /** The message to show: a failing rule once the user left the field or tried to submit, or a server error. */
  error: Accessor<string | null>;
  touched: Accessor<boolean>;
  /** Whether this value differs from the baseline. */
  dirty: Accessor<boolean>;
  /** Whether an async rule is running or waiting for its debounce. */
  validating: Accessor<boolean>;
  /** Marks the field as visited, which lets its error show. */
  blur(): void;
  /** Spread on `Input`: value, edits, blur and the focus a failed submit moves here. */
  inputProps(): {
    readonly value: T;
    onChange(event: { value: T }): void;
    onBlur(): void;
    ref(node: { focus(): void } | null): void;
  };
  /** Spread on `Switch` or `Checkbox`. */
  toggleProps(): { readonly checked: T; onChange(event: { checked: T }): void };
  /** Spread on `Select` or `Combobox`. */
  selectProps(): { readonly value: T; onChange(event: { value: T }): void };
}

/** A list inside the values. Rows have stable keys, for `Each`. */
export interface FieldArray<I> {
  /** One key per row, stable across moves and removals. */
  keys: Accessor<readonly number[]>;
  items: Accessor<readonly I[]>;
  append(item: I): void;
  remove(index: number): void;
  move(from: number, to: number): void;
  replace(items: readonly I[]): void;
}

export interface Form<V> {
  field<P extends Path<V>>(path: P, options?: FieldOptions<PathValue<V, P>, V>): Field<PathValue<V, P>>;
  array<P extends Path<V>>(
    path: P,
  ): PathValue<V, P> extends readonly (infer I)[] ? FieldArray<I> : never;
  values: Accessor<V>;
  isDirty: Accessor<boolean>;
  /** Whether no field reports an error, shown or not, and none is still validating. */
  isValid: Accessor<boolean>;
  isSubmitting: Accessor<boolean>;
  submitCount: Accessor<number>;
  /** The form-level message from the last submit. */
  error: Accessor<string | null>;
  /** Shows every error, focuses the first invalid input, and says whether the form is valid. */
  validate(): boolean;
  /** Validates, then runs `onSubmit`. Does nothing while one runs. A success makes the values the baseline. */
  submit(): Promise<boolean>;
  /** Back to the baseline, with errors and touched flags cleared. */
  reset(): void;
  /** Makes the current values the baseline, so the form reads clean. */
  markSaved(): void;
  /** Replaces values and baseline, for data that loaded after the form was made. */
  load(values: V): void;
  /** Shows errors on fields, as a failed submit does. */
  setErrors(errors: SubmitErrors): void;
}

interface FieldState {
  path: string;
  touched: ReturnType<typeof signal<boolean>>;
  serverError: ReturnType<typeof signal<string | null>>;
  asyncError: ReturnType<typeof signal<string | null>>;
  validating: ReturnType<typeof signal<boolean>>;
  syncError: Accessor<string | null>;
  input: { focus(): void } | null;
  reset(): void;
  api: Field<unknown>;
}

/** A form over the value type `V`. Registered fields are kept by path, so asking twice gives the same field. */
export function createForm<V>(options: FormOptions<V>): Form<V> {
  const values = signal<V>(options.initial);
  const baseline = signal<V>(options.initial);
  const submitted = signal(false);
  const submitting = signal(false);
  const submitCount = signal(0);
  const formError = signal<string | null>(null);
  const fields = new Map<string, FieldState>();
  const registered = signal(0);

  const clearFeedback = () => {
    for (const state of fields.values()) state.reset();
    submitted.set(false);
    formError.set(null);
  };

  const makeField = (path: string, fieldOptions: FieldOptions<unknown, V>): FieldState => {
    const touched = signal(false);
    const serverError = signal<string | null>(null);
    const asyncError = signal<string | null>(null);
    const validating = signal(false);
    const value = () => readPath(values(), path);
    const syncError = computed<string | null>(() => {
      const current = value();
      for (const rule of fieldOptions.rules ?? []) {
        const message = rule(current, values());
        if (message) return message;
      }
      return null;
    });

    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | null = null;
    let generation = 0;

    const stopAsync = () => {
      generation += 1;
      clearTimeout(timer);
      controller?.abort();
      controller = null;
    };
    cleanup(stopAsync);

    const scheduleAsync = () => {
      const rule = fieldOptions.asyncRule;
      if (!rule) return;
      stopAsync();
      asyncError.set(null);
      if (untracked(syncError)) {
        validating.set(false);
        return;
      }
      validating.set(true);
      const own = ++generation;
      const current = untracked(value);
      timer = setTimeout(async () => {
        controller = new AbortController();
        try {
          const message = await rule.check(current, { signal: controller.signal });
          if (own !== generation) return;
          asyncError.set(message ?? null);
        } catch {
          if (own !== generation) return;
          asyncError.set(null);
        }
        validating.set(false);
      }, rule.debounceMs ?? 300);
    };

    const set = (next: unknown) => {
      if (Object.is(untracked(value), next)) return;
      values.set(writePath(untracked(values), path, next));
      serverError.set(null);
      scheduleAsync();
    };

    const blur = () => touched.set(true);

    const state: FieldState = {
      path,
      touched,
      serverError,
      asyncError,
      validating,
      syncError,
      input: null,
      reset() {
        stopAsync();
        touched.set(false);
        serverError.set(null);
        asyncError.set(null);
        validating.set(false);
      },
      api: {
        path,
        value,
        set,
        error() {
          const server = serverError();
          if (server) return server;
          if (!touched() && !submitted()) return null;
          return syncError() ?? asyncError();
        },
        touched,
        dirty: () => !deepEqual(value(), readPath(baseline(), path)),
        validating,
        blur,
        inputProps: () => ({
          get value() {
            return value();
          },
          onChange: (event: { value: unknown }) => set(event.value),
          onBlur: blur,
          ref(node: { focus(): void } | null) {
            state.input = node;
          },
        }),
        toggleProps: () => ({
          get checked() {
            return value();
          },
          onChange: (event: { checked: unknown }) => set(event.checked),
        }),
        selectProps: () => ({
          get value() {
            return value();
          },
          onChange: (event: { value: unknown }) => set(event.value),
        }),
      },
    };
    return state;
  };

  const isClean = (state: FieldState) =>
    !state.serverError() && !state.syncError() && !state.asyncError() && !state.validating();

  const validate = (): boolean => {
    submitted.set(true);
    const firstInvalid = [...fields.values()].find((state) => !untracked(() => isClean(state)));
    firstInvalid?.input?.focus();
    return firstInvalid === undefined;
  };

  const setErrors = (errors: SubmitErrors) => {
    formError.set(errors.form ?? null);
    for (const [path, message] of Object.entries(errors.fields ?? {})) {
      fields.get(path)?.serverError.set(message);
    }
  };

  const markSaved = () => baseline.set(untracked(values));

  return {
    field<P extends Path<V>>(path: P, fieldOptions?: FieldOptions<PathValue<V, P>, V>) {
      let state = fields.get(path);
      if (!state) {
        state = makeField(path, (fieldOptions ?? {}) as FieldOptions<unknown, V>);
        fields.set(path, state);
        registered.update((n) => n + 1);
      }
      return state.api as Field<PathValue<V, P>>;
    },
    array(path) {
      let nextKey = 0;
      const initial = (untracked(() => readPath(values(), path)) ?? []) as readonly unknown[];
      const keys = signal<readonly number[]>(initial.map(() => nextKey++));
      const items = () => (readPath(values(), path) ?? []) as readonly unknown[];
      const write = (next: readonly unknown[]) => values.set(writePath(untracked(values), path, next));
      const api: FieldArray<unknown> = {
        keys,
        items,
        append(item) {
          write([...untracked(items), item]);
          keys.set([...untracked(keys), nextKey++]);
        },
        remove(index) {
          write(untracked(items).filter((_, i) => i !== index));
          keys.set(untracked(keys).filter((_, i) => i !== index));
        },
        move(from, to) {
          const reorder = <T,>(list: readonly T[]): T[] => {
            const copy = [...list];
            const [moved] = copy.splice(from, 1);
            copy.splice(to, 0, moved);
            return copy;
          };
          write(reorder(untracked(items)));
          keys.set(reorder(untracked(keys)));
        },
        replace(next) {
          write(next);
          keys.set(next.map(() => nextKey++));
        },
      };
      return api as never;
    },
    values,
    isDirty: () => !deepEqual(values(), baseline()),
    isValid() {
      registered();
      return [...fields.values()].every(isClean);
    },
    isSubmitting: submitting,
    submitCount,
    error: formError,
    validate,
    async submit() {
      if (untracked(submitting)) return false;
      submitCount.update((n) => n + 1);
      formError.set(null);
      if (!validate()) return false;
      submitting.set(true);
      try {
        const errors = await options.onSubmit?.(untracked(values));
        if (errors && (errors.form || errors.fields)) {
          setErrors(errors);
          return false;
        }
        markSaved();
        return true;
      } catch (thrown) {
        const errors = thrown as SubmitErrors;
        if (errors && (typeof errors.form === "string" || typeof errors.fields === "object")) {
          setErrors(errors);
          return false;
        }
        throw thrown;
      } finally {
        submitting.set(false);
      }
    },
    reset() {
      values.set(untracked(baseline));
      clearFeedback();
    },
    markSaved,
    load(next) {
      values.set(next);
      baseline.set(next);
      clearFeedback();
    },
    setErrors,
  };
}
