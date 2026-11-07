import { Text, View } from "nsh";
import { Input } from "nsh/base";
import { expect, test } from "nsh/test";
import { createFieldGroup, createForm, createFormHook, createFormHookContexts, createFormGroup, inputProps, toggleProps } from "../src";

/** The `@ts-expect-error` lines below must be type errors under `nsh check`: a wrong path or a wrong value type. */

const form = createForm(() => ({ defaultValues: { address: { city: "" }, title: "", tags: [{ name: "a" }] } }));

const address = createFieldGroup(() => ({ form, fields: "address" }));

export function GroupTypes() {
  return (
    <View>
      <address.Field name="city">{(field) => <Input {...inputProps(field)} />}</address.Field>
      {/* @ts-expect-error zip is not a field of address */}
      <address.Field name="zip">{() => <Text>zip</Text>}</address.Field>
      {/* @ts-expect-error city is a string, so toFixed does not exist on it */}
      <address.Field name="city" validators={{ onChange: ({ value }) => value.toFixed(1) }}>
        {() => <Text>city</Text>}
      </address.Field>
      <form.FormGroup name="address">{(group) => <Text>{`${group().state.meta.isTouched}`}</Text>}</form.FormGroup>
      {/* @ts-expect-error no field called missing */}
      <form.FormGroup name="missing">{() => <Text>missing</Text>}</form.FormGroup>
    </View>
  );
}

const hooks = createFormHookContexts();
const { withFieldGroup } = createFormHook({
  fieldComponents: {},
  formComponents: {},
  fieldContext: hooks.fieldContext,
  formContext: hooks.formContext,
});

const CityGroup = withFieldGroup({
  defaultValues: { city: "" },
  render: ({ group }) => (
    <group.Field name="city">{(field) => <Input {...inputProps(field)} />}</group.Field>
  ),
});

export function WithGroupTypes() {
  return (
    <View>
      <CityGroup form={form} fields="address" />
      {/* @ts-expect-error title is a string, not an object with fields */}
      <CityGroup form={form} fields="title" />
    </View>
  );
}

/** Array rows: a template literal with a number checks as a path without a cast. */
export function ArrayRow(props: { row: number }) {
  return (
    <form.Field name={`tags[${props.row}].name`}>
      {(field) => <Input {...inputProps(field)} />}
    </form.Field>
  );
}

test("the typed names and values of the group and form APIs are checked by nsh check", () => {
  expect(typeof GroupTypes).toBe("function");
  expect(typeof WithGroupTypes).toBe("function");
  expect(typeof ArrayRow).toBe("function");
  expect(typeof toggleProps).toBe("function");
  expect(typeof createFormGroup).toBe("function");
});

/** A fields map: each key is a group field, each value a path of the form. */
const mapped = createFieldGroup(() => ({ form, fields: { town: "address.city" } }));

export function MappedTypes() {
  return (
    <View>
      <mapped.Field name="town">{(field) => <Input {...inputProps(field)} />}</mapped.Field>
      {/* @ts-expect-error town is the map key, not address.city */}
      <mapped.Field name="city">{() => <Text>city</Text>}</mapped.Field>
    </View>
  );
}
