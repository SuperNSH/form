import { expect, test } from "nsh/test";
import { line, start, text } from "./support";

test("4. onChangeAsync runs once after its debounce, shows isValidating, and a newer edit drops an older answer", async () => {
  const app = await start("async");
  await app.type("id:handle", "taken");
  expect(line(app, "validating")).toContain("validating true runs 0");
  await app.clock!.runFor(300);
  expect(line(app, "validating")).toContain("runs 1");
  await app.clock!.runFor(100);
  expect(text(app)).toContain("error Taken");
  expect(line(app, "validating")).toContain("validating false");
});

test("4b. an edit while a check is in flight drops that check's answer", async () => {
  const app = await start("async");
  await app.type("id:handle", "taken");
  await app.clock!.runFor(300);
  await app.type("id:handle", "x");
  await app.clock!.runFor(100);
  expect(text(app)).not.toContain("error Taken");
  await app.clock!.runFor(400);
  expect(text(app)).not.toContain("error Taken");
  expect(line(app, "validating")).toContain("runs 2");
});

test("5. onChangeListenTo revalidates the confirmation when the password changes", async () => {
  const app = await start("linked");
  await app.type("id:password", "abc");
  await app.type("id:confirm", "xyz");
  expect(text(app)).toContain("error Passwords differ");
  await app.clear("id:password");
  await app.type("id:password", "xyz");
  expect(text(app)).not.toContain("Passwords differ");
});

test("6. a form validators.onChange returning fields puts errors on those fields", async () => {
  const app = await start("formValidators");
  await app.type("id:email", "abc");
  expect(text(app)).toContain("error Needs an @");
  await app.type("id:email", "@x.com");
  expect(text(app)).not.toContain("Needs an @");
});

test("7. form validators.onSubmitAsync sets server errors on the form and on fields", async () => {
  const app = await start("formValidators");
  await app.type("id:email", "taken@example.com");
  await app.type("id:name", "root");
  await app.press("role:button[Submit]");
  expect(text(app)).toContain("error Reserved name");
  expect(text(app)).not.toContain("Already registered");
  await app.clear("id:name");
  await app.type("id:name", "Ada");
  await app.press("role:button[Blur]");
  await app.press("role:button[Submit]");
  expect(text(app)).toContain("error Already registered");
  expect(line(app, "form errors")).toContain("Could not save");
});

test("8. Standard Schema works as a field validator and as a form validator, with no dependency", async () => {
  const app = await start("schema");
  await app.type("id:email", "abc");
  expect(text(app)).toContain("error Schema: needs @");
  await app.clear("id:email");
  await app.type("id:email", "a@b.c");
  expect(text(app)).not.toContain("Schema: needs @");
  await app.press("role:button[Submit]");
  expect(text(app)).toContain("error Schema: name needed");
});
