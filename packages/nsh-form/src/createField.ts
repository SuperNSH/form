import {
  type AnyFieldApi,
  type DeepKeys,
  type DeepValue,
  FieldApi,
  type FieldApiOptions,
  type FieldAsyncValidateOrFn,
  type FieldValidateOrFn,
  type FormAsyncValidateOrFn,
  type FormValidateOrFn,
} from "@tanstack/form-core";
import { type Accessor, cleanup, effect, type JSX, split } from "nsh";
import { reactiveState } from "./reactive";
import { useStore } from "./store";

/** The field, read through an accessor that tracks what the view shows: value, meta and errors. */
export type FieldAccessor<F> = Accessor<F>;

/** Props of `form.Field`: the field options, the render function as `children`. */
export type FieldComponentProps<
  TFormData,
  TName extends DeepKeys<TFormData>,
  TData extends DeepValue<TFormData, TName>,
  TOnMount extends undefined | FieldValidateOrFn<TFormData, TName, TData>,
  TOnChange extends undefined | FieldValidateOrFn<TFormData, TName, TData>,
  TOnChangeAsync extends undefined | FieldAsyncValidateOrFn<TFormData, TName, TData>,
  TOnBlur extends undefined | FieldValidateOrFn<TFormData, TName, TData>,
  TOnBlurAsync extends undefined | FieldAsyncValidateOrFn<TFormData, TName, TData>,
  TOnSubmit extends undefined | FieldValidateOrFn<TFormData, TName, TData>,
  TOnSubmitAsync extends undefined | FieldAsyncValidateOrFn<TFormData, TName, TData>,
  TOnDynamic extends undefined | FieldValidateOrFn<TFormData, TName, TData>,
  TOnDynamicAsync extends undefined | FieldAsyncValidateOrFn<TFormData, TName, TData>,
  TFormOnMount extends undefined | FormValidateOrFn<TFormData>,
  TFormOnChange extends undefined | FormValidateOrFn<TFormData>,
  TFormOnChangeAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  TFormOnBlur extends undefined | FormValidateOrFn<TFormData>,
  TFormOnBlurAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  TFormOnSubmit extends undefined | FormValidateOrFn<TFormData>,
  TFormOnSubmitAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  TFormOnDynamic extends undefined | FormValidateOrFn<TFormData>,
  TFormOnDynamicAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  TFormOnServer extends undefined | FormAsyncValidateOrFn<TFormData>,
  TSubmitMeta,
  ExtendedApi = {},
> = Omit<
  FieldApiOptions<
    TFormData,
    TName,
    TData,
    TOnMount,
    TOnChange,
    TOnChangeAsync,
    TOnBlur,
    TOnBlurAsync,
    TOnSubmit,
    TOnSubmitAsync,
    TOnDynamic,
    TOnDynamicAsync,
    TFormOnMount,
    TFormOnChange,
    TFormOnChangeAsync,
    TFormOnBlur,
    TFormOnBlurAsync,
    TFormOnSubmit,
    TFormOnSubmitAsync,
    TFormOnDynamic,
    TFormOnDynamicAsync,
    TFormOnServer,
    TSubmitMeta
  >,
  "form"
> & {
  children: (
    field: FieldAccessor<
      FieldApi<
        TFormData,
        TName,
        TData,
        TOnMount,
        TOnChange,
        TOnChangeAsync,
        TOnBlur,
        TOnBlurAsync,
        TOnSubmit,
        TOnSubmitAsync,
        TOnDynamic,
        TOnDynamicAsync,
        TFormOnMount,
        TFormOnChange,
        TFormOnChangeAsync,
        TFormOnBlur,
        TFormOnBlurAsync,
        TFormOnSubmit,
        TFormOnSubmitAsync,
        TFormOnDynamic,
        TFormOnDynamicAsync,
        TFormOnServer,
        TSubmitMeta
      >
    > &
      ExtendedApi,
  ) => JSX.Element;
};

/**
 * The field component `form.Field` and `form.AppField` share. Its options are read live, so
 * changing a validator or a `name` reaches the field.
 */
export type FieldComponent<
  in out TFormData,
  in out TFormOnMount extends undefined | FormValidateOrFn<TFormData>,
  in out TFormOnChange extends undefined | FormValidateOrFn<TFormData>,
  in out TFormOnChangeAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  in out TFormOnBlur extends undefined | FormValidateOrFn<TFormData>,
  in out TFormOnBlurAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  in out TFormOnSubmit extends undefined | FormValidateOrFn<TFormData>,
  in out TFormOnSubmitAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  in out TFormOnDynamic extends undefined | FormValidateOrFn<TFormData>,
  in out TFormOnDynamicAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  in out TFormOnServer extends undefined | FormAsyncValidateOrFn<TFormData>,
  in out TSubmitMeta,
  in out ExtendedApi = {},
> = <
  const TName extends DeepKeys<TFormData>,
  TData extends DeepValue<TFormData, TName>,
  TOnMount extends undefined | FieldValidateOrFn<TFormData, TName, TData>,
  TOnChange extends undefined | FieldValidateOrFn<TFormData, TName, TData>,
  TOnChangeAsync extends undefined | FieldAsyncValidateOrFn<TFormData, TName, TData>,
  TOnBlur extends undefined | FieldValidateOrFn<TFormData, TName, TData>,
  TOnBlurAsync extends undefined | FieldAsyncValidateOrFn<TFormData, TName, TData>,
  TOnSubmit extends undefined | FieldValidateOrFn<TFormData, TName, TData>,
  TOnSubmitAsync extends undefined | FieldAsyncValidateOrFn<TFormData, TName, TData>,
  TOnDynamic extends undefined | FieldValidateOrFn<TFormData, TName, TData>,
  TOnDynamicAsync extends undefined | FieldAsyncValidateOrFn<TFormData, TName, TData>,
