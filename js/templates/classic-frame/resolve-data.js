import { pickTextFieldValues } from '../shared.js';
import { classicFrameTemplateFields } from './schema.js';

export function resolveClassicFrameTemplateData(input) {
    void input.exif;
    return pickTextFieldValues(
        input.customText,
        classicFrameTemplateFields
            .filter((field) => field.key !== 'colorScheme')
            .map((field) => field.key)
    );
}
