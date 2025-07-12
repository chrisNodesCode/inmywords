module.exports = {
  // Use Next.js recommended rules + Core Web Vitals
  extends: ['next', 'next/core-web-vitals'],

  // Ignore your Prisma client output so ESLint won’t parse those huge CommonJS files
  ignorePatterns: ['src/generated/prisma/**'],

  // Optional: if you still see warnings in pages/api routes, enable both envs:
  env: {
    browser: true,
    node: true,
  },

  rules: {
    // You can suppress specific rules here if needed, e.g.:
    // 'no-unused-vars': 'warn',
  },
};