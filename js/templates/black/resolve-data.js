import { pickTextFieldValues } from '../shared.js';
import { blackTemplateFields } from './schema.js';

export function resolveBlackTemplateData(input) {
    void input.exif;
    return pickTextFieldValues(input.customText, blackTemplateFields.map((field) => field.key));
}
