import { open } from "nsh/test";
import type { App } from "nsh/test";

/** Opens the screen `screen` of App.tsx on a manual clock, so timers move only when a test moves them. */
export function start(screen: string): Promise<App> {
  return open("../App.tsx", { clock: {}, host: { params: { screen } } });
}

/** The text of every line on screen, joined, for `toContain` checks. */
export function text(app: App): string {
  return app.texts().join("\n");
}

/** The first line on screen that starts with `prefix`, or `undefined`. */
export function line(app: App, prefix: string): string | undefined {
  return app.texts().find((entry) => entry.startsWith(prefix));
}

/** A number printed after `label` in a line, such as `renders 3`. */
export function count(app: App, prefix: string, label: string): number {
  const found = line(app, prefix);
  const match = found?.match(new RegExp(`${label} (\\d+)`));
  if (!match) throw new Error(`no "${label} <n>" in "${found ?? "missing line"}"`);
  return Number(match[1]);
}
