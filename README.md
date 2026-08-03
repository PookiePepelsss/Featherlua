# Lua Compressor

A browser-only Luau compressor, built for Roblox and Roblox executor scripts. No scripts are uploaded.

## Use

1. Run `npm ci` and `npm run dev`.
2. Open `http://localhost:3000`.
3. Paste a script, pick Safe or Aggressive, and press **Compress**.

Safe mode is a lossless tokenizer with a token-preservation check. Aggressive mode parses to an AST and renames locals, folds constants, and strips types. Every input and output is compiled with the official Luau WebAssembly build before a result is shown.

Only Luau is supported. Lua 5.1-5.4 and LuaJIT are out of scope, so the tokenizer carries no bitwise operators, hex floats, or integer suffixes.

Run `npm test` for parser, corpus, fuzz, and official-runtime differential tests. Run `npm run benchmark` for compression benchmarks.

The official Luau WASM asset is pinned to playground revision `736e1d985f5a3315333e51f5b225b84a3fc3e6b6`; its license is stored beside the asset.
