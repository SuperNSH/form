import { expect, test } from "nsh/test";
import { count, line, start } from "./support";

test("13. form.Subscribe with a selector rerenders only for its slice", async () => {
  const app = await start("subscribe");
  const before = count(app, "slice ", "renders");
  await app.type("id:email", "a");
  const afterEmail = count(app, "slice a", "renders");
  expect(afterEmail).toBe(before + 1);
  await app.type("id:password", "p");
  expect(count(app, "slice a", "renders")).toBe(afterEmail);
});

test("14. form.useStore and the standalone useStore rerender only for their slice", async () => {
  const app = await start("subscribe");
  const hookBefore = count(app, "hook ", "renders");
  const standaloneBefore = count(app, "standalone ", "renders");
  await app.type("id:email", "a");
  expect(count(app, "hook a", "renders")).toBe(hookBefore + 1);
  expect(count(app, "standalone ", "renders")).toBe(standaloneBefore);
  await app.type("id:password", "p");
  expect(count(app, "standalone p", "renders")).toBe(standaloneBefore + 1);
  expect(count(app, "hook a", "renders")).toBe(hookBefore + 1);
  expect(line(app, "hook a")).toBeDefined();
});
