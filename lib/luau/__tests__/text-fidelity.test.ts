import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  compressAggressive,
  DEFAULT_AGGRESSIVE_OPTIONS,
  MEDIUM_AGGRESSIVE_OPTIONS,
} from "../compress-aggressive";
import { compressSafe } from "../compress-safe";
import { withExecutorHarness } from "../executor-harness";
import { createOfficialLuau, executeWithOfficialLuau, type LuauModule } from "../official/runtime";

// What a label says and what it is set in are the two things a user checks
// first, and several passes rewrite string literals: quotes are swapped for
// whichever needs fewer escapes, neighbouring literals are joined, repeated
// ones are lifted into a local. All of that is meant to preserve the bytes
// exactly. This proves it does, by printing every byte rather than the
// string, so a changed escape or a lost character cannot hide behind
// something that merely looks the same.

let module: LuauModule;

beforeAll(async () => {
  const wasm = readFileSync(join(process.cwd(), "public", "wasm", "luau.wasm"));
  module = await createOfficialLuau(new Uint8Array(wasm));
}, 30_000);

// Reports each string as its length and byte values, so nothing is judged
// on appearance.
const REPORTER = `
local function show(label, s)
  if type(s) ~= "string" then print(label, type(s), tostring(s)) return end
  local bytes = {}
  for i = 1, #s do bytes[i] = string.byte(s, i) end
  print(label, #s, table.concat(bytes, ","))
end
`;

// Wrapped in the executor harness, since these scripts use Instance, Enum
// and Font. Only the script itself is compressed; the harness around it is
// identical text on both sides.
function run(body: string) {
  return executeWithOfficialLuau(module, withExecutorHarness(`${REPORTER}\n${body}`));
}

const SCRIPTS: [string, string][] = [
  [
    "label text of every awkward shape",
    `local texts = {
  "plain",
  'single quoted',
  "has \\"double\\" quotes",
  'has \\'single\\' quotes',
  "mixed ' and \\" together",
  "tab\\there",
  "line\\nbreak",
  "back\\\\slash",
  "\\65\\66\\67",
  "\\x41\\x42",
  "\\u{48}\\u{49}",
  "trailing digits \\0651",
  "caf\\u{e9} na\\u{ef}ve",
  "emoji \\u{1F600}",
  "percent %s %d %%",
  "",
}
for i, t in ipairs(texts) do show("text" .. i, t) end`,
  ],
  [
    "rich text markup, which is quote heavy",
    `local markup = {
  "<b>bold</b>",
  "<font color=\\"#FF0000\\">red</font>",
  '<font face="GothamBold" size="18">sized</font>',
  "<i>a</i> and <u>b</u>",
  "<stroke color=\\"#000\\" thickness=\\"2\\">outlined</stroke>",
}
for i, m in ipairs(markup) do show("markup" .. i, m) end`,
  ],
  [
    "font properties on a label",
    `local label = Instance.new("TextLabel")
label.Text = "Score: 0"
label.Font = Enum.Font.GothamBold
label.TextSize = 14
label.TextScaled = false
label.RichText = true
label.FontFace = Font.new("rbxasset://fonts/families/SourceSansPro.json", Enum.FontWeight.Bold, Enum.FontStyle.Normal)
show("text", label.Text)
show("fontName", tostring(Enum.Font.GothamBold))
show("weight", tostring(Enum.FontWeight.Bold))
print("size", label.TextSize)`,
  ],
  [
    "text assembled by concatenation",
    `local name = "Pookie"
local score = 42
local greeting = "Hello, " .. name .. "! Score: " .. score
local joined = "a" .. "b" .. "c"
local withEscape = "line1\\n" .. "line2"
local digitEdge = "\\65" .. "6"
show("greeting", greeting)
show("joined", joined)
show("withEscape", withEscape)
show("digitEdge", digitEdge)`,
  ],
  [
    "the same text repeated, which gets lifted into a local",
    `local a = "a repeated label caption that is long enough to hoist"
local b = "a repeated label caption that is long enough to hoist"
local c = "a repeated label caption that is long enough to hoist"
show("a", a) show("b", b) show("c", c)
show("equal", tostring(a == b and b == c))`,
  ],
  [
    "text used as a table key",
    `local byFont = {}
byFont["GothamBold"] = 1
byFont[Enum.Font.SourceSans] = 2
byFont["caf\\u{e9}"] = 3
show("k1", tostring(byFont["GothamBold"]))
show("k2", tostring(byFont[Enum.Font.SourceSans]))
show("k3", tostring(byFont["caf\\u{e9}"]))`,
  ],
  [
    "long bracket text, which may be requoted",
    `local a = [[plain long]]
local b = [[has "quotes" inside]]
local c = [==[has ]] inside]==]
show("a", a) show("b", b) show("c", c)`,
  ],
  [
    "interpolated label text",
    `local n = 7
local s = \`Score: {n} of {n * 2}\`
local t = \`quote " inside\`
show("s", s)
show("t", t)`,
  ],
];

describe("text and font survive compression byte for byte", () => {
  for (const [name, body] of SCRIPTS) {
    it(name, () => {
      const source = `${REPORTER}\n${body}`;
      const before = run(body);
      expect(before.success, `baseline failed: ${before.error}`).toBe(true);
      expect(before.output.length, "the script printed nothing to compare").toBeGreaterThan(0);

      for (const [mode, options] of [
        ["Safe", "safe"],
        ["Medium", MEDIUM_AGGRESSIVE_OPTIONS],
        ["Aggressive", DEFAULT_AGGRESSIVE_OPTIONS],
      ] as const) {
        let output: string;
        if (options === "safe") output = compressSafe(source);
        else {
          const result = compressAggressive(source, options);
          expect(result.ok, result.ok ? "" : `${mode}: ${result.error.message}`).toBe(true);
          if (!result.ok) continue;
          output = result.output;
        }
        const after = executeWithOfficialLuau(module, withExecutorHarness(output));
        expect(after.success, `${mode} output failed to run: ${after.error}`).toBe(true);
        expect(after.output, `${mode} changed a string's bytes`).toBe(before.output);
      }
    });
  }
});

describe("a font enum is never renamed or folded away", () => {
  it("keeps the whole Enum path in the output", () => {
    const source = `local l = Instance.new("TextLabel")
l.Font = Enum.Font.GothamBold
l.FontFace = Font.new("rbxasset://fonts/families/Roboto.json", Enum.FontWeight.SemiBold)
print(l)`;
    const result = compressAggressive(source);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Member names are not renameable by construction, but this is the
    // property people notice, so it is worth stating outright.
    expect(result.output).toContain("Enum.Font.GothamBold");
    expect(result.output).toContain("Enum.FontWeight.SemiBold");
    expect(result.output).toContain("rbxasset://fonts/families/Roboto.json");
    expect(result.output).toContain("TextLabel");
  });
});
