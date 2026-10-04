import less from 'less';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';

/** Shared screen styles are scoped to the app namespace; map styles keep their explicit global selectors. */
export async function compileUiStyles(source, filename) {
    const result = await less.render(source, { filename, math: 'always' });
    const css = postcss.parse(result.css);
    css.walkRules(rule => {
        if (rule.parent.type === 'atrule' && /keyframes$/.test(rule.parent.name)) return;
        rule.selector = selectorParser(selectors => {
            selectors.each(selector => {
                let compound = [];
                const scope = () => {
                    const local = compound.find(node => !(node.type === 'pseudo' && node.value === ':global'));
                    if (local) {selector.insertAfter(local, selectorParser.attribute({ attribute: 'data-spotlog' }));}
                    compound = [];
                };
                [...selector.nodes].forEach(node => {
                    if (node.type === 'combinator') {scope();} else {compound.push(node);}
                });
                scope();
                selector.walkPseudos(pseudo => {
                    if (pseudo.value === ':global') {pseudo.replaceWith(...pseudo.nodes[0].nodes.map(node => node.clone()));}
                });
            });
        }).processSync(rule.selector);
    });
    return css.toString();
}

export function uiStylesPlugin() {
    return {
        name: 'spotlog-ui-styles',
        async transform(source, id) {
            if (!id.endsWith('/ui/application.less')) return null;
            return { code: 'export default ' + JSON.stringify(await compileUiStyles(source, id)) + ';', map: null };
        },
    };
}
