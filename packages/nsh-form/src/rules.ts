/** A rule returns the message when the value fails. It sees the whole form, so "must match" works. */
export type Rule<T, V = unknown> = (value: T, values: V) => string | null | undefined;

function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

export function required<T, V = unknown>(message: string): Rule<T, V> {
  return (value) => (isBlank(value) ? message : null);
}

/** Counts characters, not UTF-16 units. An empty value passes, so pair it with `required`. */
export function minLength<V = unknown>(min: number, message: string): Rule<string, V> {
  return (value) => (value.length > 0 && [...value].length < min ? message : null);
}

export function maxLength<V = unknown>(max: number, message: string): Rule<string, V> {
  return (value) => ([...value].length > max ? message : null);
}

/** One `@` with something on both sides and a dot after it. An empty value passes. */
export function email<V = unknown>(message: string): Rule<string, V> {
  return (value) => {
    if (value.length === 0) return null;
    const parts = value.split("@");
    const valid =
      parts.length === 2 &&
      parts[0].length > 0 &&
      parts[1].split(".").length >= 2 &&
      parts[1].split(".").every((part) => part.length > 0);
    return valid ? null : message;
  };
}

export function pattern<V = unknown>(regex: RegExp, message: string): Rule<string, V> {
  return (value) => (value.length === 0 || regex.test(value) ? null : message);
}

export function range<V = unknown>(min: number, max: number, message: string): Rule<number, V> {
  return (value) => (value < min || value > max ? message : null);
}

/** The value must equal another value of the form, such as a password's confirmation. */
export function matches<T, V>(other: (values: V) => T, message: string): Rule<T, V> {
  return (value, values) => (Object.is(value, other(values)) ? null : message);
}

/** Text that is a number. An empty value passes. Rejects leading zeros, as gpui-form does. */
export function numeric<V = unknown>(message: string, options: { signed?: boolean } = {}): Rule<string, V> {
  const shape = options.signed ? /^-?(0|[1-9]\d*)(\.\d+)?$/ : /^(0|[1-9]\d*)(\.\d+)?$/;
  return (value) => (value.length === 0 || shape.test(value) ? null : message);
}
