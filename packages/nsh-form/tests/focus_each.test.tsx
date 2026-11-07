import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { text } from "./support";

/** Opens the focus screen where only `only` is required, so a failed submit focuses it. */
function openOnly(only: string): Promise<App> {
  return open("../App.tsx", { clock: {}, host: { params: { screen: "focusEach", only } } });
}

test("23e-1. focusFirstInvalid focuses an Input, and typing goes into it", async () => {
  const app = await openOnly("input");
  await app.press("role:button[Save]");
  await app.keyboard.press("x");
  expect(app.value("id:fe-input")).toBe("x");
});

test("23e-2. focusFirstInvalid calls NumberInput's ref focus; in NSH 0.4.0 that focus is the wrapper view, so typed digits do not reach the field", async () => {
  const app = await openOnly("amount");
  await app.press("role:button[Save]");
  await app.keyboard.press("7");
  expect(app.value("id:fe-number")).toBe("");
});

test("23e-3. focusFirstInvalid focuses an OtpInput, and typing goes into it", async () => {
  const app = await openOnly("otp");
  await app.press("role:button[Save]");
  await app.keyboard.press("5");
  expect(app.value("id:fe-otp")).toBe("5");
});

test("23e-4. focusFirstInvalid focuses an Editor, and typing goes into it", async () => {
  const app = await openOnly("code");
  await app.press("role:button[Save]");
  await app.keyboard.press("y");
  expect(app.value("id:fe-editor")).toBe("y");
});

test("23e-5. focusFirstInvalid focuses a RichEditor, and typing goes into it", async () => {
  const app = await openOnly("notes");
  await app.press("role:button[Save]");
  await app.keyboard.press("h");
  await app.clock!.runFor(50);
  expect(text(app)).toContain('"h"');
});
