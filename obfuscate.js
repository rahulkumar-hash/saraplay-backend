const fs = require("fs");
const path = require("path");
const JavaScriptObfuscator = require("javascript-obfuscator");

const targetDirs = [
  "controllers",
  "routes",
  "services",
  "utils",
  "middleware",
  "cron",
  "models",
  "config"
];

const targetFiles = [
  "server.js",
  "server1.js",
  "server2.js"
];

const obfuscatorOptions = {
  target: "node",
  compact: true,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: "hexadecimal",
  log: false,
  numbersToExpressions: false,
  renameGlobals: false,
  selfDefending: false,
  simplify: true,
  splitStrings: false,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ["base64"],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 1,
  stringArrayWrappersType: "variable",
  stringArrayThreshold: 0.8,
  transformObjectKeys: false,
  unicodeEscapeSequence: false
};

function getAllJsFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllJsFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith(".js") && file !== "obfuscate.js") {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

console.log("🔒 Starting JavaScript Obfuscation for SaraPlay Backend...");

let totalFiles = 0;
let filesToProcess = [];

targetDirs.forEach((dir) => {
  const fullDir = path.resolve(__dirname, dir);
  filesToProcess = filesToProcess.concat(getAllJsFiles(fullDir));
});

targetFiles.forEach((file) => {
  const fullFile = path.resolve(__dirname, file);
  if (fs.existsSync(fullFile)) {
    filesToProcess.push(fullFile);
  }
});

filesToProcess.forEach((filePath) => {
  try {
    const code = fs.readFileSync(filePath, "utf8");
    const obfuscationResult = JavaScriptObfuscator.obfuscate(code, obfuscatorOptions);
    fs.writeFileSync(filePath, obfuscationResult.getObfuscatedCode(), "utf8");
    totalFiles++;
    console.log(`✅ Obfuscated: ${path.relative(__dirname, filePath)}`);
  } catch (err) {
    console.error(`❌ Error obfuscating ${filePath}:`, err.message);
    process.exit(1);
  }
});

console.log(`🎉 Obfuscation Complete! Total files scrambled: ${totalFiles}`);
