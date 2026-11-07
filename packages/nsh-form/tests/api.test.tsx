import { expect, test } from "nsh/test";
import { line, start, text } from "./support";

test("17. reset, resetField, setFieldValue, getFieldValue, setFieldMeta, getFieldMeta, deleteField, validateField and validateAllFields", async () => {
  const app = await start("api");
  await app.type("id:name", "Ada");
  await app.press("role:button[Get name]");
  expect(line(app, "result ")).toBe('result "Ada"');
  await app.press("role:button[Reset to fresh]");
  expect(app.value("id:name")).toBe("fresh");
  await app.press("role:button[Set name]");
  expect(app.value("id:name")).toBe("set");
  await app.press("role:button[Reset name]");
  expect(app.value("id:name")).toBe("fresh");
  await app.press("role:button[Touch name]");
  await app.press("role:button[Get touched]");
  expect(line(app, "result ")).toBe("result true");
  await app.press("role:button[Clear name]");
  await app.press("role:button[Validate all]");
  await app.press("role:button[Get errors]");
  expect(text(app)).toContain("Submit needs a name");
  await app.press("role:button[Reset]");
  expect(app.value("id:name")).toBe("fresh");
  await app.press("role:button[Get errors]");
  expect(line(app, "result ")).toBe("result []");
  await app.press("role:button[Validate name]");
  await app.press("role:button[Delete name]");
  await app.press("role:button[Get name]");
  expect(line(app, "result ")).toBe("result undefined");
});

test("18. listeners on form and field: onChange, onBlur, onMount, onSubmit, and a debounced onChange", async () => {
  const app = await start("listeners");
  expect(line(app, "form-change")).toContain("form-mount 1");
  await app.type("id:name", "bc");
  expect(line(app, "form-change")).toContain("form-change 2 ");
  expect(line(app, "form-change")).toContain("field-change 2");
  await app.press("role:button[Blur]");
  expect(line(app, "form-change")).toContain("form-blur 1");
  expect(line(app, "form-change")).toContain("field-blur 1");
  await app.press("role:button[Submit]");
  expect(line(app, "form-change")).toContain("form-submit 1");
  await app.type("id:other", "xyz");
  expect(line(app, "debounced")).toBe("debounced 0");
  await app.clock!.runFor(200);
  expect(line(app, "debounced")).toBe("debounced 1");
});

test("19. formOptions shared between two forms, and mergeForm", async () => {
  const app = await start("formOptions");
  await app.type("id:first", "toolongvalue");
  expect(text(app)).toContain("error Too long");
  expect(app.value("id:second")).toBe("Second");
  await app.press("role:button[Merge]");
  expect(line(app, "merged ")).toBe("merged merged");
});

test("17b. getAllErrors, getFieldInfo, resetFieldMeta, setErrorMap and parseValuesWithSchema", async () => {
  const app = await start("api");
  await app.press("role:button[Clear name]");
  await app.press("role:button[Validate all]");
  await app.press("role:button[All errors]");
  expect(line(app, "result ")).toContain("Submit needs a name");
  await app.press("role:button[Field registered]");
  expect(line(app, "result ")).toBe("result true");
  await app.press("role:button[Parse values]");
  expect(line(app, "result ")).toContain("Parse: name needed");
  await app.press("role:button[Touch name]");
  await app.press("role:button[Reset field meta]");
  expect(line(app, "result ")).toBe("result false");
  await app.press("role:button[Set error map]");
  await app.press("role:button[All errors]");
  expect(line(app, "result ")).toContain("Set by hand");
});
