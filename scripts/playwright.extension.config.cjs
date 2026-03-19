const path = require("path");

module.exports = {
  testDir: path.resolve(process.cwd(), "scripts"),
  testMatch: /extension-smoke\.spec\.cjs$/,
  fullyParallel: false,
  workers: 1,
  timeout: 180 * 1000,
  reporter: [
    ["line"],
    [
      "html",
      {
        outputFolder: path.resolve(
          process.cwd(),
          "output/playwright/extension-smoke/report",
        ),
        open: "never",
      },
    ],
  ],
  use: {
    actionTimeout: 15 * 1000,
    navigationTimeout: 30 * 1000,
  },
};
