/**
 * Merges props so each key reads live from the last source that has it. Spreading props
 * would copy their getters' values once, and a component runs once, so it would go stale.
 */
export function mergeProps<T extends object>(...sources: object[]): T {
  const merged: Record<PropertyKey, unknown> = {};
  const keys = new Set<PropertyKey>();
  for (const source of sources) for (const key of Reflect.ownKeys(source)) keys.add(key);
  for (const key of keys) {
    Object.defineProperty(merged, key, {
      enumerable: true,
      configurable: true,
      get() {
        for (let i = sources.length - 1; i >= 0; i--) {
          if (Object.hasOwn(sources[i], key)) return (sources[i] as Record<PropertyKey, unknown>)[key];
        }
        return undefined;
      },
    });
  }
  return merged as T;
}
