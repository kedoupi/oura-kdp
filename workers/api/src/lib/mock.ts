import { dateWindow, type DailyPoint, type DailyResponse } from "./daily";

function clamp(n: number): number {
  return Math.max(40, Math.min(98, Math.round(n)));
}

/** Deterministic DEV series so the dashboard lights up without Oura secrets. */
export function buildDevDaily(days: number): DailyResponse {
  const { dates } = dateWindow(days);
  const series: DailyPoint[] = dates.map((date, idx) => {
    const i = days - 1 - idx;
    const wave = Math.sin(i / 3) * 8;
    return {
      date,
      sleep: clamp(78 + wave + ((i * 3) % 5)),
      readiness: clamp(74 + wave * 0.8 + ((i * 2) % 7)),
      activity: clamp(70 + wave * 1.1 + ((i * 5) % 6)),
    };
  });
  const avg = (key: keyof Pick<DailyPoint, "sleep" | "readiness" | "activity">) =>
    series.reduce((s, p) => s + (p[key] as number), 0) / series.length;
  return {
    days,
    series,
    summary: {
      sleep: avg("sleep"),
      readiness: avg("readiness"),
      activity: avg("activity"),
    },
    source: "dev",
    stub: true,
    dev: true,
    label: "DEV 演示数据 · 非真实 Oura",
  };
}

/** @deprecated use buildDevDaily */
export function buildStubDaily(days: number): DailyResponse {
  return buildDevDaily(days);
}
