import { type Accessor, computed, host, Keyboard, type JSX, mount, signal, Text, View } from "nsh";
import {
  Calendar,
  Checkbox,
  ColorArea,
  ColorPicker,
  ColorSlider,
  Combobox,
  DatePicker,
  Editor,
  Input,
  NumberInput,
  OtpInput,
  Radio,
  RadioGroup,
  RichEditor,
  Select,
  Slider,
  Switch,
  TimeField,
  Toggle,
  ToggleGroup,
} from "nsh/base";
import {
  changedPaths,
  diagnostics,
  email,
  max,
  maxLength,
  min,
  minLength,
  oneOf,
  pattern,
  patch,
  required,
  restoreForm,
  saveForm,
  slug,
  url,
  uuid,
  type AnyFieldApi,
  type AnyFieldLikeMeta,
  defaultValidationLogic,
  revalidateLogic,
  type ValidationLogicFn,
  createForm,
  createFormHook,
  createFieldGroup,
  createFormHookContexts,
  useField,
  useFieldGroup,
  useForm,
  useFormGroup,
  useSelector,
  formOptions,
  calendarProps,
  checkboxProps,
  colorPickerProps,
  comboboxProps,
  datePickerProps,
  editorProps,
  inputProps,
  mergeForm,
  numberInputProps,
  otpInputProps,
  radioProps,
  richEditorProps,
  selectProps,
  sliderProps,
  switchProps,
  timeFieldProps,
  toggleButtonProps,
  type StandardSchemaV1,
  toggleProps,
  useStore,
} from "./src";

/** An error as text: a string, or a Standard Schema issue's message. */
function show(error: unknown): string {
  return typeof error === "string" ? error : String((error as { message: string }).message);
}

/** A button that unfocuses the focused input, as the app's own keyboard dismiss does. */
function Blur() {
  return (
    <Text role="button" onPress={() => Keyboard.dismiss()}>
      Blur
    </Text>
  );
}

/** The state a test reads: the field's flags, errors and the causes that set them, as text. */
function meta(field: AnyFieldApi): string {
  const m = field.state.meta;
  const causes = Object.entries(m.errorMap)
    .filter(([, error]) => error)
    .map(([cause]) => cause)
    .join(",");
  return `touched ${m.isTouched} blurred ${m.isBlurred} dirty ${m.isDirty} pristine ${m.isPristine} default ${m.isDefaultValue} valid ${m.isValid} causes ${causes}`;
}

function FieldScreen() {
  const form = createForm(() => ({ defaultValues: { name: "", other: "" }, canSubmitWhenInvalid: true }));
  return (
    <View class="gap-2 p-4">
      <form.Field
        name="name"
        validators={{
          onChange: ({ value }) => (value.length < 3 ? "Too short" : undefined),
          onBlur: ({ value }) => (value === "bad" ? "Not allowed" : undefined),
        }}
      >
        {(field) => (
          <View class="gap-1">
            <Input testID="name" accessibilityLabel="Name" {...inputProps(field)} />
            <Text testID="name-state">{`name ${field().state.value} ${meta(field())}`}</Text>
            <If when={field().state.meta.errors[0]}>{(message) => <Text testID="name-error">{`error ${show(message())}`}</Text>}</If>
          </View>
        )}
      </form.Field>
      <form.Field
        name="other"
        validators={{
          onMount: ({ value }) => (value === "" ? "Empty on mount" : undefined),
          onSubmit: ({ value }) => (value === "" ? "Empty on submit" : undefined),
        }}
      >
        {(field) => (
          <View class="gap-1">
            <Input testID="other" accessibilityLabel="Other" {...inputProps(field)} />
            <Text testID="other-state">{`other ${meta(field())}`}</Text>
          </View>
        )}
      </form.Field>
      <Blur />
      <Text role="button" onPress={() => form.handleSubmit()}>
        Submit
      </Text>
    </View>
  );
}

function AsyncScreen() {
  const runs = signal(0);
  const form = createForm(() => ({ defaultValues: { handle: "" } }));
  return (
    <View class="gap-2 p-4">
      <form.Field
        name="handle"
        validators={{
          onChangeAsyncDebounceMs: 300,
          onChangeAsync: async ({ value }) => {
            runs.update((n) => n + 1);
            await new Promise((done) => setTimeout(done, 100));
            return value === "taken" ? "Taken" : undefined;
          },
        }}
      >
        {(field) => (
          <View class="gap-1">
            <Input testID="handle" accessibilityLabel="Handle" {...inputProps(field)} />
            <Text testID="handle-state">{`validating ${field().state.meta.isValidating} runs ${runs()}`}</Text>
            <If when={field().state.meta.errors[0]}>{(message) => <Text testID="handle-error">{`error ${show(message())}`}</Text>}</If>
          </View>
        )}
      </form.Field>
    </View>
  );
}

function LinkedScreen() {
  const form = createForm(() => ({ defaultValues: { password: "", confirm: "" } }));
  return (
    <View class="gap-2 p-4">
      <form.Field name="password">
        {(field) => <Input testID="password" accessibilityLabel="Password" {...inputProps(field)} />}
      </form.Field>
      <form.Field
        name="confirm"
        validators={{
          onChangeListenTo: ["password"],
          onChange: ({ value, fieldApi }) =>
            value !== fieldApi.form.getFieldValue("password") ? "Passwords differ" : undefined,
        }}
      >
        {(field) => (
          <View class="gap-1">
            <Input testID="confirm" accessibilityLabel="Confirm" {...inputProps(field)} />
            <If when={field().state.meta.errors[0]}>{(message) => <Text testID="confirm-error">{`error ${show(message())}`}</Text>}</If>
          </View>
        )}
      </form.Field>
    </View>
  );
}

type Contact = { email: string; name: string };

function FormValidatorsScreen() {
  const form = createForm(() => ({
    defaultValues: { email: "", name: "" } as Contact,
    validators: {
      onChange: ({ value }) =>
        value.email === "" || value.email.includes("@") ? undefined : { fields: { email: "Needs an @" } },
      onSubmitAsync: async ({ value }) => {
        if (value.email !== "taken@example.com") return null;
        return { form: "Could not save", fields: { email: "Already registered" } };
      },
    },
  }));
  return (
    <View class="gap-2 p-4">
      <form.Field name="email">
        {(field) => (
          <View class="gap-1">
            <Input testID="email" accessibilityLabel="Email" {...inputProps(field)} />
            <If when={field().state.meta.errors[0]}>{(message) => <Text testID="email-error">{`error ${show(message())}`}</Text>}</If>
          </View>
        )}
      </form.Field>
      <form.Field
        name="name"
        validators={{
          onSubmitAsync: async ({ value }) => (value === "root" ? "Reserved name" : undefined),
        }}
      >
        {(field) => (
          <View class="gap-1">
            <Input testID="name" accessibilityLabel="Name" {...inputProps(field)} />
            <If when={field().state.meta.errors[0]}>{(message) => <Text testID="name-error">{`error ${show(message())}`}</Text>}</If>
          </View>
        )}
      </form.Field>
      <form.Subscribe selector={(state) => state.errors}>
        {(errors) => <Text testID="form-errors">{`form errors ${JSON.stringify(errors())}`}</Text>}
      </form.Subscribe>
      <Text role="button" onPress={() => form.handleSubmit()}>
        Submit
      </Text>
      <Blur />
    </View>
  );
}

const isEmail: StandardSchemaV1<string, string> = {
  "~standard": {
    version: 1,
    vendor: "hand-written",
    validate(value) {
      return typeof value === "string" && value.includes("@") ? { value } : { issues: [{ message: "Schema: needs @" }] };
    },
  },
};

type SchemaForm = { email: string; name: string };

const needsName: StandardSchemaV1<SchemaForm, SchemaForm> = {
  "~standard": {
    version: 1,
    vendor: "hand-written",
    validate(value) {
      const form = value as SchemaForm;
      return form.name.trim() ? { value: form } : { issues: [{ message: "Schema: name needed", path: ["name"] }] };
    },
  },
};

