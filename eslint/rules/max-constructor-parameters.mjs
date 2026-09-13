const exceedsConstructorLimit = parameters => parameters.length > 3 || parameters.some(parameter => parameter.type === 'RestElement');

export const maxConstructorParameters = {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: { useNamedParameters: 'Constructors accept at most three parameters: use a named immutable parameter object.' },
  },
  create: context => ({
    'MethodDefinition[kind="constructor"]'(node) {
      if (exceedsConstructorLimit(node.value.params)) {
        context.report({ node, messageId: 'useNamedParameters' });
      }
    },
  }),
};
