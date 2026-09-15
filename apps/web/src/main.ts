import { startHealthDashboard } from "./health-dashboard.js";

type MeResponse = {
  authenticated: boolean;
  source: "oauth" | "dev" | null;
  userId: string | null;
  allowDevLogin: boolean;
  oauthConfigured: boolean;
};

const loginView = document.getElementById("login-view")!;
const dashRoot = document.getElementById("dash-root")!;
const btnLogin = document.getElementById("btn-login")!;
const btnDev = document.getElementById("btn-dev")!;
const btnLogout = document.getElementById("btn-logout");
const loginError = document.getElementById("login-error")!;
const badge = document.getElementById("session-badge");

function showLogin(me?: MeResponse) {
  loginView.hidden = false;
  dashRoot.hidden = true;
  btnDev.hidden = !(me?.allowDevLogin ?? true);
  const params = new URLSearchParams(location.search);
  const error = params.get("error");
  if (error) {
    loginError.hidden = false;
    const hint = params.get("hint") ?? params.get("detail") ?? "";
    loginError.textContent = hint ? `${error} — ${hint}` : error;
  }
}

function showDash(me: MeResponse) {
  loginView.hidden = true;
  dashRoot.hidden = false;
  if (badge) {
    if (me.source === "dev") {
      badge.hidden = false;
      badge.textContent = "DEV";
    } else {
      badge.hidden = true;
    }
  }
}

btnLogin.addEventListener("click", () => {
  window.location.href = "/api/auth/oura/start";
});

btnDev.addEventListener("click", () => {
  window.location.href = "/api/auth/dev/session";
});

btnLogout?.addEventListener("click", () => {
  window.location.href = "/api/auth/logout";
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
    startHealthDashboard(() => showLogin(me));
  } catch {
    showLogin({
      authenticated: false,
      source: null,
      userId: null,
      allowDevLogin: true,
      oauthConfigured: false,
    });
    loginError.hidden = false;
    loginError.textContent = "无法连接 API。请先运行 pnpm dev（或 pnpm dev:api）。";
  }
}

void boot();
