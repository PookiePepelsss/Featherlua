// Stubs the executor/Roblox globals that vanilla Luau doesn't provide, so
// executor-style scripts can be differentially EXECUTED (original vs
// compressed) instead of only compile-checked. Every stub appends a
// deterministic record of its name and arguments to a log that the script
// prints at the end, so any change to call order, argument count, argument
// values, or which branch ran shows up as a diff.

export const EXECUTOR_PRELUDE = `
local __log = {}
-- Anything whose tostring is an address has to collapse to its kind. Two
-- runs of the same program allocate at different addresses, so leaving one
-- in makes identical behaviour look like a difference.
local function __fmt(value, depth)
  depth = depth or 0
  local kind = type(value)
  if kind ~= "table" then
    if kind == "function" or kind == "thread" or kind == "userdata" then return kind end
    return kind .. ":" .. tostring(value)
  end
  -- A table can hold itself, and the depth cap is what stops that. Four is
  -- past anything a stub is handed in practice.
  if depth >= 4 then return "table" end
  local keys = {}
  for key in pairs(value) do keys[#keys + 1] = key end
  -- Sorting on the rendered key rather than the key keeps mixed types
  -- comparable. The key itself is kept, because a numeric 1 and the string
  -- "1" are different keys and only the original one reads back.
  table.sort(keys, function(a, b) return tostring(a) < tostring(b) end)
  local parts = {}
  for _, key in ipairs(keys) do
    parts[#parts + 1] = tostring(key) .. "=" .. __fmt(rawget(value, key), depth + 1)
  end
  return "{" .. table.concat(parts, ",") .. "}"
end
local function __rec(name, ...)
  local n = select("#", ...)
  local parts = {}
  for i = 1, n do parts[i] = __fmt((select(i, ...))) end
  __log[#__log + 1] = name .. "(" .. table.concat(parts, ",") .. ")"
end
function __dumplog()
  for _, entry in ipairs(__log) do print(entry) end
end

local function __stub(name, result)
  return function(...)
    __rec(name, ...)
    return result
  end
end

local __proxyMeta = {}
-- Children are remembered rather than rebuilt. Roblox hands back the same
-- object for the same path, and scripts rely on it: Enum.KeyCode.W is
-- used as a table key, and a fresh table each time would never match the
-- one it was stored under.
__proxyMeta.__index = function(self, key)
  local name = rawget(self, "__name") .. "." .. tostring(key)
  __rec("index", name)
  local kids = rawget(self, "__kids")
  if kids == nil then
    kids = {}
    rawset(self, "__kids", kids)
  end
  local child = kids[tostring(key)]
  if child == nil then
    child = setmetatable({ __name = name }, __proxyMeta)
    kids[tostring(key)] = child
  end
  return child
end
__proxyMeta.__newindex = function(self, key, value)
  __rec("newindex", rawget(self, "__name") .. "." .. tostring(key), value)
end
-- Calls are remembered by name and arguments for the same reason, so that
-- game:GetService("Players") is the same object every time it is asked
-- for, as it would be in Roblox.
__proxyMeta.__call = function(self, ...)
  local name = rawget(self, "__name")
  __rec("call", name, ...)
  local key = name
  for i = 1, select("#", ...) do key = key .. "\\1" .. __fmt((select(i, ...)), 2) end
  local calls = rawget(self, "__calls")
  if calls == nil then
    calls = {}
    rawset(self, "__calls", calls)
  end
  local result = calls[key]
  if result == nil then
    result = setmetatable({ __name = name .. "()" }, __proxyMeta)
    calls[key] = result
  end
  return result
end
__proxyMeta.__tostring = function(self) return rawget(self, "__name") end
__proxyMeta.__eq = function(a, b) return rawget(a, "__name") == rawget(b, "__name") end
__proxyMeta.__len = function() return 0 end

local function __proxy(name)
  return setmetatable({ __name = name }, __proxyMeta)
end

game = __proxy("game")
workspace = __proxy("workspace")
script = __proxy("script")
shared = {}
Instance = { new = __stub("Instance.new", __proxy("Instance")) }
Vector2 = { new = function(x, y) return { X = x, Y = y } end }
Vector3 = { new = function(x, y, z) return { X = x, Y = y, Z = z } end }
Color3 = { new = function(r, g, b) return { R = r, G = g, B = b } end, fromRGB = function(r, g, b) return { R = r, G = g, B = b } end }
UDim2 = { new = function(a, b, c, d) return { a = a, b = b, c = c, d = d } end }
CFrame = { new = function(...) return { __cf = true } end }
Drawing = { new = __stub("Drawing.new", __proxy("Drawing")) }
WebSocket = { connect = __stub("WebSocket.connect", __proxy("Socket")) }

__GENERATED_STUBS__

local __genv, __renv = {}, {}
getgenv = function() return __genv end
getrenv = function() return __renv end
gethui = __stub("gethui", __proxy("hui"))
getgc = function(...) __rec("getgc", ...) return {} end
getreg = function() __rec("getreg") return {} end
getinstances = function() __rec("getinstances") return {} end
getnilinstances = function() __rec("getnilinstances") return {} end
getloadedmodules = function() __rec("getloadedmodules") return {} end
getconnections = function(...) __rec("getconnections", ...) return {} end
listfiles = function(...) __rec("listfiles", ...) return {} end
readfile = function(...) __rec("readfile", ...) return "payload" end
isfile = function(...) __rec("isfile", ...) return true end
isfolder = function(...) __rec("isfolder", ...) return true end
isreadonly = function(...) __rec("isreadonly", ...) return false end
iscclosure = function(...) __rec("iscclosure", ...) return true end
islclosure = function(...) __rec("islclosure", ...) return false end
isexecutorclosure = function(...) __rec("isexecutorclosure", ...) return true end
checkclosure = function(...) __rec("checkclosure", ...) return true end
isscriptable = function(...) __rec("isscriptable", ...) return true end
isnetworkowner = function(...) __rec("isnetworkowner", ...) return true end
getsimulationradius = function() __rec("getsimulationradius") return 1000 end
getthreadidentity = function() __rec("getthreadidentity") return 7 end
getthreadcontext = function() __rec("getthreadcontext") return 7 end
identifyexecutor = function() __rec("identifyexecutor") return "Harness", "1.0" end
getexecutorname = function() __rec("getexecutorname") return "Harness" end
messagebox = function(...) __rec("messagebox", ...) return 1 end
getfflag = function(...) __rec("getfflag", ...) return "False" end
setscriptable = function(...) __rec("setscriptable", ...) return false end
gethiddenproperty = function(...) __rec("gethiddenproperty", ...) return 1, true end
getcustomasset = function(...) __rec("getcustomasset", ...) return "rbxasset://stub" end
getscriptbytecode = function(...) __rec("getscriptbytecode", ...) return "bytecode" end
decompile = function(...) __rec("decompile", ...) return "source" end
dumpstring = function(...) __rec("dumpstring", ...) return "dumped" end
getscriptclosure = function(...) __rec("getscriptclosure", ...) return function() end end
getsenv = function(...) __rec("getsenv", ...) return {} end
getnamecallmethod = function() __rec("getnamecallmethod") return "FireServer" end
getrawmetatable = function(...) __rec("getrawmetatable", ...) return { __index = function() end, __namecall = function() end } end
newcclosure = function(fn) __rec("newcclosure") return fn end
clonefunction = function(fn) __rec("clonefunction") return fn end
cloneref = function(v) __rec("cloneref") return v end
compareinstances = function(a, b) __rec("compareinstances") return true end
hookfunction = function(target, replacement) __rec("hookfunction") return target end
hookmetamethod = function(obj, name, replacement) __rec("hookmetamethod", name) return function() end end
create_signal = function()
  __rec("create_signal")
  local signal = {}
  function signal:Connect(fn) __rec("signal.Connect") return { Disconnect = function() __rec("signal.Disconnect") end } end
  function signal:Fire(...) __rec("signal.Fire", ...) end
  function signal:Destroy() __rec("signal.Destroy") end
  return signal
end
cache = { invalidate = __stub("cache.invalidate"), replace = __stub("cache.replace"), iscached = function(...) __rec("cache.iscached", ...) return true end }
crypt = {
  base64 = { encode = function(v) __rec("crypt.base64.encode", v) return "ZW5j" end, decode = function(v) __rec("crypt.base64.decode", v) return "dec" end },
  hash = function(v, alg) __rec("crypt.hash", v, alg) return "hash" end,
  generatekey = function() __rec("crypt.generatekey") return "key" end,
}
local __realDebug = debug
debug = {
  info = function(...) __rec("debug.info", ...) return "info" end,
  traceback = function(...) __rec("debug.traceback") return "traceback" end,
  getupvalue = function(...) __rec("debug.getupvalue", ...) return "upvalue", 1 end,
  getupvalues = function(...) __rec("debug.getupvalues", ...) return {} end,
  setupvalue = function(...) __rec("debug.setupvalue", ...) end,
  getconstants = function(...) __rec("debug.getconstants", ...) return { 1, 2 } end,
  getconstant = function(...) __rec("debug.getconstant", ...) return 1 end,
  setconstant = function(...) __rec("debug.setconstant", ...) end,
  getprotos = function(...) __rec("debug.getprotos", ...) return { 1 } end,
  getproto = function(...) __rec("debug.getproto", ...) return function() end end,
  setproto = function(...) __rec("debug.setproto", ...) end,
  getstack = function(...) __rec("debug.getstack", ...) return { 1 } end,
  setstack = function(...) __rec("debug.setstack", ...) end,
  getlocal = function(...) __rec("debug.getlocal", ...) return nil end,
  setlocal = function(...) __rec("debug.setlocal", ...) end,
  profilebegin = function(...) __rec("debug.profilebegin", ...) end,
  profileend = function() __rec("debug.profileend") end,
}

task = {
  spawn = function(fn, ...) __rec("task.spawn") if type(fn) == "function" then fn(...) end return __proxy("thread") end,
  defer = function(fn, ...) __rec("task.defer") if type(fn) == "function" then fn(...) end return __proxy("thread") end,
  delay = function(t, fn, ...) __rec("task.delay", t) if type(fn) == "function" then fn(...) end return __proxy("thread") end,
  wait = function(t) return wait(t) end,
  cancel = function(...) __rec("task.cancel") end,
}

syn = { request = function(o) __rec("syn.request", o) return { StatusCode = 200, Body = "{}" } end, protect_gui = __stub("syn.protect_gui") }
request = function(o) __rec("request", o) return { StatusCode = 200, Body = "{}" } end
http_request = request
-- loadstring used to hand back a function that added its arguments,
-- which blew up the moment a script did Signal.new(...) on the result.
-- A proxy answers to anything, which is what a fetched library looks like.
loadstring = function(src) __rec("loadstring", src) return function() return __proxy("loadstring()") end end
require = function(target) __rec("require", target) return __proxy("require()") end

-- Roblox globals a script may use without ever touching an executor API.
-- Their absence, not the compression, was what stopped most of a real
-- corpus from running here.
warn = function(...) __rec("warn", ...) end
typeof = function(v) return type(v) end
unpack = table.unpack

-- Time never really passes, and it must not look as though it does: two
-- runs have to agree exactly, so these count rather than measure.
local __ticks = 0
local __waits = 0
-- A script written as while true do wait() end never finishes. Roblox
-- would keep it alive forever; here it has to stop, or the check that runs
-- it stops instead.
local __WAIT_BUDGET = 2000
wait = function(t)
  __waits = __waits + 1
  if __waits > __WAIT_BUDGET then error("harness: this script waits forever", 0) end
  __ticks = __ticks + (t or 0.03)
  __rec("wait", t)
  return t or 0.03
end
spawn = function(fn, ...) __rec("spawn") if type(fn) == "function" then fn(...) end end
delay = function(t, fn, ...) __rec("delay", t) if type(fn) == "function" then fn(...) end end
tick = function() __ticks = __ticks + 0.01 return 1700000000 + __ticks end
time = function() return __ticks end
elapsedTime = time
Random = { new = function() return __proxy("Random") end }
Enum = __proxy("Enum")
ColorSequence = { new = function(...) return { __seq = "ColorSequence" } end }
ColorSequenceKeypoint = { new = function(t, c) return { t = t, c = c } end }
NumberSequence = { new = function(...) return { __seq = "NumberSequence" } end }
NumberSequenceKeypoint = { new = function(t, v) return { t = t, v = v } end }
NumberRange = { new = function(a, b) return { Min = a, Max = b or a } end }
TweenInfo = { new = function(...) return { __tween = true } end }
BrickColor = { new = function(v) return { Name = tostring(v) } end, Random = function() return { Name = "Grey" } end }
Rect = { new = function(a, b) return { Min = a, Max = b } end }
Ray = { new = function(o, d) return { Origin = o, Direction = d } end }
Region3 = { new = function(a, b) return { Min = a, Max = b } end }
Axes = { new = function() return {} end }
Faces = { new = function() return {} end }
PhysicalProperties = { new = function(...) return {} end }
UDim = { new = function(a, b) return { Scale = a, Offset = b } end }
settings = function() return __proxy("settings") end
UserSettings = function() return __proxy("UserSettings") end
`;

