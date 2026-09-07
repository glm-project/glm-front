const isEslintDisableDirective = comment => /^\s*eslint-(?:disable(?:-next-line|-line)?|enable)\b/.test(comment.value);

export const noEslintDisable = {
  meta: {
    type: 'problem',
    docs: {
      description: 'forbid disabling eslint rules via comments',
    },
    schema: [],
    messages: {
      forbidden: 'Interdit de désactiver des règles eslint via des commentaires.',
    },
  },
  create: context => ({
    Program: () => {
      const comments = context.sourceCode.getAllComments();
      for (const comment of comments) {
        if (isEslintDisableDirective(comment)) {
          context.report({
            loc: comment.loc,
            messageId: 'forbidden',
          });
        }
      }
    },
  }),
};
