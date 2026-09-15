import { KEDOUPI_DAILY_SAMPLE } from "../data/kedoupi-sample.ts";
import type { OuraDailyDoc } from "./oura";

export type SleepContributors = {
  deep_sleep?: number;
  efficiency?: number;
  latency?: number;
  rem_sleep?: number;
  restfulness?: number;
  timing?: number;
  total_sleep?: number;
  [key: string]: number | undefined;
};

export type ReadinessContributors = {
  activity_balance?: number;
  body_temperature?: number;
  hrv_balance?: number;
  previous_day_activity?: number;
  previous_night?: number;
  recovery_index?: number;
  resting_heart_rate?: number;
  sleep_balance?: number;
  [key: string]: number | undefined;
};

export type NestedSleep = {
  score: number | null;
  contributors: SleepContributors;
};

export type NestedReadiness = {
  score: number | null;
  temperature_deviation?: number | null;
  temperature_trend_deviation?: number | null;
  contributors: ReadinessContributors;
};

export type NestedActivity = {
  score: number | null;
  steps: number | null;
  active_calories: number | null;
};

export type NestedDay = {
  date: string;
  sleep: NestedSleep | null;
  readiness: NestedReadiness | null;
  activity: NestedActivity | null;
};

/** Legacy flat point — kept so older clients still parse something. */
export type DailyPoint = {
  date: string;
  sleep: number | null;
  readiness: number | null;
  activity: number | null;
};

export type DailyResponse = {
  ok: true;
  user_id?: string;
  from: string;
  to: string;
  count: number;
  days: NestedDay[];
  series: DailyPoint[];
  summary: { sleep: number; readiness: number; activity: number };
  source: "oura" | "dev";
  stub?: boolean;
  dev?: boolean;
  label?: string;
};

const DEV_UPSTREAM = "https://api.xiaotaozi.cc/oura/daily?user_id=kedoupi&days=90";

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

function numMap(docs: OuraDailyDoc[]): Map<string, OuraDailyDoc> {
  const m = new Map<string, OuraDailyDoc>();
  for (const doc of docs) {
    if (!doc.day) continue;
    m.set(doc.day, doc);
  }
  return m;
}

function pickScore(n: unknown): number | null {
  return typeof n === "number" && Number.isFinite(n) ? Math.round(n) : null;
}

