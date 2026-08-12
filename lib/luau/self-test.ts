import { compressAggressive, MEDIUM_AGGRESSIVE_OPTIONS } from "./compress-aggressive";
import { compressSafe, verifySafeCompression } from "./compress-safe";
import { compileWithOfficialLuau, executeWithOfficialLuau, type LuauModule } from "./official/runtime";

// Typing this into the input box runs the checks against the build that is
// actually loaded in the page, rather than against a developer's machine.
// It answers one question: does this copy of the compressor still turn
// working scripts into working scripts that do the same thing.
export const SELF_TEST_COMMAND = /^\s*run\s+tests\s*$/i;

// Plain Luau on purpose. Nothing here needs Roblox or an executor, so the
// scripts can be run directly and their output compared.
const CASES: [string, string][] = [
  ["arithmetic and numbers", `local a = 60 * 60 * 24
local b = 7 % 3
local c = 2 ^ 10
local d = 0.1 + 0.2
print(a, b, c, string.format("%.17g", d))`],

  ["strings and escapes", `local s = "has \\"quotes\\" and \\65\\66"
local t = 'single quoted holding a " inside'
local u = [[long bracket]]
print(#s, s, t, u)`],

  ["string building", `local parts = {}
for i = 1, 5 do parts[#parts + 1] = "item" .. i end
print(table.concat(parts, ","))`],

  ["control flow", `local out = {}
for i = 1, 6 do
  if i % 3 == 0 then out[#out + 1] = "fizz"
  elseif i % 2 == 0 then out[#out + 1] = "even"
  else out[#out + 1] = tostring(i) end
end
print(table.concat(out, " "))`],

  ["scope and shadowing", `local x = 1
do local x = 2 print(x) end
print(x)
local function outer()
  local y = 10
  return function() y = y + 1 return y end
end
local step = outer()
print(step(), step())`],

  ["varargs and multiple returns", `local function many(...) return select("#", ...), ... end
local function pair() return 1, 2 end
print(many(1, 2, 3))
print((pair()))
print(pair())`],

  ["tables and methods", `local obj = { n = 0 }
function obj:bump(by) self.n = self.n + by return self.n end
print(obj:bump(2), obj:bump(3))
local t = { 10, 20, a = 1, ["b"] = 2 }
print(#t, t[1], t.a, t.b)`],

  ["closures in a loop", `local fns = {}
for i = 1, 3 do fns[i] = function() return i * 2 end end
print(fns[1](), fns[2](), fns[3]())`],

  ["repeat and while", `local n = 0
repeat n = n + 1 until n >= 3
local m = 0
while m < 3 do m = m + 1 end
print(n, m)`],

  ["interpolation", `local who = "world"
print(\`hello {who}, {1 + 1}\`)`],

  ["dead code and constants", `local unused = "never read"
if false then print("never") end
if true then print("always") end
local k = 5
print(k * 2)`],

  ["numeric for with steps", `local out = {}
for i = 0, 1, 0.25 do out[#out + 1] = string.format("%.2f", i) end
for i = 5, 1, -2 do out[#out + 1] = tostring(i) end
print(table.concat(out, " "))`],
];

export interface SelfTestReport {
  passed: number;
  failed: number;
  text: string;
}

export function runSelfTest(module: LuauModule): SelfTestReport {
  const lines: string[] = [];
  const failures: string[] = [];
  let passed = 0;
  let failed = 0;
  const started = Date.now();

  for (const [name, source] of CASES) {
    const problems: string[] = [];

    if (!compileWithOfficialLuau(module, source).success) {
      problems.push("the test script itself does not compile");
    }
    const before = executeWithOfficialLuau(module, source);
    if (!before.success) problems.push(`the test script does not run: ${before.error ?? ""}`);

    if (problems.length === 0) {
      const safe = compressSafe(source);
      const tokens = verifySafeCompression(source, safe);
      if (!tokens.success) problems.push(`Safe changed the tokens: ${tokens.error}`);

      const outputs: [string, string][] = [["Safe", safe]];
      const medium = compressAggressive(source, MEDIUM_AGGRESSIVE_OPTIONS);
      const aggressive = compressAggressive(source);
      if (medium.ok) outputs.push(["Medium", medium.output]);
      else problems.push(`Medium refused it: ${medium.error.message}`);
      if (aggressive.ok) outputs.push(["Aggressive", aggressive.output]);
      else problems.push(`Aggressive refused it: ${aggressive.error.message}`);

      for (const [mode, output] of outputs) {
        const compiled = compileWithOfficialLuau(module, output);
        if (!compiled.success) {
          problems.push(`${mode} output does not compile: ${compiled.error ?? ""}`);
          continue;
        }
        const after = executeWithOfficialLuau(module, output);
        if (!after.success) problems.push(`${mode} output does not run: ${after.error ?? ""}`);
        else if (after.output !== before.output) {
          problems.push(`${mode} printed something different\n      was: ${before.output.replace(/\n/g, " | ")}\n      now: ${after.output.replace(/\n/g, " | ")}`);
        }
      }
    }

    if (problems.length === 0) {
      passed += 1;
      lines.push(`  ok    ${name}`);
    } else {
      failed += 1;
      lines.push(`  FAIL  ${name}`);
      for (const problem of problems) failures.push(`${name}: ${problem}`);
    }
  }

  const took = Date.now() - started;
  const header = failed === 0
    ? `All ${passed} checks passed in ${took}ms.`
    : `${failed} of ${passed + failed} checks FAILED in ${took}ms.`;

  const body = [
    header,
    "",
    "Each script is compiled by the official Luau compiler, run, then",
    "compressed in all three modes. Every output must compile, run, and",
    "print exactly what the original printed. Safe is also checked for",
    "holding the same tokens.",
    "",
    ...lines,
  ];

  if (failures.length) {
    body.push("", "Details:", ...failures.map((f) => `  ${f}`));
  }

  return { passed, failed, text: body.join("\n") };
}
