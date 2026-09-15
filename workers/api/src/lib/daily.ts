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
