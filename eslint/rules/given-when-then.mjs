const TECHNICAL_ROOT = /^(TestBed|vi|cy|fixture|http|httpClient|stockage|storage|serveur|server)$/i;

const isFunction = node =>
  node?.type === 'ArrowFunctionExpression' || node?.type === 'FunctionExpression' || node?.type === 'FunctionDeclaration';

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

const contains = (node, predicate) => {
  if (!node || typeof node !== 'object') return false;
  if (predicate(node)) return true;
  if (isFunction(node)) return false;
  return Object.entries(node)
    .filter(([key]) => key !== 'parent')
    .some(([, value]) => (Array.isArray(value) ? value.some(child => contains(child, predicate)) : contains(value, predicate)));
};

const isTechnicalCall = node => node.type === 'CallExpression' && TECHNICAL_ROOT.test(rootIdentifier(node) ?? '');

const reportScenarioExpression = (context, expression) => {
  if (contains(expression, isTechnicalCall)) {
    context.report({ node: expression, messageId: 'technicalDetail' });
    return;
  }
};

const isTestCallee = node => {
  if (node.type === 'Identifier') return node.name === 'it' || node.name === 'test';
  if (node.type === 'MemberExpression') return isTestCallee(node.object);
  if (node.type === 'CallExpression') return isTestCallee(node.callee);
  return false;
};

const reportScenarioStatement = (context, statement) => {
  const technicalDetail = contains(statement, isTechnicalCall);
  if (technicalDetail) {
    context.report({ node: technicalDetail === true ? statement : technicalDetail, messageId: 'technicalDetail' });
    return;
  }

  if (statement.type === 'VariableDeclaration') return;

  if (statement.type === 'EmptyStatement') return;

  const expression =
    statement.type === 'ExpressionStatement' || statement.type === 'ReturnStatement'
      ? (statement.expression ?? statement.argument)
      : undefined;
  if (expression) {
    reportScenarioExpression(context, expression);
    return;
  }
};

export const givenWhenThen = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Keep technical test plumbing outside concise scenarios' },
    schema: [],
    messages: {
      technicalDetail: 'Hide technical test details behind a givenXxx, whenXxx, or thenXxx helper.',
    },
  },
  create: context => ({
    CallExpression: node => {
      if (!isTestCallee(node.callee)) return;
      const scenario = [...node.arguments].reverse().find(isFunction);
      if (!scenario) return;
      if (scenario.body.type === 'BlockStatement') {
        scenario.body.body.forEach(statement => reportScenarioStatement(context, statement));
        return;
      }
      reportScenarioExpression(context, scenario.body);
    },
  }),
};
