import type { OuraDailyRow } from "./oura";

export type DailyPoint = {
  date: string;
  sleep: number | null;
  readiness: number | null;
  activity: number | null;
};

function utcYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function scoreMap(rows: OuraDailyRow[]): Map<string, number | null> {
  const map = new Map<string, number | null>();
  for (const row of rows) map.set(row.day, row.score);
  return map;
}

function mean(values: Array<number | null>): number {
  const nums = values.filter((v): v is number => typeof v === "number");
  if (nums.length === 0) return Number.NaN;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

export function dateRangeUtc(days: number, end = new Date()): string[] {
  const endUtc = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
  );
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(endUtc);
    d.setUTCDate(endUtc.getUTCDate() - i);
    dates.push(utcYmd(d));
  }
  return dates;
}

export function buildDailyPayload(args: {
  days: number;
  sleep: OuraDailyRow[];
  readiness: OuraDailyRow[];
  activity: OuraDailyRow[];
}): {
  days: number;
  series: DailyPoint[];
  summary: { sleep: number; readiness: number; activity: number };
} {
  const dates = dateRangeUtc(args.days);
  const sleep = scoreMap(args.sleep);
  const readiness = scoreMap(args.readiness);
  const activity = scoreMap(args.activity);

  const series: DailyPoint[] = dates.map((date) => ({
    date,
    sleep: sleep.get(date) ?? null,
    readiness: readiness.get(date) ?? null,
    activity: activity.get(date) ?? null,
  }));

  return {
    days: args.days,
    series,
    summary: {
      sleep: mean(series.map((p) => p.sleep)),
      readiness: mean(series.map((p) => p.readiness)),
      activity: mean(series.map((p) => p.activity)),
    },
  };
}
