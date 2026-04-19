# AGENTS.md

## 项目概览

Frame Maker 是一个基于原生 HTML / CSS / JavaScript 的静态相框生成工具。应用入口是 `index.html`，浏览器端通过 ES modules 加载 `js/app.js`，用 Canvas 渲染照片、相框、模板文字、EXIF 信息和导出图片。

当前项目没有构建流程。未发现 `package.json`、锁文件、Vite/Webpack 配置、TypeScript 配置、ESLint/Prettier 配置或 Python 依赖配置文件。依赖安装、统一 lint、统一 format 和发布流程：待确认。

## 当前目录结构

- `index.html`：静态页面入口，加载字体 CSS、`css/style.css` 和 `js/app.js`。其中存在手写资源版本号。
- `css/style.css`：样式入口，只按顺序导入 `base.css`、`layout.css`、`components.css`、`features.css`。
- `css/base.css`：设计变量、reset、基础字体和基础颜色。
- `css/layout.css`：应用壳、顶部工具栏、主布局和移动端布局切换。
- `css/components.css`：按钮、字段控件、颜色按钮、range 控件等通用组件。
- `css/features.css`：导出区、预览区、模板选择器、右侧 inspector 面板等业务界面。
- `css/fonts-local.css`：本地 UI 字体声明。
- `js/app.js`：主流程，负责上传、模板选择、字段编辑、EXIF 编辑、预览和导出。
- `js/renderer.js`：渲染聚合入口，转发 `js/core/render/` 的运行时 API。
- `js/core/render/`：Canvas 渲染、布局度量、EXIF 输入归一化、导出尺寸计算。
- `js/core/templates/`：模板注册、字段归一化、外观主题、配置读写。
- `js/core/fonts/`：字体注册、字体加载和 Canvas 字体字符串构造。
- `js/ui/`：原生 DOM 控件和 inspector 面板工具函数。
- `js/templates.js`：模板注册列表和默认模板。
- `js/templates/`：模板实现。每个模板通常包含 `schema.js`、`index.js`，按需包含 `render.js` 和 `resolve-data.js`。
- `assets/fonts/`：字体文件。当前跟踪 MiSans 与 `times.ttf`；`assets/fonts/Angie_Sans_Std.otf` 被 `.gitignore` 排除。
- `assets/samples/`：示例图片，目前有 `thumbnail-source-z30.jpg`。
- `thumbnails/`：模板缩略图。当前跟踪 `.jpg` 缩略图。
- `start.sh`：本地静态服务器启动脚本，默认端口 `8001`。
- `.playwright-cli/`：本地 Playwright CLI 输出目录，被 `.gitignore` 排除。
- `.qoder/`：本地工具目录。用途待确认。

当前工作树未发现 `scripts/` 和 `reference-ui/` 目录；不要假设它们存在。

## 本地开发命令

本项目是纯静态前端，无需打包。

```bash
./start.sh
```

默认服务地址是：

```text
http://localhost:8001
```

可以指定端口：

```bash
./start.sh 8080
```

`start.sh` 实际执行：

```bash
python3 -m http.server "${PORT}"
```

也可以直接运行：

```bash
python3 -m http.server 8001
```

## 测试和检查命令

当前工作树没有确认到统一测试、lint、format、端到端测试或 Playwright 配置文件。

修改代码后至少应本地打开页面，确认上传、模板切换、右侧字段编辑、EXIF 编辑、预览和导出流程没有明显回归。

## 代码风格

- JavaScript 使用浏览器原生 ES modules，保留显式相对路径导入。
- 现有代码使用 4 个空格缩进、单引号和分号。
- 优先使用 `const` / `let`，按当前文件风格组织常量、状态和函数。
- UI 文案当前主要为中文；新增用户可见文案应保持中文表达，除非模板默认内容本身需要英文。
- 注释可以使用中文，保持简洁，只解释非显而易见的流程。
- CSS 按现有模块拆分：设计变量和 reset 放 `base.css`，页面骨架放 `layout.css`，通用控件放 `components.css`，具体功能区放 `features.css`。
- 新增 UI 前先复用现有组件类和变量，例如按钮、字段、颜色选项、range、inspector 分区等；不要为单个场景复制一套硬编码样式。
- 确实需要新组件时，先在 `components.css` 中定义可复用的通用组件样式，再在 `features.css` 中做具体区域的布局和组合。
- 不要引入构建工具、框架、状态库或格式化工具，除非任务明确要求并同步说明项目流程变化。

