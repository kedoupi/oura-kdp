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
  user?: { id: string; email: string | null };
};

type MeResponse = {
  authenticated: boolean;
  user?: { id: string; email: string | null };
};

declare const Chart: new (...args: unknown[]) => {
  destroy: () => void;
  data: { labels: string[]; datasets: { data: Array<number | null> }[] };
  update: () => void;
};

let chart: InstanceType<typeof Chart> | null = null;
let currentDays = 30;
let loggedIn = false;

const el = {
  sleep: document.getElementById("val-sleep")!,
  readiness: document.getElementById("val-readiness")!,
  activity: document.getElementById("val-activity")!,
  status: document.getElementById("status")!,
  connect: document.getElementById("btn-connect")!,
  connectHero: document.getElementById("btn-connect-hero")!,
  logout: document.getElementById("btn-logout")!,
  user: document.getElementById("user-label")!,
  guest: document.getElementById("guest")!,
  dashboard: document.getElementById("dashboard")!,
  flash: document.getElementById("flash")!,
};

function startOuraLogin() {
  window.location.href = "/api/auth/oura/start";
}

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
        spanGaps: true,
      },
      {
        label: "准备度",
        data: series.map((p) => p.readiness),
        borderColor: "#3dd6c6",
        backgroundColor: "transparent",
        tension: 0.3,
        spanGaps: true,
      },
      {
        label: "活动",
        data: series.map((p) => p.activity),
        borderColor: "#ffb020",
        backgroundColor: "transparent",
        tension: 0.3,
        spanGaps: true,
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

function setLoggedIn(user: { email: string | null } | null) {
  loggedIn = Boolean(user);
  el.guest.hidden = loggedIn;
  el.dashboard.hidden = !loggedIn;
  el.logout.hidden = !loggedIn;
  el.connect.hidden = loggedIn;
  if (user?.email) {
    el.user.hidden = false;
    el.user.textContent = user.email;
  } else {
    el.user.hidden = true;
    el.user.textContent = "";
  }
}

async function loadDaily(days: number) {
  if (!loggedIn) return;
  currentDays = days;
  el.status.classList.remove("error");
  el.status.textContent = `加载近 ${days} 天…`;
  try {
    const res = await fetch(`/api/me/daily?days=${days}`, { credentials: "include" });
    if (res.status === 401) {
      setLoggedIn(null);
      el.status.textContent = "会话已过期，请重新登录";
      return;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as DailyResponse;
    renderSummary(data.summary);
    renderChart(data.series);
    el.status.textContent = `已更新 · ${days} 天`;
  } catch (err) {
    el.status.classList.add("error");
    el.status.textContent = `加载失败：${err instanceof Error ? err.message : String(err)}`;
  }
}

async function logout() {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  if (chart) {
    chart.destroy();
    chart = null;
  }
  renderSummary({ sleep: Number.NaN, readiness: Number.NaN, activity: Number.NaN });
  setLoggedIn(null);
}

function consumeQueryFlags() {
  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");
  const detail = params.get("detail");
  if (error) {
    el.flash.hidden = false;
    el.flash.textContent = detail ? `登录失败：${error}（${detail}）` : `登录失败：${error}`;
  }
  if (error || params.get("logged_in")) {
    window.history.replaceState({}, "", window.location.pathname);
  }
}

async function boot() {
  consumeQueryFlags();
  try {
    const res = await fetch("/api/me", { credentials: "include" });
    const me = (await res.json()) as MeResponse;
    if (me.authenticated && me.user) {
      setLoggedIn(me.user);
      await loadDaily(currentDays);
    } else {
      setLoggedIn(null);
    }
  } catch {
    setLoggedIn(null);
    el.flash.hidden = false;
    el.flash.textContent = "无法连接 API（请先 pnpm dev / pnpm dev:api）";
  }
}

el.connect.addEventListener("click", startOuraLogin);
el.connectHero.addEventListener("click", startOuraLogin);
el.logout.addEventListener("click", () => {
  void logout();
});

document.querySelectorAll<HTMLButtonElement>(".chip").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    void loadDaily(Number(btn.dataset.days));
  });
});

void boot();
