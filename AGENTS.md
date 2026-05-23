# AGENTS.md

## 项目概览

Frame Maker 是一个基于 Vue 3 + Vite 的相框生成工具。应用入口是 `index.html`，浏览器端通过 `src/main.ts` 加载 Vue 应用，用共享 Canvas 渲染内核绘制照片、相框、模板文字、EXIF 信息和导出图片。

当前项目已有 `package.json`、`package-lock.json`、`vite.config.ts`、`tsconfig.json` 和 `tsconfig.node.json`。没有确认到 ESLint/Prettier 配置或统一格式化流程。

## 当前目录结构

- `index.html`：Vite 页面入口，加载 `src/main.ts`。
- `src/main.ts`：Vue 应用启动入口，加载 `src/styles/fonts-local.css` 和 `src/styles/vue-native.css`。
- `src/App.vue`：Vue 根组件，组装模板列表、预览区、右侧 inspector、文本编辑、批量照片和导出流程。
- `src/components/`：Vue 组件。
- `src/composables/`：状态、历史记录、照片、模板和预览渲染组合式逻辑。
- `src/adapters/`：Vue 到共享导出、模板包和 inspector 字段显示能力的适配层；渲染和模板状态现在主要直接调用共享 core 模块。
- `src/types/`：TypeScript 类型定义。
- `src/utils/`：Vue 文本模型编辑工具。
- `src/styles/`：Vue 原生 UI 样式入口和模块。
- `js/core/render/`：Canvas 渲染、布局度量、EXIF 输入归一化、导出尺寸计算和运行时 API，当前为 TypeScript 模块。
- `js/core/templates/`：模板注册、字段归一化、外观主题、模板包和导入注册能力，当前为 TypeScript 模块。
- `js/core/fonts/`：字体注册、字体加载和 Canvas 字体字符串构造，当前为 TypeScript 模块。
- `js/templates.ts`：模板注册列表和默认模板。
- `js/templates/`：模板实现。每个模板通常包含 `schema.ts`、`index.ts`，按需在 `index.ts` 中实现 `resolveData`，或通过 `overlays` 声明照片边框等 overlay。
- `legacy/`：旧版原生 DOM UI 归档，包含旧 `css/`、`js/app.js`、`js/app/` 和 `js/ui/`；当前 Vue 应用不从该目录加载运行时代码。
- `assets/fonts/`：字体文件。当前跟踪 MiSans Light / Regular / Medium 与 `times.ttf`；`assets/fonts/Angie_Sans_Std.otf` 被 `.gitignore` 排除。
- `thumbnails/`：模板缩略图。当前跟踪 `.jpg` 缩略图。
- `tests/`：Node/Vite 相关测试。
- `start.sh`：本地 Vite 开发服务器启动脚本，默认端口 `8001`。
- `.playwright-cli/`：本地 Playwright CLI 输出目录，被 `.gitignore` 排除。
- `.qoder/`：本地工具目录。用途待确认。

当前工作树未发现 `scripts/` 和 `reference-ui/` 目录；不要假设它们存在。

## 本地开发命令

首次使用先安装依赖：

```bash
npm install
```

启动开发服务器：

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

也可以直接运行：

```bash
npm run dev -- --port 8001
```

构建生产版本：

```bash
npm run build
```

本地预览生产构建：

```bash
npm run preview -- --port 8001
```

GitHub Pages 部署由 `.github/workflows/deploy-pages.yml` 处理：`main` 分支 push 或手动触发时使用 Node 22，执行 `npm ci`、`npm run test:templates` 和 `npm run build`，再发布 `dist/`。

## 测试和检查命令

当前确认的检查命令：

```bash
npm run build
npm run test:templates
npm run test:vue-state
```

当前没有确认到统一 lint、format 或端到端测试配置。按项目约定，如无特别说明，在计划和实施时不要做浏览器验证。

## 代码风格

