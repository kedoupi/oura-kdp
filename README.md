# oura-kdp

Open-source Oura health dashboard for [oura.kdp.cool](https://oura.kdp.cool) — OAuth, sleep / readiness / activity.

设计摘要见 [DESIGN.md](./DESIGN.md)。

## Quick start

需要 Node ≥ 20 与 [pnpm](https://pnpm.io/) 9+。

```bash
pnpm i
cp .env.example workers/api/.dev.vars   # placeholders only; never commit real secrets
pnpm dev
```

并行启动：

| 服务 | 地址 | 说明 |
|------|------|------|
| Web (`apps/web`) | http://localhost:5173 | Vite 看板；`/api` 代理到 Worker |
| API (`workers/api`) | http://localhost:8787 | Cloudflare Worker 本地 + D1 |

也可分开跑：

```bash
pnpm dev:web
pnpm dev:api
```

未配置真实 Oura 密钥时：

- `GET /api/auth/oura/start` 仍 **302** 到真实 Oura authorize URL 形状（`cloud.ouraring.com/oauth/authorize?...`，`client_id` 默认为文档占位 `oura_dev_placeholder_client_id`）
- 生产主机且无 `OURA_CLIENT_ID` → **503**（不会签发假生产 token）
- 本地可用 **DEV 演示登录**（`GET /api/auth/dev/session`）写入 HttpOnly session，看板用标注过的演示序列点亮

真实 OAuth：在 [Oura applications](https://cloud.ouraring.com/oauth/applications) 创建应用，把 `OURA_CLIENT_ID` / `OURA_CLIENT_SECRET` 写入 `.dev.vars` 或 `wrangler secret put`。callback 用 `TOKEN_ENCRYPTION_KEY` 做 AES-GCM 后把 **refresh_token** 写入 D1；前端永不拿到 token。

## Tonight verify（无真实 Oura 密钥）

```bash
pnpm i
cp .env.example workers/api/.dev.vars
pnpm test && pnpm typecheck
pnpm dev:api    # applies local D1 migrations, then wrangler
# 另一个终端: pnpm dev:web
```

**检查 1 — 登录按钮不是死 stub（authorize URL 形状）**

```bash
curl -sI http://localhost:8787/api/auth/oura/start
# 期望: HTTP 302
# Location: https://cloud.ouraring.com/oauth/authorize?client_id=...&redirect_uri=...&response_type=code&scope=daily+personal+email&state=...
```

浏览器：打开 http://localhost:5173 → 未登录应只见 **「用 Oura 登录」** → 点击后地址栏进入 `cloud.ouraring.com/oauth/authorize?...`。

**检查 2 — DEV session + `/api/me/daily` 点亮看板**

```bash
curl -sI -c /tmp/oura-cookies -b /tmp/oura-cookies http://localhost:8787/api/auth/dev/session
# 期望: 302 到 http://localhost:5173/?login=dev 且 Set-Cookie: oura_session=...; HttpOnly

curl -s -b /tmp/oura-cookies 'http://localhost:8787/api/me/daily?days=7'
# 期望: JSON { source:"dev", label:"DEV 演示数据 · 非真实 Oura", series:[...7], summary:{sleep,readiness,activity} }
```

浏览器：登录页点 **DEV 演示登录** → 出现睡眠/准备度/活动摘要卡与 7/30/90 趋势图。

生产路径（有真实密钥）：`/api/auth/oura/start` → Oura 同意 → `/api/auth/oura/callback` 换 token、加密入库、设 session → `/api/me/daily` 用该用户 refresh 拉 `daily_sleep` / `daily_readiness` / `daily_activity`。

## Layout

```
apps/web          Vite + vanilla TS 看板
workers/api       Cloudflare Worker（OAuth / session / daily）
migrations/       D1 SQL
DESIGN.md         产品与安全假设
```

## Stack

- Cloudflare Pages（前端）
- Cloudflare Workers + D1（OAuth / API / 会话）
- 密钥仅环境变量 / Worker secrets，见 `.env.example`
- 本仓不改 DNS、不部署生产、不做 `/oura/ai`

## License

MIT
