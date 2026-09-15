import type { OuraDailyDoc } from "./oura";

export type DailyPoint = {
  date: string;
  sleep: number | null;
  readiness: number | null;
  activity: number | null;
};

export type DailyResponse = {
  days: number;
  series: DailyPoint[];
  summary: { sleep: number; readiness: number; activity: number };
  source: "oura" | "dev";
  stub?: boolean;
  dev?: boolean;
  label?: string;
};

function utcDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function dateWindow(days: number, now = new Date()): {
  startDate: string;
  endDate: string;
  dates: string[];
} {
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(end.getUTCDate() - i);
    dates.push(utcDateString(d));
  }
  return {
    startDate: dates[0]!,
    endDate: dates[dates.length - 1]!,
    dates,
  };
}

export function clampDays(raw: number): 7 | 30 | 90 {
  return raw === 7 || raw === 90 ? raw : 30;
}

function scoreMap(docs: OuraDailyDoc[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const doc of docs) {
    if (!doc.day || doc.score == null || !Number.isFinite(doc.score)) continue;
    m.set(doc.day, Math.round(doc.score));
  }
  return m;
}

function avg(values: Array<number | null>): number {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (!nums.length) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

export function mapOuraToDaily(args: {
  days: number;
  dates: string[];
  sleep: OuraDailyDoc[];
  readiness: OuraDailyDoc[];
  activity: OuraDailyDoc[];
}): DailyResponse {
  const sleep = scoreMap(args.sleep);
  const readiness = scoreMap(args.readiness);
  const activity = scoreMap(args.activity);
  const series: DailyPoint[] = args.dates.map((date) => ({
    date,
    sleep: sleep.get(date) ?? null,
    readiness: readiness.get(date) ?? null,
    activity: activity.get(date) ?? null,
  }));
  return {
    days: args.days,
    series,
    summary: {
      sleep: avg(series.map((p) => p.sleep)),
      readiness: avg(series.map((p) => p.readiness)),
      activity: avg(series.map((p) => p.activity)),
    },
    source: "oura",
  };
}

function clampScore(n: number): number {
  return Math.max(40, Math.min(98, Math.round(n)));
}

/** Deterministic DEV series so the dashboard lights up without Oura secrets. */
export function buildDevDaily(days: number, now = new Date()): DailyResponse {
  const { dates } = dateWindow(days, now);
  const series: DailyPoint[] = dates.map((date, idx) => {
    const i = days - 1 - idx;
    const wave = Math.sin(i / 3) * 8;
    return {
      date,
      sleep: clampScore(78 + wave + ((i * 3) % 5)),
      readiness: clampScore(74 + wave * 0.8 + ((i * 2) % 7)),
      activity: clampScore(70 + wave * 1.1 + ((i * 5) % 6)),
    };
  });
  return {
    days,
    series,
    summary: {
      sleep: avg(series.map((p) => p.sleep)),
      readiness: avg(series.map((p) => p.readiness)),
      activity: avg(series.map((p) => p.activity)),
    },
    source: "dev",
    stub: true,
    dev: true,
    label: "DEV 演示数据 · 非真实 Oura",
  };
}
