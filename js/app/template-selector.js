import { resolveTemplateAppearance } from '../core/templates/registry.js';
import {
    ASSET_VERSION,
    THUMBNAIL_MAX_HEIGHT,
    THUMBNAIL_MAX_WIDTH,
} from './constants.js';

export function createTemplateSelectorController({ dom, state, actions, templates, getTemplateById }) {
    function createThumbnailElement(template) {
        const thumbnailImg = document.createElement('img');
        thumbnailImg.className = 'template-thumbnail';
        thumbnailImg.alt = template.id;
        thumbnailImg.width = THUMBNAIL_MAX_WIDTH;
        thumbnailImg.height = THUMBNAIL_MAX_HEIGHT;
        const thumbnailSources = [
            `thumbnails/${template.id}_thumbnail.png?v=${ASSET_VERSION}`,
            `thumbnails/${template.id}_thumbnail.jpg?v=${ASSET_VERSION}`,
        ];
        let sourceIndex = 0;

        thumbnailImg.addEventListener('error', () => {
            sourceIndex += 1;
            if (sourceIndex < thumbnailSources.length) {
                thumbnailImg.src = thumbnailSources[sourceIndex];
                return;
            }

            const appearance = resolveTemplateAppearance(template, template.defaultConfig);
            const fallbackBackground = appearance.canvasBackground?.color
                ?? appearance.backgroundColor
                ?? template.backgroundColor;
            thumbnailImg.removeAttribute('src');
            thumbnailImg.style.background = fallbackBackground;
            thumbnailImg.style.width = `${THUMBNAIL_MAX_WIDTH}px`;
            thumbnailImg.style.height = `${THUMBNAIL_MAX_HEIGHT}px`;
        });
        thumbnailImg.src = thumbnailSources[sourceIndex];

        return thumbnailImg;
    }

    function updateSelectorSelection() {
        const { selectedTemplateId } = state.getCurrentSnapshot();

        dom.selectorList.querySelectorAll('.template-card').forEach((card) => {
            card.classList.toggle('selected', card.dataset.templateId === selectedTemplateId);
        });
    }

    function renderSelectorList() {
        const { selectedTemplateId } = state.getCurrentSnapshot();
        dom.selectorList.innerHTML = '';

        for (const template of templates) {
            const card = document.createElement('div');
            card.className = 'template-card' + (template.id === selectedTemplateId ? ' selected' : '');
            card.dataset.templateId = template.id;
            card.appendChild(createThumbnailElement(template));
            dom.selectorList.appendChild(card);
        }
    }

    async function handleTemplateSelect(templateId) {
        const { selectedTemplateId, fieldValues } = state.getCurrentSnapshot();

        if (templateId === selectedTemplateId) return;

        const previousTemplate = getTemplateById(selectedTemplateId);
        state.saveTemplateFieldValues(previousTemplate, fieldValues);
        state.setSelectedTemplateId(templateId);

        const template = getTemplateById(templateId);
        if (template) {
            state.setFieldValues(state.getTemplateFieldValues(template));
            state.setSelectedTextObjectId(state.getTemplateTextModel(template)[0]?.id ?? null);
        }
        state.saveActivePhotoState();

        updateSelectorSelection();
        actions.renderInspector();

        await actions.updatePreview();
    }

    function bindSelectorEvents() {
        dom.selectorList.addEventListener('click', (e) => {
            const card = e.target.closest('.template-card');
            if (!card || !dom.selectorList.contains(card)) {
                return;
            }

            handleTemplateSelect(card.dataset.templateId);
        });
    }

    return {
        renderSelectorList,
        updateSelectorSelection,
        bindSelectorEvents,
    };
}