function SchemaScreen() {
  const form = createForm(() => ({
    defaultValues: { email: "", name: "" } as SchemaForm,
    validators: { onSubmit: needsName },
  }));
  return (
    <View class="gap-2 p-4">
      <form.Field name="email" validators={{ onChange: isEmail }}>
        {(field) => (
          <View class="gap-1">
            <Input testID="email" accessibilityLabel="Email" {...inputProps(field)} />
            <If when={field().state.meta.errors[0]}>{(message) => <Text testID="email-error">{`error ${show(message())}`}</Text>}</If>
          </View>
        )}
      </form.Field>
      <form.Field name="name">
        {(field) => (
          <View class="gap-1">
            <Input testID="name" accessibilityLabel="Name" {...inputProps(field)} />
            <If when={field().state.meta.errors[0]}>{(message) => <Text testID="name-error">{`error ${show(message())}`}</Text>}</If>
          </View>
        )}
      </form.Field>
      <Text role="button" onPress={() => form.handleSubmit()}>
        Submit
      </Text>
    </View>
  );
}

function SubmitScreen() {
  const ok = signal(0);
  const invalid = signal(0);
  const source = signal("none");
  const form = createForm(() => ({
    defaultValues: { name: "" },
    onSubmit: ({ meta }) => {
      ok.update((n) => n + 1);
      source.set(meta?.source ?? "none");
    },
    onSubmitInvalid: () => invalid.update((n) => n + 1),
    onSubmitMeta: { source: "default" },
  }));
  return (
    <View class="gap-2 p-4">
      <form.Field
        name="name"
        validators={{ onSubmit: ({ value }) => (value.trim() === "" ? "Name required" : undefined) }}
      >
        {(field) => <Input testID="name" accessibilityLabel="Name" {...inputProps(field)} />}
      </form.Field>
      <Text testID="counts">{`ok ${ok()} invalid ${invalid()} source ${source()}`}</Text>
      <form.Subscribe
        selector={(state) => ({
          canSubmit: state.canSubmit,
          isSubmitting: state.isSubmitting,
          isSubmitted: state.isSubmitted,
          isSubmitSuccessful: state.isSubmitSuccessful,
          submissionAttempts: state.submissionAttempts,
          isValidating: state.isValidating,
          isFormValid: state.isFormValid,
          isFieldsValid: state.isFieldsValid,
          isDirty: state.isDirty,
          isPristine: state.isPristine,
          isTouched: state.isTouched,
          isBlurred: state.isBlurred,
          isDefaultValue: state.isDefaultValue,
          errors: state.errors,
        })}
      >
        {(state) => <Text testID="form-state">{`state ${JSON.stringify(state())}`}</Text>}
      </form.Subscribe>
      <Text role="button" onPress={() => form.handleSubmit()}>
        Save
      </Text>
      <Text role="button" onPress={() => form.handleSubmit({ source: "toolbar" })}>
        Share draft
      </Text>
    </View>
  );
}

/**
 * Form options as core applies them. `always` and `normal` run an async check on each edit;
 * `submitAlways` and `submitNormal` fail a sync submit rule, which is where `asyncAlways` acts.
 */
function OptionsScreen() {
  const alwaysRuns = signal(0);
  const normalRuns = signal(0);
  const submitAlwaysRuns = signal(0);
  const submitNormalRuns = signal(0);
  const always = createForm(() => ({
    defaultValues: { name: "" },
    canSubmitWhenInvalid: true,
    asyncDebounceMs: 200,
    validators: {
      onChangeAsync: async () => {
        alwaysRuns.update((n) => n + 1);
        return undefined;
      },
    },
  }));
  const normal = createForm(() => ({
    defaultValues: { name: "" },
    validators: {
      onChangeAsync: async () => {
        normalRuns.update((n) => n + 1);
        return undefined;
      },
    },
  }));
  const submitAlways = createForm(() => ({
    defaultValues: { name: "" },
    canSubmitWhenInvalid: true,
    asyncAlways: true,
    validators: {
      onSubmit: () => "Blocked by a sync rule",
      onSubmitAsync: async () => {
        submitAlwaysRuns.update((n) => n + 1);
        return undefined;
      },
    },
  }));
  const submitNormal = createForm(() => ({
    defaultValues: { name: "" },
    validators: {
      onSubmit: () => "Blocked by a sync rule",
      onSubmitAsync: async () => {
        submitNormalRuns.update((n) => n + 1);
        return undefined;
      },
    },
  }));
  const alwaysCanSubmit = submitAlways.useStore((state) => state.canSubmit);
  const normalCanSubmit = submitNormal.useStore((state) => state.canSubmit);
  return (
    <View class="gap-2 p-4">
      <always.Field name="name">
        {(field) => (
          <View class="gap-1">
            <Input testID="always" accessibilityLabel="Always" {...inputProps(field)} />
            <Text testID="always-state">{`always runs ${alwaysRuns()}`}</Text>
          </View>
        )}
      </always.Field>
      <normal.Field name="name">
        {(field) => (
          <View class="gap-1">
            <Input testID="normal" accessibilityLabel="Normal" {...inputProps(field)} />
            <Text testID="normal-state">{`normal runs ${normalRuns()}`}</Text>
          </View>
        )}
      </normal.Field>
      <Text testID="submit-runs">{`submit always runs ${submitAlwaysRuns()} submit normal runs ${submitNormalRuns()}`}</Text>
      <Text testID="can-submit">{`can submit always ${alwaysCanSubmit()} normal ${normalCanSubmit()}`}</Text>
      <Text role="button" onPress={() => {
        void submitAlways.handleSubmit();
        void submitNormal.handleSubmit();
      }}>
        Save options
      </Text>
      <Blur />
    </View>
  );
}

function SubscribeScreen() {
  const form = createForm(() => ({ defaultValues: { email: "", password: "" } }));
  const sliceRenders = { count: 0 };
  const hookRenders = { count: 0 };
  const standaloneRenders = { count: 0 };
  const renderSlice = (value: string) => {
    sliceRenders.count += 1;
    return `slice ${value} renders ${sliceRenders.count}`;
  };
  const hookEmail = form.useStore((state) => state.values.email);
  const selected = form.useSelector((state) => state.values.email);
  const renderHook = (value: string) => {
    hookRenders.count += 1;
    return `hook ${value} renders ${hookRenders.count}`;
  };
  const standalone = useStore(form.store, (state) => state.values.password);
  const renderStandalone = (value: string) => {
    standaloneRenders.count += 1;
    return `standalone ${value} renders ${standaloneRenders.count}`;
  };
  return (
    <View class="gap-2 p-4">
      <form.Field name="email">
        {(field) => <Input testID="email" accessibilityLabel="Email" {...inputProps(field)} />}
      </form.Field>
      <form.Field name="password">
        {(field) => <Input testID="password" accessibilityLabel="Password" {...inputProps(field)} />}
      </form.Field>
      <form.Subscribe selector={(state) => state.values.email}>
        {(email) => <Text testID="slice">{renderSlice(email())}</Text>}
      </form.Subscribe>
      <Text testID="hook">{renderHook(hookEmail())}</Text>
      <Text testID="selector">{`selector ${selected()}`}</Text>
      <Text testID="standalone">{renderStandalone(standalone())}</Text>
    </View>
  );
}

type Row = { name: string };

