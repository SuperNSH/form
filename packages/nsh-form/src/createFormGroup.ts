import { type DeepKeys, type DeepValue, FormGroupApi } from "@tanstack/form-core";
import { type Accessor, cleanup, effect, type JSX, split } from "nsh";
import type { FormWithExtras } from "./createForm";
import type { GroupFieldValidators } from "./createFieldGroup";
import { reactiveState } from "./reactive";
import { useStore } from "./store";

/** A form group over the path `TName` of the form's data: `group().state.meta` is reactive, its fields are typed. */
export type GroupApi<TFormData, TName extends DeepKeys<TFormData>> = FormGroupApi<
  TFormData,
  TName,
  DeepValue<TFormData, TName>,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
>;

/** Options of `createFormGroup`: the form, the path the group covers, and its validators. */
export interface FormGroupInit<TFormData, TName extends DeepKeys<TFormData>> {
  form: FormWithExtras<TFormData, any, any, any, any, any, any, any, any, any, any, any>;
  name: TName;
  validators?: GroupFieldValidators<TFormData, TName>;
  onSubmitMeta?: unknown;
}

/** Props of `form.FormGroup`: the path, and a render function that receives the group. */
export interface FormGroupProps<TFormData, TName extends DeepKeys<TFormData>> {
  name: TName;
  validators?: GroupFieldValidators<TFormData, TName>;
  children: (group: Accessor<GroupApi<TFormData, TName>>) => JSX.Element;
}

/** The component `form.FormGroup` is: the group at `name`, typed by the form's data. */
export type FormGroupComponent<TFormData> = <const TName extends DeepKeys<TFormData>>(
  props: FormGroupProps<TFormData, TName>,
) => JSX.Element;

/**
 * Makes a form group over `name`, mounted now and unmounted through `cleanup`. Its accessor reruns a
 * binding only when the group's own meta changes.
 */
export function createFormGroup<TFormData, const TName extends DeepKeys<TFormData>>(
  opts: () => FormGroupInit<TFormData, TName>,
): Accessor<GroupApi<TFormData, TName>> {
  const api = new FormGroupApi(opts() as never) as unknown as GroupApi<TFormData, TName>;
  cleanup(api.mount());
  effect(() => {
    api.update(opts() as never);
  });
  const snapshot = useStore(api.store as never);
  const state = reactiveState(snapshot as never, ["meta"]);
  const group = Object.create(api, { state: { enumerable: true, get: () => state } }) as GroupApi<TFormData, TName>;
  return () => group;
}

/** `form.FormGroup`: calls `children` with the live group. The options are the props minus `children`. */
export function FormGroup(props: { children: (group: Accessor<unknown>) => JSX.Element; [key: string]: unknown }): JSX.Element {
  const [, options] = split(props, ["children"]);
  const group = createFormGroup(() => options as never);
  return props.children(group as never);
}
