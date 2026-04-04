import { renderCenteredTextRuns } from '../../text-runs.js';
import { getAppearanceColor } from '../../core/templates/registry.js';
import { buildInfoTextRuns } from '../shared.js';

export function renderClassicFrameTemplate(ctx, args) {
    const { area, data, appearance, metrics, template } = args;

    ctx.save();
    renderCenteredTextRuns(
        ctx,
        area,
        buildInfoTextRuns(data, template.textStyleDefaults),
        metrics,
        {
            defaults: template.textStyleDefaults,
            color: getAppearanceColor(appearance, 'textPrimary', '#000000'),
        }
    );
    ctx.restore();
}
