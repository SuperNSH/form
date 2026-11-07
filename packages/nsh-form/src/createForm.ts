import {
  type AnyFormApi,
  FormApi,
  type FormAsyncValidateOrFn,
  type FormOptions,
  type FormState,
  type FormValidateOrFn,
} from "@tanstack/form-core";
import { type Accessor, cleanup, effect, type JSX } from "nsh";
import { Field, type FieldComponent } from "./createField";
import { FormGroup, type FormGroupComponent } from "./createFormGroup";
import { focusFirstInvalid } from "./bind";
import { mergeProps } from "./props";
import { type StoreLike, subscribe, type SubscribeProps, useStore } from "./store";

/** Renders `children` with the selected slice; a binding in them reruns only when that slice changes. */
export type SubscribeComponent<TState> = <TSelected = TState>(
  props: SubscribeProps<TState, TSelected>,
) => JSX.Element;

/** `form.useStore(selector?)`: an accessor of the selected slice of the form state. */
export type UseStoreFn<TState> = <TSelected = TState>(
  selector?: (state: TState) => TSelected,
) => Accessor<TSelected>;

/** What `createForm` adds to `FormApi`: the components and hooks that render it. */
export interface FormExtras<
  TFormData,
  TOnMount extends undefined | FormValidateOrFn<TFormData>,
  TOnChange extends undefined | FormValidateOrFn<TFormData>,
  TOnChangeAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  TOnBlur extends undefined | FormValidateOrFn<TFormData>,
  TOnBlurAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  TOnSubmit extends undefined | FormValidateOrFn<TFormData>,
  TOnSubmitAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  TOnDynamic extends undefined | FormValidateOrFn<TFormData>,
  TOnDynamicAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  TOnServer extends undefined | FormAsyncValidateOrFn<TFormData>,
  TSubmitMeta,
> {
  Field: FieldComponent<
    TFormData,
    TOnMount,
    TOnChange,
    TOnChangeAsync,
    TOnBlur,
    TOnBlurAsync,
    TOnSubmit,
    TOnSubmitAsync,
    TOnDynamic,
    TOnDynamicAsync,
    TOnServer,
    TSubmitMeta
  >;
  FormGroup: FormGroupComponent<TFormData>;
  Subscribe: SubscribeComponent<
    FormState<
      TFormData,
      TOnMount,
      TOnChange,
      TOnChangeAsync,
      TOnBlur,
      TOnBlurAsync,
      TOnSubmit,
      TOnSubmitAsync,
      TOnDynamic,
      TOnDynamicAsync,
      TOnServer
    >
  >;
  useStore: UseStoreFn<
    FormState<
      TFormData,
      TOnMount,
      TOnChange,
      TOnChangeAsync,
      TOnBlur,
      TOnBlurAsync,
      TOnSubmit,
      TOnSubmitAsync,
      TOnDynamic,
      TOnDynamicAsync,
      TOnServer
    >
  >;
  /** The same as `useStore`, under the name TanStack's Solid adapter uses. */
  useSelector: UseStoreFn<
    FormState<
      TFormData,
      TOnMount,
      TOnChange,
      TOnChangeAsync,
      TOnBlur,
      TOnBlurAsync,
      TOnSubmit,
      TOnSubmitAsync,
      TOnDynamic,
      TOnDynamicAsync,
      TOnServer
    >
  >;
}

/** A `FormApi` with the NSH components and hooks of `FormExtras`. */
export type FormWithExtras<
  TFormData,
  TOnMount extends undefined | FormValidateOrFn<TFormData>,
  TOnChange extends undefined | FormValidateOrFn<TFormData>,
  TOnChangeAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  TOnBlur extends undefined | FormValidateOrFn<TFormData>,
  TOnBlurAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  TOnSubmit extends undefined | FormValidateOrFn<TFormData>,
  TOnSubmitAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  TOnDynamic extends undefined | FormValidateOrFn<TFormData>,
  TOnDynamicAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  TOnServer extends undefined | FormAsyncValidateOrFn<TFormData>,
  TSubmitMeta,