- Vue / TypeScript / JavaScript 使用 ES modules，保留显式相对路径导入。
- 现有代码使用 4 个空格缩进、单引号和分号。
- 优先使用 `const` / `let`，按当前文件风格组织常量、状态和函数。
- UI 文案当前主要为中文；新增用户可见文案应保持中文表达，除非模板默认内容本身需要英文。
- 注释可以使用中文，保持简洁，只解释非显而易见的流程。
- CSS 按 `src/styles/` 现有模块拆分：设计变量和 reset 放 `base.css`，页面骨架放 `layout.css`，通用按钮等放 `components.css`，字段控件放 `fields.css`、`option-input.css`、`option-buttons.css`、`nine-grid-picker.css`，具体功能区放 `preview.css`、`template-selector.css`、`inspector.css`、`export.css`、`batch-photo.css`、`text-editor.css` 等。
- 新增 UI 前先复用现有组件类和变量，例如按钮、字段、颜色选项、range、inspector 分区等；不要为单个场景复制一套硬编码样式。
- 修改样式时先判断是否应调整控件或元素的公共样式；只有公共样式不适用时，再改具体区域或独立样式。
- 确实需要新组件时，先复用或补充对应的现有样式模块；当前没有确认到 `features.css`，不要假设该文件存在。
- 不要引入构建工具、框架、状态库或格式化工具，除非任务明确要求并同步说明项目流程变化。

## 设计规范

- 设计变量集中在 `src/styles/base.css` 的 `:root`，新增颜色、间距、圆角、控件尺寸优先复用或扩展这些变量。
- 当前基础色包括 `--color-white`、`--color-gray-light`、`--color-gray-dark`、`--color-accent`，并派生出背景、文字、分隔线、字段和模板选择状态变量。
- 圆角变量 `--radius-sm`、`--radius-md`、`--radius-lg`、`--radius-pill` 当前都收敛到 `6px`；新增控件应保持小圆角风格。
- 控件高度优先对齐 `--toolbar-control-height` 或 `.field-group` 内的 `--field-height`。
- 字段文字应保持 `letter-spacing: 0`，输入区域避免由状态变化造成布局跳动。
- 主布局是左侧模板选择器、中间预览区、右侧 inspector 面板；`980px` 以下切成上下布局。
- 右侧 inspector 由 Vue 组件组合生成：基础字段在 `src/components/InspectorPanel.vue`，文本编辑在 `src/components/TextEditorPanel.vue`，批量照片在 `src/components/BatchPhotoPanel.vue`，导出设置在 `src/components/ExportPanel.vue`。
- 新组件的颜色、圆角、间距、字号、边框和状态样式应来自现有 CSS 变量；若变量不足，先补充语义化变量，再使用它。
- 不要把全局样式写进模板模块；模板视觉应通过 schema、appearance theme、render overlay 和现有 CSS 组件表达。

## 应用状态和关键变量

Vue 应用中的核心运行状态：

- `src/composables/usePhotoStore.ts` 管理上传照片、缩略图、原图 object URL 和原始 EXIF。
- `src/composables/useTemplateStore.ts` 管理内置模板和导入模板。
- `src/composables/useEditorState.ts` 管理每张照片的模板选择、字段值、文本模型、EXIF 覆盖值、导出选择、复制设置以及撤销/重做历史。
- `src/App.vue` 管理当前导出配置、右侧面板状态、上传入口、导入/导出模板和批量导出流程。

资源缓存由 Vite 构建产物 hash 处理；当前入口不再维护旧版手写 `assetVersion`。

## 字段和右侧面板约定

模板字段对象由 `js/core/templates/fields.ts` 归一化，常用属性包括：

- `key`：字段键名，必须稳定。
- `label`：右侧面板显示标签。
- `type`：当前控件支持 `text`、`textarea`、`number`、`color`、`input`、`select`、`toggle`、`range`。
- `defaultValue`：默认值；没有时由 `getFieldDefaultValue(field)` 按类型补齐。
- `options`：`select` 字段选项。
- `control: 'color-buttons'`：把 `select` 渲染为颜色按钮组。
- `hidden: true`：不在右侧面板显示，但仍参与配置归一化。
- `appearanceVisibility`：可按当前外观主题显示或隐藏字段，支持 `showOn` / `hideOn`。

右侧基础字段分区由 `src/components/InspectorPanel.vue` 的字段 key 判断，并通过 `src/adapters/inspectorFieldAdapter.ts` 转成显示用 `InspectorField`：

- 版式字段：以 `js/core/templates/frame-layout.ts` 的 `FRAME_LAYOUT_FIELD_KEYS` 为准，当前包括 `frameAspectRatio`、`frameBorderWidth`、`frameTop`、`frameRight`、`frameBottom`、`frameLeft`
- 外观字段：`colorScheme`、`showThinBorder`
- 其他可见模板字段默认进入文本区
- EXIF 区不来自模板字段，而来自 `EDITABLE_EXIF_FIELDS`
- 导出区不来自模板字段，当前由 `src/components/ExportPanel.vue` 内的 `sizePreset`、`customWidth`、`customHeight`、`jpegQuality` 控件定义

