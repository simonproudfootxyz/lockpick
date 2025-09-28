#!/usr/bin/env node

// Simple test runner that doesn't use Jest configuration
const { execSync } = require("child_process");
const path = require("path");

console.log("🧪 Running Basic Tests...\n");

try {
  // Run Jest with minimal configuration
  const jestPath = path.join(__dirname, "node_modules", ".bin", "jest");

  execSync(
    `${jestPath} server/__tests__/basic.test.js --config jest.minimal.config.js --verbose`,
    {
      stdio: "inherit",
      cwd: __dirname,
    }
  );

  console.log("\n✅ Basic tests passed!");
} catch (error) {
  console.error("\n❌ Tests failed:", error.message);
  process.exit(1);
}

