/**
 * 単体テスト (*.spec.ts) 用の Jest 設定。
 * Service 層のビジネスロジックを、Repository(DB I/O) のみモックして検証する。
 */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json' }],
  },
  collectCoverageFrom: ['**/*.service.ts'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};
