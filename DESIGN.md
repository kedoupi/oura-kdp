# oura.kdp.cool 设计摘要

## 1. 现网数据链路

- 前端：`https://h5.xiaotaozi.cc/health/` — 静态 COS HTML（非 SPA）+ Chart.js
- 数据：公开 SCF，无前端登录、无 Oura token
  - `GET https://api.xiaotaozi.cc/oura/daily?user_id=kedoupi&days=90`
  - `/oura/ai`、`/oura/sync`
- Token 仅在服务端；现为「个人公开看板」模式

## 2. 目标产品

- 用户 Oura OAuth 授权 → 后端代拉数据 → 个人看板
- 自托管友好；域名 `oura.kdp.cool`（CF Pages/Workers；DNS 由运维，本仓不改 DNS）
- 开源仓：`kedoupi/oura-kdp`

## 3. 默认可拍板假设（待建国确认）

| 项 | 假设 |
|---|---|
| 许可证 | MIT |
| 栈 | CF Pages（前端）+ Workers（OAuth/API）+ D1（用户/会话）；refresh token 加密存 D1（或 Worker secrets + per-user encrypted blob） |
| 密钥 | 禁止 client secret / token 写进仓；仅环境变量 |
| OAuth scope | 默认 `daily personal email`（睡眠/准备度/活动） |
| 首版范围 | **全量迁入**现网健康看板模块 A–O（含 AI 抽屉）；`/api/me/ai` 会话门控，未就绪时返回「未接好」桩；OAuth + DEV 登录叠加，不替代看板 |
| 多用户 | 每人 OAuth 自己的 Oura；**不做**「公开无登录个人看板」默认路径（可后续加 share link） |
| 仓库 | `kedoupi/oura-kdp`，公开 |
| 分支 | 一律 PR，不直接推 main |

## 4. 安全边界

- `OURA_CLIENT_ID` / `OURA_CLIENT_SECRET` / `TOKEN_ENCRYPTION_KEY` 仅环境变量 / Worker secrets
- `.env.example` 无真值；`.gitignore` 含 `.env`
- 前端永不持有 Oura token

## 5. 验收清单

- [ ] 仓库公开，MIT，含 DESIGN / README / LICENSE / .gitignore / .env.example
- [ ] Worker 路由：`/api/auth/oura/start`、`/api/auth/oura/callback`、`/api/me/daily`（嵌套 `days[]`）、`/api/me/ai`
- [ ] 前端全量看板：现网 CSS/DOM 模块 A–O + OAuth/DEV 登录门
- [ ] 本地可 `pnpm i && pnpm dev`（或等价）跑通壳子
- [ ] 无真实密钥入库
- [ ] 骨架经 PR 合入，未直推 main
- [ ] 未改 DNS / 未部署生产
