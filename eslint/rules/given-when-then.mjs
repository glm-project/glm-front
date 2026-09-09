import { contains, isTestCallee, rootIdentifier, scenarioOf } from './scenario.mjs';

const TECHNICAL_ROOT = /^(TestBed|vi|cy|fixture|http|httpClient|stockage|storage|serveur|server)$/i;

const isTechnicalCall = node => node.type === 'CallExpression' && TECHNICAL_ROOT.test(rootIdentifier(node) ?? '');

const reportScenarioExpression = (context, expression) => {
  if (contains(expression, isTechnicalCall)) {
    context.report({ node: expression, messageId: 'technicalDetail' });
    return;
  }
};

const reportScenarioStatement = (context, statement) => {
  const technicalDetail = contains(statement, isTechnicalCall);
  if (technicalDetail) {
    context.report({ node: statement, messageId: 'technicalDetail' });
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
      const scenario = scenarioOf(node);
      if (!scenario) return;
      if (scenario.body.type === 'BlockStatement') {
        scenario.body.body.forEach(statement => reportScenarioStatement(context, statement));
        return;
      }
      reportScenarioExpression(context, scenario.body);
    },
  }),
};
