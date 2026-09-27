const reportEach = (context, comments) => {
  for (const comment of comments) {
    context.report({ loc: comment.loc, messageId: 'forbidden' });
  }
};

export const noComments = {
  meta: {
    type: 'problem',
    docs: {
      description: 'forbid comments in scripts, templates and stylesheets',
    },
    schema: [],
    messages: {
      forbidden: 'Comments are forbidden: carry the intent in names, tests and the owning documentation — see documentation/code-style.md.',
    },
  },
  create: context => ({
    Program: () => reportEach(context, context.sourceCode.getAllComments()),
    StyleSheet: () => reportEach(context, context.sourceCode.comments),
  }),
};
