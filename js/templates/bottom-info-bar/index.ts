import { defineTemplatePackage } from '../../core/templates/data-template.ts';
import templatePackage from './template.json' with { type: 'json' };

const bottomInfoBarTemplate = defineTemplatePackage(templatePackage, {
    sourceType: 'builtin',
    assets: {
        'assets/thumbnail.jpg': new URL('./assets/thumbnail.jpg', import.meta.url).toString(),
    },
});

export default bottomInfoBarTemplate;
