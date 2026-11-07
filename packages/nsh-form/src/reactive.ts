import { type Accessor, computed, untracked } from "nsh";

/**
 * A copy of `source`'s shape whose every key is a getter over its own memo. A binding that reads
 * `result.value` reruns only when `value` changes, not when a sibling key does. Keys named in
 * `nested` are objects of the same kind, built once here; other object values are shared as read.
 */
export function reactiveState<T extends object>(source: Accessor<T>, nested: readonly string[] = []): T {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(untracked(source))) {
    const memo = computed(() => (source() as Record<string, unknown>)[key]);
    const child = nested.includes(key) ? reactiveState(memo as Accessor<object>) : undefined;
    Object.defineProperty(result, key, {
      enumerable: true,
      get: () => child ?? memo(),
    });
  }
  return result as T;
}