function ArrayScreen() {
  const form = createForm(() => ({
    defaultValues: { tags: [{ name: "a" }, { name: "b" }] as Row[], address: { city: "" }, items: [{ name: "" }] },
  }));
  const count = useStore(form.store, (state) => state.values.tags.length);
  const indexes = computed(() => Array.from({ length: count() }, (_, i) => i));
  return (
    <View class="gap-2 p-4">
      <Each of={indexes()} key={(i) => i}>
        {(row) => (
          <form.Field name={`tags[${row()}].name`}>
            {(field) => <Input testID={`tag-${row()}`} accessibilityLabel={`Tag ${row()}`} {...inputProps(field)} />}
          </form.Field>
        )}
      </Each>
      <form.Subscribe selector={(state) => state.values.tags.map((tag) => tag.name).join(",")}>
        {(names) => <Text testID="tags">{`tags ${names()}`}</Text>}
      </form.Subscribe>
      <form.Field name="address.city">
        {(field) => <Input testID="city" accessibilityLabel="City" {...inputProps(field)} />}
      </form.Field>
      <form.Field name="items[0].name">
        {(field) => <Input testID="item" accessibilityLabel="Item" {...inputProps(field)} />}
      </form.Field>
      <form.Subscribe selector={(state) => `${state.values.address.city}|${state.values.items[0].name}`}>
        {(nested) => <Text testID="nested">{`nested ${nested()}`}</Text>}
      </form.Subscribe>
      <Text role="button" onPress={() => form.pushFieldValue("tags", { name: "c" })}>
        Push
      </Text>
      <Text role="button" onPress={() => void form.insertFieldValue("tags", 0, { name: "x" })}>
        Insert
      </Text>
      <Text role="button" onPress={() => void form.replaceFieldValue("tags", 0, { name: "y" })}>
        Replace
      </Text>
      <Text role="button" onPress={() => void form.removeFieldValue("tags", 0)}>
        Remove first
      </Text>
      <Text role="button" onPress={() => form.swapFieldValues("tags", 0, 1)}>
        Swap
      </Text>
      <Text role="button" onPress={() => form.moveFieldValues("tags", 0, 1)}>
        Move
      </Text>
      <Text role="button" onPress={() => form.clearFieldValues("tags")}>
        Clear
      </Text>
    </View>
  );
}

const nameSchema: StandardSchemaV1<{ name: string }, { name: string }> = {
  "~standard": {
    version: 1,
    vendor: "hand-written",
    validate(value) {
      const form = value as { name: string };
      return form.name.trim() ? { value: form } : { issues: [{ message: "Parse: name needed", path: ["name"] }] };
    },
  },
};

function ApiScreen() {
  const form = createForm(() => ({ defaultValues: { name: "" } }));
  const result = signal("none");
  const show = (value: unknown) => result.set(JSON.stringify(value) ?? "undefined");
  return (
    <View class="gap-2 p-4">
      <form.Field
        name="name"
        validators={{ onSubmit: ({ value }) => (value ? undefined : "Submit needs a name") }}
      >
        {(field) => <Input testID="name" accessibilityLabel="Name" {...inputProps(field)} />}
      </form.Field>
      <Text testID="result">{`result ${result()}`}</Text>
      <Text role="button" onPress={() => form.reset()}>
        Reset
      </Text>
      <Text role="button" onPress={() => form.reset({ name: "fresh" })}>
        Reset to fresh
      </Text>
      <Text role="button" onPress={() => form.resetField("name")}>
        Reset name
      </Text>
      <Text role="button" onPress={() => form.setFieldValue("name", "set")}>
        Set name
      </Text>
      <Text role="button" onPress={() => show(form.getFieldValue("name"))}>
        Get name
      </Text>
      <Text role="button" onPress={() => form.setFieldMeta("name", (m) => ({ ...m, isTouched: true }))}>
        Touch name
      </Text>
      <Text role="button" onPress={() => show(form.getFieldMeta("name")?.isTouched)}>
        Get touched
      </Text>
      <Text role="button" onPress={() => form.deleteField("name")}>
        Delete name
      </Text>
      <Text role="button" onPress={() => form.setFieldValue("name", "")}>
        Clear name
      </Text>
      <Text role="button" onPress={() => void form.validateField("name", "submit")}>
        Validate name
      </Text>
      <Text role="button" onPress={() => void form.validateAllFields("submit")}>
        Validate all
      </Text>
      <Text role="button" onPress={() => show(form.getFieldMeta("name")?.errors ?? [])}>
        Get errors
      </Text>
      <Text role="button" onPress={() => show(form.getAllErrors())}>
        All errors
      </Text>
      <Text role="button" onPress={() => show(Boolean(form.getFieldInfo("name")?.instance))}>
        Field registered
      </Text>
      <Text role="button" onPress={() => show(form.resetFieldMeta(form.state.fieldMeta).name?.isTouched)}>
        Reset field meta
      </Text>
      <Text role="button" onPress={() => form.setErrorMap({ onSubmit: { form: "Set by hand", fields: {} } })}>
        Set error map
      </Text>
      <Text role="button" onPress={() => show(form.parseValuesWithSchema(nameSchema))}>
        Parse values
      </Text>
    </View>
  );
}

function ListenersScreen() {
  const formChange = signal(0);
  const formBlur = signal(0);
  const formMount = signal(0);
  const formSubmit = signal(0);
  const debounced = signal(0);
  const fieldChange = signal(0);
  const fieldBlur = signal(0);
  const form = createForm(() => ({
    defaultValues: { name: "", other: "" },
    listeners: {
      onMount: () => formMount.update((n) => n + 1),
      onChange: () => formChange.update((n) => n + 1),
      onBlur: () => formBlur.update((n) => n + 1),
      onSubmit: () => formSubmit.update((n) => n + 1),
    },
  }));
  return (
    <View class="gap-2 p-4">
      <form.Field
        name="name"
        listeners={{
          onChange: () => fieldChange.update((n) => n + 1),
          onBlur: () => fieldBlur.update((n) => n + 1),
        }}
      >
        {(field) => <Input testID="name" accessibilityLabel="Name" {...inputProps(field)} />}
      </form.Field>
      <form.Field
        name="other"
        listeners={{
          onChangeDebounceMs: 200,
          onChange: () => debounced.update((n) => n + 1),
        }}
      >
        {(field) => <Input testID="other" accessibilityLabel="Other" {...inputProps(field)} />}
      </form.Field>
      <Text testID="listeners">{`form-change ${formChange()} form-blur ${formBlur()} form-mount ${formMount()} form-submit ${formSubmit()} field-change ${fieldChange()} field-blur ${fieldBlur()}`}</Text>
      <Text testID="debounced">{`debounced ${debounced()}`}</Text>
      <Blur />
      <Text role="button" onPress={() => form.handleSubmit()}>
        Submit
      </Text>
    </View>
  );
}

const sharedOptions = formOptions({
  defaultValues: { title: "" },
  validators: {
    onChange: ({ value }) => (value.title.length > 5 ? { fields: { title: "Too long" } } : undefined),
  },
});

function FormOptionsScreen() {
  const first = createForm(() => sharedOptions);
  const second = createForm(() => ({ ...sharedOptions, defaultValues: { title: "Second" } }));
  const result = signal("none");
  return (
    <View class="gap-2 p-4">
      <first.Field name="title">
        {(field) => (
          <View class="gap-1">
            <Input testID="first" accessibilityLabel="First" {...inputProps(field)} />
            <If when={field().state.meta.errors[0]}>{(message) => <Text testID="first-error">{`error ${show(message())}`}</Text>}</If>
          </View>
        )}
      </first.Field>
      <second.Field name="title">
        {(field) => <Input testID="second" accessibilityLabel="Second" {...inputProps(field)} />}
      </second.Field>
      <Text testID="merged">{`merged ${result()}`}</Text>
      <Blur />
      <Text
        role="button"
        onPress={() => {
          mergeForm(first, { values: { title: "merged" } });
          result.set(String(first.getFieldValue("title")));
        }}
      >
        Merge
      </Text>
    </View>
  );
}

const hooks = createFormHookContexts();
const { useAppForm, withForm, withFieldGroup } = createFormHook({
  fieldComponents: {
    TextField(props: { testID: string; label: string }) {
      const field = hooks.useFieldContext<string>();
      return (
        <View class="gap-1">
          <Input testID={props.testID} accessibilityLabel={props.label} {...inputProps(field)} />
          <If when={field().state.meta.errors[0]}>{(message) => <Text testID={`${props.testID}-error`}>{`error ${show(message())}`}</Text>}</If>
        </View>
      );
    },
  },
  formComponents: {},
  fieldContext: hooks.fieldContext,
  formContext: hooks.formContext,
});

