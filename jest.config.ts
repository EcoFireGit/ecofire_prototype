// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './', // This is the path to your Next.js app
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    // Handle CSS imports (especially CSS modules)
    '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
    
    // Handle image/static asset imports
    '^.+\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
    
    // Add this line to handle the @ alias - no src folder
    '^@/(.*)$': '<rootDir>/$1',
  },
  testEnvironment: 'jsdom',
  transformIgnorePatterns: [
    'node_modules/(?!(lucide-react)/)',
  ],
};

module.exports = createJestConfig(customJestConfig);