## 设计规范

- 设计变量集中在 `css/base.css` 的 `:root`，新增颜色、间距、圆角、控件尺寸优先复用或扩展这些变量。
- 当前基础色包括 `--color-white`、`--color-gray-light`、`--color-gray-dark`、`--color-accent`，并派生出背景、文字、分隔线、字段和模板选择状态变量。
- 圆角变量 `--radius-sm`、`--radius-md`、`--radius-lg`、`--radius-pill` 当前都收敛到 `6px`；新增控件应保持小圆角风格。
- 控件高度优先对齐 `--toolbar-control-height` 或 `.field-group` 内的 `--field-height`。
- 字段文字应保持 `letter-spacing: 0`，输入区域避免由状态变化造成布局跳动。
- 主布局是左侧模板选择器、中间预览区、右侧 inspector 面板；`980px` 以下切成上下布局。
- 右侧 inspector 固定按 `版式`、`外观`、`文本`、`拍摄信息`、`导出` 分区，由 `js/app.js` 动态生成。
- 新组件的颜色、圆角、间距、字号、边框和状态样式应来自现有 CSS 变量；若变量不足，先补充语义化变量，再使用它。
- 不要把全局样式写进模板模块；模板视觉应通过 schema、appearance theme、render overlay 和现有 CSS 组件表达。

## 应用状态和关键变量

`js/app.js` 中的核心运行状态：

- `currentImage`：当前上传图片的 `HTMLImageElement`。
- `currentPhoto`：由 `createPhotoSource()` 生成的归一化照片对象，包含文件、图片尺寸、文件名、类型和大小。
- `selectedTemplateId`：当前模板 id，默认是 `gallery-caption-mat`。
- `fieldValues`：当前模板字段值。切换模板时通过 `loadTemplateConfig(template)` 初始化，字段提交后通过 `resolveTemplateConfig(template, fieldValues)` 归一化。
- `exifOverrideValues`：右侧拍摄信息区当前编辑值。
- `initialExifOverrideValues`：上传图片后由 EXIF 预填的快照，用于重置拍摄信息。
- `exportSettings`：导出配置，默认格式为 `image/jpeg`，尺寸预设为 `original`，JPEG 质量为 `1`。

资源版本号目前手写在：

- `index.html` 的 `assetVersion`、`css/style.css?v=...`、`js/app.js?v=...`
- `js/app.js` 的 `ASSET_VERSION`

修改静态资源缓存策略或缩略图加载策略时，是否同步这些版本号需要明确处理。

## 字段和右侧面板约定

模板字段对象由 `js/core/templates/fields.js` 归一化，常用属性包括：

- `key`：字段键名，必须稳定。
- `label`：右侧面板显示标签。
- `type`：当前控件支持 `text`、`textarea`、`number`、`color`、`input`、`select`、`toggle`、`range`。
- `defaultValue`：默认值；没有时由 `getFieldDefaultValue(field)` 按类型补齐。
- `options`：`select` 字段选项。
- `control: 'color-buttons'`：把 `select` 渲染为颜色按钮组。
- `hidden: true`：不在右侧面板显示，但仍参与配置归一化。
- `appearanceVisibility`：可按当前外观主题显示或隐藏字段，支持 `showOn` / `hideOn`。

右侧字段分区由 `js/app.js` 的字段 key 判断：

- 版式字段：`frameTop`、`frameRight`、`frameBottom`、`frameLeft`、`frameVerticalSides`、`frameHorizontalSides`
- 外观字段：`colorScheme`、`showThinBorder`
- 其他可见模板字段默认进入文本区
- EXIF 区不来自模板字段，而来自 `EDITABLE_EXIF_FIELDS`
- 导出区不来自模板字段，而来自 `EXPORT_FIELDS`

新增字段时要确认字段 key 是否需要加入 `LAYOUT_FIELD_KEYS` 或 `APPEARANCE_FIELD_KEYS`，否则会自动进入文本区。

## 模板系统接口

模板必须通过 `defineTemplate()` 注册。模板对象至少需要：

