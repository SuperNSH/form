import {
  type DeepKeys,
  type DeepKeysOfType,
  type DeepValue,
  type FieldApi,
  FieldGroupApi,
  type FieldGroupState,
  type FormAsyncValidateOrFn,
  type FormValidateOrFn,
  type StandardSchemaV1,
} from "@tanstack/form-core";
import { type Accessor, cleanup, type JSX } from "nsh";
import type { FormWithExtras } from "./createForm";
import { reactiveState } from "./reactive";
import { type SubscribeProps, subscribe, useStore } from "./store";

/**
 * The data of the group `fields` names. A path (`fields: "address"` on a form with `address: { city }`) gives
 * `{ city }`. A map (`fields: { city: "address.city" }`) gives an object with the map's keys and each path's value.
 */
export type GroupData<TFormData, TFields> = TFields extends string
  ? NonNullable<DeepValue<TFormData, TFields>>
  : TFields extends object
    ? { [K in keyof TFields]: DeepValue<TFormData, TFields[K] & DeepKeys<TFormData>> }
    : unknown;

/** A field of a group, typed by its value: `field().state.value` is `V`. */
export type GroupField<V> = FieldApi<any, any, V, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>;

/**
 * The validators a group field takes, with the value typed as the field's own. Each validator
 * receives `{ value, fieldApi }` and returns a message, or `undefined` for a pass.
 */
export interface GroupFieldValidators<TData, TName extends DeepKeys<TData>, V = DeepValue<TData, TName>> {
  onMount?: (props: { value: V; fieldApi: GroupField<V> }) => unknown;
  onChange?: (props: { value: V; fieldApi: GroupField<V> }) => unknown;
  onChangeAsync?: (props: { value: V; fieldApi: GroupField<V>; signal: AbortSignal }) => unknown;
  onChangeAsyncDebounceMs?: number;
  onBlur?: (props: { value: V; fieldApi: GroupField<V> }) => unknown;
  onBlurAsync?: (props: { value: V; fieldApi: GroupField<V>; signal: AbortSignal }) => unknown;
  onBlurAsyncDebounceMs?: number;
  onSubmit?: (props: { value: V; fieldApi: GroupField<V> }) => unknown;
  onSubmitAsync?: (props: { value: V; fieldApi: GroupField<V>; signal: AbortSignal }) => unknown;
  onDynamic?: (props: { value: V; fieldApi: GroupField<V> }) => unknown;
  onDynamicAsync?: (props: { value: V; fieldApi: GroupField<V>; signal: AbortSignal }) => unknown;
  onDynamicAsyncDebounceMs?: number;
  onChangeListenTo?: DeepKeys<TData>[];
  onBlurListenTo?: DeepKeys<TData>[];
  /** A Standard Schema for the value. */
  schema?: StandardSchemaV1<V, unknown>;
}

/** Props of a group's `Field`: a name relative to the group's data, its validators, and the render function. */
export interface GroupFieldProps<TData, TName extends DeepKeys<TData>> {
  name: TName;
  validators?: GroupFieldValidators<TData, TName>;
  children: (field: Accessor<GroupField<DeepValue<TData, TName>>> & Record<string, any>) => JSX.Element;
}

/** The components a field group adds to `FieldGroupApi`. A name is a path into the group's data, so a wrong one is a type error. */
export interface FieldGroupExtras<TFieldGroupData> {
  AppForm: (props: { children?: JSX.Element }) => JSX.Element;
  AppField: <const TName extends DeepKeys<TFieldGroupData>>(props: GroupFieldProps<TFieldGroupData, TName>) => JSX.Element;
  Field: <const TName extends DeepKeys<TFieldGroupData>>(props: GroupFieldProps<TFieldGroupData, TName>) => JSX.Element;
  Subscribe: <TSelected = FieldGroupState<TFieldGroupData>>(
    props: SubscribeProps<FieldGroupState<TFieldGroupData>, TSelected>,
  ) => JSX.Element;
}

/** Options of `createFieldGroup`: the form (or a parent group), the path of the group's data, and its defaults. */
export interface FieldGroupInit<TFormData, TFields, TSubmitMeta> {
  form:
    | FormWithExtras<TFormData, any, any, any, any, any, any, any, any, any, any, any>
    | FieldGroupApi<any, any, any, any, any, any, any, any, any, any, any, any, any, any>;
  fields: TFields;
  defaultValues?: GroupData<TFormData, TFields>;
  onSubmitMeta?: TSubmitMeta;
  formComponents?: Record<string, unknown>;
}

/**
 * Makes a field group, mounted now and unmounted through `cleanup`. Its components forward to the form
 * with the names mapped, so `group.Field name="city"` is `form.Field name="address.city"` when the group
 * covers `address`. Its state is reactive as `createField`'s is.
 */
export function createFieldGroup<
  TFormData,
  const TFields extends DeepKeysOfType<TFormData, object | null | undefined> | Record<string, DeepKeys<TFormData>>,
  TSubmitMeta = never,
>(
  opts: () => FieldGroupInit<TFormData, TFields, TSubmitMeta>,
): FieldGroupApi<any, any, any, any, any, any, any, any, any, any, any, any, any, any> &
  FieldGroupExtras<GroupData<TFormData, TFields>> {
  const options = opts();
  const api = new FieldGroupApi(options as never);
  const form = (options.form instanceof FieldGroupApi ? options.form.form : options.form) as Record<string, any>;
  const snapshot = useStore(api.store as never);
  const state = reactiveState(snapshot as never, ["meta"]);
  const extended = Object.create(api, { state: { enumerable: true, get: () => state } }) as Record<string, any>;
  extended.AppForm = (props: { children?: JSX.Element }) => form.AppForm(props);
  extended.AppField = (props: unknown) => form.AppField(api.getFormFieldOptions(props as never));
  extended.Field = (props: unknown) => form.Field(api.getFormFieldOptions(props as never));
  extended.Subscribe = (props: SubscribeProps<never, unknown>) => subscribe(api.store as never, props);
  cleanup(api.mount());
  return Object.assign(extended, options.formComponents ?? {}) as never;
}
