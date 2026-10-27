# Plasmid Demo：质粒图谱生成器

这是一个给实验人员使用的质粒图谱小工具：上传 SnapGene 导出的 `.dna` 文件，就可以生成带方向箭头、feature 名称和长度信息的环形质粒图，并导出 SVG 矢量图。

## 最简单的使用方法（Mac）

不需要会写代码，也不需要会用 Git。

### 第一次使用

1. 在 GitHub 页面点击绿色的 **Code** 按钮。
2. 选择 **Download ZIP**，下载项目压缩包。
3. 双击下载的压缩包解压。
4. 打开解压后的 `plasmid-demo` 文件夹。
5. 双击里面的 `启动质粒图谱.command`。
6. 如果 Mac 提示无法打开，右键这个文件，选择 **打开**，再确认一次。

第一次启动会自动安装依赖，可能需要等待几十秒。随后浏览器会自动打开质粒图谱页面。

### 以后使用

以后只需要打开 `plasmid-demo` 文件夹，双击 `启动质粒图谱.command` 即可。使用完以后，关闭启动脚本打开的终端窗口，网站就会停止运行。

## Windows 使用方法

1. 在 GitHub 页面点击 **Code → Download ZIP**。
2. 解压后打开 `plasmid-demo` 文件夹。
3. 双击 `启动质粒图谱.bat`。
4. 等待浏览器打开 `http://localhost:3000`。

第一次运行会自动安装依赖。使用完后关闭弹出的命令提示符窗口即可停止网站。

## 生成一张质粒图

1. 点击上传区域，选择 SnapGene 导出的 `.dna` 文件。
2. 在右侧列表中点击 feature，决定哪些元件保留在图上。
3. 用“箭头粗细”滑块调整彩色 feature 的宽度。
4. 用“字体”滑块调整外侧标签大小。
5. 点击“下载 SVG”，保存可编辑的矢量图。

导出的 SVG 可以继续用 Illustrator、Inkscape 或 PowerPoint 编辑。

## 支持什么文件

支持 SnapGene 导出的 `.dna` 文件。程序会读取质粒名称、序列长度、环状或线性属性、feature 名称、位置、方向和颜色。文件在浏览器本地读取和处理，不会上传到服务器。

## 如果双击后没有打开网页

先关闭之前打开的启动终端窗口，再重新双击 `启动质粒图谱.command`。

如果仍然打不开：

1. 打开“终端”应用。
2. 把 `plasmid-demo` 文件夹拖进终端窗口，得到文件夹路径。
3. 输入下面两行命令，每行输入后按回车：

```bash
npm install
npm run dev
```

4. 终端出现 `http://localhost:3000` 后，在浏览器打开这个地址。

如果提示没有找到 `node`，先从 [Node.js 官网](https://nodejs.org/) 安装 Node.js 22 或更高版本，然后重新运行启动文件。

## 给熟悉开发的人

```bash
npm install
npm run dev
```

项目使用 React、Vite/Vinext 和 SnapGene bio-parser。主要文件是 `app/page.tsx`，启动脚本是 `启动质粒图谱.command`。

