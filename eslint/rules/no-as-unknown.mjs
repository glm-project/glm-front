export const noAsUnknown = {
  meta: {
    type: 'problem',
    docs: {
      description: 'forbid type assertions to unknown',
    },
    schema: [],
    messages: {
      forbidden: 'Type assertions to unknown bypass type safety: model the domain or narrow the type explicitly.',
    },
  },
  create: context => ({
    ':matches(TSAsExpression, TSTypeAssertion) > TSUnknownKeyword': node => {
      context.report({
        node,
        messageId: 'forbidden',
      });
    },
  }),
};
