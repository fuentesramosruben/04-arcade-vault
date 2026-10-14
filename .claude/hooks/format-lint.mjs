import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const LINT_EXT = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"]);
const COMPACT_EXT = new Set([...LINT_EXT, ".css"]);
let input = "";
for await (const chunk of process.stdin) input += chunk;
let file;
try {
  const data = JSON.parse(input);
  file = data.tool_response?.filePath ?? data.tool_input?.file_path;
} catch {
  process.exit(0);
}
if (!file) process.exit(0);
const root = path.resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
const target = path.resolve(file);
const rel = path.relative(root, target);
if (rel.startsWith("..") || path.isAbsolute(rel)) process.exit(0);
if (/(^|[\\/])(node_modules|\.next)([\\/]|$)/.test(rel)) process.exit(0);
const run = (bin, args) =>
  spawnSync(process.execPath, [path.join(root, "node_modules", bin), ...args], {
    cwd: root,
    encoding: "utf8",
  });
if (COMPACT_EXT.has(path.extname(target).toLowerCase())) {
  const original = fs.readFileSync(target, "utf8");
  const compact = original
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line !== "")
    .join("\n")
    .concat("\n");
  if (compact !== original) fs.writeFileSync(target, compact);
}
run("prettier/bin/prettier.cjs", ["--write", "--ignore-unknown", target]);
if (LINT_EXT.has(path.extname(target).toLowerCase())) {
  const res = run("eslint/bin/eslint.js", ["--fix", target]);
  if (res.status !== 0) {
    process.stderr.write(
      `ESLint encontró errores en ${rel}:\n${res.stdout}${res.stderr}`,
    );
    process.exit(2);
  }
}
