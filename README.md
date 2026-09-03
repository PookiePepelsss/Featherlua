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

## Modes

**Safe** removes comments and whitespace, then checks the output holds the same tokens as the input.

**Medium** parses to an AST but keeps every local name and binding. It folds constant arithmetic, drops type annotations and branches that cannot run, merges adjacent declarations, and picks the shorter spelling of a form. Debug and reflection APIs can still observe changed declaration layout or line information, so the app warns when it detects them.

**Aggressive** parses to an AST and renames locals, folds and propagates constants, drops what nothing reads, strips type annotations, merges declarations, dedupes strings, and rewrites various forms into shorter ones. Every pass has a checkbox. Afterwards it re-parses its own output and checks it matches what it meant to produce.

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

Luau only. Lua 5.1 to 5.4 and LuaJIT are out of scope. Shebangs, `--!`
directives and licence headers survive every mode.

There is a size limit, and it comes from the compiler rather than from the compressor. The official Luau build runs inside the page in a fixed amount of memory, 32MB to start and 512MB at most, and a script of ordinary density stops fitting a little past a megabyte. Past that it is refused with an explanation rather than a crash, and the compiler is rebuilt so the next script works. What is in a script matters as much as how long it is, so treat a megabyte as roughly where the wall is rather than as a rule.

## Before and after

A short executor script with types, a branch that cannot run, a local
nothing reads and a couple of constants, 972 bytes, comes out of Aggressive
at 479:

```lua
--!strict
local b=game:GetService"Players"local c=game:GetService"UserInputService"local a={walkSpeed=64,espEnabled=true}local function d()local a=b.LocalPlayer.Character if a==nil then return nil end return a:FindFirstChildOfClass"Humanoid"end local function e()local b=d()if b then b.WalkSpeed=a.walkSpeed end end e()c.InputBegan:Connect(function(b,c)if c then return end if b.KeyCode==Enum.KeyCode.F then a.espEnabled=not a.espEnabled print("ESP toggled",a.espEnabled)end end)
```

The type alias and the annotation are gone, `16 * 4` became 64, the unread
local went with nothing reading it, `if true then` lost its test, and every
local is down to a single letter. The `--!strict` directive stays, because
directives always do.

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

## Licence

AGPL-3.0. Use it, change it, run it. If you distribute it or host a modified version, that version's source has to be available under the same licence. See [LICENSE](LICENSE).
