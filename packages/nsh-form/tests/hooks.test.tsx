import { expect, test } from "nsh/test";
import { start, text } from "./support";

test("20. createFormHook with an app-bound TextField component and withForm", async () => {
  const app = await start("hook");
  expect(text(app)).toContain("Sign up");
  await app.type("id:hook-email", "bad");
  expect(app.value("id:hook-email")).toBe("bad");
  expect(app.shows("id:hook-email-error")).toBe(true);
  expect(text(app)).toContain("error Needs an @");
  await app.clear("id:hook-email");
  await app.type("id:hook-email", "a@b.c");
  expect(app.shows("id:hook-email-error")).toBe(false);
});
