# Official Luau browser runtime

`luau-module.js` and `public/wasm/luau.wasm` are unmodified artifacts from the official [Luau playground](https://github.com/luau-lang/playground) at revision `736e1d985f5a3315333e51f5b225b84a3fc3e6b6`.

- WASM SHA-256: `c3b4c08a083b9834ad1e2678a6e30a5933962bd50f2a2191e0861640a19d6ced`
- Loader SHA-256: `53ec33b30cfedcfd87b6973f2b24fe8416e8f4cce0b8c9156f955af4c10eacbb`
- License: `public/wasm/LICENSE.playground.txt`

The app calls the playground's `luau_dump_bytecode` bridge with output disabled. A successful response proves the source was parsed and compiled by that official build without retaining a bytecode dump.
