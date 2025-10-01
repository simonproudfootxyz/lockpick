#!/usr/bin/env node

// Simple test runner for server tests
const { execSync } = require("child_process");
const path = require("path");

console.log("🧪 Running Server Tests...\n");

try {
  // Run Jest with the server tests
  const jestPath = path.join(__dirname, "node_modules", ".bin", "jest");
  const testPattern = "server/__tests__/**/*.test.js";

  execSync(`${jestPath} ${testPattern} --config jest.config.js --verbose`, {
    stdio: "inherit",
    cwd: __dirname,
  });

  console.log("\n✅ All server tests passed!");
} catch (error) {
  console.error("\n❌ Tests failed:", error.message);
  process.exit(1);
}




