export const isFunction = node =>
  node?.type === 'ArrowFunctionExpression' || node?.type === 'FunctionExpression' || node?.type === 'FunctionDeclaration';

const isWrappedExpression = node =>
  node.type === 'AwaitExpression' || node.type === 'TSAsExpression' || node.type === 'TSNonNullExpression';

export const rootIdentifier = node => {
  if (!node) return undefined;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'ChainExpression') return rootIdentifier(node.expression);
  if (node.type === 'CallExpression') return rootIdentifier(node.callee);
  if (node.type === 'MemberExpression') return rootIdentifier(node.object);
  if (isWrappedExpression(node)) {
    return rootIdentifier(node.expression ?? node.argument);
  }
  return undefined;
};

const isNonTraversable = node => !node || typeof node !== 'object';

const firstIn = (values, predicate) => {
  for (const value of values) {
    const found = findFirst(value, predicate);
    if (found) return found;
  }
  return undefined;
};

export const findFirst = (node, predicate) => {
  if (isNonTraversable(node)) return undefined;
  if (predicate(node)) return node;
  if (isFunction(node)) return undefined;
  return firstIn(
    Object.entries(node)
      .filter(([key]) => key !== 'parent')
      .flatMap(([, value]) => (Array.isArray(value) ? value : [value])),
    predicate,
  );
};

export const contains = (node, predicate) => findFirst(node, predicate) !== undefined;

export const isTestCallee = node => {
  if (node.type === 'Identifier') return node.name === 'it' || node.name === 'test';
  if (node.type === 'MemberExpression') return isTestCallee(node.object);
  if (node.type === 'CallExpression') return isTestCallee(node.callee);
  return false;
};

export const scenarioOf = node => [...node.arguments].reverse().find(isFunction);
