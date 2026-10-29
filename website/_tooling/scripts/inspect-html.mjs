import { HtmlValidate, Rule } from 'html-validate';

// Use the validator's public rule API so source validation and content inspection
// share a real HTML parser, rather than extracting nested cards with regexes.
export async function inspectHtml(contents, filename = 'index.html') {
    let root;
    class CaptureDocument extends Rule {
        setup() { this.on('dom:ready', event => { root = event.document.root; }); }
    }
    const validator = new HtmlValidate({
        extends: ['html-validate:recommended'],
        plugins: [{ name: 'website', rules: { 'website/document': CaptureDocument } }],
        rules: { 'website/document': 'error', 'prefer-native-element': 'off',
            'attr-quotes': 'off', 'void-style': 'off', 'doctype-style': 'off' }
    });
    const result = await validator.validateString(contents, filename);
    return { root, errors: result.results.flatMap(file => file.messages.map(message =>
        `${filename}:${message.line}:${message.column} ${message.ruleId}: ${message.message}`)) };
}

export const attribute = (node, name) => node?.getAttribute(name)?.value ?? null;

export function validateCardReferences(root, catalogue) {
    const errors = [];
    const cards = root.querySelectorAll('.demo-carousel__slide');
    const tabs = root.querySelectorAll('.demo-carousel__dot');
    const expected = catalogue.examples.map(example => example.id);
    const ids = nodes => nodes.map(node => attribute(node, 'data-example-id'));
    for (const [label, nodes] of [['cards', cards], ['tabs', tabs]]) {
        const actual = ids(nodes);
        if (!actual.length || new Set(actual).size !== actual.length
            || [...actual].sort().join('\n') !== [...expected].sort().join('\n')) {
            errors.push(`index.html: demo ${label} must contain each catalogue ID exactly once`);
        }
    }
    if (ids(cards).join('\n') !== ids(tabs).join('\n')) {
        errors.push('index.html: card and tab order must agree (catalogue order is independent)');
    }
    for (const card of cards) {
        const id = attribute(card, 'data-example-id');
        const downloads = card.querySelectorAll('[data-example-download]');
        const frames = card.querySelectorAll('iframe');
        const tab = tabs.find(node => attribute(node, 'data-example-id') === id);
        if (downloads.length !== 1 || attribute(downloads[0], 'data-example-download') !== id) {
            errors.push(`index.html [${id}]: download must reference the card's example ID`);
        }
        const playerUrl = attribute(frames[0], 'data-src') ?? attribute(frames[0], 'src');
        const url = new URL(playerUrl ?? '', 'https://ograf.ebu.io/');
        if (frames.length !== 1 || url.origin !== 'https://ograf.ebu.io'
            || url.pathname !== '/website/demo-player/index.html' || url.searchParams.get('example') !== id) {
            errors.push(`index.html [${id}]: player must reference the card's example ID`);
        }
        if (!tab || attribute(tab, 'aria-controls') !== attribute(card, 'id')
            || attribute(card, 'aria-labelledby') !== attribute(tab, 'id')) {
            errors.push(`index.html [${id}]: tab and card ARIA references do not agree`);
        }
    }
    return errors;
}
