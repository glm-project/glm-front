module.exports = {
  '{src/**/,}*.{ts,html}': ['eslint --fix', 'prettier --write'],
  '*.{md,json*,yml,yaml,css,scss,java,xml,feature}': ['prettier --write'],
};
