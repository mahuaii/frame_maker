import { renderCenteredTextRuns } from '../../text-runs.js';
import { getAppearanceColor } from '../../core/templates/registry.js';
import { buildInfoTextRuns } from '../shared.js';

export function renderClassicFrameTemplate(ctx, args) {
    const { area, data, appearance, metrics, template } = args;
    const textStyleDefaults = {
        ...template.textStyleDefaults,
        fontIdEn: data.infoFontId || template.textStyleDefaults.fontIdEn,
        fontIdZh: data.infoFontId || template.textStyleDefaults.fontIdZh,
    };

    ctx.save();
    renderCenteredTextRuns(
        ctx,
        area,
        buildInfoTextRuns(data, textStyleDefaults),
        metrics,
        {
            defaults: textStyleDefaults,
            color: getAppearanceColor(appearance, 'textPrimary', '#000000'),
        }
    );
    ctx.restore();
}
