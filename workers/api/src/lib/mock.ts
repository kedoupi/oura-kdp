export type DailyPoint = {
  date: string;
  sleep: number;
  readiness: number;
  activity: number;
};

function clamp(n: number): number {
  return Math.max(40, Math.min(98, Math.round(n)));
}

/** Deterministic stub series so the dashboard charts without OAuth. */
export function buildStubDaily(days: number): {
  days: number;
  series: DailyPoint[];
  summary: { sleep: number; readiness: number; activity: number };
  stub: true;
} {
  const series: DailyPoint[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    const wave = Math.sin(i / 3) * 8;
    series.push({
      date: d.toISOString().slice(0, 10),
      sleep: clamp(78 + wave + ((i * 3) % 5)),
      readiness: clamp(74 + wave * 0.8 + ((i * 2) % 7)),
      activity: clamp(70 + wave * 1.1 + ((i * 5) % 6)),
    });
  }
  const avg = (key: keyof DailyPoint) =>
    series.reduce((s, p) => s + (p[key] as number), 0) / series.length;
  return {
    days,
    series,
    summary: {
      sleep: avg("sleep"),
      readiness: avg("readiness"),
      activity: avg("activity"),
    },
    stub: true,
  };
}
