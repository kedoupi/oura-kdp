import { startHealthBoard } from "./board";

type MeResponse = {
  authenticated: boolean;
  source: "oauth" | "dev" | null;
  userId: string | null;
  allowDevLogin: boolean;
  oauthConfigured: boolean;
};

const el = {
  loginView: document.getElementById("login-view")!,
  dashView: document.getElementById("dash-view")!,
  login: document.getElementById("btn-login")!,
  dev: document.getElementById("btn-dev")!,
  logout: document.getElementById("btn-logout")!,
  loginError: document.getElementById("login-error")!,
  badge: document.getElementById("session-badge")!,
};

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
    startHealthBoard(showLogin);
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
