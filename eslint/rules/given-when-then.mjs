const SCENARIO_HELPER = /^(given|when|then)[A-Z]/;
const THEN_HELPER = /^then[A-Z]/;
const DATA_FACTORY = /^(build|create)[A-Z]|Fixture$/;
const TECHNICAL_ROOT = /^(TestBed|vi|cy|fixture|http|httpClient|stockage|storage|serveur|server)$/i;

const isFunction = node =>
  node?.type === 'ArrowFunctionExpression' || node?.type === 'FunctionExpression' || node?.type === 'FunctionDeclaration';

const functionName = node => {
  if (node.type === 'FunctionDeclaration') return node.id?.name;
  if (node.parent?.type === 'VariableDeclarator' && node.parent.id.type === 'Identifier') return node.parent.id.name;
  if (node.parent?.type === 'Property' && !node.parent.computed && node.parent.key.type === 'Identifier') return node.parent.key.name;
  return undefined;
};

const rootIdentifier = node => {
  if (!node) return undefined;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'ChainExpression') return rootIdentifier(node.expression);
  if (node.type === 'CallExpression') return rootIdentifier(node.callee);
  if (node.type === 'MemberExpression') return rootIdentifier(node.object);
  if (node.type === 'AwaitExpression' || node.type === 'TSAsExpression' || node.type === 'TSNonNullExpression') {
    return rootIdentifier(node.expression ?? node.argument);
  }
  return undefined;
};

const calledHelperName = node => {
  const expression = node?.type === 'AwaitExpression' ? node.argument : node;
  return expression?.type === 'CallExpression' && expression.callee.type === 'Identifier' ? expression.callee.name : undefined;
};

const contains = (node, predicate) => {
  if (!node || typeof node !== 'object') return false;
  if (predicate(node)) return true;
  if (isFunction(node)) return false;
  return Object.entries(node)
    .filter(([key]) => key !== 'parent')
    .some(([, value]) => (Array.isArray(value) ? value.some(child => contains(child, predicate)) : contains(value, predicate)));
};

const isAssertion = node =>
  node.type === 'CallExpression'
  && ((node.callee.type === 'Identifier' && ['expect', 'assert', 'expectTypeOf'].includes(node.callee.name))
    || (node.callee.type === 'MemberExpression'
      && !node.callee.computed
      && node.callee.property.type === 'Identifier'
      && node.callee.property.name === 'should'));

const isTechnicalCall = node => node.type === 'CallExpression' && TECHNICAL_ROOT.test(rootIdentifier(node) ?? '');

const unwrappedExpression = node => (node?.type === 'AwaitExpression' ? node.argument : node);

const isUnlabelledDeclarationCall = node => {
  const expression = unwrappedExpression(node);
  if (expression?.type !== 'CallExpression') return false;
  if (expression.callee.type !== 'Identifier') return true;
  return !SCENARIO_HELPER.test(expression.callee.name) && !DATA_FACTORY.test(expression.callee.name);
};

const isTestCallee = node => {
  if (node.type === 'Identifier') return node.name === 'it' || node.name === 'test';
  if (node.type === 'MemberExpression') return isTestCallee(node.object);
  if (node.type === 'CallExpression') return isTestCallee(node.callee);
  return false;
};

const isInsideThenHelper = (sourceCode, node) =>
  sourceCode
    .getAncestors(node)
    .reverse()
    .filter(isFunction)
    .some(ancestor => THEN_HELPER.test(functionName(ancestor) ?? ''));

const reportScenarioStatement = (context, statement) => {
  const technicalDetail = contains(statement, isTechnicalCall);
  if (technicalDetail) {
    context.report({ node: technicalDetail === true ? statement : technicalDetail, messageId: 'technicalDetail' });
    return;
  }

  if (contains(statement, isAssertion)) return;

  if (statement.type === 'VariableDeclaration') {
    if (statement.declarations.some(declaration => isUnlabelledDeclarationCall(declaration.init))) {
      context.report({ node: statement, messageId: 'unnamedScenarioStep' });
    }
    return;
  }

  if (statement.type === 'EmptyStatement') return;

  const expression =
    statement.type === 'ExpressionStatement' || statement.type === 'ReturnStatement'
      ? (statement.expression ?? statement.argument)
      : undefined;
  if (SCENARIO_HELPER.test(calledHelperName(expression) ?? '')) return;

  context.report({ node: statement, messageId: 'unnamedScenarioStep' });
};

export const givenWhenThen = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Keep test scenarios in given-when-then helpers' },
    schema: [],
    messages: {
      assertionOutsideThen: 'Assertions belong in a helper named thenXxx.',
      technicalDetail: 'Hide technical test details behind a givenXxx, whenXxx, or thenXxx helper.',
      unnamedScenarioStep: 'Name every scenario step givenXxx, whenXxx, or thenXxx.',
    },
  },
  create: context => ({
    CallExpression: node => {
      if (isAssertion(node) && !isInsideThenHelper(context.sourceCode, node)) {
        context.report({ node, messageId: 'assertionOutsideThen' });
      }

      if (!isTestCallee(node.callee)) return;
      const scenario = [...node.arguments].reverse().find(isFunction);
      if (scenario?.body.type !== 'BlockStatement') return;
      scenario.body.body.forEach(statement => reportScenarioStatement(context, statement));
    },
  }),
};
