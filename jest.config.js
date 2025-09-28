module.exports = {
  testEnvironment: "node",
  testMatch: ["**/server/__tests__/**/*.test.js"],
  collectCoverageFrom: [
    "server/**/*.js",
    "!server/__tests__/**",
    "!server/node_modules/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  testTimeout: 10000,
  // Don't use setupFilesAfterEnv for server tests to avoid React setup
  transform: {
    "^.+\\.js$": "babel-jest",
  },
  transformIgnorePatterns: ["node_modules/(?!(uuid)/)"],
};
