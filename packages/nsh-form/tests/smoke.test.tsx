import { expect, open, test } from "nsh/test";

test("25. smoke: one small form end to end", async () => {
  const app = await open("../App.tsx");
  await app.type("id:name", "Ada");
  await app.press("role:button[Save]");
  await app.waitFor("text:saved Ada");
  expect(app.value("id:name")).toBe("Ada");
});
