module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    // Enables the no-unsafe-* rules — these need type info, hence project: above.
    'plugin:@typescript-eslint/recommended-type-checked',
  ],
  env: { browser: true, es2021: true },
  ignorePatterns: ['main.js', 'node_modules/', '*.mjs', '*.config.ts', 'scripts/'],
  rules: {
    // `dateScope` is intentionally destructured out in normalizeFilters; allow rest siblings.
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
    // Obsidian lifecycle methods (onOpen/onClose) and VaultLike fakes are `async` to satisfy
    // a Promise-returning interface without actually awaiting — not a missing-await bug.
    '@typescript-eslint/require-await': 'off',
  },
};
