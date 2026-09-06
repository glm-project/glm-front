const MIN_INJECTED_COLLABORATORS = 4;
const MIN_PUBLIC_OPERATIONS = 6;
const MIN_OWNED_STATES = 3;

const containsCallNamed = (node, name) => {
  if (!node || typeof node !== 'object') return false;
  if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === name) return true;
  return Object.entries(node)
    .filter(([key]) => key !== 'parent')
    .some(([, value]) => (Array.isArray(value) ? value.some(child => containsCallNamed(child, name)) : containsCallNamed(value, name)));
};

const isInjectedCollaborator = member =>
  member.type === 'PropertyDefinition' && !member.static && containsCallNamed(member.value, 'inject');

const isOwnedState = member => {
  if (member.type !== 'PropertyDefinition' || member.static || isInjectedCollaborator(member)) return false;
  return !member.readonly || containsCallNamed(member.value, 'signal');
};

const isPublicOperation = member =>
  member.type === 'MethodDefinition'
  && member.kind === 'method'
  && !member.static
  && member.accessibility !== 'private'
  && member.accessibility !== 'protected';

const className = node => node.id?.name ?? 'anonymous class';

export const responsibilityCohesion = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'stop overloaded stateful coordinators for responsibility review',
    },
    schema: [],
    messages: {
      splitResponsibilities:
        '{{className}} coordinates {{collaborators}} injected collaborators through {{operations}} public operations while owning {{states}} state fields. Inventory its reasons to change and extract an independently cohesive responsibility. If it remains one deep module, document that reason in a narrow inline suppression — see ADR 0023.',
    },
  },
  create: context => {
    const checkClass = node => {
      const members = node.body.body;
      const collaborators = members.filter(isInjectedCollaborator).length;
      const operations = members.filter(isPublicOperation).length;
      const states = members.filter(isOwnedState).length;
      if (collaborators < MIN_INJECTED_COLLABORATORS || operations < MIN_PUBLIC_OPERATIONS || states < MIN_OWNED_STATES) {
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
