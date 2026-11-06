import { type JSX, mount, signal, Text, View } from "nsh";
import { Input, Switch } from "nsh/base";
import { createForm, email, type Field, matches, minLength, numeric, required } from "./src";

function TextField(props: { id: string; label: string; field: Field<string>; masked?: boolean }) {
  return (
    <View>
      <Input testID={props.id} accessibilityLabel={props.label} masked={props.masked} {...props.field.inputProps()} />
      <If when={props.field.error()}>{(message) => <Text testID={`${props.id}-error`}>{message()}</Text>}</If>
    </View>
  );
}

type SignUp = {
  email: string;
  password: string;
  confirm: string;
  age: string;
  subscribe: boolean;
  address: { city: string };
  tags: { name: string }[];
};

const empty: SignUp = {
  email: "",
  password: "",
  confirm: "",
  age: "",
  subscribe: false,
  address: { city: "" },
  tags: [{ name: "first" }],
};

function SignUpForm() {
  const saved = signal(0);
  const form = createForm<SignUp>({
    initial: empty,
    async onSubmit(values) {
      if (values.email === "taken@example.com") return { fields: { email: "Already registered" } };
      if (values.email === "down@example.com") return { form: "Try again later" };
      saved.update((n) => n + 1);
    },
  });
  const address = form.field("email", {
    rules: [required("Enter your email"), email("That is not an email")],
    asyncRule: {
      debounceMs: 300,
      check: async (value) => (value === "blocked@example.com" ? "Blocked domain" : null),
    },
  });
  const password = form.field("password", { rules: [required("Enter a password"), minLength(8, "Too short")] });
  const confirm = form.field("confirm", { rules: [matches((v: SignUp) => v.password, "Passwords differ")] });
  const age = form.field("age", { rules: [numeric("Not a number")] });
  const subscribe = form.field("subscribe");
  const city = form.field("address.city");
  const tags = form.array("tags");

  return (
    <View class="gap-2 p-4">
      <TextField id="email" label="Email" field={address} />
      <TextField id="password" label="Password" field={password} masked />
      <TextField id="confirm" label="Confirm" field={confirm} masked />
      <TextField id="age" label="Age" field={age} />
      <TextField id="city" label="City" field={city} />
      <Switch accessibilityLabel="Subscribe" trackClass="w-11 bg-muted" thumbClass="size-5 bg-background" {...subscribe.toggleProps()} />
      <Text testID="subscribed">{`subscribed ${subscribe.value()}`}</Text>
      <Text testID="tags">{`tags ${tags.items().map((t) => t.name).join(",")}`}</Text>
      <Text testID="tag-keys">{`keys ${tags.keys().join(",")}`}</Text>
      <Text role="button" onPress={() => tags.append({ name: "added" })}>Add tag</Text>
      <Text role="button" onPress={() => tags.remove(0)}>Remove tag</Text>
      <Text testID="dirty">{`dirty ${form.isDirty()}`}</Text>
      <Text testID="valid">{`valid ${form.isValid()}`}</Text>
      <Text testID="validating">{`validating ${address.validating()}`}</Text>
      <Text testID="city-dirty">{`city dirty ${city.dirty()}`}</Text>
      <Text testID="saved">{`saved ${saved()}`}</Text>
      <Text testID="submits">{`submits ${form.submitCount()}`}</Text>
      <If when={form.error()}>{(message) => <Text testID="form-error">{message()}</Text>}</If>
      <Text role="button" onPress={() => form.submit()}>Submit</Text>
      <Text role="button" onPress={() => form.reset()}>Reset</Text>
      <Text role="button" onPress={() => form.load({ ...empty, email: "loaded@example.com" })}>Load</Text>
    </View>
  );
}

const render: () => JSX.Element = SignUpForm;
mount(render);
