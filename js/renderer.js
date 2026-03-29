import { resolveTemplateConfig } from './core/templates/registry.js';

/**
 * 核心渲染函数：将照片 + 相框模板渲染到 Canvas
 *
 * @param {HTMLCanvasElement} canvas - 目标画布
 * @param {HTMLImageElement} image - 已加载的图片
 * @param {object} template - 相框模板配置对象
 * @param {Record<string, string>} fieldValues - 用户编辑的字段值
 * @param {number} [scale=1] - 缩放比例，1 为原始分辨率（导出用），<1 为预览缩放
 */
export function renderFrame(canvas, image, template, fieldValues, scale = 1) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const config = resolveTemplateConfig(template, fieldValues);
    const layoutMetrics = calculateFrameMetrics(image, template, scale);
    const {
        imageWidth,
        imageHeight,
        fullWidth,
        fullHeight,
        scaledImageWidth,
        scaledImageHeight,
        scaledBarHeight,
    } = layoutMetrics;

    // 应用缩放
    const displayWidth = Math.round(fullWidth * scale);
    const displayHeight = Math.round(fullHeight * scale);

    // 设置 Canvas 尺寸
    // 处理高 DPI: 导出时 dpr=1（原始分辨率），预览时使用 devicePixelRatio
    const dpr = scale < 1 ? (window.devicePixelRatio || 1) : 1;
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';
    ctx.scale(dpr, dpr);

    // 1. 填充整个背景色（先铺满，确保没有缝隙）
    ctx.fillStyle = template.backgroundColor;
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // 2. 绘制照片（缩放后）
    ctx.drawImage(image, 0, 0, scaledImageWidth, scaledImageHeight);

    // 3. 调用模板的 render 函数绘制信息栏
    const area = {
        x: 0,
        y: scaledImageHeight,
        width: scaledImageWidth,
        height: scaledBarHeight,
    };
    const data = template.resolveData({
        photo: image,
        exif: null,
        customText: config,
        global: {
            scale,
        },
    });

    template.render(ctx, {
        photo: image,
        area,
        config,
        data,
        metrics: layoutMetrics,
        canvasSize: {
            width: displayWidth,
            height: displayHeight,
        },
    });
}

/**
 * 计算模板尺寸基准
 *
 * @param {number} imageWidth - 原始图片宽度
 * @param {number} imageHeight - 原始图片高度
 * @param {'width'|'height'|'shorterSide'|'longerSide'|'area'} basis - 模板尺寸基准
 * @returns {number}
 */
function getBasisSize(imageWidth, imageHeight, basis) {
    switch (basis) {
        case 'width':
            return imageWidth;
        case 'height':
            return imageHeight;
        case 'shorterSide':
            return Math.min(imageWidth, imageHeight);
        case 'longerSide':
            return Math.max(imageWidth, imageHeight);
        case 'area':
            return Math.sqrt(imageWidth * imageHeight);
        default:
            return imageHeight;
    }
}

/**
 * 统一计算相框布局度量，供预览、缩略图和导出复用
 *
 * @param {HTMLImageElement} image - 图片
 * @param {object} template - 模板尺寸策略
 * @param {number} [scale=1] - 缩放比例
 * @returns {object}
 */
export function calculateFrameMetrics(image, template, scale = 1) {
    const imageWidth = image.naturalWidth;
    const imageHeight = image.naturalHeight;
    const barBasisSize = getBasisSize(imageWidth, imageHeight, template.barSizeBasis);
    const fontBasisSize = getBasisSize(imageWidth, imageHeight, template.fontSizeBasis);
    const barHeight = Math.round(barBasisSize * template.barHeightRatio);
    const rawFontSize = Math.round(fontBasisSize * template.fontSizeRatio);
    const fontSize = Math.max(template.minFontSize ?? 12, rawFontSize);

    return {
        imageWidth,
        imageHeight,
        fullWidth: imageWidth,
        fullHeight: imageHeight + barHeight,
        barBasisSize,
        fontBasisSize,
        barHeight,
        fontSize,
        textRunBaseFontSize: fontSize,
        scaledImageWidth: imageWidth * scale,
        scaledImageHeight: imageHeight * scale,
        scaledBarHeight: barHeight * scale,
        scaledFontSize: fontSize * scale,
        scaledTextRunBaseFontSize: fontSize * scale,
    };
}

/**
 * 计算预览缩放比例，使画布适配容器
 *
 * @param {HTMLImageElement} image - 图片
 * @param {object} template - 模板（获取 barHeightRatio）
 * @param {number} containerWidth - 容器可用宽度
 * @param {number} containerHeight - 容器可用高度
 * @param {number} [padding=0.9] - 留白比例（0.9 表示最大占 90%）
 * @returns {number} 缩放比例
 */
export function calculatePreviewScale(image, template, containerWidth, containerHeight, padding = 0.9) {
    const { fullWidth, fullHeight } = calculateFrameMetrics(image, template, 1);

    const maxWidth = containerWidth * padding;
    const maxHeight = containerHeight * padding;

    const scaleX = maxWidth / fullWidth;
    const scaleY = maxHeight / fullHeight;

    return Math.min(scaleX, scaleY, 1); // 不超过原始大小
}