const SignUpFields = withForm<{ email: string; age: string }, { title: string }>({
  defaultValues: { email: "", age: "" },
  render: ({ form, title }) => (
    <View class="gap-2 p-4">
      <Text>{title}</Text>
      <form.AppField
        name="email"
        validators={{ onChange: ({ value }) => (value.includes("@") || value === "" ? undefined : "Needs an @") }}
      >
        {(field) => <field.TextField testID="hook-email" label="Email" />}
      </form.AppField>
    </View>
  ),
});

function HookScreen() {
  const form = useAppForm(() => ({ defaultValues: { email: "", age: "" } }));
  return <SignUpFields form={form} title="Sign up" />;
}

function ControlsScreen() {
  const form = createForm(() => ({
    defaultValues: { subscribe: false, plan: "free" as string | null, age: null as number | null },
  }));
  return (
    <View class="gap-2 p-4">
      <form.Field name="age">
        {(field) => <NumberInput testID="age" accessibilityLabel="Age" {...numberInputProps(field)} />}
      </form.Field>
      <form.Subscribe selector={(state) => state.values.age}>
        {(age) => <Text testID="age-value">{`age ${age()}`}</Text>}
      </form.Subscribe>
      <form.Field name="subscribe">
        {(field) => (
          <Switch
            accessibilityLabel="Subscribe"
            trackClass="w-11 bg-muted"
            thumbClass="size-5 bg-background"
            {...switchProps(field)}
          />
        )}
      </form.Field>
      <form.Subscribe selector={(state) => state.values.subscribe}>
        {(value) => <Text testID="subscribed">{`subscribed ${value()}`}</Text>}
      </form.Subscribe>
      <form.Field name="plan">
        {(field) => (
          <Select
            accessibilityLabel="Plan"
            trigger={
              <Text role="button" testID="plan-trigger" accessibilityLabel="Plan">
                Choose plan
              </Text>
            }
            items={[
              { value: "free", title: "Free" },
              { value: "pro", title: "Pro" },
            ]}
            {...selectProps(field)}
          />
        )}
      </form.Field>
      <form.Subscribe selector={(state) => state.values.plan}>
        {(value) => <Text testID="plan">{`plan ${value()}`}</Text>}
      </form.Subscribe>
    </View>
  );
}

/** Focus: the first invalid field with an input gets focus. `filled` leaves only the input-less field invalid. */
function FocusScreen(props: { filled: boolean }) {
  const invalid = signal(0);
  const form = createForm(() => ({
    defaultValues: { hidden: "", first: props.filled ? "x" : "", second: props.filled ? "y" : "" },
    onSubmitInvalid: () => invalid.update((n) => n + 1),
  }));
  return (
    <View class="gap-2 p-4">
      <form.Field name="hidden" validators={{ onSubmit: ({ value }) => (value === "" ? "Hidden needed" : undefined) }}>
        {() => <Text testID="hidden-note">Hidden field, no input</Text>}
      </form.Field>
      <form.Field name="first" validators={{ onSubmit: ({ value }) => (value === "" ? "First needed" : undefined) }}>
        {(field) => <Input testID="first" accessibilityLabel="First" {...inputProps(field)} />}
      </form.Field>
      <form.Field name="second" validators={{ onSubmit: ({ value }) => (value === "" ? "Second needed" : undefined) }}>
        {(field) => <Input testID="second" accessibilityLabel="Second" {...inputProps(field)} />}
      </form.Field>
      <Text testID="invalid">{`invalid ${invalid()}`}</Text>
      <Text role="button" onPress={() => form.handleSubmit()}>
        Save
      </Text>
    </View>
  );
}

function RowsScreen() {
  const rows = signal([1, 2]);
  const calls = signal<Record<string, number>>({});
  const form = createForm(() => ({ defaultValues: { items: [{ name: "" }, { name: "" }] } }));
  return (
    <View class="gap-2 p-4">
      <Each of={rows()} key={(id) => id}>
        {(id) => {
          const n = id();
          return (
            <form.Field
              name={`items[${n - 1}].name`}
              validators={{
                onChangeAsyncDebounceMs: 300,
                onChangeAsync: async () => {
                  calls.update((c) => ({ ...c, [String(n)]: (c[String(n)] ?? 0) + 1 }));
                  return undefined;
                },
              }}
            >
              {(field) => <Input testID={`row-${n}`} accessibilityLabel={`Row ${n}`} {...inputProps(field)} />}
            </form.Field>
          );
        }}
      </Each>
      <Text testID="calls">{`calls row1 ${calls()["1"] ?? 0} row2 ${calls()["2"] ?? 0}`}</Text>
      <Text role="button" onPress={() => rows.set([1])}>
        Remove row 2
      </Text>
    </View>
  );
}

function SmokeScreen() {
  const saved = signal("");
  const form = createForm(() => ({
    defaultValues: { name: "" },
    onSubmit: ({ value }) => {
      saved.set(value.name);
    },
  }));
  return (
    <View class="gap-2 p-4">
      <form.Field name="name" validators={{ onChange: ({ value }) => (value === "" ? "Name required" : undefined) }}>
        {(field) => <Input testID="name" accessibilityLabel="Name" {...inputProps(field)} />}
      </form.Field>
      <Text testID="saved">{`saved ${saved()}`}</Text>
      <Text role="button" onPress={() => form.handleSubmit()}>
        Save
      </Text>
    </View>
  );
}

const groupDefaults = { address: { city: "" } };

/** Field groups: `group.Field name="city"` is `form.Field name="address.city"`. */
const CityGroup = withFieldGroup({
  defaultValues: { city: "" },
  render: ({ group }) => (
    <group.Field name="city">
      {(field) => <Input testID="group-hook-city" accessibilityLabel="Hook city" {...inputProps(field)} />}
    </group.Field>
  ),
});

function GroupScreen() {
  const form = createForm(() => ({ defaultValues: groupDefaults }));
  const address = createFieldGroup(() => ({ form, fields: "address", formComponents: {} }));
  const mappedCity = createFieldGroup(() => ({ form, fields: { town: "address.city" } }));
  return (
    <View class="gap-2 p-4">
      <address.Field name="city">
        {(field) => <Input testID="group-city" accessibilityLabel="Group city" {...inputProps(field)} />}
      </address.Field>
      <form.Subscribe selector={(state) => state.values.address.city}>
        {(city) => <Text testID="group-value">{`group city ${city()}`}</Text>}
      </form.Subscribe>
      <form.FormGroup name="address">
        {(group) => <Text testID="group-meta">{`group touched ${group().getMeta().isTouched}`}</Text>}
      </form.FormGroup>
      <CityGroup form={form} fields="address" />
      <mappedCity.Field name="town">{(field) => <Input testID="group-map" accessibilityLabel="Map city" {...inputProps(field)} />}</mappedCity.Field>
    </View>
  );
}

type Tag = { name: string };

