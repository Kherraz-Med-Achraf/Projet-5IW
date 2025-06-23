module.exports = {
  displayName: 'Blog Feature Tests',
  testMatch: ['<rootDir>/src/blog/**/*.spec.ts', '<rootDir>/test/blog.e2e-spec.ts'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/blog/**/*.(t|j)s',
    '!src/blog/**/*.spec.ts',
    '!src/blog/**/*.interface.ts',
    '!src/blog/**/*.dto.ts',
  ],
  coverageDirectory: './coverage/blog',
  testEnvironment: 'node',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/blog/blog.service.ts': {
      branches: 95,
      functions: 100,
      lines: 95,
      statements: 95,
    },
    './src/blog/blog.controller.ts': {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
}; 