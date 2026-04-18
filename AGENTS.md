# AGENTS.md

## 项目概览

Frame Maker 是一个基于原生 HTML / CSS / JavaScript 的静态相框生成工具。应用入口是 `index.html`，浏览器端通过 ES modules 加载 `js/app.js`，使用 Canvas 渲染照片、相框、模板文字和导出图片。

README 确认的主要能力包括：上传图片、模板切换、动态生成右侧编辑面板、读取 JPEG EXIF、导出 JPG，以及按模板扩展相框样式。

当前未发现 `package.json`、锁文件、Vite/Webpack 配置、TypeScript 配置、ESLint/Prettier 配置或 Python 依赖配置。依赖安装方式、格式化规则和发布流程：待确认。

## 目录结构

- `index.html`：静态页面入口，加载 CSS 和 `js/app.js`。
- `css/`：样式文件。`css/style.css` 只负责按顺序导入 `base.css`、`layout.css`、`components.css`、`features.css`。
- `js/app.js`：浏览器端主流程，包括上传、模板选择、字段编辑、预览和导出。
- `js/renderer.js`：渲染能力的聚合入口，转发 `js/core/render/` 的运行时函数。
- `js/core/render/`：Canvas 渲染、布局度量、EXIF 输入归一化等核心逻辑。
- `js/core/templates/`：模板注册、字段归一化、外观主题和配置处理。
- `js/core/fonts/`：字体注册、字体加载、Canvas 字体字符串构造。
- `js/templates.js`：模板注册列表和默认模板。
- `js/templates/`：各模板实现。每个模板通常有 `schema.js`、`index.js`，按需包含 `render.js` 和 `resolve-data.js`。
- `assets/fonts/`：字体文件。仓库跟踪 MiSans 与 `times.ttf`；`assets/fonts/Angie_Sans_Std.otf` 被 `.gitignore` 排除。
- `assets/samples/`：脚本使用的示例图片，目前有 `thumbnail-source-z30.jpg`。
- `thumbnails/`：模板缩略图。当前跟踪的是 `.jpg` 缩略图。
- `scripts/`：辅助脚本，包括缩略图生成页面/脚本和布局校验脚本。
- `start.sh`：本地静态服务器启动脚本。
- `.playwright-cli/`：本地 Playwright CLI 输出目录，被 `.gitignore` 排除。
- `.qoder/`：本地工具目录，当前只确认有 `.DS_Store`。用途：待确认。

README 提到 `reference-ui/`，但当前工作树未发现该目录。是否仍属于项目结构：待确认。

## 本地开发命令

本项目 README 确认是纯静态前端，无需打包。

```bash
./start.sh
```

默认服务地址是 `http://localhost:8001`。也可以指定端口：

```bash
./start.sh 8080
```

`start.sh` 实际执行的是：

```bash
python3 -m http.server "${PORT}"
```

也可以直接运行：

```bash
python3 -m http.server 8001
```

依赖安装命令：待确认。当前仓库没有确认到 npm、pnpm、yarn、bun、pip 或其他依赖配置文件。

## 测试和检查命令

当前仓库确认存在一个 Node 布局校验脚本：

```bash
node scripts/verify-layout.mjs
```

该脚本使用 `node:assert/strict` 校验模板布局度量、固定比例模板、锚点数量等，成功时输出 `layout verification passed`。

生成缺失缩略图：

```bash
./scripts/generate-thumbnails.sh
```

强制重建缩略图：

```bash
./scripts/generate-thumbnails.sh --force
```

缩略图脚本已确认依赖：

- `zsh`
- `node`
- `python3`
- Microsoft Edge，可通过 `EDGE_BIN` 环境变量覆盖默认路径
- `assets/samples/thumbnail-source-z30.jpg`

缩略图尺寸可通过 `THUMBNAIL_RENDER_MAX_WIDTH` 和 `THUMBNAIL_RENDER_MAX_HEIGHT` 覆盖。

未发现 npm test、lint、format、端到端测试或 Playwright 配置文件。对应命令：待确认。

## 代码风格约定

