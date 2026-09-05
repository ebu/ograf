import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const TOOLING_ROOT = resolve(SCRIPT_DIRECTORY, '..');
const NODE_MODULES = resolve(TOOLING_ROOT, 'node_modules');

const ICON_SOURCES = {
    'arrow-right': 'arrow-right',
    'arrow-up-down': 'arrow-up-down',
    banknote: 'banknote',
    'book-open': 'book-open',
    check: 'check',
    'chevron-left': 'chevron-left',
    'chevron-right': 'chevron-right',
    'circle-check': 'circle-check',
    'code-2': 'code-xml',
    database: 'database',
    download: 'download',
    'file-text': 'file-text',
    globe: 'globe',
    'link-2-off': 'link-2-off',
    palette: 'palette',
    'pen-tool': 'pen-tool',
    pencil: 'pencil',
    play: 'play',
    rocket: 'rocket',
    'sliders-horizontal': 'sliders-horizontal',
    square: 'square',
    star: 'star',
    'test-tube-2': 'test-tube-diagonal',
    tv: 'tv',
    users: 'users',
    wrench: 'wrench',
    x: 'x'
};

async function loadIconNodes() {
    const entries = await Promise.all(
        Object.entries(ICON_SOURCES).map(async ([name, source]) => {
            const modulePath = resolve(
                NODE_MODULES,
                `lucide/dist/esm/icons/${source}.mjs`
            );
            const iconModule = await import(pathToFileURL(modulePath).href);

            return [name, iconModule.default];
        })
    );

    return Object.fromEntries(entries);
}

function createRuntimeSource(iconNodes) {
    return `/* @license Lucide v1.39.0 - ISC. Custom OGraf website icon subset. */
(function () {
    const ICONS = ${JSON.stringify(iconNodes)};
    const DEFAULT_ATTRIBUTES = {
        xmlns: 'http://www.w3.org/2000/svg',
        width: 24,
        height: 24,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': 2,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round'
    };

    function createSvgElement([tag, attributes, children = []]) {
        const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
        Object.entries(attributes).forEach(([name, value]) => {
            element.setAttribute(name, String(value));
        });
        children.forEach(child => element.append(createSvgElement(child)));

        return element;
    }

    function hasAccessibleName(attributes) {
        return ['aria-label', 'aria-labelledby', 'title', 'role']
            .some(name => Object.hasOwn(attributes, name));
    }

    function createIcons({ attrs = {} } = {}) {
        document.querySelectorAll('[data-lucide]').forEach(placeholder => {
            const iconName = placeholder.getAttribute('data-lucide');
            const iconNode = ICONS[iconName];
            if (!iconNode) {
                console.warn(\`Lucide icon not included: \${iconName}\`);
                return;
            }

            const placeholderAttributes = Object.fromEntries(
                [...placeholder.attributes].map(attribute => [attribute.name, attribute.value])
            );
            const iconAttributes = {
                ...DEFAULT_ATTRIBUTES,
                'data-lucide': iconName,
                ...attrs,
                ...placeholderAttributes
            };
            if (!hasAccessibleName(iconAttributes)) iconAttributes['aria-hidden'] = 'true';

            const classes = [
                'lucide',
                \`lucide-\${iconName}\`,
                placeholderAttributes.class
            ].filter(Boolean).join(' ');
            iconAttributes.class = [...new Set(classes.split(/\\s+/))].join(' ');

            const svg = createSvgElement(['svg', iconAttributes, iconNode]);
            placeholder.replaceWith(svg);
        });
    }

    window.lucide = { createIcons };
})();
`;
}

export async function createLucideBundle(destinationPath) {
    const iconNodes = await loadIconNodes();
    await writeFile(destinationPath, createRuntimeSource(iconNodes), 'utf8');
}
