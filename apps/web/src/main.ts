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
  const data = {
    labels,
    datasets: [
      {
        label: "睡眠",
        data: series.map((p) => p.sleep),
        borderColor: "#7c6cff",
        backgroundColor: "transparent",
        spanGaps: true,
        tension: 0.3,
      },
      {
        label: "准备度",
        data: series.map((p) => p.readiness),
        borderColor: "#3dd6c6",
        backgroundColor: "transparent",
        spanGaps: true,
        tension: 0.3,
      },
      {
        label: "活动",
        data: series.map((p) => p.activity),
        borderColor: "#ffb020",
        backgroundColor: "transparent",
        spanGaps: true,
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
