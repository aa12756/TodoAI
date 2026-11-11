# 应用资源

运行 `node scripts/write-tray-icon.mjs`（`npm install` 也会执行）会生成：

- `tray.png` — 32×32，系统托盘
- `icon.png` — 256×256，窗口标题栏 / 任务栏

蓝底 + 白色「✓」，与 TodoAI 待办主题一致。要换成自己的品牌图，可覆盖上述文件（或提供 `icon.ico`）。
