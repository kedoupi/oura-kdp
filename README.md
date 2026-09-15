# oura-kdp

Open-source Oura health dashboard for [oura.kdp.cool](https://oura.kdp.cool) — multi-user OAuth, sleep / readiness / activity.

设计摘要见 [DESIGN.md](./DESIGN.md)。本仓不改 DNS、不实现 `/oura/ai`。

## Quick start

需要 Node ≥ 20 与 [pnpm](https://pnpm.io/) 9+。

```bash
pnpm i
cp workers/api/.dev.vars.example workers/api/.dev.vars
# 填入 Oura 凭证与 openssl rand -hex 32 生成的密钥（见下文）
pnpm db:migrate:local
pnpm dev
```

并行启动：

| 服务 | 地址 | 说明 |
|------|------|------|
| Web (`apps/web`) | http://localhost:5173 | Vite 看板；`/api` 代理到 Worker（登录请从这里点） |
| API (`workers/api`) | http://localhost:8787 | Cloudflare Worker 本地 + D1 |

也可分开跑：`pnpm dev:web` / `pnpm dev:api`。

未配置 `OURA_CLIENT_ID` 时，`GET /api/auth/oura/start` 返回 **503** 与配置说明。未登录访问 `GET /api/me/daily` 返回 **401**。

## Oura OAuth setup

1. 用 Oura App 账号登录 [Oura Cloud](https://cloud.ouraring.com/)（与手机环同一账号）。
2. 打开 [API Applications](https://cloud.ouraring.com/oauth/applications)，创建应用。
3. 填写应用名与网站。Redirect URI 必须**完全一致**（含 scheme / host / port / path）：
   - 本地推荐：`http://localhost:5173/api/auth/oura/callback`  
     （走 Vite 代理，这样 `oura_session` cookie 会写在 `:5173` 上）
   - 生产（Pages + Worker 同域 `/api/*`）：`https://oura.kdp.cool/api/auth/oura/callback`
4. 记下 **Client ID** 与 **Client Secret**。不要写入 git。
5. 本产品请求 scopes：`daily personal email`（日摘要 + 身份邮箱）。

### 本地 `.dev.vars`

```bash
cp workers/api/.dev.vars.example workers/api/.dev.vars
```

```
OURA_CLIENT_ID=...
OURA_CLIENT_SECRET=...
OURA_REDIRECT_URI=http://localhost:5173/api/auth/oura/callback
FRONTEND_ORIGIN=http://localhost:5173
TOKEN_ENCRYPTION_KEY=<openssl rand -hex 32>
SESSION_SECRET=<openssl rand -hex 32>
```

`TOKEN_ENCRYPTION_KEY` 必须是 **32 字节**（64 位 hex，或等长 base64）。用于 AES-GCM 加密 refresh token 后写入 D1。

Oura 的 refresh token **一次性有效**：每次刷新都会轮换，Worker 会立刻写回密文。

### 生产 Worker secrets

先建 D1，再把 `database_id` 写进 `workers/api/wrangler.toml`（不要提交真实密钥）：

```bash
cd workers/api
wrangler d1 create oura_kdp
wrangler d1 migrations apply oura_kdp --remote
wrangler secret put OURA_CLIENT_ID
wrangler secret put OURA_CLIENT_SECRET
wrangler secret put TOKEN_ENCRYPTION_KEY
wrangler secret put SESSION_SECRET
# 若 Worker 与前端不同源，再设：
wrangler secret put OURA_REDIRECT_URI
wrangler secret put FRONTEND_ORIGIN
wrangler deploy
```

将 Worker 路由到站点的 `/api/*`（DNS / 自定义域由运维处理，本仓不改）。

## Auth & API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/auth/oura/start` | 将 CSRF `state` 写入 D1，302 到 Oura authorize |
| GET | `/api/auth/oura/callback` | 校验 state、换 token、加密入库、写会话 cookie、回前端 |
| POST/GET | `/api/auth/logout` | 删除会话并清 cookie |
| GET | `/api/me` | `{ authenticated, user? }` |
| GET | `/api/me/daily?days=7\|30\|90` | **需登录**；拉 Oura daily sleep / readiness / activity |
| GET | `/api/health` | 存活检查 |

前端「用 Oura 登录」跳转 `/api/auth/oura/start`。登录后看板请求 `/api/me/daily`（`credentials: include`）。

## Layout

```
apps/web          Vite + vanilla TS 看板
workers/api       Cloudflare Worker（OAuth / 会话 / Oura 代理）
migrations/       D1：users / sessions / encrypted_tokens / oauth_states
DESIGN.md         产品与安全假设
```

## Stack

- Cloudflare Pages（前端）
- Cloudflare Workers + D1（OAuth / API / 会话）
- 密钥仅环境变量 / Worker secrets，见 `.env.example` 与 `workers/api/.dev.vars.example`

## License

MIT
