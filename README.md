# Featherlua

A Luau compressor that runs in the browser. Built for Roblox and executor scripts. Nothing leaves the page.

## Running it

```
npm ci
npm run dev
```

Then open `http://localhost:3000`, paste a script, and press Compress.

## Modes

**Safe** removes comments and whitespace, then checks the output holds the same tokens as the input.

**Medium** parses to an AST but leaves the locals alone: none renamed, none invented, none removed. It folds constant arithmetic, drops type annotations and branches that cannot run, merges adjacent declarations, and picks the shorter spelling of a form. Anything reading a local by name, such as `debug.getlocal` or a stack trace, sees what it saw before.

**Aggressive** parses to an AST and renames locals, folds and propagates constants, drops what nothing reads, strips type annotations, merges declarations, dedupes strings, and rewrites various forms into shorter ones. Every pass has a checkbox. Afterwards it re-parses its own output and checks it matches what it meant to produce.

**Auto Repair** fixes a script the compiler rejects, where the mistake has only one sensible reading: a missing `end`, `then`, `do`, `until` or comma, an unclosed bracket, a stray `end`. Anything ambiguous is reported rather than guessed at. Off by default, in which case the fix is offered instead.

**Check behaviour** runs your script and the compressed one side by side under a stubbed executor, about ninety Roblox and executor globals recording every call they receive, and compares what the two printed. A stub is not your executor, so a match is evidence rather than proof, but a mismatch is real. Scripts that wait on something they cannot have here are given ten seconds and then reported as inconclusive.

Every input and output goes through the official Luau WebAssembly compiler before you see a result.

Luau only. Lua 5.1 to 5.4 and LuaJIT are out of scope. Shebangs, `--!` directives and licence headers survive every mode.

## Numbers

158 scripts from [Stefanuk12/ROBLOX](https://github.com/Stefanuk12/ROBLOX), 152 of which compile:

- Safe: 1,649,716 to 1,117,355 bytes
- Aggressive: 1,649,716 to 889,641 bytes, median 55% per file
- Aggressive beat Safe on all 152, never larger than the source

55 of them run under a harness stubbing the executor globals, and all 55 print the same thing before and after.

Against darklua 0.19, Aggressive output is 3 to 5% smaller depending on the corpus.

## Global aliasing

`local p = print` is worth about 3% on large scripts. It is worth nothing at all for speed, which is worth stating because localising globals is standard Lua advice: measured, it came out at 1.04x, and Luau's import resolution has already done the work.

It is off by default because the alias keeps whatever the global held at load time. Anything that hooks or replaces that global later would be missed, which is normal in executor environments. The pass refuses outright on scripts touching `getfenv`, `getgenv`, `hookfunction`, `loadstring`, `_G`, `shared` or the debug reflection APIs.

## Speed

Every pass trades bytes, not time, and none of them makes a script measurably faster. `npm test` includes the rewrites that were considered for a speed pass, measured against the real runtime:

| Rewrite | Effect |
| --- | --- |
| Building a string in a loop, into `table.concat` | 106x faster |
| Hoisting a nested field chain out of a loop | 3.5x |
| Hoisting a repeated field read out of a loop | 1.9x |
| Hoisting `#t` out of a loop condition | 1.4x |
| Hoisting a method lookup out of a loop | 1.4x |
| Localising a library global | 1.04x, nothing |
| `table.insert(t, v)` into `t[#t + 1] = v` | 1.04x, nothing |
| `ipairs` into a numeric `for` | **0.88x, slower** |
| A dot call into a method call | **0.85x, slower** |

The bottom four are standard Lua 5.1 advice and do not survive contact with Luau, which has a dedicated instruction for `ipairs`, resolves imports ahead of time, and gains nothing from `NAMECALL` here.

None of the rest are implemented, and the reason is that the list is really one item: every genuine win is hoisting something out of a loop, and that is exactly the rewrite that cannot be trusted. `part.Position` read twice in a loop is not a repeated read to be folded away, it is the whole point of the loop. A pass doing this would also produce a program deliberately not equivalent to its input, so it could not be checked the way the existing passes are.

These numbers move if measured carelessly. Warming the runtime first and measuring each side in both orders matters: without that, localising a global reads as 1.5x purely because it was the first thing run.

Measured against the standalone Luau interpreter built to WebAssembly. Roblox has native codegen and its own fast paths, so the direction transfers and the exact multiples do not.

## Tests

`npm test`. The Luau WASM asset is pinned to playground revision `736e1d985f5a3315333e51f5b225b84a3fc3e6b6` and checked against a known hash before use.

## Licence

AGPL-3.0. Use it, change it, run it. If you distribute it or host a modified version, that version's source has to be available under the same licence. See [LICENSE](LICENSE).
