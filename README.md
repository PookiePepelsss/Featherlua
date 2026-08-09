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

`local p = print` is worth about 3% on large scripts and is off by default, because the alias keeps whatever the global held at load time. Anything that hooks or replaces that global later would be missed, which is normal in executor environments. The pass refuses outright on scripts touching `getfenv`, `getgenv`, `hookfunction`, `loadstring`, `_G`, `shared` or the debug reflection APIs.

## Tests

`npm test`. The Luau WASM asset is pinned to playground revision `736e1d985f5a3315333e51f5b225b84a3fc3e6b6` and checked against a known hash before use.

## Licence

AGPL-3.0. Use it, change it, run it. If you distribute it or host a modified version, that version's source has to be available under the same licence. See [LICENSE](LICENSE).
