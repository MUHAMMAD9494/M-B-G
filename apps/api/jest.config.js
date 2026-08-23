/* eslint-disable @typescript-eslint/no-var-requires */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleNameMapper: {
    '^@nexora/types$': '<rootDir>/../../packages/types/src',
    '^@nexora/config$': '<rootDir>/../../packages/config/src',
    '^@nexora/utils$': '<rootDir>/../../packages/utils/src',
    '^@nexora/validation$': '<rootDir>/../../packages/validation/src',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.module.ts',
    '!src/main.ts',
    '!src/database/**',
    '!src/**/*.entity.ts',
  ],
  coverageDirectory: 'coverage',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
};
