type Primitive = string | number | boolean | bigint | symbol | null | undefined | Date;

/** Dotted paths into `V`: `"email"`, `"address.city"`, `"items.0.name"`. */
export type Path<V> = V extends Primitive
  ? never
  : V extends readonly (infer I)[]
    ? `${number}` | (I extends Primitive ? never : `${number}.${Path<I>}`)
    : {
        [K in keyof V & string]: V[K] extends Primitive
          ? K
          : K | `${K}.${Path<NonNullable<V[K]>>}`;
      }[keyof V & string];

/** The value at path `P` of `V`. */
export type PathValue<V, P extends string> = P extends `${infer H}.${infer R}`
  ? H extends keyof V
    ? PathValue<NonNullable<V[H]>, R>
    : V extends readonly (infer I)[]
      ? PathValue<I, R>
      : never
  : P extends keyof V
    ? V[P]
    : V extends readonly (infer I)[]
      ? I
      : never;

export function readPath(values: unknown, path: string): unknown {
  let at = values;
  for (const segment of path.split(".")) {
    if (at === null || at === undefined) return undefined;
    at = (at as Record<string, unknown>)[segment];
  }
  return at;
}

/** A copy of `values` with `path` set. Objects along the path are new, and others are shared. */
export function writePath<V>(values: V, path: string, value: unknown): V {
  const [head, ...rest] = path.split(".");
  const source = values as unknown;
  const copy: Record<string, unknown> | unknown[] = Array.isArray(source)
    ? [...source]
    : { ...(source as Record<string, unknown>) };
  const next = rest.length === 0 ? value : writePath((copy as Record<string, unknown>)[head], rest.join("."), value);
  (copy as Record<string, unknown>)[head] = next;
  return copy as V;
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const left = Object.keys(a);
  const right = Object.keys(b);
  if (left.length !== right.length) return false;
  return left.every((key) => deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
}