- `id`：稳定唯一 id。
- `defaultConfig`：对象，通常用 `buildDefaultConfig(fields)` 生成。
- `fields`：字段数组。
- `frame.sides`：相框四边百分比。
- `textGroups`：声明式文字分组数组，可以为空数组。

可选能力：

- `backgroundColor`：旧式背景色 fallback。
- `appearanceFieldKey`：外观字段 key，默认 `colorScheme`。
- `appearanceDefaultKey`：默认外观主题 key。
- `appearanceThemes`：外观主题对象。存在时必须有对应的外观字段。
- `resolveData(input)`：把 `photo`、`exif`、`customText`、`global` 转成模板渲染数据。
- `renderOverlay(ctx, args)`：绘制声明式背景、照片、文字之外的 overlay，例如细框、信息栏、分隔线。

模板注册在 `js/templates.js`。当前顺序为：

```js
galleryCaptionMatTemplate,
simpleMatTemplate,
bottomInfoBarTemplate,
storyExifTemplate,
```

当前默认模板是 `gallery-caption-mat`，并且 `js/app.js` 的 `selectedTemplateId` 也默认使用这个 id。调整默认模板时两处都要同步。

## 模板几何和字段命名

`frame.sides = { top, right, bottom, left }` 使用百分比数值：

- `top` / `bottom` 以原照片高度为基准。
- `left` / `right` 以原照片宽度为基准。
- `frame.fixedAspectRatio` 可指定整体固定比例，例如 `1:1`。运行时会先按百分比计算四边，再补足宽或高，使最终画布满足目标比例。

`buildFrameSideFields(frame, controls)` 用于生成相框边距字段：

- `top` -> `frameTop`
- `right` -> `frameRight`
- `bottom` -> `frameBottom`
- `left` -> `frameLeft`
- `verticalSides` -> `frameVerticalSides`
- `horizontalSides` -> `frameHorizontalSides`

运行时 `calculateFrameMetrics()` 会生成：

- `imageWidth`、`imageHeight`
- `fullWidth`、`fullHeight`、`canvasSize`
- `sidesPercent`、`sidesPx`
- `photoArea`
- `textRegions`
- `textInsets`
- `textContentRegions`
- `anchors`
- 对应的 `scaledPhotoArea`、`scaledSidesPx`、`scaledTextRegions`、`scaledTextInsets`、`scaledTextContentRegions`、`scaledAnchors`
- `fontSize`、`scaledFontSize`

`anchors` 是每个边区域的九宫格锚点，key 包括 `top-left`、`top-center`、`top-right`、`middle-left`、`center`、`middle-right`、`bottom-left`、`bottom-center`、`bottom-right`。

## 声明式文字约定

`textGroups` 中每组文字常用属性：

- `region`：`top`、`right`、`bottom`、`left`，默认 `bottom`。
- `anchor`：使用该 region 的锚点，默认 `center`。
- `textAlign`：覆盖根据锚点推导的对齐方式。
- `maxWidthBasis` / `maxWidthRatio`：控制整组文字最大宽度。
- `gapBasis` / `gapRatio` / `minGap`：控制多行文字间距。
- `offsetBasis` / `offsetX` / `offsetY` / `offsetXRatio` / `offsetYRatio`：控制相对锚点偏移。
- `fontId` / `fontIdConfigKey`：字体来源。
- `fontSizeRatio` / `fontSizeRatioConfigKey` / `minFontSize`：字号缩放和下限。
- `fontWeight` / `fontWeightConfigKey` / `fontStyle`：字体样式。
- `colorKey`：从外观主题 `colors` 中读取颜色。

`texts` 中每条文字常用属性：

- `text`：固定文本。
- `configPath`：从归一化后的模板配置读取文本。
- `dataPath`：从 `resolveData()` 返回数据读取文本。
- `fallbackText`：空文本 fallback。
- `whenConfig`：配置路径为真时显示。
- `whenData`：数据路径为真时显示。
- `visible`：显式布尔开关。
- `colorKeyDataPath`：从数据里读取颜色 token key。

声明式文字会自动用 `runtime.fitText()` 在最大宽度内收缩字号。复杂图形、线条或信息栏应放在模板 `render.js` 的 `renderOverlay()` 中。

## 外观主题约定

外观主题相关 API 位于 `js/core/templates/appearance.js`：

