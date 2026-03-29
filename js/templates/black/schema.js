import { buildDefaultConfig } from '../../core/templates/fields.js';
import { defaultSizing, defaultTextStyleDefaults, infoFieldDefinitions } from '../shared.js';

export const blackTemplateFields = infoFieldDefinitions;

export const blackTemplateSchema = {
    id: 'black',
    label: '黑底相框',
    backgroundColor: '#000000',
    ...defaultSizing,
    defaultConfig: buildDefaultConfig(blackTemplateFields),
    fields: blackTemplateFields,
    textStyleDefaults: {
        ...defaultTextStyleDefaults,
    },
};
