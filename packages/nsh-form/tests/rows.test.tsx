import { expect, test } from "nsh/test";
import { line, start } from "./support";

test("24. a field made inside Each stops validating after its row goes", async () => {
  const app = await start("rows");
  await app.type("id:row-2", "x");
  await app.press("role:button[Remove row 2]");
  await app.clock!.runFor(400);
  expect(line(app, "calls ")).toBe("calls row1 0 row2 0");
  await app.type("id:row-1", "y");
  await app.clock!.runFor(400);
  expect(line(app, "calls ")).toBe("calls row1 1 row2 0");
});
