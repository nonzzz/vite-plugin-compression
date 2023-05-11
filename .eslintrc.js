module.exports = {
  'env': {
    browser: true,
    es6: true,
    node: true,
  },
  'root':true,
  'extends': ['kagura'],
  'overrides': [
    {
      'files': ['*.ts'],
      'parser': '@typescript-eslint/parser',
      'plugins': ['@typescript-eslint'],
      'extends': ['eslint:recommended', 'plugin:@typescript-eslint/recommended','kagura'],
      'rules': {
        '@typescript-eslint/no-explicit-any': 0,
      },
    },
  ],
};
