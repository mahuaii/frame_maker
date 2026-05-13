import { createTemplateRegistry } from './registry.ts';
import type { FrameTemplate } from '../../../src/types/template';

type ImportedFrameTemplate = FrameTemplate & {
    originalId?: string;
    releaseAssets?: () => void;
};

function splitTemplateId(id: string) {
    const importedSuffixMatch = String(id).match(/^(.*)--imported-\d+$/);
    return importedSuffixMatch ? importedSuffixMatch[1] : String(id);
}

function createUniqueTemplateId(id: string, usedIds: Set<string>) {
    if (!usedIds.has(id)) {
        return id;
    }

    const baseId = splitTemplateId(id);
    let index = 1;
    let nextId = `${baseId}--imported-${index}`;

    while (usedIds.has(nextId)) {
        index += 1;
        nextId = `${baseId}--imported-${index}`;
    }

    return nextId;
}

function cloneTemplateWithId(template: ImportedFrameTemplate, id: string): ImportedFrameTemplate {
    return Object.freeze({
        ...template,
        id,
        originalId: template.originalId ?? template.id,
    });
}

export function createImportedTemplateRegistry(builtinTemplates: ImportedFrameTemplate[] = []) {
    const importedTemplates: ImportedFrameTemplate[] = [];

    function getUsedIds() {
        return new Set([
            ...builtinTemplates.map((template) => template.id),
            ...importedTemplates.map((template) => template.id),
        ]);
    }

    function getTemplates() {
        return [
            ...builtinTemplates,
            ...importedTemplates,
        ];
    }

    return {
        addImportedTemplate(template) {
            const id = createUniqueTemplateId(template.id, getUsedIds());
            const importedTemplate = id === template.id ? template : cloneTemplateWithId(template, id);
            importedTemplates.push(importedTemplate);
            return importedTemplate;
        },
        removeImportedTemplate(id: string) {
            const index = importedTemplates.findIndex((template) => template.id === id);
            if (index >= 0) {
                const [template] = importedTemplates.splice(index, 1);
                if (typeof template.releaseAssets === 'function') {
                    template.releaseAssets();
                }
            }
        },
        clearImportedTemplates() {
            importedTemplates.splice(0).forEach((template) => {
                if (typeof template.releaseAssets === 'function') {
                    template.releaseAssets();
                }
            });
        },
        get templates() {
            return Object.freeze(getTemplates());
        },
        getTemplateById(id: string) {
            return getTemplates().find((template) => template.id === id);
        },
        createRegistry() {
            return createTemplateRegistry(getTemplates());
        },
    };
}
