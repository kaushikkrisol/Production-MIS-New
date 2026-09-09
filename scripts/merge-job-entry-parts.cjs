const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outputFile = path.join(
  root,
  "src",
  "feature-module",
  "uiinterface",
  "table",
  "JobEntry.jsx"
);
const partsDir = path.join(
  root,
  "src",
  "feature-module",
  "uiinterface",
  "table",
  "JobEntry"
);
const partFiles = [1, 2, 3, 4, 5].map((partNumber) =>
  path.join(partsDir, `JobEntry.part${partNumber}.jsxpart`)
);

const normalizeNewlines = (value) => value.replace(/\r\n/g, "\n");
const toWindowsNewlines = (value) => normalizeNewlines(value).replace(/\n/g, "\r\n");

const merged = partFiles
  .map((file) => {
    if (!fs.existsSync(file)) {
      throw new Error(`Missing JobEntry part: ${path.relative(root, file)}`);
    }
    return fs.readFileSync(file, "utf8");
  })
  .join("");

const output = toWindowsNewlines(merged);

if (process.argv.includes("--check")) {
  if (!fs.existsSync(outputFile)) {
    throw new Error(`Missing output file: ${path.relative(root, outputFile)}`);
  }

  const current = fs.readFileSync(outputFile, "utf8");
  if (current !== output) {
    console.error("JobEntry.jsx is not in sync with the five JobEntry parts.");
    console.error("Run: npm run jobentry:merge");
    process.exit(1);
  }

  console.log("JobEntry.jsx is in sync with the five JobEntry parts.");
  process.exit(0);
}

fs.writeFileSync(outputFile, output, "utf8");
console.log(`Created ${path.relative(root, outputFile)} from 5 JobEntry parts.`);
