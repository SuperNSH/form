import { expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { start, text } from "./support";

/** The form's values as printed by the bindings screen. */
function values(app: App): Record<string, unknown> {
  const found = text(app).split("\n").find((line) => line.startsWith("values "));
  if (!found) throw new Error("no values line");
  return JSON.parse(found.slice("values ".length));
}

test("b1. OtpInput: typed digits reach the field through otpInputProps", async () => {
  const app = await start("bindings");
  await app.type("id:b-otp", "12");
  expect(values(app).otp).toBe("12");
});

test("b2. Checkbox: a press checks it through checkboxProps", async () => {
  const app = await start("bindings");
  await app.press("text:Agree");
  expect(values(app).check).toBe(true);
});

test("b3. Toggle: a press presses it through toggleButtonProps", async () => {
  const app = await start("bindings");
  await app.press("label:Bold");
  expect(values(app).bold).toBe(true);
  await app.press("label:Bold");
  expect(values(app).bold).toBe(false);
});

test("b4. ToggleGroup: each item toggles its own value in the list", async () => {
  const app = await start("bindings");
  await app.press("label:Red");
  await app.press("label:Green");
  expect(values(app).colors).toEqual(["red", "green"]);
  await app.press("label:Red");
  expect(values(app).colors).toEqual(["green"]);
});

test("b5. RadioGroup: pressing a radio sets the field to its option", async () => {
  const app = await start("bindings");
  expect(values(app).size).toBe("s");
  await app.press("label:Large");
  expect(values(app).size).toBe("l");
});

test("b6. Combobox: choosing an item sets the list of values", async () => {
  const app = await start("bindings");
  await app.press("text:Choose colors");
  await app.press("text:Teal");
  expect(values(app).picked).toEqual(["teal"]);
});

test("b7. Slider: a drag on the thumb changes the number", async () => {
  const app = await start("bindings");
  await app.drag("label:Volume", { x: 60, y: 0 });
  expect(values(app).volume).toBeGreaterThan(3);
});

test("b8. Calendar: a press on a day sets the date", async () => {
  const app = await start("bindings");
  await app.press("text:15 >> nth=0");
  expect(values(app).day).toBe("2026-11-15");
});

test("b9. DatePicker (range): two picks set the range", async () => {
  const app = await start("bindings");
  await app.press("text:Pick range");
  await app.press("text:10 >> nth=1");
  await app.press("text:20 >> nth=1");
  expect(values(app).range).toEqual(["2026-11-10", "2026-11-20"]);
});

test("b10. TimeField: typed digits set the time", async () => {
  const app = await start("bindings");
  await app.type("label:Time", "0930");
  expect(values(app).time).toBe("09:30");
});

test("b11. ColorPicker: dragging the hue channel changes the color", async () => {
  const app = await start("bindings");
  expect(values(app).swatch).toBe("#ff0000");
  await app.drag("label:Hue", { x: 60, y: 0 });
  expect(values(app).swatch).not.toBe("#ff0000");
});

test("b12. Editor: typed text sets the code", async () => {
  const app = await start("bindings");
  await app.type("id:b-editor", "const x = 1");
  expect(values(app).code).toBe("const x = 1");
});

test("b13. RichEditor: typing stores its document, read through docJson", async () => {
  const app = await start("bindings");
  await app.type("id:b-rich", "hi");
  expect(values(app).notes).not.toBeNull();
  expect(JSON.stringify(values(app).notes)).toContain("hi");
});