function pickContributors(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

function pickSleep(doc?: OuraDailyDoc): NestedSleep | null {
  if (!doc) return null;
  const score = pickScore(doc.score);
  const contributors = pickContributors(doc.contributors);
  if (score == null && !Object.keys(contributors).length) return null;
  return { score, contributors };
}

function pickReadiness(doc?: OuraDailyDoc): NestedReadiness | null {
  if (!doc) return null;
  const score = pickScore(doc.score);
  const contributors = pickContributors(doc.contributors);
  const temperature_deviation =
    typeof doc.temperature_deviation === "number" ? doc.temperature_deviation : null;
  const temperature_trend_deviation =
    typeof doc.temperature_trend_deviation === "number"
      ? doc.temperature_trend_deviation
      : null;
  if (
    score == null &&
    !Object.keys(contributors).length &&
    temperature_deviation == null &&
    temperature_trend_deviation == null
  ) {
    return null;
  }
  return {
    score,
    temperature_deviation,
    temperature_trend_deviation,
    contributors,
  };
}

function pickActivity(doc?: OuraDailyDoc): NestedActivity | null {
  if (!doc) return null;
  const score = pickScore(doc.score);
  const steps = typeof doc.steps === "number" && Number.isFinite(doc.steps) ? doc.steps : null;
  const active_calories =
    typeof doc.active_calories === "number" && Number.isFinite(doc.active_calories)
      ? doc.active_calories
      : null;
  if (score == null && steps == null && active_calories == null) return null;
  return { score, steps, active_calories };
}

function avg(values: Array<number | null | undefined>): number {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (!nums.length) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function toSeries(days: NestedDay[]): DailyPoint[] {
  return days.map((d) => ({
    date: d.date,
    sleep: d.sleep?.score ?? null,
    readiness: d.readiness?.score ?? null,
    activity: d.activity?.score ?? null,
  }));
}

function finalize(
  days: NestedDay[],
  extra: Omit<DailyResponse, "ok" | "from" | "to" | "count" | "days" | "series" | "summary"> & {
    user_id?: string;
  },
): DailyResponse {
  const sorted = [...days].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const series = toSeries(sorted);
  return {
    ok: true,
    user_id: extra.user_id,
    from: sorted[0]?.date ?? "",
    to: sorted[sorted.length - 1]?.date ?? "",
    count: sorted.length,
    days: sorted,
    series,
    summary: {
      sleep: avg(series.map((p) => p.sleep)),
      readiness: avg(series.map((p) => p.readiness)),
      activity: avg(series.map((p) => p.activity)),
    },
    source: extra.source,
    stub: extra.stub,
    dev: extra.dev,
    label: extra.label,
  };
}

function isNestedDay(v: unknown): v is NestedDay {
  if (!v || typeof v !== "object") return false;
  const d = v as NestedDay;
  return typeof d.date === "string";
}

export function normalizeHealthDaily(
  payload: { days?: unknown[]; user_id?: string },
  extra: Omit<DailyResponse, "ok" | "from" | "to" | "count" | "days" | "series" | "summary">,
): DailyResponse {
  const days = (payload.days ?? []).filter(isNestedDay).map((d) => ({
    date: d.date,
    sleep: d.sleep
      ? {
          score: pickScore(d.sleep.score),
          contributors: pickContributors(d.sleep.contributors),
        }
      : null,
    readiness: d.readiness
      ? {
          score: pickScore(d.readiness.score),
          temperature_deviation:
            typeof d.readiness.temperature_deviation === "number"
              ? d.readiness.temperature_deviation
              : null,
          temperature_trend_deviation:
            typeof d.readiness.temperature_trend_deviation === "number"
              ? d.readiness.temperature_trend_deviation
              : null,
          contributors: pickContributors(d.readiness.contributors),
        }
      : null,
    activity: d.activity
      ? {
          score: pickScore(d.activity.score),
          steps:
            typeof d.activity.steps === "number" && Number.isFinite(d.activity.steps)
              ? d.activity.steps
              : null,
          active_calories:
            typeof d.activity.active_calories === "number" &&
            Number.isFinite(d.activity.active_calories)
              ? d.activity.active_calories
              : null,
        }
      : null,
  }));
  return finalize(days, { ...extra, user_id: payload.user_id ?? extra.user_id });
}

export function mapOuraToDaily(args: {
  days: number;
  dates: string[];
  sleep: OuraDailyDoc[];
  readiness: OuraDailyDoc[];
  activity: OuraDailyDoc[];
  user_id?: string;
}): DailyResponse {
  const sleep = numMap(args.sleep);
  const readiness = numMap(args.readiness);
  const activity = numMap(args.activity);
  const nested: NestedDay[] = args.dates.map((date) => ({
    date,
    sleep: pickSleep(sleep.get(date)),
    readiness: pickReadiness(readiness.get(date)),
    activity: pickActivity(activity.get(date)),
  }));
  return finalize(nested, { source: "oura", user_id: args.user_id });
}

/** Bundled real kedoupi 30d export — used when upstream is unreachable. */
export function buildDevDaily(_days = 30): DailyResponse {
  return normalizeHealthDaily(KEDOUPI_DAILY_SAMPLE, {
    source: "dev",
    stub: false,
    dev: true,
    label: "DEV · 真实 kedoupi 日数据（bundled 30d）",
    user_id: KEDOUPI_DAILY_SAMPLE.user_id,
  });
}

/** Prefer live personal daily for DEV, fall back to bundled real sample. */
export async function loadDevDaily(days = 90): Promise<DailyResponse> {
  try {
    const res = await fetch(DEV_UPSTREAM, { headers: { Accept: "application/json" } });
    if (res.ok) {
      const json = (await res.json()) as { ok?: boolean; days?: unknown[]; user_id?: string };
      if (json?.ok && Array.isArray(json.days) && json.days.length) {
        return normalizeHealthDaily(json, {
          source: "dev",
          stub: false,
          dev: true,
          label: `DEV · 真实 kedoupi 日数据（api.xiaotaozi.cc · ${json.days.length} 天）`,
          user_id: json.user_id,
        });
      }
    }
  } catch {
    // offline / blocked egress — bundled sample
  }
  const bundled = buildDevDaily(days);
  bundled.label = "DEV · 真实 kedoupi 日数据（bundled 30d · 上游不可达）";
  return bundled;
}
