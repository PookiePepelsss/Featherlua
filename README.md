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
| Medium | 881,546 | 31.7% |
| darklua 0.19 | 807,277 | 37.5% |
| **Aggressive** | **734,909** | **43.1%** |

Featherlua is **8.96% smaller overall**, a median of **6.13%** per file, and smaller on 95 of the 96 with the remaining one a tie. It is not larger anywhere.

Most of the gap is type stripping and constant propagation. darklua leaves `type Config = { ... }` in the output, and Luau erases it at runtime anyway.

Of those 96, the 34 that will run under the stubbed-executor harness print exactly the same thing before and after, in all three modes.

## Global aliasing

`local p = print` is worth about 3% on large scripts. It is worth nothing at all for speed, which is worth stating because localising globals is standard Lua advice: measured, it came out at 1.04x, and Luau's import resolution has already done the work.

It is off by default because the alias keeps whatever the global held at load time. Anything that hooks or replaces that global later would be missed, which is normal in executor environments. The pass refuses outright on scripts touching `getfenv`, `getgenv`, `hookfunction`, `loadstring`, `_G`, `shared` or the debug reflection APIs.

## Speed

Compression is neutral for speed. Across executor-shaped scripts with real work in them, every mode lands between 0.97x and 1.05x of the original, which is noise, and a test holds it there so a future pass cannot quietly cost a hot loop time in exchange for a few bytes.

It does not buy much at load either: 43% fewer bytes compiles 1.08x faster. The compiler is not the bottleneck people assume.

Source-level constant folding is a size optimisation only. Luau folds constants into bytecode regardless, so `60 * 60 * 24` written out costs nothing at runtime; it only costs bytes.

These are the rewrites considered for a speed pass, measured against the real runtime:

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
