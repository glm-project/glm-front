const MIN_INJECTED_COLLABORATORS = 4;
const MIN_PUBLIC_OPERATIONS = 6;
const MIN_OWNED_STATES = 3;

const isCallNamed = (node, name) => node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === name;

const isNonTraversable = node => !node || typeof node !== 'object';

const containsCallNamed = (node, name) => {
  if (isNonTraversable(node)) return false;
  if (isCallNamed(node, name)) return true;
  return Object.entries(node)
    .filter(([key]) => key !== 'parent')
    .some(([, value]) => (Array.isArray(value) ? value.some(child => containsCallNamed(child, name)) : containsCallNamed(value, name)));
};

const isInjectedCollaborator = member =>
  member.type === 'PropertyDefinition' && !member.static && containsCallNamed(member.value, 'inject');

const isExcludedStateMember = member => member.type !== 'PropertyDefinition' || member.static || isInjectedCollaborator(member);

const isOwnedState = member => {
  if (isExcludedStateMember(member)) return false;
  return !member.readonly || containsCallNamed(member.value, 'signal');
};

const isPublicOperation = member =>
  member.type === 'MethodDefinition'
  && member.kind === 'method'
  && !member.static
  && member.accessibility !== 'private'
  && member.accessibility !== 'protected';

const className = node => node.id?.name ?? 'anonymous class';

const isBelowCoordinatorTripwire = (collaborators, operations, states) =>
  collaborators < MIN_INJECTED_COLLABORATORS || operations < MIN_PUBLIC_OPERATIONS || states < MIN_OWNED_STATES;

export const responsibilityCohesion = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'stop overloaded stateful coordinators for responsibility review',
    },
    schema: [],
    messages: {
      splitResponsibilities:
        '{{className}} coordinates {{collaborators}} injected collaborators through {{operations}} public operations while owning {{states}} state fields. Inventory its reasons to change and extract an independently cohesive responsibility; no inline suppressions are permitted — see ADR 0023.',
    },
  },
  create: context => {
    const checkClass = node => {
      const members = node.body.body;
      const collaborators = members.filter(isInjectedCollaborator).length;
      const operations = members.filter(isPublicOperation).length;
      const states = members.filter(isOwnedState).length;
      if (isBelowCoordinatorTripwire(collaborators, operations, states)) {
        return;
      }
      context.report({
        node,
        messageId: 'splitResponsibilities',
        data: { className: className(node), collaborators, operations, states },
      });
    };

    return {
      'ClassDeclaration:exit': checkClass,
      'ClassExpression:exit': checkClass,
    };
  },
};