>(
  props: FieldComponentProps<
    TFormData,
    TName,
    TData,
    TOnMount,
    TOnChange,
    TOnChangeAsync,
    TOnBlur,
    TOnBlurAsync,
    TOnSubmit,
    TOnSubmitAsync,
    TOnDynamic,
    TOnDynamicAsync,
    TFormOnMount,
    TFormOnChange,
    TFormOnChangeAsync,
    TFormOnBlur,
    TFormOnBlurAsync,
    TFormOnSubmit,
    TFormOnSubmitAsync,
    TFormOnDynamic,
    TFormOnDynamicAsync,
    TFormOnServer,
    TSubmitMeta,
    ExtendedApi
  >,
) => JSX.Element;

/**
 * The field `form.Field` hands its children: the `FieldApi` itself, with `state` replaced by
 * reactive getters. `field().state.value` reruns a binding only when the value changes, and
 * `field().state.meta.isTouched` only when touched changes. Every other member is the `FieldApi`'s.
 */
export function liveField<F extends AnyFieldApi>(api: F): FieldAccessor<F> {
  const snapshot = useStore(api.store);
  const state = reactiveState(snapshot, ["meta"]);
  const field = Object.create(api, { state: { enumerable: true, get: () => state } }) as F;
  return () => field;
}

/**
 * Makes a field from options that are read live. The field is mounted now and unmounted
 * through `cleanup`, so its validators stop when its component goes.
 */
export function createField<
  TFormData,
  TName extends DeepKeys<TFormData>,
  TData extends DeepValue<TFormData, TName>,
  TOnMount extends undefined | FieldValidateOrFn<TFormData, TName, TData>,
  TOnChange extends undefined | FieldValidateOrFn<TFormData, TName, TData>,
  TOnChangeAsync extends undefined | FieldAsyncValidateOrFn<TFormData, TName, TData>,
  TOnBlur extends undefined | FieldValidateOrFn<TFormData, TName, TData>,
  TOnBlurAsync extends undefined | FieldAsyncValidateOrFn<TFormData, TName, TData>,
  TOnSubmit extends undefined | FieldValidateOrFn<TFormData, TName, TData>,
  TOnSubmitAsync extends undefined | FieldAsyncValidateOrFn<TFormData, TName, TData>,
  TOnDynamic extends undefined | FieldValidateOrFn<TFormData, TName, TData>,
  TOnDynamicAsync extends undefined | FieldAsyncValidateOrFn<TFormData, TName, TData>,
  TFormOnMount extends undefined | FormValidateOrFn<TFormData>,
  TFormOnChange extends undefined | FormValidateOrFn<TFormData>,
  TFormOnChangeAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  TFormOnBlur extends undefined | FormValidateOrFn<TFormData>,
  TFormOnBlurAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  TFormOnSubmit extends undefined | FormValidateOrFn<TFormData>,
  TFormOnSubmitAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  TFormOnDynamic extends undefined | FormValidateOrFn<TFormData>,
  TFormOnDynamicAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  TFormOnServer extends undefined | FormAsyncValidateOrFn<TFormData>,
  TSubmitMeta,
>(
  opts: () => FieldApiOptions<
    TFormData,
    TName,
    TData,
    TOnMount,
    TOnChange,
    TOnChangeAsync,
    TOnBlur,
    TOnBlurAsync,
    TOnSubmit,
    TOnSubmitAsync,
    TOnDynamic,
    TOnDynamicAsync,
    TFormOnMount,
    TFormOnChange,
    TFormOnChangeAsync,
    TFormOnBlur,
    TFormOnBlurAsync,
    TFormOnSubmit,
    TFormOnSubmitAsync,
    TFormOnDynamic,
    TFormOnDynamicAsync,
    TFormOnServer,
    TSubmitMeta
  >,
): FieldAccessor<
  FieldApi<
    TFormData,
    TName,
    TData,
    TOnMount,
    TOnChange,
    TOnChangeAsync,
    TOnBlur,
    TOnBlurAsync,
    TOnSubmit,
    TOnSubmitAsync,
    TOnDynamic,
    TOnDynamicAsync,
    TFormOnMount,
    TFormOnChange,
    TFormOnChangeAsync,
    TFormOnBlur,
    TFormOnBlurAsync,
    TFormOnSubmit,
    TFormOnSubmitAsync,
    TFormOnDynamic,
    TFormOnDynamicAsync,
    TFormOnServer,
    TSubmitMeta
  >
> {
  const api = new FieldApi(opts());
  cleanup(api.mount());
  effect(() => {
    api.update(opts());
  });
  return liveField(api as AnyFieldApi) as never;
}

/** `form.Field`: calls `children` with the live field. The options are the props minus `children`. */
export function Field(props: {
  children: (field: FieldAccessor<AnyFieldApi>) => JSX.Element;
  [key: string]: unknown;
}): JSX.Element {
  const [, options] = split(props, ["children"]);
  const field = createField<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>(
    () => options as never,
  );
  return props.children(field as never);
}
