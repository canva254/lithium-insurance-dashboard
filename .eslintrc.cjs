module.exports = {
  root: true,
  extends: ['next/core-web-vitals', 'next/typescript', 'plugin:security/recommended'],
  plugins: ['security'],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'src/**/*'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
  },
};
