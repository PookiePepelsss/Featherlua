<img src="public/icon.png" alt="Featherlua" width="88">

# Featherlua

A Luau compressor that runs in the browser. Built for Roblox and executor scripts. Nothing leaves the page.

It is running at **[app.featherlua.workers.dev](https://app.featherlua.workers.dev)**.
The compressor itself is at [/app](https://app.featherlua.workers.dev/app): paste a
script, press Compress.

## Running it

```
npm ci
npm run dev
```

`http://localhost:3000` serves the landing page; the compressor itself is at
`http://localhost:3000/app`. Paste a script there and press Compress.

## The site

`public/index.html` is the landing page, exported from the design canvas and
served as it came: its own markup, its own motion, its own copy. `support.js`
is the runtime it shipped with, byte for byte.

The one thing that changed is where it gets React. That runtime fetches React,
ReactDOM and Babel from unpkg, which would mean a third-party request on every
visit to a tool whose whole claim is that nothing leaves the page. It looks in
`window.__resources` before reaching for a CDN, so those three are served from
`public/vendor` instead and the file itself is untouched. They are the same
bytes it would have fetched: their SHA-384 digests match the integrity hashes
in `support.js`.

## Modes

**Safe** removes comments and whitespace, then checks the output holds the same tokens as the input.

**Medium** parses to an AST but keeps every local name and binding. It folds constant arithmetic, drops type annotations and branches that cannot run, merges adjacent declarations, and picks the shorter spelling of a form. Debug and reflection APIs can still observe changed declaration layout or line information, so the app warns when it detects them.

**Aggressive** parses to an AST and renames locals, folds and propagates constants, drops what nothing reads, strips type annotations, merges declarations, dedupes strings, and rewrites various forms into shorter ones. Every pass has a checkbox. Afterwards it re-parses its own output and checks it matches what it meant to produce.

Among the rewrites, and so present in Medium too: an `else` holding nothing but
an `if` becomes `elseif`, which decompilers generate endlessly; `if not x then A
else B end` swaps its branches and sheds the `not`; a double `not` in a condition
folds away, since a condition asks only for truthiness, while `return not not v`
keeps it because there the boolean is the value; an empty `else` and a trailing
bare `return` are dropped; and `"a" .. 'b'` folds despite the mismatched quotes
by re-quoting the right side.

**Auto Repair** fixes a script the compiler rejects, where the mistake has only one sensible reading:

| Broken | Repaired |
| --- | --- |
| a missing `end`, `then`, `do` or comma | inserted where the indentation says it belongs |
| an unclosed bracket | closed where the code dedents back to the opener's own level |
| a stray `end` | the one the parser named, not the last one in the file |
| `if x = 1 then` | `==`, the only thing an `=` in a condition can have meant |
| `print(1, 2,)` | the trailing comma dropped, where only a closer follows it |
| `print("hi)` | `print("hi")`, closing the string before the bracket rather than swallowing it |
| a file cut off mid-string or mid-comment | the literal closed, then whatever brackets the truncation left open |
| `local t.field = v` | the `local`, which cannot introduce a field, dropped |

A `repeat` with no `until` condition is left unchanged because inventing a condition would change its behavior. Anything ambiguous is reported rather than guessed at. Off by default, in which case the fix is offered instead.

Every repair is checked twice before it is offered: the edited source has to re-parse, and then the official compiler has to accept it. A repair that only moves the error somewhere else never surfaces.

Type **`run tests`** into the input box and press Compress to check the build in front of you: a dozen scripts are compiled, run, compressed in all three modes, and every output has to compile, run, and print exactly what the original printed.

Every input and output goes through the official Luau WebAssembly compiler before you see a result.

Luau only. Lua 5.1 to 5.4 and LuaJIT are out of scope, and the difference is not
cosmetic: Luau never took `goto` from Lua 5.2, so `local goto = 1` and `t.goto`
are ordinary Luau that this compresses, while a `goto` statement or a `::label::`
is refused exactly as the real compiler refuses it. Shebangs, `--!` directives and
licence headers survive every mode.

There is a size limit, and it comes from the compiler rather than from the compressor. The official Luau build runs inside the page in a fixed amount of memory, 32MB to start and 512MB at most, and a script of ordinary density stops fitting a little past a megabyte. Past that it is refused with an explanation rather than a crash, and the compiler is rebuilt so the next script works. What is in a script matters as much as how long it is, so treat a megabyte as roughly where the wall is rather than as a rule.

## Before and after

A short executor script, with types, a branch that cannot run, a local nothing reads, and a couple of constants:

```lua
--!strict
-- Simple walkspeed + ESP toggle for a Roblox executor.

type Config = {
	walkSpeed: number,
	espEnabled: boolean,
}

local Players = game:GetService("Players")
local UserInput = game:GetService("UserInputService")

local DEFAULT_SPEED = 16
local BOOST_MULTIPLIER = 4
local UNUSED_LEGACY_FLAG = false

local config: Config = {
	walkSpeed = DEFAULT_SPEED * BOOST_MULTIPLIER,
	espEnabled = true,
}

local function getHumanoid()
	local character = Players.LocalPlayer.Character
	if character == nil then
		return nil
	end
	return character:FindFirstChildOfClass("Humanoid")
end

local function applySpeed()
	local humanoid = getHumanoid()
	if humanoid then
		humanoid.WalkSpeed = config.walkSpeed
	end
end

if true then
	applySpeed()
end

UserInput.InputBegan:Connect(function(input, processed)
	if processed then
		return
	end
	if input.KeyCode == Enum.KeyCode.F then
		config.espEnabled = not config.espEnabled
		print("ESP toggled", config.espEnabled)
	end
end)
```

Aggressive turns that into this, 479 bytes from 972:

```lua
--!strict
local b=game:GetService"Players"local c=game:GetService"UserInputService"local a={walkSpeed=64,espEnabled=true}local function d()local a=b.LocalPlayer.Character if a==nil then return nil end return a:FindFirstChildOfClass"Humanoid"end local function e()local b=d()if b then b.WalkSpeed=a.walkSpeed end end e()c.InputBegan:Connect(function(b,c)if c then return end if b.KeyCode==Enum.KeyCode.F then a.espEnabled=not a.espEnabled print("ESP toggled",a.espEnabled)end end)
```

The type alias and the annotation are gone, `16 * 4` became 64, `UNUSED_LEGACY_FLAG` went with nothing reading it, `if true then` lost its test, `("Players")` lost its brackets, and every local is down to a single letter. The `--!strict` directive stays, because directives always do.

| | Bytes | Off |
| --- | --- | --- |
| Source | 972 | |
| Safe | 827 | 14.9% |
| Medium | 729 | 25.0% |
| darklua 0.19 | 623 | 35.9% |
| **Aggressive** | **479** | **50.7%** |

## Against darklua

Same 96 scripts from [Stefanuk12/ROBLOX](https://github.com/Stefanuk12/ROBLOX) through both tools. darklua 0.19 running `darklua process` on its own defaults, which came out ahead of a hand-picked rule list, so this is its better showing rather than its worse one. Every output here was put through the official Luau compiler.

| | Bytes | Off the source |
| --- | --- | --- |
| Source | 1,291,360 | |
| Safe | 906,130 | 29.8% |
| Medium | 881,500 | 31.7% |
| darklua 0.19 | 807,277 | 37.5% |
| **Aggressive** | **734,885** | **43.1%** |

Featherlua is **8.97% smaller overall**, a median of **6.13%** per file, and smaller on 95 of the 96 with the remaining one a tie. It is not larger anywhere.

Most of the gap is type stripping and constant propagation. darklua leaves `type Config = { ... }` in the output, and Luau erases it at runtime anyway.

darklua is the faster of the two, and by a clear margin: about 850ms for those 96 files against 1,860ms here, and its figure includes reading and writing every file while this one does not. It is a native binary and this is TypeScript in a browser tab. If you are minifying on every commit, that matters more than the bytes; if you are compressing a script by hand, it does not.

The two are not really the same tool. darklua is a build-pipeline program with a CLI, bundling, require resolution and configurable rules, and it handles Lua 5.1 as well as Luau. This is a box you paste a script into. Most of what darklua does more of are things this deliberately is not.

Of those 96, 62 get far enough under a harness stubbing the executor globals to be compared, and all 62 print exactly the same thing before and after, in all three modes. A script written to run forever is stopped at a fixed point and compared as far as it got.

## Global aliasing

`local p = print` is worth about 3% on large scripts. It buys nothing for speed, despite localising globals being standard Lua advice, because Luau resolves imports ahead of time and there is no lookup left to save.

It is off by default because the alias keeps whatever the global held at load time. Anything that hooks or replaces that global later would be missed, which is normal in executor environments. The pass refuses outright on scripts touching `getfenv`, `getgenv`, `hookfunction`, `loadstring`, `_G`, `shared` or the debug reflection APIs.

## Tests

`npm test` runs 1,263 checks across 48 files, and CI runs them on every push along with the types and a build.

Most of them are not unit tests. Scripts are compiled and run by the official Luau build, before and after compression, and have to print the same thing; generated programs are put through every combination of passes; and the grammar this parser accepts is compared against the one Luau accepts, because the two bugs that produced output the compiler rejected both came from that gap.

The Luau WASM asset is pinned to playground revision `736e1d985f5a3315333e51f5b225b84a3fc3e6b6` and checked against a known hash before use.

## Licence

AGPL-3.0. Use it, change it, run it. If you distribute it or host a modified version, that version's source has to be available under the same licence. See [LICENSE](LICENSE).