- `buildAppearanceField(themes)` 生成 `colorScheme` 字段，默认渲染为颜色按钮。
- `createAppearanceThemes(sharedThemes, themeOverrides)` 合并共享主题和模板覆盖。
- `createSolidAppearanceThemes()` 用于白/黑纯色主题。
- `resolveTemplateAppearance(template, config)` 根据配置解析当前主题。
- `getAppearanceColor(appearance, token, fallback)` 读取 `appearance.colors[token]`。

主题可定义：

- `label`
- `displayValue`
- `opacity`
- `canvasBackground`
- `barBackground`
- `colors`

背景 surface 当前支持：

- `{ type: 'solid', color }`
- `{ type: 'photoBlur', blur, saturate, brightness, overlayColor, overlayOpacity }`
- `{ type: 'edgeExtendBlur', color, blur, ambientBlur, ambientOpacity, extendedOpacity, saturate, brightness, contrast, overlayColor, overlayOpacity, sourceBandRatio }`

`barBackground` 不会自动绘制，只有模板 overlay 读取并使用时才生效。

## EXIF 和渲染输入

EXIF 解析位于 `js/core/render/input.js`，当前主要面向 JPEG。可编辑字段由 `EDITABLE_EXIF_FIELDS` 固定：

- `make`
- `model`
- `dateTimeOriginal`
- `fNumber`
- `exposureTime`
- `iso`
- `focalLength`
- `focalLengthIn35mm`
- `lensModel`

`buildTemplateResolveInput()` 传给模板 `resolveData(input)` 的结构：

- `photo`：归一化照片对象。
- `exif`：由右侧拍摄信息编辑值归一化得到；没有任何显式值时为 `null`。
- `customText`：模板配置，即归一化后的 `fieldValues`。
- `global`：全局渲染设置，如 `scale`、`mode`、`resize`、`compression`、`watermark`。

注意：上传图片后，EXIF 原始值会先转为右侧可编辑文本；模板实际读取的是 `exifOverrideValues` 归一化结果。

## 渲染和导出流程

公共入口是 `renderFrame(canvas, image, template, fieldValues, scaleOrOptions)`，内部调用 `renderTemplateFrame()`。

渲染顺序：

1. `resolveTemplateConfig()` 归一化模板字段。
2. `calculateFrameMetrics()` 计算相框、照片、文字区域和锚点。
3. `setupCanvas()` 设置 Canvas 尺寸和 DPR。
4. `buildTemplateResolveInput()` 组装模板输入。
5. `template.resolveData(input)` 生成模板数据。
6. `resolveTemplateAppearance()` 解析外观主题。
7. 绘制 canvas background surface。
8. 绘制照片。
9. 绘制声明式 `textGroups`。
10. 调用 `template.renderOverlay(ctx, args)`。
11. 应用全局 resize / watermark 后处理。

`renderOverlay(ctx, args)` 可用参数包括：

- `template`
- `photo`
- `config`
- `data`
- `appearance`
- `resolveInput`
- `metrics`
- `canvasSize`
- `runtime`

`runtime` 提供：

- `loadFonts()`
- `ensureFont(fontId)`
- `scaleByShortEdge(ratio)`
- `scaleByLongEdge(ratio)`
- `measureText(options)`
- `fitText(options)`
- `safeArea(inset)`
- `drawSurface(area, surface, image)`

导出尺寸由 `js/core/render/sizing.js` 处理：

- `sizePreset: 'original'` 不缩放。
- `sizePreset: '1080'` / `'2048'` 按长边缩放。
- `sizePreset: 'custom'` 支持只填宽、只填高或宽高都填；输入必须是正整数。

导出文件名由原文件名生成，后缀默认为 `_framed.jpg`。

## 字体约定

字体注册在 `js/core/fonts/index.js`：

- `angieSansStd`：`Angie Sans Std`，资产路径是 `assets/fonts/Angie_Sans_Std.otf`，该文件被忽略，不应提交。
- `miSans`：`MiSans`，资产路径是 `assets/fonts/MiSans-Regular.woff2`。
- `timesNewRoman`：`Times New Roman`，资产路径是 `assets/fonts/times.ttf`。
- `systemSans`：系统 sans-serif 字体栈。

默认字体 id：

- 英文：`angieSansStd`
- 中文：`systemSans`
- UI：`systemSans`

