import { renderCenteredTextRuns } from '../../text-runs.js';
import { buildInfoTextRuns } from '../shared.js';

export function renderWhiteTemplate(ctx, args) {
    const { area, data, metrics, template } = args;

    ctx.save();
    renderCenteredTextRuns(
        ctx,
        area,
        buildInfoTextRuns(data, template.textStyleDefaults),
        metrics,
        {
            defaults: template.textStyleDefaults,
            color: '#000000',
        }
    );
    ctx.restore();
}
