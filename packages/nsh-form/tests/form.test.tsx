import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";

async function start(): Promise<App> {
  return open("../App.tsx", { clock: {} });
}

async function fillValid(app: App): Promise<void> {
  await app.type("id:email", "ada@example.com");
  await app.type("id:password", "correct-horse");
  await app.type("id:confirm", "correct-horse");
  await app.clock!.runFor(350);
}

test("errors wait for a blur or a submit", async () => {
  const app = await start();
  await app.type("id:email", "not-an-email");
  expect(app.shows("id:email-error")).toBe(false);
  await app.press("role:button[Submit]");
  await app.waitFor("text:That is not an email");
  await app.waitFor("text:Enter a password");
  expect(app.shows("text:saved 0")).toBe(true);
});

test("a submit with errors runs nothing and counts the attempt", async () => {
  const app = await start();
  await app.press("role:button[Submit]");
  expect(app.shows("text:submits 1")).toBe(true);
  expect(app.shows("text:saved 0")).toBe(true);
  expect(app.shows("text:Enter your email")).toBe(true);
});

test("a rule can read other values", async () => {
  const app = await start();
  await app.type("id:password", "correct-horse");
  await app.type("id:confirm", "wrong");
  await app.press("role:button[Submit]");
  await app.waitFor("text:Passwords differ");
});

test("a valid submit saves and makes the values the baseline", async () => {
  const app = await start();
  await fillValid(app);
  expect(app.shows("text:dirty true")).toBe(true);
  await app.press("role:button[Submit]");
  await app.waitFor("text:saved 1");
  await app.waitFor("text:dirty false");
});

test("server errors land on their field and clear on edit", async () => {
  const app = await start();
  await app.type("id:email", "taken@example.com");
  await app.type("id:password", "correct-horse");
  await app.type("id:confirm", "correct-horse");
  await app.clock!.runFor(350);
  await app.press("role:button[Submit]");
  await app.waitFor("text:Already registered");
  expect(app.shows("text:dirty true")).toBe(true);
  await app.clear("id:email");
  await app.type("id:email", "ada@example.com");
  expect(app.shows("text:Already registered")).toBe(false);
});

test("a form-level error shows on the form", async () => {
  const app = await start();
  await app.type("id:email", "down@example.com");
  await app.type("id:password", "correct-horse");
  await app.type("id:confirm", "correct-horse");
  await app.clock!.runFor(350);
  await app.press("role:button[Submit]");
  await app.waitFor("text:Try again later");
});

test("an async rule debounces and blocks a submit while it runs", async () => {
  const app = await start();
  await app.type("id:email", "blocked@example.com");
  expect(app.shows("text:validating true")).toBe(true);
  expect(app.shows("text:valid false")).toBe(true);
  await app.clock!.runFor(350);
  await app.waitFor("text:validating false");
  await app.press("role:button[Submit]");
  await app.waitFor("text:Blocked domain");
});

test("an edit drops the answer of an older async check", async () => {
  const app = await start();
  await app.type("id:email", "blocked@example.com");
  await app.clock!.runFor(100);
  await app.clear("id:email");
  await app.type("id:email", "ada@example.com");
  await app.clock!.runFor(350);
  await app.waitFor("text:validating false");
  await app.press("role:button[Submit]");
  expect(app.shows("text:Blocked domain")).toBe(false);
});

test("reset goes back to the baseline and clears feedback", async () => {
  const app = await start();
  await app.type("id:email", "x");
  await app.press("role:button[Submit]");
  await app.waitFor("text:That is not an email");
  await app.press("role:button[Reset]");
  expect(app.value("id:email")).toBe("");
  expect(app.shows("text:dirty false")).toBe(true);
  expect(app.shows("text:That is not an email")).toBe(false);
});

test("load replaces values and baseline", async () => {
  const app = await start();
  await app.press("role:button[Load]");
  expect(app.value("id:email")).toBe("loaded@example.com");
  expect(app.shows("text:dirty false")).toBe(true);
});

test("nested paths read, write and report dirty on their own", async () => {
  const app = await start();
  expect(app.shows("text:city dirty false")).toBe(true);
  await app.type("id:city", "Lahore");
  expect(app.value("id:city")).toBe("Lahore");
  expect(app.shows("text:city dirty true")).toBe(true);
});

test("toggle props bind a switch", async () => {
  const app = await start();
  await app.press("label:Subscribe");
  expect(app.shows("text:subscribed true")).toBe(true);
});

test("array rows keep their keys through a removal", async () => {
  const app = await start();
  expect(app.shows("text:tags first")).toBe(true);
  await app.press("role:button[Add tag]");
  expect(app.shows("text:tags first,added")).toBe(true);
  expect(app.shows("text:keys 0,1")).toBe(true);
  await app.press("role:button[Remove tag]");
  expect(app.shows("text:tags added")).toBe(true);
  expect(app.shows("text:keys 1")).toBe(true);
  expect(app.shows("text:dirty true")).toBe(true);
});
