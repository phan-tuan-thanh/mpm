const { createCjsPreset } = require('jest-preset-angular/presets');

const presetConfig = createCjsPreset();

/** @type {import('jest').Config} */
module.exports = {
  ...presetConfig,
  testEnvironment: 'jsdom',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/setup-jest.ts'],
  moduleNameMapper: {
    '@mpm/shared-types': '<rootDir>/../../libs/shared-types/src/index.ts',
    '^lowlight$': '<rootDir>/src/app/testing/lowlight-mock.ts',
  },
};
