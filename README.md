# oura-kdp

Open-source Oura health dashboard for [oura.kdp.cool](https://oura.kdp.cool) — OAuth, sleep / readiness / activity.

设计摘要见 [DESIGN.md](./DESIGN.md)。

## Quick start

需要 Node ≥ 20 与 [pnpm](https://pnpm.io/) 9+。

```bash
pnpm i
pnpm dev
```

并行启动：

| 服务 | 地址 | 说明 |
|------|------|------|
| Web (`apps/web`) | http://localhost:5173 | Vite 看板壳；`/api` 代理到 Worker |
| API (`workers/api`) | http://localhost:8787 | Cloudflare Worker 本地 |

也可分开跑：

```bash
pnpm dev:web
pnpm dev:api
```

本地密钥（可选）：复制 `.env.example` → `workers/api/.dev.vars`（已被 gitignore），填入 Oura 应用凭证。未配置时 `/api/me/daily` 返回 stub 图表数据；`/api/auth/oura/start` 返回 503 提示。

## Layout

```
apps/web          Vite + vanilla TS 看板壳
workers/api       Cloudflare Worker（OAuth / API 骨架）
migrations/       D1 SQL
DESIGN.md         产品与安全假设
```

## Stack

- Cloudflare Pages（前端）
- Cloudflare Workers + D1（OAuth / API / 会话）
- 密钥仅环境变量 / Worker secrets，见 `.env.example`

## License

MIT
