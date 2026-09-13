import { contains, isFunction, isTestCallee, rootIdentifier, scenarioOf } from './scenario.mjs';

const TECHNICAL_ROOT = /^(TestBed|vi|cy|fixture|http|httpClient|stockage|storage|serveur|server|dataSelector)$/i;

const isTechnicalCall = node => node.type === 'CallExpression' && TECHNICAL_ROOT.test(rootIdentifier(node) ?? '');

const isDomQuery = node =>
  node.type === 'MemberExpression'
  && ['querySelector', 'querySelectorAll', 'getAttribute', 'getBoundingClientRect', 'textContent', 'innerHTML', 'nativeElement'].includes(
    memberName(node),
  );

const isTechnicalDetail = node => isTechnicalCall(node) || isDomQuery(node);

const hasTechnicalDetail = node =>
  contains(node, isTechnicalDetail)
  || contains(
    node,
    current =>
      current.type === 'CallExpression' && current.arguments.some(argument => isFunction(argument) && hasTechnicalDetail(argument.body)),
  );

const reportScenarioExpression = (context, expression) => {
  if (hasTechnicalDetail(expression)) {
    context.report({ node: expression, messageId: 'technicalDetail' });
    return;
  }
};

const reportScenarioStatement = (context, statement) => {
  const technicalDetail = hasTechnicalDetail(statement);
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

const functionName = node => node.id?.name ?? node.parent?.id?.name;

const isInsideThenHelper = (context, node) =>
  context.sourceCode.getAncestors(node).some(ancestor => isFunction(ancestor) && /^then[A-Z]/.test(functionName(ancestor) ?? ''));

const GESTURES = new Set([
  'focus',
  'blur',
  'click',
  'dispatchEvent',
  'navigateByUrl',
  'navigate',
  'visit',
  'type',
  'trigger',
  'scrollTo',
  'scrollIntoView',
  'tick',
  'setSystemTime',
  'advanceTimersByTime',
  'advanceTimersByTimeAsync',
  'runAllTimers',
]);

const memberName = node => (node.computed ? node.property.value : node.property.name);

const isGesture = node => {
  if (node.callee.type === 'Identifier') return /^(given|when)[A-Z]/.test(node.callee.name);
  if (node.callee.type !== 'MemberExpression') return false;
  const method = memberName(node.callee);
  return GESTURES.has(method) || (method === 'invoke' && GESTURES.has(node.arguments[0]?.value));
};

const isDeferredAssertion = (context, node) =>
  context.sourceCode.getAncestors(node).some(ancestor => isFunction(ancestor) && rootIdentifier(ancestor.parent) === 'expect');

const isActionInThen = (context, node) => isGesture(node) && isInsideThenHelper(context, node) && !isDeferredAssertion(context, node);

export const givenWhenThen = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Keep technical test plumbing outside concise scenarios' },
    schema: [],
    messages: {
      actionInThen: 'Move this action into a given or when helper; a then helper only observes.',
      technicalDetail: 'Hide technical test details behind a givenXxx, whenXxx, or thenXxx helper.',
    },
  },
  create: context => ({
    CallExpression: node => {
      if (isActionInThen(context, node)) {
        context.report({ node, messageId: 'actionInThen' });
      }
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
