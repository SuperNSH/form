import { expect, test } from "nsh/test";
import { line, start, text } from "./support";

test("1. field.state.value, handleChange and handleBlur update in a binding", async () => {
  const app = await start("field");
  await app.type("id:name", "ab");
  expect(app.value("id:name")).toBe("ab");
  expect(line(app, "name ab")).toBeDefined();
  expect(text(app)).not.toContain("blurred true");
  await app.press("role:button[Blur]");
  expect(line(app, "name ab")).toContain("blurred true");
});

test("2. field meta: isTouched, isBlurred, isDirty, isPristine, isDefaultValue, isValid, errors, errorMap", async () => {
  const app = await start("field");
  expect(line(app, "name ")).toContain("touched false blurred false dirty false pristine true default true valid true");
  await app.type("id:name", "ab");
  expect(line(app, "name ab")).toContain("dirty true pristine false default false valid false causes onChange");
  expect(text(app)).toContain("error Too short");
  await app.press("role:button[Blur]");
  expect(line(app, "name ab")).toContain("touched true blurred true");
});

test("3. validators onChange, onBlur, onSubmit and onMount each report under their own cause", async () => {
  const app = await start("field");
  expect(line(app, "other ")).toContain("causes onMount");
  await app.press("role:button[Submit]");
  expect(line(app, "other ")).toContain("causes onMount,onSubmit");
  await app.type("id:name", "bad");
  expect(line(app, "name bad")).toContain("valid true");
  await app.press("role:button[Blur]");
  expect(line(app, "name bad")).toContain("causes onBlur");
  expect(line(app, "name bad")).toContain("valid false");
});

test("21. inputProps through a real Input: typing, blur and the error on screen", async () => {
  const app = await start("field");
  await app.type("id:name", "a");
  expect(app.value("id:name")).toBe("a");
  expect(text(app)).toContain("error Too short");
  await app.press("role:button[Blur]");
  expect(text(app)).toContain("blurred true");
  await app.type("id:name", "bc");
  expect(app.value("id:name")).toBe("abc");
  expect(text(app)).not.toContain("error Too short");
});
