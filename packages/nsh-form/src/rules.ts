/** A field validator: returns the message when the value fails, or `undefined` when it passes. */
export type Rule<T = unknown> = (props: { value: T }) => string | undefined;

/** Fails when the value is empty: `""`, whitespace only, `null`, or `undefined`. */
export function required(message: string): Rule<unknown> {
  return ({ value }) => (value === null || value === undefined || String(value).trim() === "" ? message : undefined);
}

/** One `@` with text on each side, and a dot in the domain. An empty value passes; pair it with `required`. */
export function email(message: string): Rule<string> {
  return ({ value }) => (value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? undefined : message);
}

/** An absolute `http` or `https` URL. An empty value passes; pair it with `required`. */
export function url(message: string): Rule<string> {
  return ({ value }) => {
    if (value === "") return undefined;
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:" ? undefined : message;
    } catch {
      return message;
    }
  };
}

/** Lowercase words of letters and digits joined by single hyphens. An empty value passes. */
export function slug(message: string): Rule<string> {
  return ({ value }) => (value === "" || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ? undefined : message);
}

/** A UUID in the 8-4-4-4-12 hexadecimal form, any version. An empty value passes. */
export function uuid(message: string): Rule<string> {
  return ({ value }) =>
    value === "" || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? undefined : message;
}

/** At least `min` characters, counted as code points. An empty value passes; pair it with `required`. */
export function minLength(min: number, message: string): Rule<string> {
  return ({ value }) => (value === "" || [...value].length >= min ? undefined : message);
}

/** At most `max` characters, counted as code points. */
export function maxLength(max: number, message: string): Rule<string> {
  return ({ value }) => ([...value].length <= max ? undefined : message);
}

/** A number at least `min`. Text that is not a number fails. */
export function min(bound: number, message: string): Rule<number | string | null> {
  return ({ value }) => (value !== null && value !== "" && Number(value) >= bound ? undefined : message);
}

/** A number at most `bound`. Text that is not a number fails. */
export function max(bound: number, message: string): Rule<number | string | null> {
  return ({ value }) => (value !== null && value !== "" && Number(value) <= bound ? undefined : message);
}

/** The whole value matches `regex`. An empty value passes; pair it with `required`. */
export function pattern(regex: RegExp, message: string): Rule<string> {
  return ({ value }) => (value === "" || new RegExp(regex.source, regex.flags.replace(/[gy]/g, "")).test(value) ? undefined : message);
}

/** The value is one of `choices`. */
export function oneOf<T>(choices: readonly T[], message: string): Rule<T> {
  return ({ value }) => (choices.includes(value) ? undefined : message);
}