/** The field API: array and value methods called on the field object a `form.Field` child gets. */
function FieldApiScreen() {
  const form = createForm(() => ({ defaultValues: { tags: [{ name: "a" }, { name: "b" }] as Tag[] } }));
  const tagsOptions = {
    validators: { onSubmit: ({ value }: { value: Tag[] }) => (value.length === 0 ? "No tags" : undefined) },
  };
  const result = signal("none");
  const show = (value: unknown) => result.set(JSON.stringify(value) ?? "undefined");
  const tagsSchema: StandardSchemaV1<string, string> = {
    "~standard": {
      version: 1,
      vendor: "hand-written",
      validate(value) {
        return typeof value === "string" && value.length > 0 ? { value } : { issues: [{ message: "Parse: empty" }] };
      },
    },
  };
  let tags: Accessor<any> | undefined;
  return (
    <View class="gap-2 p-4">
      <form.Field name="tags" {...tagsOptions}>
        {(field) => {
          tags = field;
          return <Text testID="tags-field">{`tags-field ${field().state.value.map((tag: Tag) => tag.name).join(",")}`}</Text>;
        }}
      </form.Field>
      <Text testID="result">{`result ${result()}`}</Text>
      <Text role="button" onPress={() => tags?.().pushValue({ name: "c" })}>
        Field push
      </Text>
      <Text role="button" onPress={() => void tags?.().insertValue(0, { name: "x" })}>
        Field insert
      </Text>
      <Text role="button" onPress={() => void tags?.().replaceValue(0, { name: "y" })}>
        Field replace
      </Text>
      <Text role="button" onPress={() => void tags?.().removeValue(0)}>
        Field remove
      </Text>
      <Text role="button" onPress={() => tags?.().swapValues(0, 1)}>
        Field swap
      </Text>
      <Text role="button" onPress={() => tags?.().moveValue(0, 1)}>
        Field move
      </Text>
      <Text role="button" onPress={() => tags?.().clearValues()}>
        Field clear
      </Text>
      <Text role="button" onPress={() => tags?.().setValue([{ name: "set" }])}>
        Field set
      </Text>
      <Text role="button" onPress={() => show(tags?.().getValue())}>
        Field get
      </Text>
      <Text role="button" onPress={() => show(tags?.().getMeta().isTouched)}>
        Field meta
      </Text>
      <Text role="button" onPress={() => show(tags?.().getInfo().instance?.store === tags?.().store)}>
        Field info
      </Text>
      <Text role="button" onPress={() => show(tags?.().getLinkedFields("change").length)}>
        Field linked
      </Text>
      <Text role="button" onPress={() => tags?.().setErrorMap({ onSubmit: "Field error by hand" })}>
        Field error map
      </Text>
      <Text role="button" onPress={() => show(tags?.().getMeta().errors)}>
        Field errors
      </Text>
      <Text role="button" onPress={() => tags?.().setMeta((prev: AnyFieldLikeMeta) => ({ ...prev, isBlurred: true }))}>
        Field blur meta
      </Text>
      <Text role="button" onPress={() => show(tags?.().getMeta().isBlurred)}>
        Field blurred
      </Text>
      <Text role="button" onPress={() => show(tags?.().validate("submit"))}>
        Field validate
      </Text>
      <Text role="button" onPress={() => show(tags?.().parseValueWithSchema(tagsSchema))}>
        Field parse
      </Text>
    </View>
  );
}

/** Fine-grained: each line counts the runs of one binding, so a test sees which ones woke. */
function FineScreen() {
  const counts = { emailValue: 0, emailTouched: 0, nameValue: 0, nameErrors: 0 };
  const form = createForm(() => ({ defaultValues: { email: "", name: "" } }));
  return (
    <View class="gap-2 p-4">
      <form.Field name="email">
        {(field) => (
          <View class="gap-1">
            <Input testID="email" accessibilityLabel="Email" {...inputProps(field)} />
            <Text testID="email-value">{`email value ${field().state.value} runs ${++counts.emailValue}`}</Text>
            <Text testID="email-touched">{`email touched ${field().state.meta.isTouched} runs ${++counts.emailTouched}`}</Text>
          </View>
        )}
      </form.Field>
      <form.Field name="name">
        {(field) => (
          <View class="gap-1">
            <Text testID="name-value">{`name value ${field().state.value} runs ${++counts.nameValue}`}</Text>
            <Text testID="name-errors">{`name errors ${field().state.meta.errors.length} runs ${++counts.nameErrors}`}</Text>
          </View>
        )}
      </form.Field>
      <Blur />
    </View>
  );
}

const choices = [
  { value: "crimson", title: "Crimson" },
  { value: "teal", title: "Teal" },
  { value: "navy", title: "Navy" },
];

/** Every value-holding control of `nsh/base`, bound to one form. Each control has its own test. */
function BindingsScreen() {
  const form = createForm(() => ({
    defaultValues: {
      otp: "",
      check: false,
      bold: false,
      colors: [] as string[],
      size: "s",
      picked: [] as string[],
      volume: 3,
      day: null as string | null,
      range: null as [string | null, string | null] | null,
      time: null as string | null,
      swatch: "#ff0000",
      code: "",
      notes: null as unknown,
    },
  }));
  return (
    <View class="gap-2 p-4">
      <form.Subscribe selector={(state) => JSON.stringify(state.values)}>
        {(values) => <Text testID="b-values">{`values ${values()}`}</Text>}
      </form.Subscribe>
      <form.Field name="otp">
        {(field) => (
          <View testID="b-otp">
            <OtpInput length={4} accessibilityLabel="Code" cellStyle={{ width: 30, height: 40 }} {...otpInputProps(field)} />
          </View>
        )}
      </form.Field>
      <form.Field name="check">
        {(field) => (
          <Checkbox accessibilityLabel="Agree" {...checkboxProps(field)}>
            <Text>Agree</Text>
          </Checkbox>
        )}
      </form.Field>
      <form.Field name="bold">
        {(field) => (
          <Toggle accessibilityLabel="Bold" {...toggleButtonProps(field)}>
            <Text>Bold</Text>
          </Toggle>
        )}
      </form.Field>
      <form.Field name="colors">
        {(field) => (
          <ToggleGroup>
            <Toggle accessibilityLabel="Red" {...toggleButtonProps(field, "red")}>
              <Text>Red</Text>
            </Toggle>
            <Toggle accessibilityLabel="Green" {...toggleButtonProps(field, "green")}>
              <Text>Green</Text>
            </Toggle>
          </ToggleGroup>
        )}
      </form.Field>
      <form.Field name="size">
        {(field) => (
          <RadioGroup>
            <Radio accessibilityLabel="Small" {...radioProps(field, "s")}>
              <Text>Small</Text>
            </Radio>
            <Radio accessibilityLabel="Large" {...radioProps(field, "l")}>
              <Text>Large</Text>
            </Radio>
          </RadioGroup>
        )}
      </form.Field>
      <form.Field name="picked">
        {(field) => (
          <Combobox
            testID="b-combo"
            accessibilityLabel="Picked"
            multiple
            items={choices}
            triggerButton={<Text>Choose colors</Text>}
            {...comboboxProps(field)}
          />
        )}
      </form.Field>
      <form.Field name="volume">
        {(field) => (
          <Slider
            accessibilityLabel="Volume"
            min={0}
            max={10}
            trackClass="w-64 h-4 bg-muted"
            thumbClass="size-5 bg-background"
            rangeClass="bg-primary"
            {...sliderProps(field)}
          />
        )}
      </form.Field>
      <form.Field name="day">
        {(field) => <Calendar {...calendarProps(field)} />}
      </form.Field>
      <form.Field name="range">
        {(field) => (
          <DatePicker
            testID="b-range"
            accessibilityLabel="Range"
            range
            trigger={<Text>Pick range</Text>}
            {...datePickerProps(field)}
          />
        )}
      </form.Field>
      <form.Field name="time">
        {(field) => <TimeField accessibilityLabel="Time" {...timeFieldProps(field)} />}
      </form.Field>
      <form.Field name="swatch">
        {(field) => (
          <View testID="b-color">
            <ColorPicker {...colorPickerProps(field)}>
              <ColorArea accessibilityLabel="Area" panelClass="w-48 h-24 bg-muted" thumbClass="size-3 bg-background" />
              <ColorSlider channel="hue" accessibilityLabel="Hue" trackClass="w-48 h-4 bg-muted" thumbClass="size-3 bg-background" />
            </ColorPicker>
          </View>
        )}
      </form.Field>
      <form.Field name="code">
        {(field) => (
          <View testID="b-editor" class="w-96 h-40">
            <Editor accessibilityLabel="Code editor" language="typescript" {...editorProps(field)} />
          </View>
        )}
      </form.Field>
      <form.Field name="notes">
        {(field) => (
          <View testID="b-rich" class="w-96 h-40">
            <RichEditor accessibilityLabel="Notes" {...richEditorProps(field)} />
          </View>
        )}
      </form.Field>
    </View>
  );
}

/** The first error of a field, as a line of text, with a test ID. */
function FieldError(props: { testID: string; field: Accessor<AnyFieldApi> }) {
  return (
    <If when={props.field().state.meta.errors[0]}>
      {(message) => <Text testID={props.testID}>{`error ${show(message())}`}</Text>}
    </If>
  );
}

