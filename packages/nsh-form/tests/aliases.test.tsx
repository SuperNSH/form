import { expect, test } from "nsh/test";
import { line, start, text } from "./support";

test("al1. useForm is createForm: a form made with it takes typed values", async () => {
  const app = await start("aliases");
  await app.type("id:alias-name", "Ada");
  expect(app.value("id:alias-name")).toBe("Ada");
  expect(line(app, "alias selected ")).toBe("alias selected Ada");
});

test("al2. useField is createField: its validators run on typing", async () => {
  const app = await start("aliases");
  await app.type("id:alias-name", "a");
  expect(line(app, "alias error ")).toBe("alias error Alias too short");
});

test("al3. useFieldGroup is createFieldGroup: a group field writes into the form's path", async () => {
  const app = await start("aliases");
  await app.type("id:alias-city", "Lahore");
  expect(line(app, "alias city ")).toBe("alias city Lahore");
});

test("al4. useFormGroup is createFormGroup: the group's state follows its fields", async () => {
  const app = await start("aliases");
  expect(line(app, "alias group ")).toBe("alias group false");
  await app.type("id:alias-city", "x");
  expect(line(app, "alias group ")).toBe("alias group true");
});

test("al5. useSelector is useStore: it reads a slice and rerenders when that slice changes", async () => {
  const app = await start("aliases");
  await app.type("id:alias-name", "Grace");
  expect(line(app, "alias selected ")).toBe("alias selected Grace");
  expect(text(app)).toContain("alias selected Grace");
});
