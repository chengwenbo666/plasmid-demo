# Plasmid Demo

一个用于生成质粒环形图谱的网页工具。它可以读取 SnapGene 导出的 `.dna` 文件，显示 feature 的方向、颜色和名称，并导出可编辑的 SVG 图谱。

## 在线使用

打开仓库页面后，进入项目网站或本地运行页面，点击上传区域，选择一个 `.dna` 文件即可生成图谱。

使用流程：

1. 上传 SnapGene `.dna` 文件。
2. 在右侧选择要保留的 feature。
3. 调整箭头粗细和标签字体大小。
4. 点击“下载 SVG”导出矢量图。

## 本地运行

需要 Node.js 22 或更高版本。

```bash
npm install
npm run dev
```

然后打开终端中显示的本地地址。

## 输入文件

支持 SnapGene 导出的 `.dna` 文件。程序读取文件中的序列名称、长度、环状属性和 feature 信息。文件本身只在浏览器本地处理，不会上传到服务器。

## 导出结果

导出的 SVG 是可编辑的矢量图，可以继续在 Illustrator、Inkscape 或 PowerPoint 中修改颜色、文字和布局。

## 项目结构

- `app/page.tsx`：网页界面和质粒图谱绘制逻辑
- `app/globals.css`：页面样式
- `package.json`：运行依赖和脚本