/** Form-level and field-level validators for each trigger: mount, blur, dynamic, and their async forms. */
function RulesScreen() {
  const runs = signal(0);
  const blurredAt = signal(0);
  const checkedAt = signal(0);
  const slugRuns = signal(0);
  const form = createForm(() => ({
    defaultValues: { code: "", note: "", slug: "", password: "", confirm: "" },
    validators: {
      onMount: ({ value }) => (value.code === "" ? { fields: { code: "Form mount: code needed" } } : undefined),
      onBlur: ({ value }) => (value.note === "bad" ? { fields: { note: "Form blur: bad note" } } : undefined),
      onBlurAsyncDebounceMs: 200,
      onBlurAsync: async ({ value }) =>
        value.note === "taken" ? { fields: { note: "Form async blur: taken" } } : undefined,
      onChangeAsyncDebounceMs: 300,
      onChangeAsync: async () => {
        runs.update((n) => n + 1);
        return undefined;
      },
    },
  }));
  return (
    <View class="gap-2 p-4">
      <form.Field name="code">
        {(field) => (
          <View class="gap-1">
            <Input testID="code" accessibilityLabel="Code" {...inputProps(field)} />
            <FieldError testID="code-error" field={field} />
          </View>
        )}
      </form.Field>
      <form.Field name="note">
        {(field) => (
          <View class="gap-1">
            <Input testID="note" accessibilityLabel="Note" {...inputProps(field)} />
            <FieldError testID="note-error" field={field} />
          </View>
        )}
      </form.Field>
      <form.Field
        name="slug"
        listeners={{ onBlur: () => blurredAt.set(Date.now()) }}
        validators={{
          onBlurAsyncDebounceMs: 250,
          onBlurAsync: async ({ value }) => {
            slugRuns.update((n) => n + 1);
            checkedAt.set(Date.now());
            return value === "taken" ? "Field async blur: taken" : undefined;
          },
        }}
      >
        {(field) => (
          <View class="gap-1">
            <Input testID="slug" accessibilityLabel="Slug" {...inputProps(field)} />
            <FieldError testID="slug-error" field={field} />
          </View>
        )}
      </form.Field>
      <Text testID="slug-timing">{`slug gap ${checkedAt() - blurredAt()} runs ${slugRuns()}`}</Text>
      <form.Field name="password">
        {(field) => <Input testID="password" accessibilityLabel="Password" {...inputProps(field)} />}
      </form.Field>
      <form.Field
        name="confirm"
        validators={{
          onBlurListenTo: ["password"],
          onBlur: ({ value, fieldApi }) =>
            value !== fieldApi.form.getFieldValue("password") ? "Blur: passwords differ" : undefined,
        }}
      >
        {(field) => (
          <View class="gap-1">
            <Input testID="confirm" accessibilityLabel="Confirm" {...inputProps(field)} />
            <FieldError testID="confirm-error" field={field} />
          </View>
        )}
      </form.Field>
      <Text testID="form-runs">{`form runs ${runs()}`}</Text>
      <Blur />
    </View>
  );
}

/**
 * `onDynamic` and `onDynamicAsync` run only when the validation logic adds them. `revalidateLogic` adds them
 * on the event it watches (here `blur`, before a submit), so a blur of each field runs them.
 */
function DynamicScreen() {
  const blurredAt = signal(0);
  const checkedAt = signal(0);
  const form = createForm(() => ({
    defaultValues: { code: "", note: "", slug: "" },
    validationLogic: revalidateLogic({ mode: "blur" }),
    validators: {
      onDynamic: ({ value }) => (value.code === "dyn" ? { fields: { code: "Form dynamic code" } } : undefined),
      onDynamicAsyncDebounceMs: 150,
      onDynamicAsync: async ({ value }) =>
        value.note === "dyn" ? { fields: { note: "Form dynamic async" } } : undefined,
    },
  }));
  return (
    <View class="gap-2 p-4">
      <form.Field name="code">
        {(field) => (
          <View class="gap-1">
            <Input testID="code" accessibilityLabel="Code" {...inputProps(field)} />
            <FieldError testID="code-error" field={field} />
          </View>
        )}
      </form.Field>
      <form.Field name="note">
        {(field) => (
          <View class="gap-1">
            <Input testID="note" accessibilityLabel="Note" {...inputProps(field)} />
            <FieldError testID="note-error" field={field} />
          </View>
        )}
      </form.Field>
      <form.Field
        name="slug"
        listeners={{ onBlur: () => blurredAt.set(Date.now()) }}
        validators={{
          onDynamic: ({ value }) => (value === "dyn" ? "Field dynamic" : undefined),
          onDynamicAsyncDebounceMs: 100,
          onDynamicAsync: async ({ value }) => {
            checkedAt.set(Date.now());
            return value === "dyn-async" ? "Field dynamic async" : undefined;
          },
        }}
      >
        {(field) => (
          <View class="gap-1">
            <Input testID="slug" accessibilityLabel="Slug" {...inputProps(field)} />
            <FieldError testID="slug-error" field={field} />
          </View>
        )}
      </form.Field>
      <Text testID="slug-timing">{`dynamic gap ${checkedAt() - blurredAt()}`}</Text>
      <Blur />
    </View>
  );
}

/** Form options: formId, defaultState, transform, and the three validation logics. */
function FormRulesScreen() {
  const submitOnly: ValidationLogicFn = (props) => {
    if (props.event.type !== "submit") return props.runValidation({ validators: [], form: props.form });
    return defaultValidationLogic(props);
  };
  const state = createForm(() => ({
    formId: "signup-form",
    defaultState: { values: { name: "from state" }, submissionAttempts: 3, isSubmitted: true },
    transform: (data: unknown) => {
      const { state } = data as { state: object };
      return { state: { ...state, errorMap: { onSubmit: "Transformed at creation" } } };
    },
    validators: {},
  }));
  const revalidate = createForm(() => ({
    defaultValues: { note: "" },
    validationLogic: revalidateLogic({ mode: "blur", modeAfterSubmission: "change" }),
    validators: {
      onDynamic: ({ value }) => (value.note === "dyn" ? { fields: { note: "Dynamic only" } } : undefined),
    },
  }));
  const custom = createForm(() => ({
    defaultValues: { note: "" },
    validationLogic: submitOnly,
  }));
  const plain = createForm(() => ({
    defaultValues: { note: "" },
    validationLogic: defaultValidationLogic,
  }));
  const rule = (value: string) => (value.length < 3 ? "Too short" : undefined);
  return (
    <View class="gap-2 p-4">
      <Text testID="form-id">{`form id ${state._formId}`}</Text>
      <state.Field name="name">
        {(field) => <Input testID="state-name" accessibilityLabel="State name" {...inputProps(field)} />}
      </state.Field>
      <state.Subscribe selector={(s) => JSON.stringify({ attempts: s.submissionAttempts, submitted: s.isSubmitted })}>
        {(json) => <Text testID="state-json">{`state ${json()}`}</Text>}
      </state.Subscribe>
      <state.Subscribe selector={(s) => JSON.stringify(s.errors)}>
        {(errors) => <Text testID="state-errors">{`state errors ${errors()}`}</Text>}
      </state.Subscribe>
      <revalidate.Field name="note" validators={{ onChange: ({ value }) => rule(value) }}>
        {(field) => (
          <View class="gap-1">
            <Input testID="reval" accessibilityLabel="Revalidate" {...inputProps(field)} />
            <FieldError testID="reval-error" field={field} />
          </View>
        )}
      </revalidate.Field>
      <custom.Field name="note" validators={{ onChange: ({ value }) => rule(value) }}>
        {(field) => (
          <View class="gap-1">
            <Input testID="custom" accessibilityLabel="Custom" {...inputProps(field)} />
            <FieldError testID="custom-error" field={field} />
          </View>
        )}
      </custom.Field>
      <plain.Field name="note" validators={{ onChange: ({ value }) => rule(value) }}>
        {(field) => (
          <View class="gap-1">
            <Input testID="plain" accessibilityLabel="Plain" {...inputProps(field)} />
            <FieldError testID="plain-error" field={field} />
          </View>
        )}
      </plain.Field>
      <Text role="button" onPress={() => void custom.handleSubmit()}>
        Submit custom
      </Text>
      <Blur />
    </View>
  );
}

