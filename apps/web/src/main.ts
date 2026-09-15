type DailyPoint = {
  date: string;
  sleep: number | null;
  readiness: number | null;
  activity: number | null;
};

type DailyResponse = {
  days: number;
  series: DailyPoint[];
  summary: { sleep: number; readiness: number; activity: number };
  source?: "oura" | "dev";
  stub?: boolean;
  dev?: boolean;
  label?: string;
};

type MeResponse = {
  authenticated: boolean;
  source: "oauth" | "dev" | null;
  userId: string | null;
  allowDevLogin: boolean;
  oauthConfigured: boolean;
};

declare const Chart: new (...args: unknown[]) => {
  destroy: () => void;
  data: { labels: string[]; datasets: { data: Array<number | null> }[] };
  update: () => void;
};

let chart: InstanceType<typeof Chart> | null = null;
let currentDays = 30;

const el = {
  loginView: document.getElementById("login-view")!,
  dashView: document.getElementById("dash-view")!,
  sleep: document.getElementById("val-sleep")!,
  readiness: document.getElementById("val-readiness")!,
  activity: document.getElementById("val-activity")!,
  status: document.getElementById("status")!,
  login: document.getElementById("btn-login")!,
  dev: document.getElementById("btn-dev")!,
  logout: document.getElementById("btn-logout")!,
  loginError: document.getElementById("login-error")!,
  badge: document.getElementById("session-badge")!,
};

function avgLabel(n: number): string {
  return Number.isFinite(n) && n > 0 ? n.toFixed(0) : "—";
}

function renderSummary(summary: DailyResponse["summary"]) {
  el.sleep.textContent = avgLabel(summary.sleep);
  el.readiness.textContent = avgLabel(summary.readiness);
  el.activity.textContent = avgLabel(summary.activity);
}

function renderChart(series: DailyPoint[]) {
  const labels = series.map((p) => p.date.slice(5));
  const canvas = document.getElementById("trend-chart") as HTMLCanvasElement;
  const tickColor = "#64748b";
  const gridColor = "rgba(148, 163, 184, 0.28)";
  const data = {
    labels,
    datasets: [
      {
        label: "睡眠",
        data: series.map((p) => p.sleep),
        borderColor: "#f97316",
        backgroundColor: "rgba(249, 115, 22, 0.12)",
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        spanGaps: true,
        tension: 0.3,
        fill: false,
      },
      {
        label: "准备度",
        data: series.map((p) => p.readiness),
        borderColor: "#ea580c",
        backgroundColor: "transparent",
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        spanGaps: true,
        tension: 0.3,
      },
      {
        label: "活动",
        data: series.map((p) => p.activity),
        borderColor: "#fdba74",
        backgroundColor: "transparent",
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        spanGaps: true,
        tension: 0.3,
        borderDash: [4, 3],
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
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "top",
          align: "end",
          labels: {
            color: tickColor,
            boxWidth: 8,
            boxHeight: 8,
            usePointStyle: true,
            pointStyle: "circle",
            font: { size: 11 },
          },
        },
        tooltip: {
          backgroundColor: "rgba(255, 255, 255, 0.98)",
          titleColor: "#0f172a",
          bodyColor: "#334155",
          borderColor: "#edd5c4",
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
        },
      },
      scales: {
        x: {
          ticks: { color: tickColor, maxTicksLimit: 8 },
          grid: { display: false },
          border: { display: false },
        },
        y: {
          min: 0,
          max: 100,
          ticks: { color: tickColor },
          grid: { color: gridColor },
          border: { display: false },
        },
      },
    },
  });
}

async function loadDaily(days: number) {
  currentDays = days;
  el.status.textContent = `加载近 ${days} 天…`;
  try {
    const res = await fetch(`/api/me/daily?days=${days}`, { credentials: "include" });
    if (res.status === 401) {
      showLogin();
      return;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as DailyResponse;
    renderSummary(data.summary);
    renderChart(data.series);
    el.status.textContent = data.label
      ? `${data.label} · ${days} 天`
      : data.source === "oura"
        ? `已更新 · 真实 Oura · ${days} 天`
        : `已更新 · ${days} 天`;
  } catch (err) {
    el.status.textContent = `加载失败：${err instanceof Error ? err.message : String(err)}（请先 pnpm dev:api）`;
  }
}

function showLogin(me?: MeResponse) {
  el.loginView.hidden = false;
  el.dashView.hidden = true;
  el.dev.hidden = !(me?.allowDevLogin ?? true);
  const params = new URLSearchParams(location.search);
  const error = params.get("error");
  if (error) {
    el.loginError.hidden = false;
    const hint = params.get("hint") ?? params.get("detail") ?? "";
    el.loginError.textContent = hint ? `${error} — ${hint}` : error;
  }
}

function showDash(me: MeResponse) {
  el.loginView.hidden = true;
  el.dashView.hidden = false;
  if (me.source === "dev") {
    el.badge.hidden = false;
    el.badge.textContent = "DEV 演示";
  } else {
    el.badge.hidden = true;
  }
}

el.login.addEventListener("click", () => {
  window.location.href = "/api/auth/oura/start";
});

el.dev.addEventListener("click", () => {
  window.location.href = "/api/auth/dev/session";
});

el.logout.addEventListener("click", () => {
  window.location.href = "/api/auth/logout";
});

document.querySelectorAll<HTMLButtonElement>(".chip").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    void loadDaily(Number(btn.dataset.days));
  });
});

async function boot() {
  try {
    const res = await fetch("/api/me", { credentials: "include" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const me = (await res.json()) as MeResponse;
    if (!me.authenticated) {
      showLogin(me);
      return;
    }
    showDash(me);
    await loadDaily(currentDays);
  } catch {
    showLogin({
      authenticated: false,
      source: null,
      userId: null,
      allowDevLogin: true,
      oauthConfigured: false,
    });
    el.loginError.hidden = false;
    el.loginError.textContent = "无法连接 API。请先运行 pnpm dev（或 pnpm dev:api）。";
  }
}

void boot();