新增字段时要确认字段 key 是否需要加入 `FRAME_LAYOUT_FIELD_KEYS` 或 `InspectorPanel.vue` 内的 `APPEARANCE_FIELD_KEYS`，否则不会进入基础面板的对应分区；文本模型相关能力在 `TextEditorPanel.vue` 和 `src/utils/textModelEditor.ts` 中处理。`FieldControl.vue` 还支持显示适配后的 `option-input`、`theme-radio`、`nine-grid` 等控件形态，不要直接把这些当成模板 schema 的通用字段类型。

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
- `resolveData(input)`：把 `photo`、`exif`、`config`、`global` 转成模板渲染数据。
- `renderOverlay(ctx, args)`：绘制声明式背景、照片、文字之外的 overlay，例如细框、信息栏、分隔线。

模板注册在 `js/templates.ts`。当前顺序为：

```js
galleryCaptionMatTemplate,
simpleMatTemplate,
bottomInfoBarTemplate,
storyExifTemplate,
```

当前默认模板由 `js/templates.ts` 的 `defaultTemplate` 和 Vue 状态初始化共同决定。调整默认模板时要同步检查 `js/templates.ts`、`src/composables/useTemplateStore.ts` 和 `src/App.vue` 的初始化链路。

## 模板几何和字段命名

`frame.sides = { top, right, bottom, left }` 使用百分比数值：

- `top` / `bottom` 以原照片高度为基准。
- `left` / `right` 以原照片宽度为基准。
- `frameAspectRatio` 字段可指定整体固定比例，例如 `1:1`。自由比例时使用四边百分比；固定比例时使用 `frameBorderWidth` 结合照片比例补足宽或高，使最终画布满足目标比例。

`buildFrameLayoutFields(frame, options)` 用于生成相框比例、固定比例边框宽度和自由比例四边边距字段：

- `top` -> `frameTop`
- `right` -> `frameRight`
- `bottom` -> `frameBottom`
- `left` -> `frameLeft`
- `aspectRatio` -> `frameAspectRatio`
- `borderWidth` -> `frameBorderWidth`

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

`textGroups` 中每组文字对象当前使用文本模型结构，常用属性：

- `region`：`top`、`right`、`bottom`、`left`、`center`，默认 `bottom`。
- `anchor`：使用该 region 的锚点，默认 `center`。
- `direction`：`vertical` 或 `horizontal`。
- `align`：`start`、`center`、`end`。
- `gapScale`：控制组内项目间距。
- `offsetXScale` / `offsetYScale`：控制相对锚点偏移。
- `style`：组级文字样式，例如 `fontId`、`fontScale`、`fontWeight`、`fontStyle`、`colorToken`、`color`、`letterSpacingScale`。
- `items`：组内文字、分隔线或图片项目。

`items` 中每条文字常用属性：

- `type: 'text'`：普通文字项目。
- `content`：固定文本内容。
- `fallbackContent`：空文本 fallback。
- `hideWhenEmptyToken`：用于按数据 token 为空时隐藏。
- `visible`：显式布尔开关。
- `style`：项目级样式，可覆盖组级样式。

声明式文字由 `js/core/text/` 的布局和绘制逻辑处理。复杂图形、线条或信息栏可放在模板 `renderOverlay()` 中；照片边框等通用图形优先使用模板 `overlays` 声明。

## 外观主题约定

外观主题相关 API 位于 `js/core/templates/appearance.ts`：

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

EXIF 解析位于 `js/core/render/input.ts`，当前主要面向 JPEG。可编辑字段由 `EDITABLE_EXIF_FIELDS` 固定：

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
- `config`：模板配置，即归一化后的字段值。
- `global`：全局渲染设置，如 `scale`、`mode`、`resize`、`compression`、`watermark`。

注意：上传图片后，EXIF 原始值会先转为右侧可编辑文本；模板实际读取的是 `exifOverrideValues` 归一化结果。

## 渲染和导出流程

公共入口是 `renderTemplateFrame(canvas, image, template, rawConfig, options)`。

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

导出尺寸由 `js/core/render/sizing.ts` 处理：

- `sizePreset: 'original'` 不缩放。
- `sizePreset: '1080'` / `'2048'` 按长边缩放。
- `sizePreset: 'custom'` 支持只填宽、只填高或宽高都填；输入必须是正整数。

导出文件名由原文件名生成，后缀默认为 `_framed.jpg`。

