import { pickTextFieldValues } from '../shared.js';
import { whiteTemplateFields } from './schema.js';

export function resolveWhiteTemplateData(input) {
    void input.exif;
    return pickTextFieldValues(input.customText, whiteTemplateFields.map((field) => field.key));
}