> = FormApi<
  TFormData,
  TOnMount,
  TOnChange,
  TOnChangeAsync,
  TOnBlur,
  TOnBlurAsync,
  TOnSubmit,
  TOnSubmitAsync,
  TOnDynamic,
  TOnDynamicAsync,
  TOnServer,
  TSubmitMeta
> &
  FormExtras<
    TFormData,
    TOnMount,
    TOnChange,
    TOnChangeAsync,
    TOnBlur,
    TOnBlurAsync,
    TOnSubmit,
    TOnSubmitAsync,
    TOnDynamic,
    TOnDynamicAsync,
    TOnServer,
    TSubmitMeta
  >;

/**
 * Makes a form from options read live, so `validators` and `defaultValues` can change. The
 * form is mounted now and unmounted through `cleanup`. A `Field` made from it reads
 * `form.state` through TanStack's own store, so `form.Field` is the way to bind inputs.
 */
export function createForm<
  TFormData,
  TOnMount extends undefined | FormValidateOrFn<TFormData>,
  TOnChange extends undefined | FormValidateOrFn<TFormData>,
  TOnChangeAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  TOnBlur extends undefined | FormValidateOrFn<TFormData>,
  TOnBlurAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  TOnSubmit extends undefined | FormValidateOrFn<TFormData>,
  TOnSubmitAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  TOnDynamic extends undefined | FormValidateOrFn<TFormData>,
  TOnDynamicAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  TOnServer extends undefined | FormAsyncValidateOrFn<TFormData>,
  TSubmitMeta,
>(
  opts: () => FormOptions<
    TFormData,
    TOnMount,
    TOnChange,
    TOnChangeAsync,
    TOnBlur,
    TOnBlurAsync,
    TOnSubmit,
    TOnSubmitAsync,
    TOnDynamic,
    TOnDynamicAsync,
    TOnServer,
    TSubmitMeta
  >,
): FormWithExtras<
  TFormData,
  TOnMount,
  TOnChange,
  TOnChangeAsync,
  TOnBlur,
  TOnBlurAsync,
  TOnSubmit,
  TOnSubmitAsync,
  TOnDynamic,
  TOnDynamicAsync,
  TOnServer,
  TSubmitMeta
> {
  const withFocus = () => {
    const options = opts();
    const onSubmitInvalid = options.onSubmitInvalid;
    return {
      ...options,
      onSubmitInvalid(args: Parameters<NonNullable<typeof onSubmitInvalid>>[0]) {
        focusFirstInvalid(args.formApi as AnyFormApi);
        onSubmitInvalid?.(args);
      },
    };
  };
  const api = new FormApi<
    TFormData,
    TOnMount,
    TOnChange,
    TOnChangeAsync,
    TOnBlur,
    TOnBlurAsync,
    TOnSubmit,
    TOnSubmitAsync,
    TOnDynamic,
    TOnDynamicAsync,
    TOnServer,
    TSubmitMeta
  >(withFocus());
  cleanup(api.mount());
  effect(() => {
    api.update(withFocus());
  });

  const extended = api as unknown as FormWithExtras<
    TFormData,
    TOnMount,
    TOnChange,
    TOnChangeAsync,
    TOnBlur,
    TOnBlurAsync,
    TOnSubmit,
    TOnSubmitAsync,
    TOnDynamic,
    TOnDynamicAsync,
    TOnServer,
    TSubmitMeta
  >;
  extended.Field = ((props: object) => Field(mergeProps(props, { form: api }) as never)) as never;
  extended.FormGroup = ((props: object) => FormGroup(mergeProps(props, { form: api }) as never)) as never;
  extended.useStore = ((selector?: (state: never) => unknown) =>
    useStore(api.store as unknown as StoreLike<never>, selector)) as never;
  extended.useSelector = extended.useStore;
  extended.Subscribe = ((props: SubscribeProps<never, unknown>) =>
    subscribe(api.store as unknown as StoreLike<never>, props)) as never;
  return extended;
}
