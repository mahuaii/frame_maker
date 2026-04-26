import { TEXT_ALIGNS, TEXT_ITEM_TYPES } from './schema.js';

function getLineOffset(itemWidth, lineWidth, align) {
    if (align === TEXT_ALIGNS.end) {
        return itemWidth - lineWidth;
    }

    if (align === TEXT_ALIGNS.center) {
        return (itemWidth - lineWidth) / 2;
    }

    return 0;
}

function drawTextWithLetterSpacing(ctx, text, x, y, letterSpacing = 0) {
    if (!letterSpacing || text.length <= 1) {
        ctx.fillText(text, x, y);
        return;
    }

    let cursor = x;
    for (let index = 0; index < text.length; index += 1) {
        const character = text[index];
        ctx.fillText(character, cursor, y);
        cursor += ctx.measureText(character).width + letterSpacing;
    }
}

function drawTextItem(ctx, item, originX, originY) {
    const x = originX + item.x;
    const y = originY + item.y;

    ctx.save();
    ctx.font = item.style.font;
    ctx.fillStyle = item.style.color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    item.lines.forEach((line, index) => {
        const lineX = x + getLineOffset(item.width, line.width, item.lineAlign);
        const lineY = y + item.style.lineHeight * index + line.baselineOffset;
        drawTextWithLetterSpacing(ctx, line.text, lineX, lineY, item.style.letterSpacing);
    });

    ctx.restore();
}

function drawSeparatorItem(ctx, item, originX, originY) {
    ctx.save();
    ctx.fillStyle = item.color;
    ctx.fillRect(originX + item.x, originY + item.y, item.width, item.height);
    ctx.restore();
}

function drawImageItem(ctx, item, originX, originY) {
    if (!item.image) {
        return;
    }

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(item.image, originX + item.x, originY + item.y, item.width, item.height);
    ctx.restore();
}

function drawItem(ctx, item, originX, originY) {
    if (item.type === TEXT_ITEM_TYPES.text) {
        drawTextItem(ctx, item, originX, originY);
        return;
    }

    if (item.type === TEXT_ITEM_TYPES.separator) {
        drawSeparatorItem(ctx, item, originX, originY);
        return;
    }

    if (item.type === TEXT_ITEM_TYPES.image) {
        drawImageItem(ctx, item, originX, originY);
        return;
    }

    if (item.type === TEXT_ITEM_TYPES.group) {
        drawGroup(ctx, item, originX + item.x, originY + item.y);
    }
}

export function drawGroup(ctx, group, originX = 0, originY = 0) {
    group.items.forEach((item) => {
        drawItem(ctx, item, originX, originY);
    });
}

export function drawTextLayout(ctx, layout = []) {
    layout.forEach((group) => {
        drawGroup(ctx, group, group.x, group.y);
    });
}
