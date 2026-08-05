# Featherlua

A browser-only Luau compressor, built for Roblox and Roblox executor scripts. Nothing is uploaded; compression runs entirely in the page.

## Use

1. Run `npm ci` and `npm run dev`.
2. Open `http://localhost:3000`.
3. Paste a script, pick Safe or Aggressive, and press **Compress**.

## Modes

**Safe** strips comments and whitespace and nothing else, then checks the output holds exactly the same tokens as the input.

**Aggressive** parses to an AST and renames locals, folds and propagates constants, removes what nothing reads, strips type annotations, merges adjacent declarations, dedupes repeated strings, and rewrites a number of forms into shorter equivalents. Each pass has its own checkbox. Afterwards it re-parses its own output and checks it is alpha-equivalent to the tree it meant to produce, and if switching a pass off makes the result smaller it keeps the smaller one and says which.

**Auto Repair** is a separate switch. A script the compiler rejects for a single unambiguous omission gets one edit applied before compressing: a missing `end`, `then`, `do`, `until` or comma, an unclosed bracket, or one `end` too many. Every candidate has to re-parse and then compile before it counts, and where more than one reading is possible the error says so rather than guessing. Left off, the same fix is offered rather than applied.

Every input and output is compiled with the official Luau WebAssembly build before a result is shown, so output the real compiler would reject never reaches you.

## Scope

Luau only. Lua 5.1 to 5.4 and LuaJIT are out of scope, so the tokenizer carries no bitwise operators, hex floats, or integer suffixes.

Shebangs, `--!` directives, and `@license`/SPDX headers are preserved.

## Global aliasing

Binding repeated globals to locals (`local p = print`) is the largest saving left, worth around 3% on large scripts, and it is off by default. An alias keeps whatever the global held when the script started, so anything that replaces or hooks that global later is missed, which is ordinary in executor environments. The pass declines outright on scripts touching `getfenv`, `getgenv`, `hookfunction`, `loadstring`, `_G`, `shared` or the debug reflection APIs, and on any global the script assigns.

## Measured

Against 158 real scripts from [Stefanuk12/ROBLOX](https://github.com/Stefanuk12/ROBLOX), of which 152 compile as input:

| | |
| --- | --- |
| Safe | 1,649,716 to 1,117,355 bytes, 32.3% smaller |
| Aggressive | 1,649,716 to 889,641 bytes, 46.1% smaller |
| Median file | 55.3% smaller |
| Aggressive beat Safe on | 152 of 152 |

Of those, 55 run under a harness that stubs the executor globals; all 55 print exactly what they printed before compression, through both modes. The rest need a real Roblox environment, so for those the evidence is that the output compiles, re-parses, and is alpha-equivalent.

Against darklua 0.19, taking its best result per file across three configurations, Aggressive output is 2.9% to 5.1% smaller depending on the corpus.

## Tests

`npm test` runs the parser, corpus, fuzz, repair and official-runtime differential suites. `npm run benchmark` runs the compression benchmarks.

The official Luau WASM asset is pinned to playground revision `736e1d985f5a3315333e51f5b225b84a3fc3e6b6` and checked against a known SHA-256 before use; its license is stored beside the asset.
