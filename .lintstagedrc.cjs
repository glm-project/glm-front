module.exports = {
  '*.{ts,html,js,mjs,cjs}': ['eslint --fix', 'prettier --write'],
  '*.{md,json*,yml,yaml,css,scss,java,xml,feature}': ['prettier --write'],
};
