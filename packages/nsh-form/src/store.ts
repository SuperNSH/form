import { type Accessor, cleanup, computed, type JSX, signal } from "nsh";

/** What `useStore` reads from: a TanStack store's state and its `subscribe`. */
export interface StoreLike<T> {
  readonly state: T;
  subscribe(listener: (value: T) => void): { unsubscribe(): void };
}

/**
 * An accessor of the store's selected slice. A binding that reads it reruns only when the
 * selected value changes by `===`, not on every store update. Call it in a component body:
 * the subscription ends when that component goes.
 */
export function useStore<T, S = T>(store: StoreLike<T>, selector?: (state: T) => S): Accessor<S> {
  const snapshot = signal(store.state, { equals: false });
  const subscription = store.subscribe(() => snapshot.set(store.state));
  cleanup(() => subscription.unsubscribe());
  return computed(() => (selector ? selector(snapshot()) : (snapshot() as unknown as S)));
}

/** Props of `Subscribe`: a selector, and children that get the selected slice as an accessor. */
export interface SubscribeProps<TState, TSelected> {
  selector?: (state: TState) => TSelected;
  children: ((state: Accessor<TSelected>) => JSX.Element) | JSX.Element;
}

/** Renders `children` with the selected slice, through `useStore`. */
export function subscribe<TState, TSelected>(
  store: StoreLike<TState>,
  props: SubscribeProps<TState, TSelected>,
): JSX.Element {
  const data = useStore(store, props.selector);
  const children = props.children;
  return typeof children === "function" ? (children as (state: Accessor<TSelected>) => JSX.Element)(data) : children;
}
