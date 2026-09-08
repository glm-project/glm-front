const NESTED_SCOPES = new Set(['ArrowFunctionExpression', 'FunctionExpression', 'ClassExpression']);

const isBooleanCombination = node => node.type === 'LogicalExpression' && (node.operator === '&&' || node.operator === '||');

const isTraversalBoundary = node => !node || NESTED_SCOPES.has(node.type);

const countBooleanCombinations = (node, visitorKeys) => {
  if (isTraversalBoundary(node)) return 0;
  const ownCount = isBooleanCombination(node) ? 1 : 0;
  return (visitorKeys[node.type] ?? []).reduce((count, key) => {
    const children = Array.isArray(node[key]) ? node[key] : [node[key]];
    return count + children.reduce((total, child) => total + countBooleanCombinations(child, visitorKeys), 0);
  }, ownCount);
};

export const maxIfCriteria = {
  meta: {
    type: 'suggestion',
    docs: { description: 'require a named predicate for if conditions combining criteria with && or ||' },
    schema: [],
    messages: {
      extractPredicate:
        'This if condition combines criteria with && or ||. Extract an explicitly named predicate: business rules belong to their Value Object, aggregate or policy; technical conditions stay near their caller. Preserve behavior and evaluation order — see documentation/code-style.md.',
    },
  },
  create: context => ({
    IfStatement: node => {
      if (countBooleanCombinations(node.test, context.sourceCode.visitorKeys) === 0) return;
      context.report({ node: node.test, messageId: 'extractPredicate' });
    },
  }),
};
