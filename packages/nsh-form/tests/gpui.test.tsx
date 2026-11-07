import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { line, start, text } from "./support";

test("gp1. email() rejects text that is not an address", async () => {
  const app = await start("gpui");
  await app.type("id:gp-email", "bad");
  expect(text(app)).toContain("error Bad email");
  await app.clear("id:gp-email");
  await app.type("id:gp-email", "a@b.co");
  expect(text(app)).not.toContain("Bad email");
});

test("gp2. url() accepts only absolute http and https addresses", async () => {
  const app = await start("gpui");
  await app.type("id:gp-url", "nope");
  expect(text(app)).toContain("error Bad url");
  await app.clear("id:gp-url");
  await app.type("id:gp-url", "https://example.com");
  expect(text(app)).not.toContain("Bad url");
});

test("gp3. slug() accepts lowercase words joined by hyphens", async () => {
  const app = await start("gpui");
  await app.type("id:gp-slug", "Not A Slug");
  expect(text(app)).toContain("error Bad slug");
});

test("gp4. uuid() checks the 8-4-4-4-12 hexadecimal form", async () => {
  const app = await start("gpui");
  await app.type("id:gp-uuid", "1234");
  expect(text(app)).toContain("error Bad uuid");
});

test("gp5. required(), minLength() and maxLength() combine on one field", async () => {
  const app = await start("gpui");
  await app.type("id:gp-name", "a");
  expect(text(app)).toContain("error Too short");
  await app.type("id:gp-name", "bcdefghijkl");
  expect(text(app)).toContain("error Too long");
  await app.clear("id:gp-name");
  expect(text(app)).toContain("error Name needed");
});

test("gp6. min() and max() bound a number, and reject text that is not one", async () => {
  const app = await start("gpui");
  await app.type("id:gp-age", "200");
  expect(text(app)).toContain("error Too high");
  await app.clear("id:gp-age");
  await app.type("id:gp-age", "30");
  expect(text(app)).not.toContain("Too high");
});

test("gp7. pattern() matches the whole value", async () => {
  const app = await start("gpui");
  await app.type("id:gp-code", "12");
  expect(text(app)).toContain("error Code is 3 digits");
  await app.type("id:gp-code", "3");
  expect(text(app)).not.toContain("Code is 3 digits");
});

test("gp8. oneOf() accepts only the listed choices", async () => {
  const app = await start("gpui");
  await app.clear("id:gp-plan");
  await app.type("id:gp-plan", "gold");
  expect(text(app)).toContain("error Unknown plan");
});

test("gp9. changedPaths and patch list only the fields that differ from their defaults", async () => {
  const app = await start("gpui");
  await app.press("role:button[Show changes]");
  expect(line(app, "result ")).toBe("result []");
  await app.type("id:gp-email", "a@b.co");
  await app.press("role:button[Show changes]");
  expect(line(app, "result ")).toBe('result ["email"]');
  await app.press("role:button[Show patch]");
  expect(line(app, "result ")).toBe('result {"email":"a@b.co"}');
});

test("gp10. diagnostics reports the values, validity and each field's meta", async () => {
  const app = await start("gpui");
  await app.type("id:gp-email", "bad");
  await app.press("role:button[Show diagnostics]");
  const report = JSON.parse(line(app, "result ")!.slice("result ".length)) as {
    isDirty: boolean;
    fields: Record<string, { value: string; isDirty: boolean; errors: unknown[] }>;
  };
  expect(report.isDirty).toBe(true);
  expect(report.fields.email.value).toBe("bad");
  expect(report.fields.email.isDirty).toBe(true);
  expect(report.fields.email.errors).toEqual(["Bad email"]);
});

test("gp11. saveForm writes the values to Storage, and restoreForm reads them back", async () => {
  const app = await start("gpui");
  await app.type("id:gp-email", "x@y.co");
  await app.press("role:button[Save draft]");
  await app.waitUntil(() => (app.storage().draft ?? "").includes("x@y.co"), { timeout: 2000 });
  await app.clear("id:gp-email");
  await app.press("role:button[Restore draft]");
  await app.waitUntil(() => app.value("id:gp-email") === "x@y.co", { timeout: 2000 });
  expect(app.value("id:gp-email")).toBe("x@y.co");
});

test("gp12. restoreForm finds a draft saved before the app started", async () => {
  const app: App = await open("../App.tsx", {
    clock: {},
    host: { params: { screen: "gpui" } },
    storage: { draft: JSON.stringify({ email: "saved@y.co" }) },
  });
  await app.press("role:button[Restore draft]");
  await app.waitUntil(() => app.value("id:gp-email") === "saved@y.co", { timeout: 2000 });
  expect(app.value("id:gp-email")).toBe("saved@y.co");
});
