# 质粒图谱 · Plasmid Demo

上传 SnapGene `.dna` 文件，筛选元件、调整箭头粗细和字体，导出可编辑的 SVG 矢量图。文件在浏览器本地处理。

## 直接使用（Mac / Windows）

1. 下载项目 ZIP 并**完整解压**。
2. 双击 **`质粒图谱.html`**，用 Chrome、Edge 或 Safari 打开。
3. 上传 `.dna`，或先点击示例按钮，再下载 SVG。

**不用安装 Node.js，不用联网，不用启动服务器。** 可把这个 HTML 单独复制到桌面、U 盘或其他电脑；代码与样式已全部包含在文件中。

Windows 也可双击 `start-plasmid-demo.bat`（或 `启动质粒图谱.bat`）。英文名 `Plasmid-Demo.html` 是同一便携版本，供 Windows 启动器使用，以避开命令行编码差异。不要在压缩包预览里直接运行。若 HTML 被其他程序关联，用右键 → 打开方式 → Chrome / Edge。

Mac 也可双击 `启动质粒图谱.command`。把 HTML 的替身或应用入口放到桌面 / Dock，以后即可直接打开。

## 开发和更新便携版本

安装符合 package.json engines 的 Node.js 后运行：

```bash
npm ci
npm run dev
```

重新生成便携 HTML：

```bash
npm run build
```

绘图代码：`app/page.tsx`；入口：`main.tsx`；打包脚本：`scripts/build-portable.mjs`。

浏览器界面不依赖 Cloudflare、开发服务器或在线字体。旧版 Windows 启动器依赖 Node.js、首次联网安装依赖和固定等待时间；现已改为直接打开便携 HTML。

## 验证范围

便携版需验证本地 file:// 打开、真实 SnapGene 文件解析、示例操作和 SVG 下载。Windows 实机兼容性仍需在 Windows 上复核；Mac 上通过浏览器验证不能替代 Windows 实机测试。
