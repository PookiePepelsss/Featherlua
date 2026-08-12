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

**Medium** parses to an AST but keeps every local name and binding. It folds constant arithmetic, drops type annotations and branches that cannot run, merges adjacent declarations, and picks the shorter spelling of a form. Debug and reflection APIs can still observe changed declaration layout or line information, so the app warns when it detects them.

**Aggressive** parses to an AST and renames locals, folds and propagates constants, drops what nothing reads, strips type annotations, merges declarations, dedupes strings, and rewrites various forms into shorter ones. Every pass has a checkbox. Afterwards it re-parses its own output and checks it matches what it meant to produce.

**Auto Repair** fixes a script the compiler rejects, where the mistake has only one sensible reading: a missing `end`, `then`, `do` or comma, an unclosed bracket, or a stray `end`. A `repeat` with no `until` condition is left unchanged because inventing a condition would change its behavior. Anything ambiguous is reported rather than guessed at. Off by default, in which case the fix is offered instead.

Type **`run tests`** into the input box and press Compress to check the build in front of you: a dozen scripts are compiled, run, compressed in all three modes, and every output has to compile, run, and print exactly what the original printed.

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

Of those 96, the 56 that will run under a harness stubbing the executor globals print exactly the same thing before and after, in all three modes.

## Global aliasing

`local p = print` is worth about 3% on large scripts. It buys nothing for speed, despite localising globals being standard Lua advice, because Luau resolves imports ahead of time and there is no lookup left to save.

It is off by default because the alias keeps whatever the global held at load time. Anything that hooks or replaces that global later would be missed, which is normal in executor environments. The pass refuses outright on scripts touching `getfenv`, `getgenv`, `hookfunction`, `loadstring`, `_G`, `shared` or the debug reflection APIs.

## Tests

`npm test`. The Luau WASM asset is pinned to playground revision `736e1d985f5a3315333e51f5b225b84a3fc3e6b6` and checked against a known hash before use.

## Licence

AGPL-3.0. Use it, change it, run it. If you distribute it or host a modified version, that version's source has to be available under the same licence. See [LICENSE](LICENSE).
