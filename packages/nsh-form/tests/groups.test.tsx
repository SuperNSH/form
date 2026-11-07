import { expect, test } from "nsh/test";
import { line, start, text } from "./support";

test("26. createFieldGroup maps group names onto the form, and withFieldGroup shares the same field", async () => {
  const app = await start("group");
  await app.type("id:group-city", "Lahore");
  expect(line(app, "group city ")).toBe("group city Lahore");
  expect(app.value("id:group-hook-city")).toBe("Lahore");
  await app.type("id:group-hook-city", "x");
  expect(line(app, "group city ")).toBe("group city Lahorex");
  expect(text(app)).toContain("group touched");
});

test("26b. createFieldGroup with a fields map names group fields that point at paths of the form", async () => {
  const app = await start("group");
  await app.type("id:group-map", "Karachi");
  expect(line(app, "group city ")).toBe("group city Karachi");
});
