import { expect, test } from "nsh/test";
import { line, start } from "./support";

test("22. toggleProps on a Switch, selectProps on a Select, and numberInputProps on a NumberInput", async () => {
  const app = await start("controls");
  expect(line(app, "subscribed ")).toBe("subscribed false");
  await app.press("label:Subscribe");
  expect(line(app, "subscribed ")).toBe("subscribed true");
  await app.press("id:plan-trigger");
  await app.press("text:Pro");
  expect(line(app, "plan ")).toBe("plan pro");
  await app.type("id:age", "42");
  expect(line(app, "age ")).toBe("age 42");
});
