const { defineConfig, devices } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const environmentFile = path.join(__dirname, ".env.e2e");
if (fs.existsSync(environmentFile)) {
  fs.readFileSync(environmentFile, "utf8")
    .split(/\r?\n/)
    .forEach((line) => {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!match || process.env[match[1]] !== undefined) return;
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
    });
}

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const usesLocalServer = /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?/i.test(baseURL);

module.exports = defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: usesLocalServer
    ? {
        command: "npm start",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      }
    : undefined,
});
