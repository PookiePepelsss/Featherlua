# Lua Compressor

A browser-only Lua/Luau compressor. No scripts are uploaded.

## Use

1. Run `npm ci` and `npm run dev`.
2. Open `http://localhost:3000`.
3. Choose Luau, Lua 5.1–5.4, or LuaJIT 2.x.
4. Paste a script and press **Compress**.

Luau supports Safe and Aggressive modes. Every Luau input and output is compiled with the official Luau WebAssembly build before a result is shown. Lua and LuaJIT use conservative token-preserving compression; aggressive Luau AST rewrites are intentionally unavailable for those dialects.

Run `npm test` for parser, corpus, fuzz, and official-runtime differential tests. Run `npm run benchmark` for compression benchmarks.

The official Luau WASM asset is pinned to playground revision `736e1d985f5a3315333e51f5b225b84a3fc3e6b6`; its license is stored beside the asset.