// The sandbox's `_G` is readonly and is not the real global environment, so
// stubs have to be emitted as plain global assignments rather than looped
// `_G[name] = ...` writes.
const STUB_NAMES = [
  "getreg", "getgc", "getinstances", "getnilinstances", "getloadedmodules",
  "getconnections", "getscriptclosure", "getsenv", "setnamecallmethod",
  "setrawmetatable", "setreadonly", "checkcaller", "setclipboard",
  "protectgui", "unprotectgui", "makefolder", "writefile", "appendfile",
  "delfile", "delfolder", "queue_on_teleport", "queueonteleport",
  "setthreadidentity", "setthreadcontext", "setfflag", "sethiddenproperty",
  "setsimulationradius", "firesignal", "fireclickdetector",
  "firetouchinterest", "mouse1move", "mouse1press", "mouse1release",
  "mouse2click", "mousescroll", "keypress", "keyrelease", "rconsoleclear",
  "rconsolename", "rconsoleprint", "consolewarn", "consoleerror",
];

// Names used as instances/objects rather than called as functions -- they
// have to be indexable proxies, not stub functions.
const PROXY_NAMES = ["target", "part", "partA", "partB", "detector", "button", "instance"];

const GENERATED_STUBS = [
  ...STUB_NAMES.map((name) => `${name} = __stub("${name}", __proxy("${name}!"))`),
  ...PROXY_NAMES.map((name) => `${name} = __proxy("${name}")`),
].join("\n");

function preludeText() {
  return EXECUTOR_PRELUDE.replace("__GENERATED_STUBS__", GENERATED_STUBS);
}

export function withExecutorHarness(source: string): string {
  // A `#!` line is only a line at the very top of a file. Wrapped below the
  // prelude it is halfway down one, where it is a syntax error rather than
  // a shebang, so it goes before the source is embedded.
  const body = source.startsWith("#!") ? source.slice(source.indexOf("\n") + 1) : source;
  return `${preludeText()}\ndo\n${body}\nend\n__dumplog()`;
}

/**
 * How many lines the harness sits above the script. A runtime error names
 * the line it happened on in the combined text, which is a couple of
 * hundred past anything the author wrote, so it has to be shifted back
 * before it means anything to them.
 */
export function harnessLineOffset(): number {
  return `${preludeText()}\ndo\n`.split("\n").length - 1;
}
