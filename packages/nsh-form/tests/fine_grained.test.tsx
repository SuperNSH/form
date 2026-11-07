import { expect, test } from "nsh/test";
import { count, start } from "./support";

test("a binding on field().state.value does not wake on a blur, and one on isTouched does not wake on typing", async () => {
  const app = await start("fine");
  await app.type("id:email", "a");
  const value = count(app, "email value", "runs");
  const touched = count(app, "email touched", "runs");

  await app.type("id:email", "b");
  expect(count(app, "email value", "runs")).toBe(value + 1);
  expect(count(app, "email touched", "runs")).toBe(touched);

  await app.press("role:button[Blur]");
  expect(count(app, "email value", "runs")).toBe(value + 1);
});

test("typing in one field does not wake the bindings of another", async () => {
  const app = await start("fine");
  const value = count(app, "name value", "runs");
  const errors = count(app, "name errors", "runs");
  await app.type("id:email", "a");
  expect(count(app, "name value", "runs")).toBe(value);
  expect(count(app, "name errors", "runs")).toBe(errors);
});