- JavaScript 使用浏览器原生 ES modules，保留显式相对路径导入。
- 现有代码使用 4 个空格缩进、单引号和分号。
- 优先使用 `const` / `let`，按当前文件风格组织常量、状态和函数。
- 模板应通过 `defineTemplate()` 注册，必须提供稳定 `id`、`defaultConfig`、`fields`、`frame.sides` 和 `textGroups`。
- 模板字段默认值优先通过 `buildDefaultConfig(fields)` 生成，字段值归一化走 `resolveTemplateConfig()` / `normalizeTemplateConfig()`。
- 新模板放在 `js/templates/<template-id>/`，并在 `js/templates.js` 注册。
- 模板几何按 README 说明使用 `frame.sides` 百分比：左右以原照片宽度为基准，上下以原照片高度为基准。
- `render.js` 只处理声明式文字/背景/照片之外的 overlay 绘制，例如细框或分隔线。
- CSS 按现有模块拆分；全局变量和 reset 放 `css/base.css`，布局放 `css/layout.css`，通用控件放 `css/components.css`，具体功能区放 `css/features.css`。
- UI 文案当前主要为中文；新增用户可见文案应保持中文表达，除非模板内容本身需要英文。
- 注释可以使用中文；保持简洁，优先解释非显而易见的流程。

## 修改代码时的注意事项

- 修改模板后，同时检查 `js/templates.js` 注册顺序、模板 `id`、默认配置和缩略图文件名是否一致。
- 新增或调整模板字段后，确认右侧编辑面板分组逻辑是否需要更新。`js/app.js` 目前按字段 key 把布局、外观和文本字段分组。
- 改动布局计算、`frame.sides`、`fixedAspectRatio`、anchors 或文本区域时，运行 `node scripts/verify-layout.mjs`。
- 改动缩略图相关逻辑、模板默认外观或模板列表后，按需运行缩略图脚本并确认输出文件。
- 字体加载同时影响 UI 和 Canvas 导出。新增字体时需要检查 `js/core/fonts/index.js`、`css/fonts-local.css` 和 README 的字体说明。
- README 确认 `Angie Sans Std` 属于本地私有字体处理，不应随仓库提交。
- `index.html` 和 `js/app.js` 中存在手写资源版本号。修改静态资源缓存策略时，是否同步这些版本号：待确认。
- 当前 `js/core/templates/config-store.js` 的保存函数是空实现；如果要持久化用户配置，需要先确认预期存储策略。

## 不应该改动的文件或目录

- `.git/`：Git 内部目录。
- `.DS_Store`：本地系统文件，已在 `.gitignore` 中忽略。
- `.playwright-cli/`：本地 Playwright CLI 输出目录，已在 `.gitignore` 中忽略。
- `assets/fonts/Angie_Sans_Std.otf`：本地私有字体文件，已在 `.gitignore` 中忽略。
- `thumbnails/`：除非正在新增模板、更新模板默认视觉或明确重建缩略图，否则不要改动。
- `assets/fonts/` 中已跟踪字体文件：除非任务明确涉及字体授权、字体替换或渲染一致性，否则不要改动。
- `LICENSE`：除非任务明确涉及许可证，否则不要改动。

## 提交前检查清单

- 运行并通过：

```bash
node scripts/verify-layout.mjs
```

- 如果改动了模板视觉、默认配置、模板注册列表或缩略图生成逻辑，运行或评估是否需要运行：

```bash
./scripts/generate-thumbnails.sh
```

- 本地打开页面，至少确认上传、模板切换、右侧字段编辑、预览和导出流程没有明显回归。
- 确认没有提交 `.DS_Store`、`.playwright-cli/`、`assets/fonts/Angie_Sans_Std.otf` 或其他本地生成文件。
- 确认新增模板已在 `js/templates.js` 注册，并有匹配的 `thumbnails/<template-id>_thumbnail.(png|jpg)`。
- 确认 README 中已公开的命令和说明没有被代码改动破坏；如有破坏，同步更新 README。
- lint、format、发布检查：待确认。
