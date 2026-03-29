# Frame Maker — 开发待办清单

> 基于 [REQUIREMENTS.md](./REQUIREMENTS.md) 拆解，按执行顺序排列。  
> 每个任务标注预估复杂度：🟢 简单 | 🟡 中等 | 🔴 复杂

---

## 阶段一：项目初始化

- [ ] 🟢 **1.1 初始化 Vite + React + TypeScript 项目**
  - 确认 `package.json`、`vite.config.ts`、`tsconfig.app.json` 等配置文件就绪
  - 运行 `npm install` 安装依赖

- [ ] 🟢 **1.2 配置 Tailwind CSS**
  - 确认 `tailwind.config.ts`、`postcss.config.js` 配置正确
  - 在 `src/index.css` 中引入 Tailwind 指令

- [ ] 🟢 **1.3 搭建设计系统 Token**
  - 在 `src/index.css` 中定义亮色主题 CSS 变量（背景色、前景色、强调色、边框色等）
  - 在 `tailwind.config.ts` 中扩展语义化颜色 Token
  - 定义间距、圆角、阴影等 Token

- [ ] 🟢 **1.4 创建目录结构**
  - 按规划创建 `src/types/`、`src/hooks/`、`src/components/`、`src/lib/templates/` 等目录

---

## 阶段二：类型定义与模板配置

- [ ] 🟡 **2.1 定义核心类型** (`src/types/index.ts`)
  - `FrameTemplate` 接口：id、name、backgroundColor、barHeightRatio、fields、render
  - `TemplateField` 类型：key、label、defaultValue
  - `Rect` 类型：x、y、width、height
  - 应用状态相关类型（当前图片、选中模板、文字值等）

- [ ] 🟡 **2.2 实现白底模板配置** (`src/lib/templates/white.ts`)
  - 定义 `FrameTemplate` 对象
  - backgroundColor: `#FFFFFF`
  - fields: 焦距(23mm)、光圈(f/1.8)、快门(1/1000)、ISO(100)
  - render 函数：在白底信息栏上单行居中绘制参数文字（黑色字）

- [ ] 🟡 **2.3 实现黑底模板配置** (`src/lib/templates/black.ts`)
  - 定义 `FrameTemplate` 对象
  - backgroundColor: `#000000`
  - fields: 同白底模板
  - render 函数：在黑底信息栏上单行居中绘制参数文字（白色字）

- [ ] 🟢 **2.4 创建模板注册表** (`src/lib/templates/index.ts`)
  - 导出所有模板的数组
  - 提供根据 id 查找模板的工具函数

---

## 阶段三：Canvas 渲染引擎

- [ ] 🔴 **3.1 实现核心渲染函数** (`src/lib/renderer.ts`)
  - `renderFrame(canvas, image, template, values, scale)` 主函数
  - 计算画布尺寸：图片宽高 + 信息栏高度（基于 barHeightRatio）
  - 步骤 1：填充相框底色
  - 步骤 2：绘制照片到画布上方区域
  - 步骤 3：调用模板的 render 函数绘制信息栏
  - 支持传入 scale 参数，预览时缩放、导出时用原始尺寸

- [ ] 🟡 **3.2 实现 useCanvasRenderer Hook** (`src/hooks/useCanvasRenderer.ts`)
  - 输入：canvasRef、image、template、values
  - 监听输入变化，自动触发重新渲染
  - 处理 Canvas 尺寸适配（devicePixelRatio）
  - 返回：渲染状态、手动触发渲染的方法

---

## 阶段四：UI 组件开发

### 4A. 顶部工具栏

- [ ] 🟢 **4.1 实现 Toolbar 组件** (`src/components/Toolbar.tsx`)
  - 左侧：应用名称 "Frame Maker"
  - 右侧：「上传照片」按钮 + 「导出」按钮
  - 「上传照片」按钮触发隐藏的 `<input type="file" accept="image/*">`
  - 「导出」按钮在无图片时禁用或提示
  - 样式：白色背景，底部细线分隔

### 4B. 预览区

- [ ] 🟡 **4.2 实现 PreviewCanvas 组件** (`src/components/PreviewCanvas.tsx`)
  - 容器：灰色背景，flex 居中
  - 内部放置 `<canvas>` 元素
  - 未上传图片时显示上传引导（Upload 图标 + "点击或拖拽上传照片" 文字）
  - 上传引导区域支持点击上传和拖拽上传（drag & drop）
  - Canvas 等比缩放适配容器尺寸
  - 调用 useCanvasRenderer 驱动渲染

