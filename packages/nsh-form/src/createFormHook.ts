import type { AnyFieldApi, AnyFormApi, BaseFormOptions, DeepKeys, DeepKeysOfType, FieldApi, FormOptions } from "@tanstack/form-core";
import { type Accessor, type Component, context, type JSX, split } from "nsh";
import { createFieldGroup, type FieldGroupExtras } from "./createFieldGroup";
import { createForm, type FormWithExtras } from "./createForm";
import type { FieldComponent } from "./createField";
import { mergeProps } from "./props";

/**
 * The contexts `createFormHook` reads. The field context holds the field accessor a
 * `form.AppField` child receives; the form context holds the form an `AppForm` provides.
 */
export function createFormHookContexts() {
  const fieldContext = context<Accessor<AnyFieldApi>>(null as never);

  function useFieldContext<TData = unknown>(): Accessor<FieldApi<any, string, TData, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>> {
    const field = fieldContext();
    if (!field) {
      throw new Error("`useFieldContext` only works inside an `AppField` child made by `createFormHook`");
    }
    return field as never;
  }

  const formContext = context<AnyFormApi>(null as never);

  function useFormContext<TFormData = Record<string, never>>(): FormWithExtras<TFormData, any, any, any, any, any, any, any, any, any, any, any> {
    const form = formContext();
    if (!form) {
      throw new Error("`useFormContext` only works inside an `AppForm` made by `createFormHook`");
    }
    return form as never;
  }

  return { fieldContext, useFieldContext, useFormContext, formContext };
}

/** A field component of `createFormHook`, rendered as `<field.TextField />` inside an `AppField` child. */
export type FieldComponents = Record<string, Component<any>>;

/** The form `useAppForm` returns: the `FormApi` with `AppField`, `AppForm` and the form components. */
export type AppFormApi<TFormData, TFieldComponents extends FieldComponents, TFormComponents extends FieldComponents> = FormWithExtras<
  TFormData,
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
> &
  TFormComponents & {
    AppField: FieldComponent<TFormData, any, any, any, any, any, any, any, any, any, any, any, TFieldComponents>;
    AppForm: Component<{ children?: JSX.Element }>;
  };

/** Options of `withForm` and `withFieldGroup` components: the form options, and a render function. */
export interface WithFormProps<
  TFormData,
  TRenderProps extends Record<string, unknown>,
  TFieldComponents extends FieldComponents = FieldComponents,
  TFormComponents extends FieldComponents = FieldComponents,
> extends FormOptions<TFormData, any, any, any, any, any, any, any, any, any, any, any> {
  /** Extra props for `render`, besides `form`. */
  props?: TRenderProps;
  render: (props: TRenderProps & { form: AppFormApi<TFormData, TFieldComponents, TFormComponents>; children?: JSX.Element }) => JSX.Element;
}

/** Options of `withFieldGroup`: the field-group options, props for `render`, and the render function. */
export interface WithFieldGroupProps<TFieldGroupData, TRenderProps extends Record<string, unknown>> extends BaseFormOptions<TFieldGroupData, unknown> {
  props?: TRenderProps;
  render: (props: TRenderProps & { group: FieldGroupExtras<TFieldGroupData>; children?: JSX.Element }) => JSX.Element;
}

/** Options of `createFormHook`: the components and the contexts they are bound to. */
export interface CreateFormHookProps<TFieldComponents extends FieldComponents, TFormComponents extends FieldComponents> {
  fieldComponents: TFieldComponents;
  fieldContext: ReturnType<typeof createFormHookContexts>["fieldContext"];
  formComponents: TFormComponents;
  formContext: ReturnType<typeof createFormHookContexts>["formContext"];
}

/**
 * Binds app components to a form type: `useAppForm` makes the form, `withForm` makes a component
 * that takes the form as `form`, and `withFieldGroup` does the same for a field group.
 */
export function createFormHook<const TFieldComponents extends FieldComponents, const TFormComponents extends FieldComponents>(
  opts: CreateFormHookProps<TFieldComponents, TFormComponents>,
) {
  function useAppForm<TFormData>(
    props: () => FormOptions<TFormData, any, any, any, any, any, any, any, any, any, any, any>,
  ): AppFormApi<TFormData, TFieldComponents, TFormComponents> {
    const form = createForm<TFormData, any, any, any, any, any, any, any, any, any, any, any>(props) as unknown as Record<string, any>;

    form.AppForm = (formProps: { children?: JSX.Element }) =>
      opts.formContext.Provider({
        value: form as never,
        get children() {
          return formProps.children;
        },
      });

    form.AppField = (fieldProps: Record<string, unknown> & { children: (field: Accessor<AnyFieldApi> & TFieldComponents) => JSX.Element }) => {
      const [own, rest] = split(fieldProps, ["children"]);
      return form.Field(
        mergeProps(rest, {
          children: (field: Accessor<AnyFieldApi>) =>
            opts.fieldContext.Provider({
              value: field,
              get children() {
                return own.children(Object.assign(field, opts.fieldComponents) as never);
              },
            }),
        }),
      );
    };

    Object.assign(form, opts.formComponents);
    return form as never;
  }

  function withForm<TFormData, TRenderProps extends Record<string, unknown> = {}>(
    params: WithFormProps<TFormData, TRenderProps, TFieldComponents, TFormComponents>,
  ): (innerProps: TRenderProps & { form: AppFormApi<TFormData, TFieldComponents, TFormComponents>; children?: JSX.Element }) => JSX.Element {
    return (innerProps) => params.render(mergeProps(params.props ?? {}, innerProps) as never);
  }

  function withFieldGroup<TFieldGroupData, TRenderProps extends Record<string, unknown> = {}>(
    params: WithFieldGroupProps<TFieldGroupData, TRenderProps>,
  ): <TFormData, const TFields extends DeepKeysOfType<TFormData, object | null | undefined> | Record<string, DeepKeys<TFormData>>>(
    innerProps: TRenderProps & { form: FormWithExtras<TFormData, any, any, any, any, any, any, any, any, any, any, any>; fields: TFields; children?: JSX.Element },
  ) => JSX.Element {
    return (innerProps) => {
      const group = createFieldGroup(() => ({
        form: innerProps.form as never,
        fields: innerProps.fields as never,
        defaultValues: params.defaultValues as never,
        formComponents: opts.formComponents,
      })) as unknown as FieldGroupExtras<TFieldGroupData>;
      return params.render(mergeProps(params.props ?? {}, innerProps, { group }) as never);
    };
  }

  return { useAppForm, withForm, withFieldGroup };
}
