import { buildDefaultConfig } from '../../core/templates/fields.js';
import { defaultSizing, defaultTextStyleDefaults, infoFieldDefinitions } from '../shared.js';

export const whiteTemplateFields = infoFieldDefinitions;

export const whiteTemplateSchema = {
    id: 'white',
    label: '白底相框',
    backgroundColor: '#FFFFFF',
    ...defaultSizing,
    defaultConfig: buildDefaultConfig(whiteTemplateFields),
    fields: whiteTemplateFields,
    textStyleDefaults: {
        ...defaultTextStyleDefaults,
    },
};
