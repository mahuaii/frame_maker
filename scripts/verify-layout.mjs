import assert from 'node:assert/strict';
import { calculateFrameMetrics } from '../js/renderer.js';
import { getTemplateById, templates } from '../js/templates.js';

const landscapeImage = {
    naturalWidth: 1000,
    naturalHeight: 500,
};
const portraitImage = {
    naturalWidth: 500,
    naturalHeight: 1000,
};

function metrics(templateId, image = landscapeImage, config = undefined) {
    const template = getTemplateById(templateId);
    assert.ok(template, `Expected template "${templateId}" to exist.`);
    return calculateFrameMetrics(image, template, 1, config ?? template.defaultConfig);
}

function assertPoint(point, expected, message) {
    assert.equal(point.x, expected.x, `${message} x`);
    assert.equal(point.y, expected.y, `${message} y`);
}

{
    const result = metrics('simple-mat');
    assert.deepEqual(result.sidesPx, {
        top: 13,
        right: 25,
        bottom: 38,
        left: 25,
    });
    assert.deepEqual(result.photoArea, {
        x: 25,
        y: 13,
        width: 1000,
        height: 500,
    });
    assert.deepEqual(result.textRegions.top, {
        x: 25,
        y: 0,
        width: 1000,
        height: 13,
    });
    assert.deepEqual(result.textRegions.left, {
        x: 0,
        y: 13,
        width: 25,
        height: 500,
    });
}

{
    const result = metrics('simple-mat', portraitImage);
    assert.deepEqual(result.sidesPx, {
        top: 25,
        right: 13,
        bottom: 75,
        left: 13,
    });
}

{
    const result = metrics('simple-mat', landscapeImage, {
        frameTop: 10,
        frameBottom: 6,
        frameHorizontalSides: 4,
    });
    assert.deepEqual(result.sidesPx, {
        top: 50,
        right: 40,
        bottom: 30,
        left: 40,
    });
}

{
    const result = metrics('bottom-info-bar', landscapeImage, {
        frameBottom: 0,
    });
    assert.deepEqual(result.sidesPx, {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
    });
    assert.equal(result.textRegions.bottom.height, 0);
    assert.equal(result.textContentRegions.bottom.height, 0);
}

{
    const result = metrics('gallery-caption-mat');
    const template = getTemplateById('gallery-caption-mat');
    assert.equal(result.fullWidth, 1156);
    assert.equal(result.fullHeight, 1156);
    assert.equal(result.fullWidth / result.fullHeight, 1);
    assert.equal(template.textGroups.length, 1);
    assert.equal(template.textGroups[0].anchor, 'center');
    assert.equal(template.textGroups[0].region, 'bottom');
    assert.equal(template.textGroups[0].texts.length, 2);
    assert.deepEqual(result.sidesPx, {
        top: 328,
        right: 78,
        bottom: 328,
        left: 78,
    });
    assert.deepEqual(result.textRegions.top, {
        x: 78,
        y: 0,
        width: 1000,
        height: 328,
    });
    assert.deepEqual(result.textRegions.bottom, {
        x: 78,
        y: 828,
        width: 1000,
        height: 328,
    });
}

{
    const baseTemplate = getTemplateById('gallery-caption-mat');
    const template = {
        ...baseTemplate,
        fields: [
            ...baseTemplate.fields,
            {
                key: 'frameHorizontalSides',
                type: 'number',
                defaultValue: 15.5,
            },
        ],
    };
    const result = calculateFrameMetrics(landscapeImage, template, 1, {
        ...baseTemplate.defaultConfig,
        frameHorizontalSides: 20,
    });

    assert.deepEqual(result.sidesPx, {
        top: 450,
        right: 200,
        bottom: 450,
        left: 200,
    });
    assert.equal(result.fullWidth, 1400);
    assert.equal(result.fullHeight, 1400);
}

{
    const result = metrics('story-exif');
    const bottomContent = result.textContentRegions.bottom;
    assert.ok(bottomContent.x > result.textRegions.bottom.x);
    assert.ok(bottomContent.y > result.textRegions.bottom.y);
    assert.ok(bottomContent.width < result.textRegions.bottom.width);
    assert.ok(bottomContent.height < result.textRegions.bottom.height);

    assertPoint(result.anchors.bottom['top-left'], {
        x: bottomContent.x,
        y: bottomContent.y,
    }, 'bottom top-left anchor');
    assertPoint(result.anchors.bottom.center, {
        x: bottomContent.x + bottomContent.width / 2,
        y: bottomContent.y + bottomContent.height / 2,
    }, 'bottom center anchor');
    assertPoint(result.anchors.bottom['bottom-right'], {
        x: bottomContent.x + bottomContent.width,
        y: bottomContent.y + bottomContent.height,
    }, 'bottom bottom-right anchor');
}

for (const template of templates) {
    const result = metrics(template.id);
    assert.ok(result.fullWidth > 0, `${template.id} fullWidth`);
    assert.ok(result.fullHeight > 0, `${template.id} fullHeight`);
    assert.equal(Object.keys(result.anchors.top).length, 9, `${template.id} top anchors`);
    assert.equal(Object.keys(result.anchors.right).length, 9, `${template.id} right anchors`);
    assert.equal(Object.keys(result.anchors.bottom).length, 9, `${template.id} bottom anchors`);
    assert.equal(Object.keys(result.anchors.left).length, 9, `${template.id} left anchors`);
}

console.log('layout verification passed');