### 4C. 相框选择器

- [ ] 🟡 **4.3 实现 FrameSelector 组件** (`src/components/FrameSelector.tsx`)
  - 纵向列表排列模板缩略卡片
  - 每个卡片显示：模板名称 + 缩略预览（小尺寸 Canvas 或静态示意图）
  - 选中态：强调色边框 + 轻微阴影
  - 未选中态：普通边框，hover 时有过渡效果
  - 点击切换当前模板，触发预览更新
  - 容器可滚动（模板多时）

### 4D. 文字编辑区

- [ ] 🟡 **4.4 实现 TextEditor 组件** (`src/components/TextEditor.tsx`)
  - 根据当前模板的 `fields` 动态渲染输入框
  - 每个字段：标签 + 输入框，横向排列（一行多个字段）
  - 输入变化时实时更新 values 状态 → 触发预览重渲染
  - 样式：白色背景，顶部细线分隔，内部使用网格布局

---

## 阶段五：功能集成

- [ ] 🟡 **5.1 组装 App 主布局** (`src/App.tsx`)
  - 整体布局结构：
    - 顶部：Toolbar（固定高度）
    - 中部：左侧 PreviewCanvas（75%）+ 右侧 FrameSelector（25%）
    - 底部：TextEditor（固定高度）
  - 全局状态管理（useState）：
    - `image: HTMLImageElement | null` — 当前上传的图片
    - `selectedTemplateId: string` — 当前选中的模板 ID
    - `fieldValues: Record<string, string>` — 当前文字字段值
  - 状态联动：切换模板时，用新模板的 defaultValue 重置 fieldValues

- [ ] 🟢 **5.2 实现图片上传逻辑**
  - File → URL.createObjectURL → new Image() → 设置 image 状态
  - 支持从 Toolbar 按钮上传
  - 支持从预览区拖拽上传
  - 格式校验：仅接受 image/jpeg、image/png、image/webp

- [ ] 🟡 **5.3 实现导出下载逻辑**
  - 创建离屏 Canvas，使用原图分辨率（非预览缩放尺寸）
  - 调用 renderFrame 以 scale=1 绘制
  - canvas.toBlob → URL.createObjectURL → 创建临时 `<a>` 标签触发下载
  - 文件名格式：`frame_maker_导出时间戳.png`
  - 无图片时点击导出：弹出提示「请先上传照片」

---

## 阶段六：视觉打磨

- [ ] 🟢 **6.1 细化工具栏样式**
  - 确保按钮 hover/active 状态过渡自然
  - 「导出」按钮使用强调色样式，「上传」按钮使用次要样式

- [ ] 🟢 **6.2 细化预览区样式**
  - 相框卡片投影效果
  - 上传引导区虚线边框 + hover 高亮
  - 拖拽悬停时的视觉反馈（边框变色）

- [ ] 🟢 **6.3 细化选择器样式**
  - 缩略卡片选中/未选中过渡动画（0.2s）
  - 列表间距均匀

- [ ] 🟢 **6.4 细化编辑区样式**
  - 输入框 focus 态边框高亮
  - 标签与输入框对齐
  - 响应式网格（窄屏时减少列数）

---

## 阶段七：验证与收尾

- [ ] 🟡 **7.1 功能验证**
  - 上传图片 → 预览正确显示
  - 切换白底/黑底模板 → 预览实时切换
  - 修改文字字段 → 预览实时更新
  - 导出图片 → 下载的 PNG 分辨率与原图一致、内容与预览一致
  - 无图片时导出 → 正确提示

- [ ] 🟢 **7.2 边界情况处理**
  - 超大图片（>8000px）的性能处理
  - 超长文字的截断或缩小
  - 非图片文件的拒绝提示

- [ ] 🟢 **7.3 构建验证**
  - `npm run build` 无 TypeScript 错误
  - `npm run preview` 生产包可正常运行

---

## 任务依赖关系

```
阶段一 ──→ 阶段二 ──→ 阶段三 ──→ 阶段五
               │                    ↑
               └──→ 阶段四 ────────┘
                                    │
                              阶段六 ──→ 阶段七
```

- 阶段二（类型+模板）和阶段四（UI 组件）可并行开发
- 阶段三（渲染引擎）依赖阶段二的类型定义
- 阶段五（集成）依赖阶段三和阶段四全部完成
- 阶段六（打磨）在集成完成后进行
- 阶段七（验证）最后执行
