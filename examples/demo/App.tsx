import { type JSX, mount, signal, Text, View } from "nsh";
import { Input } from "nsh/base";
import { createForm, email, minLength, required } from "../../packages/nsh-form/src";

type SignIn = { email: string; password: string };

/** A sign-in form on the public API: rules, a dirty flag, a submit that runs only when the values are valid. */
function Demo() {
  const submitted = signal("Not submitted yet");
  const form = createForm<SignIn>({
    initial: { email: "", password: "" },
    async onSubmit(values) {
      submitted.set(`Signed in as ${values.email}`);
    },
  });
  const address = form.field("email", { rules: [required("Enter your email"), email("That is not an email")] });
  const password = form.field("password", { rules: [required("Enter a password"), minLength(8, "Too short")] });

  return (
    <View class="gap-2 p-4">
      <Input accessibilityLabel="Email" {...address.inputProps()} />
      <If when={address.error()}>{(message) => <Text>{message()}</Text>}</If>
      <Input accessibilityLabel="Password" masked {...password.inputProps()} />
      <If when={password.error()}>{(message) => <Text>{message()}</Text>}</If>
      <Text>{`dirty ${form.isDirty()}, valid ${form.isValid()}`}</Text>
      <Text role="button" onPress={() => form.submit()}>Submit</Text>
      <Text role="button" onPress={() => form.reset()}>Reset</Text>
      <Text>{submitted()}</Text>
    </View>
  );
}

const render: () => JSX.Element = Demo;
mount(render);
