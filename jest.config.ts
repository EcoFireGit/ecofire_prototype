// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './', // This is the path to your Next.js app
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'], // File to run before each test
  moduleNameMapper: {
    // Handle CSS imports (especially CSS modules)
    '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',

    // Handle image/static asset imports
    '^.+\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  testEnvironment: 'jest-environment-jsdom', // Simulate a browser for React testing
};

module.exports = createJestConfig(customJestConfig);
