import { expect, test } from "nsh/test";
import { start, text } from "./support";

test("r1. form-level onMount puts its error on the field at mount", async () => {
  const app = await start("rules");
  expect(text(app)).toContain("error Form mount: code needed");
});

test("r2. form-level onBlur runs when a field loses focus", async () => {
  const app = await start("rules");
  await app.type("id:note", "bad");
  expect(text(app)).not.toContain("Form blur: bad note");
  await app.press("role:button[Blur]");
  expect(text(app)).toContain("error Form blur: bad note");
});

test("r3. form-level onBlurAsync waits its onBlurAsyncDebounceMs after the blur", async () => {
  const app = await start("rules");
  await app.type("id:note", "taken");
  await app.press("role:button[Blur]");
  await app.clock!.runFor(199);
  expect(text(app)).not.toContain("Form async blur: taken");
  await app.clock!.runFor(1);
  expect(text(app)).toContain("error Form async blur: taken");
});

test("r4. form-level onDynamic runs when revalidateLogic adds it on blur, not on change", async () => {
  const app = await start("dynamic");
  await app.type("id:code", "dyn");
  expect(text(app)).not.toContain("Form dynamic code");
  await app.press("role:button[Blur]");
  expect(text(app)).toContain("error Form dynamic code");
});

test("r5. form-level onDynamicAsync waits its onDynamicAsyncDebounceMs", async () => {
  const app = await start("dynamic");
  await app.type("id:note", "dyn");
  await app.press("role:button[Blur]");
  await app.clock!.runFor(149);
  expect(text(app)).not.toContain("Form dynamic async");
  await app.clock!.runFor(1);
  expect(text(app)).toContain("error Form dynamic async");
});

test("r6. form-level onChangeAsync waits its onChangeAsyncDebounceMs", async () => {
  const app = await start("rules");
  await app.type("id:code", "a");
  await app.clock!.runFor(299);
  expect(text(app)).toContain("form runs 0");
  await app.clock!.runFor(1);
  expect(text(app)).toContain("form runs 1");
});

test("r7. field-level onBlurAsync runs no sooner than its onBlurAsyncDebounceMs after the blur", async () => {
  const app = await start("rules");
  await app.type("id:slug", "taken");
  await app.press("role:button[Blur]");
  await app.clock!.runFor(1000);
  expect(text(app)).toContain("error Field async blur: taken");
  const gap = Number(text(app).match(/slug gap (-?\d+)/)?.[1]);
  expect(gap).toBeGreaterThanOrEqual(250);
});

test("r8. field-level onDynamic and onDynamicAsync run under the same validation logic", async () => {
  const app = await start("dynamic");
  await app.type("id:slug", "dyn");
  await app.press("role:button[Blur]");
  expect(text(app)).toContain("error Field dynamic");
  await app.clear("id:slug");
  await app.type("id:slug", "dyn-async");
  await app.press("role:button[Blur]");
  await app.clock!.runFor(1000);
  expect(text(app)).toContain("error Field dynamic async");
  const gap = Number(text(app).match(/dynamic gap (-?\d+)/)?.[1]);
  expect(gap).toBeGreaterThanOrEqual(100);
});

test("r9. onBlurListenTo: a blur of the password revalidates the confirmation on blur", async () => {
  const app = await start("rules");
  await app.type("id:password", "abc");
  await app.type("id:confirm", "abd");
  await app.press("role:button[Blur]");
  expect(text(app)).toContain("error Blur: passwords differ");
  await app.clear("id:password");
  await app.type("id:password", "abd");
  await app.press("role:button[Blur]");
  expect(text(app)).not.toContain("Blur: passwords differ");
});

test("f1. formId is the id the form was given", async () => {
  const app = await start("formRules");
  expect(text(app)).toContain("form id signup-form");
});

test("f2. defaultState sets the starting values and state", async () => {
  const app = await start("formRules");
  expect(text(app)).toContain('state {"attempts":3,"submitted":true}');
});

test("f3. transform changes the form's error state when the form is made", async () => {
  const app = await start("formRules");
  expect(text(app)).toContain('state errors ["Transformed at creation"]');
});

test("f4. revalidateLogic adds onDynamic on the watched event, and onChange still runs on change", async () => {
  const app = await start("formRules");
  await app.type("id:reval", "dyn");
  expect(text(app)).not.toContain("Dynamic only");
  await app.press("role:button[Blur]");
  expect(text(app)).toContain("error Dynamic only");
});

test("f5. a custom ValidationLogicFn decides when validators run", async () => {
  const app = await start("formRules");
  await app.type("id:custom", "a");
  expect(text(app)).not.toContain("Too short");
  await app.press("role:button[Submit custom]");
  expect(text(app)).toContain("error Too short");
});

test("f6. defaultValidationLogic runs validators on each change", async () => {
  const app = await start("formRules");
  await app.type("id:plain", "a");
  expect(text(app)).toContain("error Too short");
});

test("a1. validateArrayFieldsStartingFrom validates the rows from the index on", async () => {
  const app = await start("arrayRules");
  await app.press("role:button[Validate from 1]");
  expect(text(app)).not.toContain("error Row needs a name\nRow");
  expect(app.shows("id:row-1-error")).toBe(true);
  expect(app.shows("id:row-2-error")).toBe(true);
  expect(app.shows("id:row-0-error")).toBe(false);
});

test("u1. a form's defaultValues update at run time while the form is untouched", async () => {
  const app = await start("update");
  expect(app.value("id:update-name")).toBe("Ada");
  await app.press("role:button[Rename]");
  expect(app.value("id:update-name")).toBe("Grace");
});

test("u2. a field's validators update at run time from the props it is given", async () => {
  const app = await start("update");
  await app.clear("id:update-name");
  await app.type("id:update-name", "x");
  expect(text(app)).toContain("error Too short (2)");
  await app.press("role:button[Raise minimum]");
  await app.clear("id:update-name");
  await app.type("id:update-name", "xyzw");
  expect(text(app)).toContain("error Too short (5)");
});

test("g1. group.AppField binds a field of the group through the form's components", async () => {
  const app = await start("groupContext");
  await app.type("id:gc-city", "Lahore");
  expect(app.value("id:gc-city")).toBe("Lahore");
});

test("g2. group.Subscribe reads the group's slice", async () => {
  const app = await start("groupContext");
  await app.type("id:gc-city", "Lahore");
  expect(text(app)).toContain("group sub Lahore");
});

test("g3. AppForm and group.AppForm provide the form to their children", async () => {
  const app = await start("groupContext");
  expect(text(app)).toContain("context title ");
});

test("g4. useFormContext reads the form inside an AppForm", async () => {
  const app = await start("groupContext");
  await app.type("id:gc-title", "Hello");
  expect(text(app)).toContain("context title Hello");
});

test("p1. parseValuesWithSchemaAsync runs an async Standard Schema on the whole form", async () => {
  const app = await start("parse");
  await app.press("role:button[Parse values async]");
  await app.clock!.runFor(10);
  expect(text(app)).toContain("Parse async: name needed");
});

test("p2. parseValueWithSchemaAsync runs an async Standard Schema on one field", async () => {
  const app = await start("parse");
  await app.press("role:button[Parse value async]");
  await app.clock!.runFor(10);
  expect(text(app)).toContain("Parse async: field empty");
});

test("s1. form.useSelector reads a slice of the form state", async () => {
  const app = await start("subscribe");
  await app.type("id:email", "a");
  expect(text(app)).toContain("selector a");
});
