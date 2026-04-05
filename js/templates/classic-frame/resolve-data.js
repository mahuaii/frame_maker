import { pickTextFieldValues } from '../shared.js';
import { classicFrameTemplateFields } from './schema.js';

const CLASSIC_FRAME_TEXT_FIELD_KEYS = classicFrameTemplateFields
    .filter((field) => field.key !== 'colorScheme')
    .map((field) => field.key);

export function resolveClassicFrameTemplateData(input) {
    void input.exif;
    return pickTextFieldValues(input.customText, CLASSIC_FRAME_TEXT_FIELD_KEYS);
}