/** Array validation from an index: rows 0..n-1, validated from `start` onward. */
function ArrayRulesScreen() {
  const form = createForm(() => ({ defaultValues: { items: [{ name: "" }, { name: "" }, { name: "" }] } }));
  const rows = [0, 1, 2];
  return (
    <View class="gap-2 p-4">
      {rows.map((row) => (
        <form.Field
          name={`items[${row}].name`}
          validators={{ onSubmit: ({ value }) => (value ? undefined : "Row needs a name") }}
        >
          {(field) => (
            <View class="gap-1">
              <Input testID={`row-${row}`} accessibilityLabel={`Row ${row}`} {...inputProps(field)} />
              <FieldError testID={`row-${row}-error`} field={field} />
            </View>
          )}
        </form.Field>
      ))}
      <Text role="button" onPress={() => void form.validateArrayFieldsStartingFrom("items", 1, "submit")}>
        Validate from 1
      </Text>
    </View>
  );
}

/** Options that change at run time: a form default and a field's validator, read live. */
function UpdateScreen() {
  const prefix = signal("Ada");
  const minimum = signal(2);
  const form = createForm(() => ({ defaultValues: { name: prefix() } }));
  return (
    <View class="gap-2 p-4">
      <form.Field
        name="name"
        validators={{ onChange: ({ value }) => (value.length < minimum() ? `Too short (${minimum()})` : undefined) }}
      >
        {(field) => (
          <View class="gap-1">
            <Input testID="update-name" accessibilityLabel="Update name" {...inputProps(field)} />
            <FieldError testID="update-error" field={field} />
          </View>
        )}
      </form.Field>
      <Text role="button" onPress={() => prefix.set("Grace")}>
        Rename
      </Text>
      <Text role="button" onPress={() => minimum.set(5)}>
        Raise minimum
      </Text>
    </View>
  );
}

/** Groups and contexts: a group's AppField, Subscribe and AppForm, and useFormContext inside an AppForm. */
function GroupContextScreen() {
  const form = useAppForm(() => ({ defaultValues: { address: { city: "" }, title: "" } }));
  const address = createFieldGroup(() => ({ form, fields: "address", formComponents: {} }));
  return (
    <View class="gap-2 p-4">
      <form.AppForm>
        <address.AppField name="city">{(field) => <field.TextField testID="gc-city" label="City" />}</address.AppField>
        <address.Subscribe selector={(state) => state.values.city}>
          {(city) => <Text testID="gc-group">{`group sub ${city()}`}</Text>}
        </address.Subscribe>
        <form.AppField name="title">{(field) => <field.TextField testID="gc-title" label="Title" />}</form.AppField>
        <address.AppForm>
          <InnerTitle />
        </address.AppForm>
      </form.AppForm>
    </View>
  );
}

/** Reads the form from `useFormContext`, inside an `AppForm`. */
function InnerTitle() {
  const form = hooks.useFormContext<{ address: { city: string }; title: string }>();
  return (
    <form.Subscribe selector={(state) => state.values.title}>
      {(title) => <Text testID="gc-context">{`context title ${title()}`}</Text>}
    </form.Subscribe>
  );
}

/** Async parse of a whole form and of one field, through Standard Schema. */
function ParseScreen() {
  const form = createForm(() => ({ defaultValues: { name: "" } }));
  const result = signal("none");
  const asyncSchema: StandardSchemaV1<{ name: string }, { name: string }> = {
    "~standard": {
      version: 1,
      vendor: "hand-written",
      validate: async (value) => {
        const named = value as { name: string };
        return named.name.trim() ? { value: named } : { issues: [{ message: "Parse async: name needed", path: ["name"] }] };
      },
    },
  };
  const fieldSchema: StandardSchemaV1<string, string> = {
    "~standard": {
      version: 1,
      vendor: "hand-written",
      validate: async (value) =>
        typeof value === "string" && value.length > 0 ? { value } : { issues: [{ message: "Parse async: field empty" }] },
    },
  };
  let name: Accessor<AnyFieldApi> | undefined;
  return (
    <View class="gap-2 p-4">
      <form.Field name="name">
        {(field) => {
          name = field as never;
          return <Input testID="parse-name" accessibilityLabel="Parse name" {...inputProps(field)} />;
        }}
      </form.Field>
      <Text testID="parse-result">{`parse ${result()}`}</Text>
      <Text role="button" onPress={() => void form.parseValuesWithSchemaAsync(asyncSchema).then((r) => result.set(JSON.stringify(r)))}>
        Parse values async
      </Text>
      <Text role="button" onPress={() => void name?.().parseValueWithSchemaAsync(fieldSchema).then((r) => result.set(JSON.stringify(r)))}>
        Parse value async
      </Text>
    </View>
  );
}

/** The react-form and solid-form names, each used once. */
function AliasesScreen() {
  const form = useForm(() => ({ defaultValues: { name: "", pair: { city: "" } } }));
  const name = useField(() => ({
    form,
    name: "name",
    validators: { onChange: ({ value }: { value: string }) => (value.length < 2 ? "Alias too short" : undefined) },
  }));
  const pair = useFieldGroup(() => ({ form, fields: "pair" }));
  const pairGroup = useFormGroup(() => ({ form, name: "pair" }));
  const selected = useSelector(form.store, (state) => state.values.name);
  const city = form.useStore((state) => state.values.pair.city);
  return (
    <View class="gap-2 p-4">
      <Input testID="alias-name" accessibilityLabel="Alias name" {...inputProps(name)} />
      <Text testID="alias-selected">{`alias selected ${selected()}`}</Text>
      <Text testID="alias-error">{`alias error ${name().state.meta.errors.join("|")}`}</Text>
      <pair.Field name="city">{(field) => <Input testID="alias-city" accessibilityLabel="Alias city" {...inputProps(field)} />}</pair.Field>
      <Text testID="alias-city-value">{`alias city ${city()}`}</Text>
      <Text testID="alias-group">{`alias group ${pairGroup().state.meta.isTouched}`}</Text>
    </View>
  );
}