## 字体约定

字体注册在 `js/core/fonts/index.ts`：

- `angieSansStd`：`Angie Sans Std`，资产路径是 `assets/fonts/Angie_Sans_Std.otf`，该文件被忽略，不应提交。
- `miSans`：`MiSans`，资产路径是 `assets/fonts/MiSans-Regular.woff2`。
- `miSans` 同时注册 300 / 400 / 500 字重，分别对应 `MiSans-Light.woff2`、`MiSans-Regular.woff2`、`MiSans-Medium.woff2`。
- `timesNewRoman`：`Times New Roman`，资产路径是 `assets/fonts/times.ttf`。
- `systemSans`：系统 sans-serif 字体栈。

默认字体 id：

- 英文：`angieSansStd`
- 中文：`systemSans`
- UI：`systemSans`

新增字体时需要同步检查：

- `js/core/fonts/index.ts`
- `src/styles/fonts-local.css`
- 是否涉及字体授权或私有字体提交限制

## 新增或修改模板流程

1. 在 `js/templates/<template-id>/` 中创建或修改模板。
2. 在 `schema.ts` 定义 `id`、`appearanceThemes`、`frame`、`textGroups`、`fields`、`defaultConfig`。
3. 如需把输入数据转为渲染数据，在 `index.ts` 中传入 `resolveData`，或按模板目录现有方式拆分后再导入。
4. 如需绘制照片、背景和声明式文字之外的图形，在 `index.ts` 中传入 `renderOverlay`；照片边框等通用图形优先使用 `overlays` 声明。
5. 通过 `defineTemplate()` 导出模板。
6. 在 `js/templates.ts` 注册模板，并确认默认模板是否需要调整。
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
- 修改模板后，同时检查 `js/templates.ts` 注册顺序、模板 `id`、默认配置和缩略图文件名是否一致。
- 新增或调整字段后，检查 `src/components/InspectorPanel.vue` 的基础字段分区逻辑，以及 `src/components/TextEditorPanel.vue` 是否需要配合文本模型能力。
- 改动布局计算、`frame.sides`、`frameAspectRatio`、anchors 或文本区域时，要做浏览器渲染验证；若布局校验脚本恢复存在，也运行对应脚本。
- 改动缩略图相关逻辑、模板默认外观或模板列表后，按需重建缩略图并确认输出文件。
- 字体加载同时影响 UI 和 Canvas 导出。字体相关改动要检查本地服务和导出结果。
- 当前未发现运行中的模板配置持久化模块；如需持久化用户配置，需要先确认预期存储策略。
- `renderOverlay()` 只处理声明式文字、背景、照片之外的 overlay。不要把可声明的普通文字布局硬写到 overlay。
- 优先复用 `js/templates/shared.ts` 的工具函数，例如 `buildFrameLayoutFields()`、`buildThinBorderToggleField()`、`buildExifMetaPrimary()`、`buildExifMetaSecondary()`。

## 不应该改动的文件或目录

- `.git/`：Git 内部目录。
- `.DS_Store`：本地系统文件，已在 `.gitignore` 中忽略。
- `.playwright-cli/`：本地 Playwright CLI 输出目录，已在 `.gitignore` 中忽略。
- `assets/fonts/Angie_Sans_Std.otf`：本地私有字体文件，已在 `.gitignore` 中忽略。
- `thumbnails/`：除非正在新增模板、更新模板默认视觉或明确重建缩略图，否则不要改动。
- `assets/fonts/` 中已跟踪字体文件：除非任务明确涉及字体授权、字体替换或渲染一致性，否则不要改动。
- `LICENSE`：除非任务明确涉及许可证，否则不要改动。

## 提交前检查清单

- 如任务明确需要或项目约定允许，确认页面能通过本地静态服务器打开；如无特别说明，不做浏览器验证。
- 涉及交互或渲染时，按任务范围手动验证上传、模板切换、右侧字段编辑、EXIF 编辑、预览和导出 JPG；自动化运行默认以现有 npm 检查命令为主。
- 确认新增模板已在 `js/templates.ts` 注册，并有匹配的 `thumbnails/<template-id>_thumbnail.(png|jpg)`。
- 确认没有提交 `.DS_Store`、`.playwright-cli/`、`assets/fonts/Angie_Sans_Std.otf` 或其他本地生成文件。
- 如后续恢复了布局校验或缩略图脚本，按改动范围运行对应脚本。
- lint、format、发布检查：当前仍待确认。
