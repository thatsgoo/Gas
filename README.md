# Gas

> **赛璐璐 3D 空间白模沙盒 & AI Three.js HTML 场景可视化编辑工具**  
> **Cel-Shaded 3D Spatial Sandbox & Visual Editor for AI-Generated Three.js HTML Scenes**

**Gas** 是一款面向桌面与浏览器的轻量级 3D 微缩场景编辑器。你可以像搭乐高一样快速推演建筑与街道空间，也可以**直接导入 AI 生成的单文件 Three.js `.html` 3D 场景**，将其自动深度拆解为独立可编辑的 3D 物体，进行二次摆位、贴墙挂靠、缩放调优、收藏资产复用，并重新导出为 **100% 离线可交互单文件 `.html`** 或 **高清无 UI 展板 PNG**。

---

## 核心特性 / Features

- **万能 3D HTML 导入与深度拆解**
  - 支持无损重载 Gas 自身导出的 `.html` 工程，也支持直接导入外部 AI 生成的 Three.js `.html`（兼容 CDN ESM/UMD 与 Vite/Rollup 打包单文件），自动保留原配色、Canvas 贴图与 Shader 色彩。
  - 提供三档拆解粒度（深度拆分子物体 / 按大组 / 合并整体），并自动识别自带底座的 HTML 场景以隐藏默认空白基底。
  - 同时支持直接拖入 `.glb` / `.gltf` / `.obj` / `.fbx` 外部 3D 模型。
- **独立三模式精准操控**
  - **移动 (`W`)**：水平吸附移动、顶部绿色箭头垂直升降，以及 **贴面挂靠 (`Shift`)** 自动吸附到任意墙面或屋顶表面。
  - **360° 三轴旋转 (`E`)**：RX / RY / RZ 三色圆环自由旋转，支持 `R` 键 90° 快速转向与一键归正。
  - **推拉缩放 (`S`)**：6 面单向推拉与 4 角点等比缩放，支持 XYZ 比例锁切换。
- **多选、总体缩放与物体锁定**
  - 支持 `Ctrl + 点击` 多选与 `Ctrl + A` 全选：可整体平移、升降、90° 旋转，以及按 `S` 围绕共同底面中心进行**总体等比缩放**（不穿模、不漂浮）。
  - 支持 **物体锁定 (`L`)**：锁定后防误选、防误拖、防误删，`Ctrl + A` 自动跳过；按住 `Alt + 左键` 或点击顶部锁定清单即可随时解锁。
- **永久资产库 (`saved-models/`)**
  - 可将任意外部 HTML 拆出的单个喜欢模型（如贩卖机、路灯、建筑）一键永久保存到内置 **收藏资产** 库（桌面版直接存放在根目录 `saved-models/` 下，随软件文件夹一起迁移）。
- **赛璐璐大气光影与离线导出**
  - 4 套赛璐璐天气与程序化声景（午后 / 清晨 / 黄昏 / 雨夜）+ 实时 360° 太阳方位角调节 + 1.65m 人视点漫游。
  - 导出 **100% 离线单文件 `.html`**（内嵌渲染器与太阳方位滑块，断网双击即可交互漫游）或 **2x 高清无 UI PNG**（支持透明背景）。
- **四语言原生支持**
  - 软件界面、导出 `.html` 浏览页与 Windows 安装向导均完整支持：**简体中文 / 繁體中文 / English / 日本語**。

---

## 下载与安装 / Download

前往右侧 **[Releases](../../releases)** 页面下载最新版本：

- **安装版（推荐）**：`Gas-Setup-1.0.0.exe` — 支持启动选语言、自定义安装路径（自动追加 `\Gas` 目录）、自动创建快捷方式及标准 `Uninstall.exe` 卸载。
- **便携版**：解压后打开 `Gas` 文件夹直接双击 `Gas.exe` 即可运行。

---

## 常用快捷键 / Shortcuts

| 快捷键 / Shortcut | 功能 / Action |
| --- | --- |
| `W` / `E` / `S` | 切换 移动 / 360°旋转 / 缩放（多选时 `S` 进入总体缩放） |
| `Shift`（拖动时按住） | 临时开启「贴面挂靠」，将物体吸附到墙面或物体表面 |
| `R` | 水平顺时针旋转 90°（支持多选整体旋转） |
| `L` | 锁定 / 解锁选中物体 |
| `Alt + 左键点击` | 临时选中已锁定的物体以便解锁 |
| `Ctrl + 点击` / `Ctrl + A` | 多选 / 全选未锁定物体 |
| `Ctrl + D` / `Delete` | 复制 / 删除选中物体 |
| `Ctrl + Z` / `Ctrl + Y` | 撤销 / 重做 |
| `Esc` | 取消选中 / 退出人视点漫游 |

---

## 本地开发与打包 / Development & Build

### 环境要求 / Prerequisites
- Node.js 20+ & npm

### 启动开发预览 / Run Dev Server
```bash
npm install
npm run dev
```

### 构建生产网页版 / Build Web Bundle
```bash
npm run build
```

### 打包 Windows 安装包与便携版 / Package Windows Setup & Portable Folder
```bash
npm run pack:win
```
打包产物会输出至 `release/` 目录：
- `release/Gas-Setup-1.0.0.exe`（NSIS 四语言安装向导，含 `Uninstall.exe`）
- `release/Gas/`（开箱即用的便携版根目录，含 `Gas.exe` 与 `saved-models/`）

---

## 技术栈 / Tech Stack

- **3D Engine**: Three.js (Custom Cel-Shaded Toon Pipeline, EdgesGeometry Ink Outlines, Virtual Three.js HTML Runner)
- **Frontend**: React 19 + TypeScript + Tailwind CSS v4 + Zustand + Vite 6
- **Desktop**: Electron + electron-builder (NSIS)

---

## 开源协议 / License

本项目采用 [MIT License](./LICENSE) 开源。
