# 落地页换图槽位

黄薇 / tzai-image 出图后，把 PNG **按文件名丢进本目录**即可，不用改布局。

页面会优先读这些 PNG；没有文件时 hero 回退到 `../board-preview.svg`，其余槽位显示奶油色占位。

| 文件名 | 槽位 | 建议比例 | 用途 |
|---|---|---|---|
| `01-hero.png` | Hero，产品标题旁 / 移动端标题下 | 4:3（约 1440×1080） | 看板 / 睡眠氛围主视觉 |
| `02-feature-readiness.png` | 功能条 | 4:3（约 1200×900） | 准备度 / 早晨状态 |
| `03-share-concept.png` | 「每人一份数据」 | 4:3（约 1200×900） | 多人登录、各看各的 |

约束：

- 奶油纸色（`#fffaf5` / `#fff7ed` / `#f97316`），不要深色科技壳
- **不要**用 Oura 官方 logo / wordmark
- 不要做成「某个人的实时分数」截图
- 用 `object-fit: cover` 填满槽位，比例略偏也可以

可选后续（不必现在做）：`04-strip-sleep.png`、`05-strip-activity.png`。要加的话扩 `landing-strip` 即可，槽位组件已复用。
