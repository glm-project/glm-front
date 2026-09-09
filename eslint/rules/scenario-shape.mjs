import { contains, findFirst, isTestCallee, rootIdentifier, scenarioOf } from './scenario.mjs';

const BRANCHES = new Set([
  'IfStatement',
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'WhileStatement',
  'DoWhileStatement',
  'SwitchStatement',
  'TryStatement',
]);

const isBranch = node => BRANCHES.has(node.type);

const isThenHelperCall = node => {
  if (node.callee.type !== 'Identifier') return false;
  return /^then[A-Z]/.test(node.callee.name);
};

const isAssertion = node => {
  if (node.type !== 'CallExpression') return false;
  if (rootIdentifier(node) === 'expect') return true;
  return isThenHelperCall(node);
};

const isCall = node => node.type === 'CallExpression';

const isActing = statement => {
  if (contains(statement, isAssertion)) return false;
  return contains(statement, isCall);
};

const reportBranch = (context, scenario) => {
  const branch = findFirst(scenario.body, isBranch);
  if (branch === undefined) return;
  context.report({ node: branch, messageId: 'branchInScenario' });
};

const reportActionAfterAssertion = (context, statements) => {
  const asserted = statements.findIndex(statement => contains(statement, isAssertion));
  if (asserted === -1) return;
  const acting = statements.slice(asserted + 1).find(isActing);
  if (acting === undefined) return;
  context.report({ node: acting, messageId: 'actionAfterAssertion' });
};

export const scenarioShape = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Keep a scenario a straight given, when and then' },
    schema: [
      {
        type: 'object',
        properties: { order: { type: 'boolean' } },
        additionalProperties: false,
      },
    ],
    messages: {
      branchInScenario: 'A scenario tells one straight story: move this branch into a given, when or then helper that narrows or throws.',
      actionAfterAssertion: 'A scenario stops at its assertions: give this second act its own scenario.',
    },
  },
  create: context => ({
    CallExpression: node => {
      if (!isTestCallee(node.callee)) return;
      const scenario = scenarioOf(node);
      if (!scenario) return;
      if (scenario.body.type !== 'BlockStatement') return;
      reportBranch(context, scenario);
      if (context.options[0]?.order !== true) return;
      reportActionAfterAssertion(context, scenario.body.body);
    },
  }),
};
