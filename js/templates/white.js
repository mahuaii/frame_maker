import { defaultSizing, buildInfoText } from './shared.js';

const whiteTemplate = {
    id: 'white',
    name: '白底相框',
    backgroundColor: '#FFFFFF',
    ...defaultSizing,
    fields: [
        { key: 'focal_length', label: '焦距', defaultValue: '23mm' },
        { key: 'aperture', label: '光圈', defaultValue: 'f/1.8' },
        { key: 'shutter', label: '快门', defaultValue: '1/1000' },
        { key: 'iso', label: 'ISO', defaultValue: '100' },
    ],
    render(ctx, area, values, metrics) {
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.font = `${Math.max(metrics.scaledFontSize, 1)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const text = buildInfoText(values);
        const centerX = area.x + area.width / 2;
        const centerY = area.y + area.height / 2;

        ctx.fillText(text, centerX, centerY);
        ctx.restore();
    }
};

export default whiteTemplate;
