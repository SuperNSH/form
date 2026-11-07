import { expect, test } from "nsh/test";
import { line, start, text } from "./support";

test("23. focusFirstInvalid focuses the first invalid field with an input on a failed submit", async () => {
  const app = await start("focus");
  await app.press("role:button[Save]");
  expect(line(app, "invalid ")).toBe("invalid 1");
  await app.keyboard.press("x");
  expect(app.value("id:first")).toBe("x");
});

test("23b. focusFirstInvalid does not throw when the only invalid field has no input", async () => {
  const app = await start("focusHidden");
  await app.press("role:button[Save]");
  expect(line(app, "invalid ")).toBe("invalid 1");
});

test("23c. moving focus to the first invalid field keeps a form-level submit error", async () => {
  const app = await start("formValidators");
  await app.type("id:email", "taken@example.com");
  await app.type("id:name", "Ada");
  await app.press("role:button[Submit]");
  expect(text(app)).toContain("error Already registered");
  expect(line(app, "form errors")).toContain("Could not save");
  await app.keyboard.press("x");
  expect(app.value("id:email")).toBe("taken@example.comx");
  expect(line(app, "form errors")).not.toContain("Could not save");
  await app.press("role:button[Blur]");
  expect(line(app, "form errors")).not.toContain("Could not save");
});
