# oura-kdp

Open-source Oura health dashboard for [oura.kdp.cool](https://oura.kdp.cool) — OAuth, sleep / readiness / activity.

设计摘要见 [DESIGN.md](./DESIGN.md)。

## Quick start

```bash
pnpm i
pnpm dev
```

- Web: Vite 静态看板壳（默认 http://localhost:5173）
- API: Cloudflare Worker 本地（`wrangler dev`，默认 http://localhost:8787）

## Stack

- Cloudflare Pages（前端）
- Cloudflare Workers + D1（OAuth / API / 会话）
- 密钥仅环境变量，见 `.env.example`

## License

MIT
