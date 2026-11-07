import { expect, test } from "nsh/test";
import { line, start } from "./support";

function state(app: Parameters<typeof line>[0]): Record<string, unknown> {
  const found = line(app, "state ");
  if (!found) throw new Error("no form state line");
  return JSON.parse(found.slice("state ".length));
}

test("9. handleSubmit runs onSubmit only when valid, and onSubmitInvalid otherwise", async () => {
  const app = await start("submit");
  await app.press("role:button[Save]");
  expect(line(app, "ok ")).toContain("ok 0 invalid 1 source none");
  await app.type("id:name", "Ada");
  await app.press("role:button[Save]");
  expect(line(app, "ok ")).toContain("ok 1 invalid 1");
});

test("10. handleSubmit(meta) passes onSubmitMeta, and the default meta is used otherwise", async () => {
  const app = await start("submit");
  await app.type("id:name", "Ada");
  await app.press("role:button[Share draft]");
  expect(line(app, "ok ")).toContain("source toolbar");
  await app.press("role:button[Save]");
  expect(line(app, "ok ")).toContain("source default");
});

test("11. form state: submission, validity, dirtiness and touched flags", async () => {
  const app = await start("submit");
  expect(state(app).submissionAttempts).toBe(0);
  expect(state(app).isSubmitted).toBe(false);
  await app.press("role:button[Save]");
  expect(state(app).submissionAttempts).toBe(1);
  expect(state(app).isSubmitted).toBe(false);
  expect(state(app).isFieldsValid).toBe(false);
  expect(state(app).isTouched).toBe(true);
  await app.type("id:name", "Ada");
  expect(state(app).isDirty).toBe(true);
  expect(state(app).isPristine).toBe(false);
  await app.press("role:button[Save]");
  expect(state(app).isSubmitted).toBe(true);
  expect(state(app).isSubmitSuccessful).toBe(true);
  expect(state(app).submissionAttempts).toBe(2);
  for (const key of ["canSubmit", "isSubmitting", "isValidating", "isFormValid", "isBlurred", "isDefaultValue", "errors"]) {
    expect(Object.keys(state(app))).toContain(key);
  }
});

test("12. canSubmitWhenInvalid, asyncAlways and asyncDebounceMs at form level", async () => {
  const app = await start("options");
  await app.type("id:always", "a");
  await app.clock!.runFor(199);
  expect(line(app, "always runs")).toContain("always runs 0");
  await app.clock!.runFor(1);
  expect(line(app, "always runs")).toContain("always runs 1");
  await app.type("id:normal", "a");
  await app.clock!.runFor(1);
  expect(line(app, "normal runs")).toContain("normal runs 1");
  await app.press("role:button[Save options]");
  expect(line(app, "submit always")).toBe("submit always runs 1 submit normal runs 0");
  expect(line(app, "can submit")).toBe("can submit always true normal false");
});
