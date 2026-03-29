import { defineTemplate } from '../core/templates/registry.js';
import { renderCenteredTextRuns } from '../text-runs.js';
import { buildDefaultConfig, pickTextFieldValues } from './helpers.js';
import { defaultSizing, defaultTextStyleDefaults, buildInfoTextRuns, infoFieldDefinitions } from './shared.js';

const fields = infoFieldDefinitions;

const blackTemplate = defineTemplate({
    id: 'black',
    label: '黑底相框',
    backgroundColor: '#000000',
    ...defaultSizing,
    defaultConfig: buildDefaultConfig(fields),
    fields,
    textStyleDefaults: {
        ...defaultTextStyleDefaults,
    },
    resolveData(input) {
        return pickTextFieldValues(input.customText, fields.map((field) => field.key));
    },
    render(ctx, args) {
        const { area, data, metrics } = args;

        ctx.save();
        renderCenteredTextRuns(
            ctx,
            area,
            buildInfoTextRuns(data, this.textStyleDefaults),
            metrics,
            {
                defaults: this.textStyleDefaults,
                color: '#FFFFFF',
            }
        );
        ctx.restore();
    }
});

export default blackTemplate;
