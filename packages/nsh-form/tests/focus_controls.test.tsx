import { expect, test } from "nsh/test";
import { start, text } from "./support";

/** Types into `control`, with the email holding a value the submit will reject: the focus move to the email blurs `control`. */
async function focusThenSubmit(control: (app: Awaited<ReturnType<typeof start>>) => Promise<void>) {
  const app = await start("focusControls");
  await app.type("id:fc-email", "taken@example.com");
  await control(app);
  await app.press("role:button[Save]");
  return app;
}

test("23d-1. a blur of an Input made by the focus move keeps the form-level submit error", async () => {
  const app = await focusThenSubmit((a) => a.type("id:fc-input", "x"));
  expect(text(app)).toContain('form errors ["Could not save"]');
});

test("23d-2. a blur of a NumberInput made by the focus move keeps the form-level submit error", async () => {
  const app = await focusThenSubmit((a) => a.type("id:fc-number", "4"));
  expect(text(app)).toContain('form errors ["Could not save"]');
});

test("23d-3. a blur of an OtpInput made by the focus move keeps the form-level submit error", async () => {
  const app = await focusThenSubmit((a) => a.type("id:fc-otp", "12"));
  expect(text(app)).toContain('form errors ["Could not save"]');
});

test("23d-4. a blur of an Editor made by the focus move keeps the form-level submit error", async () => {
  const app = await focusThenSubmit((a) => a.type("id:fc-editor", "x"));
  expect(text(app)).toContain('form errors ["Could not save"]');
});

test("23d-5. a blur of a RichEditor made by the focus move keeps the form-level submit error", async () => {
  const app = await focusThenSubmit((a) => a.type("id:fc-rich", "hi"));
  expect(text(app)).toContain('form errors ["Could not save"]');
});