/** The gpui-form rule helpers, saved drafts, changed values and diagnostics, on one form. */
function GpuiScreen() {
  const form = createForm(() => ({
    defaultValues: { email: "", homepage: "", slug: "", id: "", name: "", age: "", code: "", plan: "free" },
  }));
  const result = signal("none");
  const show = (value: unknown) => result.set(JSON.stringify(value) ?? "undefined");
  const nameRules = ({ value }: { value: string }) =>
    required("Name needed")({ value }) ?? minLength(2, "Too short")({ value }) ?? maxLength(10, "Too long")({ value });
  return (
    <View class="gap-2 p-4">
      <form.Field name="email" validators={{ onChange: ({ value }) => email("Bad email")({ value }) }}>
        {(field) => (
          <View class="gap-1">
            <Input testID="gp-email" accessibilityLabel="Email" {...inputProps(field)} />
            <FieldError testID="gp-email-error" field={field} />
          </View>
        )}
      </form.Field>
      <form.Field name="homepage" validators={{ onChange: ({ value }) => url("Bad url")({ value }) }}>
        {(field) => (
          <View class="gap-1">
            <Input testID="gp-url" accessibilityLabel="Homepage" {...inputProps(field)} />
            <FieldError testID="gp-url-error" field={field} />
          </View>
        )}
      </form.Field>
      <form.Field name="slug" validators={{ onChange: ({ value }) => slug("Bad slug")({ value }) }}>
        {(field) => (
          <View class="gap-1">
            <Input testID="gp-slug" accessibilityLabel="Slug" {...inputProps(field)} />
            <FieldError testID="gp-slug-error" field={field} />
          </View>
        )}
      </form.Field>
      <form.Field name="id" validators={{ onChange: ({ value }) => uuid("Bad uuid")({ value }) }}>
        {(field) => (
          <View class="gap-1">
            <Input testID="gp-uuid" accessibilityLabel="Id" {...inputProps(field)} />
            <FieldError testID="gp-uuid-error" field={field} />
          </View>
        )}
      </form.Field>
      <form.Field name="name" validators={{ onChange: nameRules }}>
        {(field) => (
          <View class="gap-1">
            <Input testID="gp-name" accessibilityLabel="Name" {...inputProps(field)} />
            <FieldError testID="gp-name-error" field={field} />
          </View>
        )}
      </form.Field>
      <form.Field
        name="age"
        validators={{
          onChange: ({ value }) => min(0, "Too low")({ value }) ?? max(150, "Too high")({ value }),
        }}
      >
        {(field) => (
          <View class="gap-1">
            <Input testID="gp-age" accessibilityLabel="Age" {...inputProps(field)} />
            <FieldError testID="gp-age-error" field={field} />
          </View>
        )}
      </form.Field>
      <form.Field name="code" validators={{ onChange: ({ value }) => pattern(/^\d{3}$/, "Code is 3 digits")({ value }) }}>
        {(field) => (
          <View class="gap-1">
            <Input testID="gp-code" accessibilityLabel="Code" {...inputProps(field)} />
            <FieldError testID="gp-code-error" field={field} />
          </View>
        )}
      </form.Field>
      <form.Field
        name="plan"
        validators={{ onChange: ({ value }) => oneOf(["free", "pro"], "Unknown plan")({ value }) }}
      >
        {(field) => (
          <View class="gap-1">
            <Input testID="gp-plan" accessibilityLabel="Plan" {...inputProps(field)} />
            <FieldError testID="gp-plan-error" field={field} />
          </View>
        )}
      </form.Field>
      <Text testID="gp-result">{`result ${result()}`}</Text>
      <Text role="button" onPress={() => show(changedPaths(form))}>
        Show changes
      </Text>
      <Text role="button" onPress={() => show(patch(form))}>
        Show patch
      </Text>
      <Text role="button" onPress={() => show(diagnostics(form))}>
        Show diagnostics
      </Text>
      <Text role="button" onPress={() => void saveForm(form, "draft")}>
        Save draft
      </Text>
      <Text role="button" onPress={() => void restoreForm(form, "draft")}>
        Restore draft
      </Text>
    </View>
  );
}

/**
 * Every control that reports a blur, with an email field that the submit makes invalid. The focus move
 * to the email blurs the control, and that blur must keep the form-level submit error.
 */
function FocusControlsScreen() {
  const form = createForm(() => ({
    defaultValues: { email: "", input: "", amount: null as number | null, otp: "", code: "", notes: null as unknown },
    validators: {
      onSubmitAsync: async ({ value }) =>
        value.email === "taken@example.com"
          ? { form: "Could not save", fields: { email: "Already registered" } }
          : null,
    },
  }));
  return (
    <View class="gap-2 p-4">
      <form.Field name="email">
        {(field) => <Input testID="fc-email" accessibilityLabel="Email" {...inputProps(field)} />}
      </form.Field>
      <form.Field name="input">
        {(field) => <Input testID="fc-input" accessibilityLabel="Input" {...inputProps(field)} />}
      </form.Field>
      <form.Field name="amount">
        {(field) => <NumberInput testID="fc-number" accessibilityLabel="Amount" {...numberInputProps(field)} />}
      </form.Field>
      <form.Field name="otp">
        {(field) => (
          <View testID="fc-otp">
            <OtpInput length={4} accessibilityLabel="Code" cellStyle={{ width: 30, height: 40 }} {...otpInputProps(field)} />
          </View>
        )}
      </form.Field>
      <form.Field name="code">
        {(field) => (
          <View testID="fc-editor" class="w-96 h-40">
            <Editor accessibilityLabel="Code editor" language="typescript" {...editorProps(field)} />
          </View>
        )}
      </form.Field>
      <form.Field name="notes">
        {(field) => (
          <View testID="fc-rich" class="w-96 h-40">
            <RichEditor accessibilityLabel="Notes" {...richEditorProps(field)} />
          </View>
        )}
      </form.Field>
      <form.Subscribe selector={(state) => JSON.stringify(state.errors)}>
        {(errors) => <Text testID="fc-errors">{`form errors ${errors()}`}</Text>}
      </form.Subscribe>
      <Text role="button" onPress={() => form.handleSubmit()}>
        Save
      </Text>
    </View>
  );
}

/** Only the control named by the launch parameter `only` is required, so a failed submit focuses that control. */
function FocusEachScreen() {
  const only = String(host.params.only ?? "");
  const form = createForm(() => ({
    defaultValues: { input: "", amount: null as number | null, otp: "", code: "", notes: null as unknown },
  }));
  const rule = (name: string) => ({ value }: { value: unknown }) =>
    only === name && (value === "" || value === null || value === undefined) ? "Needed" : undefined;
  return (
    <View class="gap-2 p-4">
      <form.Field name="input" validators={{ onSubmit: rule("input") }}>
        {(field) => <Input testID="fe-input" accessibilityLabel="Input" {...inputProps(field)} />}
      </form.Field>
      <form.Field name="amount" validators={{ onSubmit: rule("amount") }}>
        {(field) => <NumberInput testID="fe-number" accessibilityLabel="Amount" {...numberInputProps(field)} />}
      </form.Field>
      <form.Field name="otp" validators={{ onSubmit: rule("otp") }}>
        {(field) => (
          <View testID="fe-otp">
            <OtpInput length={4} accessibilityLabel="Code" cellStyle={{ width: 30, height: 40 }} {...otpInputProps(field)} />
          </View>
        )}
      </form.Field>
      <form.Field name="code" validators={{ onSubmit: rule("code") }}>
        {(field) => (
          <View testID="fe-editor" class="w-96 h-40">
            <Editor accessibilityLabel="Code editor" language="typescript" {...editorProps(field)} />
          </View>
        )}
      </form.Field>
      <form.Field name="notes" validators={{ onSubmit: rule("notes") }}>
        {(field) => (
          <View testID="fe-rich" class="w-96 h-40">
            <RichEditor accessibilityLabel="Notes" {...richEditorProps(field)} />
          </View>
        )}
      </form.Field>
      <form.Subscribe selector={(state) => JSON.stringify(state.values.notes)}>
        {(notes) => <Text testID="fe-notes">{`fe notes ${notes()}`}</Text>}
      </form.Subscribe>
      <Text role="button" onPress={() => form.handleSubmit()}>
        Save
      </Text>
    </View>
  );
}

const screens: Record<string, () => JSX.Element> = {
  focusEach: FocusEachScreen,
  focusControls: FocusControlsScreen,
  gpui: GpuiScreen,
  aliases: AliasesScreen,
  rules: RulesScreen,
  dynamic: DynamicScreen,
  formRules: FormRulesScreen,
  arrayRules: ArrayRulesScreen,
  update: UpdateScreen,
  groupContext: GroupContextScreen,
  parse: ParseScreen,
  bindings: BindingsScreen,
  fine: () => <FineScreen />,
  fieldApi: FieldApiScreen,
  group: GroupScreen,
  field: FieldScreen,
  async: AsyncScreen,
  linked: LinkedScreen,
  formValidators: FormValidatorsScreen,
  schema: SchemaScreen,
  submit: SubmitScreen,
  options: OptionsScreen,
  subscribe: SubscribeScreen,
  array: ArrayScreen,
  api: ApiScreen,
  listeners: ListenersScreen,
  formOptions: FormOptionsScreen,
  hook: HookScreen,
  controls: ControlsScreen,
  focus: () => <FocusScreen filled={false} />,
  focusHidden: () => <FocusScreen filled />,
  rows: RowsScreen,
  smoke: SmokeScreen,
};

function App() {
  const name = String(host.params.screen ?? "smoke");
  const Screen = screens[name] ?? SmokeScreen;
  return <Screen />;
}

mount(App);
