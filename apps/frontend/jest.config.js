const { createCjsPreset } = require('jest-preset-angular/presets');

const presetConfig = createCjsPreset();

/** @type {import('jest').Config} */
module.exports = {
  ...presetConfig,
  testEnvironment: 'jsdom',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  moduleNameMapper: {
    '@mpm/shared-types': '<rootDir>/../../libs/shared-types/src/index.ts',
  },
};
