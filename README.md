# Frame Maker

一个基于原生 HTML / CSS / JavaScript 的静态相框生成工具。上传照片后，可以选择不同模板、编辑文案，并直接导出 JPG。

这个项目适合做：

- 摄影照片加边框与信息排版
- 社交媒体图片快速出图
- 基于模板的相框样式实验
- 继续扩展新的画框模板或信息栏样式

## 特性

- 支持拖拽或点击上传图片
- 支持多种相框模板切换
- 支持模板字段动态生成右侧编辑面板
- 支持读取 JPEG EXIF 信息并用于模板排版
- 支持导出 JPG，并可设置长边尺寸或自定义尺寸
- 模板系统模块化，便于新增样式
- 提供缩略图生成脚本和参考 UI 页面

## 当前模板

- `bottom-info-bar`：底部信息栏，突出设备与拍摄参数
- `simple-mat`：极简留边，偏干净展示
- `gallery-caption-mat`：正方形留白标题卡，适合地点 / 机型双行文案
- `story-exif`：标题 + EXIF，适合带文案的叙事风格出图

## 快速开始

本项目是纯静态前端，无需打包。

### 方式一：直接启动仓库内脚本

```bash
./start.sh
```

默认访问地址：

```text
http://localhost:8001
```

指定端口：

```bash
./start.sh 8080
```

### 方式二：使用 Python 本地静态服务器

```bash
python3 -m http.server 8001
```

然后打开：

```text
http://localhost:8001
```

## 使用流程

1. 打开页面后上传照片
2. 在底部选择相框模板
3. 在右侧编辑模板字段
4. 选择导出尺寸和 JPEG 质量
5. 导出最终 JPG

## 字体说明

应用启动时不再等待运行时字体加载完成。页面会先渲染，再在后台预热导出/画布所需字体。

- 线上托管页面的 UI 字体优先使用 `dsrkafuu/misans` 提供的 CDN CSS
- 本地 `localhost` / 离线静态服务优先使用 `assets/fonts/` 中的项目内字体文件
- 导出与画布渲染仍优先使用项目内字体文件；如果文件不存在，再回退到本机已安装字体

- UI 样式优先使用本地 `MiSans`
- 英文展示字体优先使用本地 `Angie Sans Std`
- 模板字体下拉现已提供 `MiSans` 选项，可用于导出文字渲染
- 当本机没有对应字体时，会回退到系统 sans-serif 字体栈

仓库当前会提交 MiSans 字体文件，用于跨机器保持一致；`Angie Sans Std` 仍按本地私有字体处理，不会随仓库提交。当前支持的本地回退文件名为：

- `assets/fonts/MiSans-Regular.woff2`
- `assets/fonts/MiSans-Light.woff2`
- `assets/fonts/Angie_Sans_Std.otf`

### MiSans 使用说明

本项目可选使用 MiSans 字体。根据 MiSans 官方 FAQ 与许可说明，MiSans 可以作为嵌入式字体用于软件，但应满足至少以下要求：

- 在软件中注明使用了 MiSans 字体
- 不改编或二次开发字体文件本身
- 不将字体文件作为独立资源单独分发或售卖

官方参考：

- [MiSans FAQ](https://hyperos.mi.com/font/zh/faq/)
- [MiSans 下载与许可页面](https://hyperos.mi.com/font/zh/download/)

## EXIF 说明

- 当前 EXIF 提取逻辑主要面向 JPEG
- 可读取的典型信息包括相机型号、镜头、光圈、快门、ISO、焦距等
- 如果图片不含 EXIF，相关模板会回退到默认文案

## 项目结构

```text
frame_maker/
├── index.html                  # 应用入口
├── css/
│   └── style.css               # 主界面样式
├── js/
│   ├── app.js                  # 页面主流程
│   ├── renderer.js             # 渲染入口
│   ├── templates.js            # 模板注册表
│   ├── core/                   # 核心渲染、模板、字体能力
│   └── templates/              # 各模板实现
├── thumbnails/                 # 模板缩略图
├── scripts/                    # 辅助脚本（如缩略图生成）
├── reference-ui/               # 参考界面稿与实验页面
└── start.sh                    # 本地启动脚本
```

## 模板开发

模板位于 `js/templates/<template-id>/`，通常包含：

- `schema.js`：定义 `frame.sides`、`textGroups`、模板字段、默认配置和外观主题
- `resolve-data.js`：把输入数据转换成渲染可用的数据结构
- `render.js`：可选的 overlay 绘制，用于细框、分隔线等无法声明的附加图形
- `index.js`：导出模板定义

模板几何统一按“原照片四边向外扩展”计算：

- `frame.sides = { top, right, bottom, left }` 使用百分比数值，例如 `9.5` 表示 `9.5%`
- 左右边宽以原照片宽度为基准，上下边宽以原照片高度为基准
- 需要固定整体比例的模板可使用 `frame.fixedAspectRatio`，宽度仍由 `frame.sides` 或对应表单百分比字段定义；runtime 会先按百分比计算原始四边像素宽度，再扩展不足的宽或高，让添加相框后的整张图满足目标比例，例如 `fixedAspectRatio = '1:1'`
- `buildFrameSideFields(frame)` 默认生成上下联动、左右联动字段；也可以传入 `['bottom']` 等单边控制
- runtime 会生成 `metrics.photoArea`、`metrics.textRegions`、`metrics.textContentRegions` 和四边九宫格 `metrics.anchors`
- `textGroups` 用声明式方式把一组文字放到 `top/right/bottom/left` 的 9 个锚点上；每个 group 通过 `texts` 定义一条或多条文字，每条文字都可独立设置内容来源、字体、字号、颜色、显隐和最大宽度

新增模板的一般步骤：

1. 新建 `js/templates/<your-template>/`
2. 在 `schema.js` 中声明 `frame.sides`、`textGroups`、`fields` 和 `defaultConfig`
3. 在 `js/templates.js` 中注册模板
4. 为模板补充 `thumbnails/<template-id>_thumbnail.(png|jpg)`

## 辅助资源

- `scripts/thumbnail-generator.js`：用于生成模板缩略图
- `reference-ui/`：存放界面参考稿与样式探索页面


## 已知限制

- 目前没有构建流程、测试框架和发布流程
- EXIF 解析不是完整格式兼容实现，重点支持常见 JPEG 场景
- 字体依赖本机环境，不同设备上的视觉结果可能略有差异
- 当前导出格式为 JPG

## License

Copyright (c) 2026 Ma Huai

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.
