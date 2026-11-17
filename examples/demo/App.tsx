import { type JSX, mount, signal, Text, View } from "nsh";
import { Input } from "nsh/base";
import { createForm, email, inputProps, minLength, required } from "../../packages/nsh-form/src";

type SignIn = { email: string; password: string };

const emailRules = ({ value }: { value: string }) =>
  required("Enter your email")({ value }) ?? email("That is not an email")({ value });
const passwordRules = ({ value }: { value: string }) =>
  required("Enter a password")({ value }) ?? minLength(8, "Too short")({ value });

/** A sign-in form on the public API: rules, a dirty flag, a submit that runs only when the values are valid. */
function Demo() {
  const submitted = signal("Not submitted yet");
  const form = createForm(() => ({
    defaultValues: { email: "", password: "" } as SignIn,
    onSubmit: async ({ value }: { value: SignIn }) => {
      submitted.set(`Signed in as ${value.email}`);
    },
  }));
  const status = form.useStore((state) => `dirty ${state.isDirty}, valid ${state.isValid}`);

  return (
    <View class="gap-2 p-4">
      <form.Field name="email" validators={{ onChange: emailRules }}>
        {(field) => (
          <View class="gap-1">
            <Input accessibilityLabel="Email" {...inputProps(field)} />
            <If when={field().state.meta.errors[0]}>{(message) => <Text>{String(message())}</Text>}</If>
          </View>
        )}
      </form.Field>
      <form.Field name="password" validators={{ onChange: passwordRules }}>
        {(field) => (
          <View class="gap-1">
            <Input accessibilityLabel="Password" masked {...inputProps(field)} />
            <If when={field().state.meta.errors[0]}>{(message) => <Text>{String(message())}</Text>}</If>
          </View>
        )}
      </form.Field>
      <Text>{status()}</Text>
      <Text role="button" onPress={() => form.handleSubmit()}>Submit</Text>
      <Text role="button" onPress={() => form.reset()}>Reset</Text>
      <Text>{submitted()}</Text>
    </View>
  );
}

const render: () => JSX.Element = Demo;
mount(render);
