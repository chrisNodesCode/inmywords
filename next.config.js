/* eslint-env node */
/* eslint-disable no-undef */
const withTM = require('next-transpile-modules')([
  'antd',
  '@ant-design/icons',
  '@ant-design/colors',
  '@ant-design/cssinjs',
  'rc-util',
  'rc-tree',
]);

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Prevent ESLint errors from failing `next build`
    ignoreDuringBuilds: true,
  },
};

module.exports = withTM(nextConfig);
