import type { InspectorField } from './inspector';

export type InspectorFieldRow = {
    id?: string;
    type: 'single' | 'double';
    title?: string;
    fields: InspectorField[];
};
