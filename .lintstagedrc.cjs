module.exports = {
  '*.{ts,html,css,js,mjs,cjs}': ['eslint --fix', 'prettier --write'],
  '*.{md,json*,yml,yaml,scss,java,xml,feature}': ['prettier --write'],
};
