import { expect, test } from "nsh/test";
import { line, start, text } from "./support";

test("15. array fields: push, remove, swap, move, insert, replace and clear, with rows that keep their values", async () => {
  const app = await start("array");
  expect(line(app, "tags ")).toBe("tags a,b");
  await app.press("role:button[Push]");
  expect(line(app, "tags ")).toBe("tags a,b,c");
  expect(app.value("id:tag-2")).toBe("c");
  await app.press("role:button[Remove first]");
  expect(line(app, "tags ")).toBe("tags b,c");
  expect(app.value("id:tag-0")).toBe("b");
  expect(app.value("id:tag-1")).toBe("c");
  expect(app.shows("id:tag-2")).toBe(false);
  await app.press("role:button[Swap]");
  expect(line(app, "tags ")).toBe("tags c,b");
  await app.press("role:button[Move]");
  expect(line(app, "tags ")).toBe("tags b,c");
  await app.press("role:button[Insert]");
  expect(line(app, "tags ")).toBe("tags x,b,c");
  await app.press("role:button[Replace]");
  expect(line(app, "tags ")).toBe("tags y,b,c");
  await app.press("role:button[Clear]");
  expect(line(app, "tags ")?.trim()).toBe("tags");
});

test("16. nested paths, address.city and items[0].name, are typed and bind", async () => {
  const app = await start("array");
  await app.type("id:city", "Lahore");
  expect(app.value("id:city")).toBe("Lahore");
  expect(line(app, "nested ")).toBe("nested Lahore|");
  await app.type("id:item", "Ada");
  expect(line(app, "nested ")).toBe("nested Lahore|Ada");
  expect(text(app)).not.toContain("undefined");
});