新增字体时需要同步检查：

- `js/core/fonts/index.js`
- `css/fonts-local.css`
- 是否涉及字体授权或私有字体提交限制

## 新增或修改模板流程

1. 在 `js/templates/<template-id>/` 中创建或修改模板。
2. 在 `schema.js` 定义 `id`、`appearanceThemes`、`frame`、`textGroups`、`fields`、`defaultConfig`。
3. 如需把输入数据转为渲染数据，实现 `resolve-data.js` 并在 `index.js` 传入 `resolveData`。
4. 如需绘制照片、背景和声明式文字之外的图形，实现 `render.js` 并在 `index.js` 传入 `renderOverlay`。
5. 通过 `defineTemplate()` 导出模板。
6. 在 `js/templates.js` 注册模板，并确认默认模板是否需要调整。
7. 准备匹配的缩略图 `thumbnails/<template-id>_thumbnail.jpg` 或 `.png`。
8. 检查新增字段是否会被右侧面板正确分区。
9. 本地验证上传、模板切换、字段编辑、预览和导出。

## 当前模板

- `gallery-caption-mat`：默认模板，固定 `1:1`，底部居中标题/副标题，支持内边框和白/黑外观。
- `simple-mat`：极简留边模板，支持白/黑/边缘氛围外观，可调上边、下边和左右边宽，可选内边框。
- `bottom-info-bar`：底部信息栏，读取 EXIF 生成相机和拍摄参数，使用 overlay 绘制底栏和分隔线。
- `story-exif`：底部叙事标题 + EXIF 信息，支持标题、副标题、镜头显示、信息倍率和无 EXIF 文案。

## 修改代码时的注意事项

- 不要回退用户已有改动。当前项目可能有未提交文件或本地生成文件，修改前先看 `git status --short`。
- 修改模板后，同时检查 `js/templates.js` 注册顺序、模板 `id`、默认配置和缩略图文件名是否一致。
- 新增或调整字段后，检查 `js/app.js` 的右侧字段分区逻辑。
- 改动布局计算、`frame.sides`、`fixedAspectRatio`、anchors 或文本区域时，要做浏览器渲染验证；若布局校验脚本恢复存在，也运行对应脚本。
- 改动缩略图相关逻辑、模板默认外观或模板列表后，按需重建缩略图并确认输出文件。
- 字体加载同时影响 UI 和 Canvas 导出。字体相关改动要检查本地服务和导出结果。
- `js/core/templates/config-store.js` 当前 `saveTemplateConfig()` 是空实现；如需持久化用户配置，需要先确认预期存储策略。
- `render.js` 只处理声明式文字、背景、照片之外的 overlay。不要把可声明的普通文字布局硬写到 overlay。
- 优先复用 `js/templates/shared.js` 的工具函数，例如 `buildFrameSideFields()`、`buildFontSelectField()`、`buildExifMetaPrimary()`、`buildExifMetaSecondary()`。

## 不应该改动的文件或目录

- `.git/`：Git 内部目录。
- `.DS_Store`：本地系统文件，已在 `.gitignore` 中忽略。
- `.playwright-cli/`：本地 Playwright CLI 输出目录，已在 `.gitignore` 中忽略。
- `assets/fonts/Angie_Sans_Std.otf`：本地私有字体文件，已在 `.gitignore` 中忽略。
- `thumbnails/`：除非正在新增模板、更新模板默认视觉或明确重建缩略图，否则不要改动。
- `assets/fonts/` 中已跟踪字体文件：除非任务明确涉及字体授权、字体替换或渲染一致性，否则不要改动。
- `LICENSE`：除非任务明确涉及许可证，否则不要改动。

## 提交前检查清单

- 确认页面能通过本地静态服务器打开。
- 至少手动验证上传、模板切换、右侧字段编辑、EXIF 编辑、预览和导出 JPG。
- 确认新增模板已在 `js/templates.js` 注册，并有匹配的 `thumbnails/<template-id>_thumbnail.(png|jpg)`。
- 确认没有提交 `.DS_Store`、`.playwright-cli/`、`assets/fonts/Angie_Sans_Std.otf` 或其他本地生成文件。
- 如后续恢复了布局校验或缩略图脚本，按改动范围运行对应脚本。
- lint、format、发布检查：当前仍待确认。
