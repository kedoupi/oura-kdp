type DailyPoint = {
  date: string;
  sleep: number;
  readiness: number;
  activity: number;
};

type DailyResponse = {
  days: number;
  series: DailyPoint[];
  summary: { sleep: number; readiness: number; activity: number };
  stub?: boolean;
};

declare const Chart: new (...args: unknown[]) => {
  destroy: () => void;
  data: { labels: string[]; datasets: { data: number[] }[] };
  update: () => void;
};

let chart: InstanceType<typeof Chart> | null = null;
let currentDays = 30;

const el = {
  sleep: document.getElementById("val-sleep")!,
  readiness: document.getElementById("val-readiness")!,
  activity: document.getElementById("val-activity")!,
  status: document.getElementById("status")!,
  connect: document.getElementById("btn-connect")!,
};

function avgLabel(n: number): string {
  return Number.isFinite(n) ? n.toFixed(0) : "—";
}

function renderSummary(summary: DailyResponse["summary"]) {
  el.sleep.textContent = avgLabel(summary.sleep);
  el.readiness.textContent = avgLabel(summary.readiness);
  el.activity.textContent = avgLabel(summary.activity);
}

function renderChart(series: DailyPoint[]) {
  const labels = series.map((p) => p.date.slice(5));
  const canvas = document.getElementById("trend-chart") as HTMLCanvasElement;
  const data = {
    labels,
    datasets: [
      {
        label: "睡眠",
        data: series.map((p) => p.sleep),
        borderColor: "#7c6cff",
        backgroundColor: "transparent",
        tension: 0.3,
      },
      {
        label: "准备度",
        data: series.map((p) => p.readiness),
        borderColor: "#3dd6c6",
        backgroundColor: "transparent",
        tension: 0.3,
      },
      {
        label: "活动",
        data: series.map((p) => p.activity),
        borderColor: "#ffb020",
        backgroundColor: "transparent",
        tension: 0.3,
      },
    ],
  };

  if (chart) {
    chart.destroy();
  }
  chart = new Chart(canvas, {
    type: "line",
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#8b9bb8" } } },
      scales: {
        x: { ticks: { color: "#8b9bb8", maxTicksLimit: 8 }, grid: { color: "#243049" } },
        y: { min: 0, max: 100, ticks: { color: "#8b9bb8" }, grid: { color: "#243049" } },
      },
    },
  });
}

async function loadDaily(days: number) {
  currentDays = days;
  el.status.textContent = `加载近 ${days} 天…`;
  try {
    const res = await fetch(`/api/me/daily?days=${days}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as DailyResponse;
    renderSummary(data.summary);
    renderChart(data.series);
    el.status.textContent = data.stub
      ? `Stub 数据 · ${days} 天（OAuth 接通后替换为真实 Oura）`
      : `已更新 · ${days} 天`;
  } catch (err) {
    el.status.textContent = `加载失败：${err instanceof Error ? err.message : String(err)}（请先 pnpm dev:api）`;
  }
}

el.connect.addEventListener("click", () => {
  window.location.href = "/api/auth/oura/start";
});

document.querySelectorAll<HTMLButtonElement>(".chip").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    void loadDaily(Number(btn.dataset.days));
  });
});

void loadDaily(currentDays);
