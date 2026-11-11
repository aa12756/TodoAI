# TodoAI

个人待办 + AI 助手（DeepSeek 等 OpenAI 兼容 API），**Electron + SQLite** 桌面端。

开发计划：[docs/开发计划书.md](docs/开发计划书.md)

## 技术栈

Electron · electron-vite · React · TypeScript · sql.js（SQLite 文件，无原生编译）

## 要求

- Node.js 20+
- Windows（首目标平台）

## 开发

```bash
npm install
npm run dev
```

若 `postinstall` 下载 Electron 超时，在 PowerShell 中先设置镜像再安装：

```powershell
$env:ELECTRON_MIRROR='https://npmmirror.com/mirrors/electron/'
npm install
# 或仅补装运行时：node node_modules/electron/install.js
```

M0 使用 **sql.js** 读写 `%APPDATA%/todoai/todo.db`，避免 Windows 上未安装 C++ 构建链时 `better-sqlite3` 编译失败；后续里程碑可再评估切回原生驱动以提升性能。

## 构建

```bash
npm run build
npm run preview
```

## 安装包（Windows）

先关闭正在运行的 TodoAI（含 `npm run dev`），再执行：

```bash
npm run dist
```

在 GitHub / 部分构建工具下载较慢时，PowerShell 可先设镜像再打包：

```powershell
$env:ELECTRON_MIRROR='https://npmmirror.com/mirrors/electron/'
$env:ELECTRON_BUILDER_BINARIES_MIRROR='https://npmmirror.com/mirrors/electron-builder-binaries/'
npm run dist
```

安装程序输出在 `release/TodoAI Setup 0.1.0.exe`（另含 `release/win-unpacked/` 免安装目录）。`package.json` 的 `build` 字段已配置本机 Electron、`sql.js` 解包与 NSIS 选项。

未签名的安装包在首次运行安装程序时，Windows SmartScreen 可能提示「未知发布者」，选择「仍要运行」即可；应用数据仍在 `%APPDATA%/todoai/`，卸载程序不会删除数据库。

## 数据位置

SQLite 库：`%APPDATA%/todoai/todo.db`（`app.getPath('userData')`）

## 里程碑

- [x] **M0**：Electron 壳 + SQLite + 任务 IPC CRUD + 基础列表 UI
- [x] **M1**：任务列表 UI（筛选、全字段新建/编辑、完成/恢复、逾期高亮）
- [x] **M2**：托盘、关闭隐藏到托盘、系统通知联调
- [x] **M3**：到期提醒调度、去重、点击通知定位任务
- [x] **M4**：DeepSeek 对话 + 任务工具 + AI 设置
- [x] **M5**：规划建议（`ai:suggestSchedule`）+ 确认勾选 + `schedule:apply`
- [x] **M6**：每日简报 + electron-builder 安装包
