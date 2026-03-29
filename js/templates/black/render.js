import { renderCenteredTextRuns } from '../../text-runs.js';
import { buildInfoTextRuns } from '../shared.js';

export function renderBlackTemplate(ctx, args) {
    const { area, data, metrics, template } = args;

    ctx.save();
    renderCenteredTextRuns(
        ctx,
        area,
        buildInfoTextRuns(data, template.textStyleDefaults),
        metrics,
        {
            defaults: template.textStyleDefaults,
            color: '#FFFFFF',
        }
    );
    ctx.restore();
}
