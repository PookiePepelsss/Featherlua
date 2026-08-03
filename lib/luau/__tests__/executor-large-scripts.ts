// Large, realistic executor scripts. Small fixtures catch per-API bugs;
// these catch interaction bugs, where a pass is fine alone but wrong once
// closures, metatables, hook chains, and shared upvalues are combined at
// the scale a real script hub actually reaches.

export interface LargeScript {
  name: string;
  source: string;
}

const scriptHub = `
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local CONFIG = {
    Version = "2.4.1",
    Name = "Test Hub",
    AutoFarm = false,
    AutoCollect = true,
    WalkSpeed = 16,
    JumpPower = 50,
    ESPEnabled = false,
    MaxRetries = 3,
    RetryDelay = 0.5,
}

local State = {
    connections = {},
    running = false,
    collected = 0,
    errors = 0,
    startTime = 0,
}

local function log(level, message)
    local prefix = "[" .. CONFIG.Name .. "/" .. level .. "] "
    print(prefix .. message)
end

local function safeCall(fn, ...)
    local results = { pcall(fn, ...) }
    local ok = table.remove(results, 1)
    if not ok then
        State.errors = State.errors + 1
        log("ERROR", tostring(results[1]))
        return nil
    end
    return table.unpack(results)
end

local function retry(fn, attempts, delay)
    attempts = attempts or CONFIG.MaxRetries
    delay = delay or CONFIG.RetryDelay
    local lastError
    for attempt = 1, attempts do
        local ok, result = pcall(fn)
        if ok then return result end
        lastError = result
        if attempt < attempts then task.wait(delay) end
    end
    log("ERROR", "all retries failed: " .. tostring(lastError))
    return nil
end

local Signal = {}
Signal.__index = Signal

function Signal.new(name)
    return setmetatable({ name = name, handlers = {}, fireCount = 0 }, Signal)
end

function Signal:Connect(handler)
    local id = #self.handlers + 1
    self.handlers[id] = handler
    return {
        Disconnect = function()
            self.handlers[id] = nil
        end,
    }
end

function Signal:Fire(...)
    self.fireCount = self.fireCount + 1
    for _, handler in pairs(self.handlers) do
        safeCall(handler, ...)
    end
end

local Inventory = {}
Inventory.__index = Inventory

function Inventory.new()
    return setmetatable({ items = {}, total = 0 }, Inventory)
end

function Inventory:Add(name, count, price)
    local existing = self.items[name]
    if existing then
        existing.count = existing.count + count
    else
        self.items[name] = { count = count, price = price }
    end
    self.total = self.total + count * price
    return self
end

function Inventory:Remove(name, count)
    local entry = self.items[name]
    if not entry then return false end
    if entry.count <= count then
        self.total = self.total - entry.count * entry.price
        self.items[name] = nil
        return true
    end
    entry.count = entry.count - count
    self.total = self.total - count * entry.price
    return true
end

function Inventory:Report()
    local names = {}
    for name in pairs(self.items) do
        names[#names + 1] = name
    end
    table.sort(names)
    local lines = {}
    for _, name in ipairs(names) do
        local entry = self.items[name]
        lines[#lines + 1] = name .. "x" .. entry.count .. "@" .. entry.price
    end
    return table.concat(lines, ",") .. "|total=" .. self.total
end

local onCollect = Signal.new("collect")
local inventory = Inventory.new()

onCollect:Connect(function(name, count, price)
    inventory:Add(name, count, price)
    State.collected = State.collected + count
end)

onCollect:Connect(function(name)
    if CONFIG.ESPEnabled then
        log("DEBUG", "collected " .. name)
    end
end)

local hooked
hooked = hookmetamethod(game, "__namecall", newcclosure(function(self, ...)
    local method = getnamecallmethod()
    if method == "FireServer" or method == "InvokeServer" then
        local args = { ... }
        if #args > 0 and CONFIG.AutoFarm then
            return hooked(self, table.unpack(args))
        end
    end
    return hooked(self, ...)
end))

local function setupCharacter(character)
    local humanoid = character:WaitForChild("Humanoid")
    humanoid.WalkSpeed = CONFIG.WalkSpeed
    humanoid.JumpPower = CONFIG.JumpPower
    return humanoid
end

local function onPlayerAdded(player)
    log("INFO", "player joined")
    local connection = player.CharacterAdded:Connect(function(character)
        safeCall(setupCharacter, character)
    end)
    State.connections[#State.connections + 1] = connection
end

Players.PlayerAdded:Connect(onPlayerAdded)

local ITEM_TABLE = {
    { name = "potion", count = 3, price = 12 },
    { name = "key", count = 1, price = 40 },
    { name = "map", count = 2, price = 8 },
    { name = "gem", count = 5, price = 100 },
    { name = "potion", count = 2, price = 12 },
}

for index, item in ipairs(ITEM_TABLE) do
    if index % 2 == 0 then
        onCollect:Fire(item.name, item.count, item.price)
    else
        onCollect:Fire(item.name, item.count, item.price)
    end
end

inventory:Remove("map", 1)
inventory:Remove("nothing", 1)
inventory:Remove("key", 5)

local function computeStats()
    local base = 100
    local multiplier = 2
    local bonus = base * multiplier
    local penalty = State.errors * 10
    local final = bonus - penalty
    if final < 0 then final = 0 end
    return {
        base = base,
        bonus = bonus,
        penalty = penalty,
        final = final,
    }
end

local stats = computeStats()

local function serialize(value, depth)
    depth = depth or 0
    if depth > 3 then return "..." end
    local kind = type(value)
    if kind ~= "table" then return tostring(value) end
    local keys = {}
    for key in pairs(value) do keys[#keys + 1] = tostring(key) end
    table.sort(keys)
    local parts = {}
    for _, key in ipairs(keys) do
        parts[#parts + 1] = key .. "=" .. serialize(value[key], depth + 1)
    end
    return "{" .. table.concat(parts, ",") .. "}"
end

log("INFO", "report " .. inventory:Report())
log("INFO", "stats " .. serialize(stats))
log("INFO", "collected " .. State.collected .. " errors " .. State.errors)
log("INFO", "fires " .. onCollect.fireCount)

local counter = 0
local function tick()
    counter = counter + 1
    if counter >= 3 then return false end
    return true
end

while tick() do end
log("INFO", "ticks " .. counter)

repeat
    counter = counter - 1
until counter <= 0

for i = 1, 5 do
    if i == 2 then continue end
    if i == 4 then break end
    log("DEBUG", "loop " .. i)
end

local a, b, c = 1, 2, 3
a, b = b, a
log("INFO", "swap " .. a .. b .. c)

local text = "alpha" .. "beta" .. "gamma"
local nested = { outer = { inner = { value = 42 } } }
log("INFO", text .. " " .. nested.outer.inner.value)
`;

const antiCheatBypass = `
local getgenv = getgenv
local env = getgenv()
env.LoadedModules = env.LoadedModules or {}

local Detection = {
    checks = 0,
    flagged = false,
    whitelist = { "Humanoid", "HumanoidRootPart", "Head" },
}

local function isWhitelisted(name)
    for _, entry in ipairs(Detection.whitelist) do
        if entry == name then return true end
    end
    return false
end

local originalIndex
local metatable = getrawmetatable(game)
local wasReadonly = isreadonly(metatable)
setreadonly(metatable, false)
originalIndex = metatable.__index
metatable.__index = newcclosure(function(self, key)
    Detection.checks = Detection.checks + 1
    if key == "WalkSpeed" and not isWhitelisted(key) then
        return 16
    end
    return originalIndex(self, key)
end)
setreadonly(metatable, wasReadonly)

local originalNamecall
originalNamecall = hookmetamethod(game, "__namecall", function(self, ...)
    local method = getnamecallmethod()
    if method == "Kick" then
        Detection.flagged = true
        return nil
    end
    if method == "FireServer" then
        local first = ...
        if first == "report" then
            return nil
        end
    end
    return originalNamecall(self, ...)
end)

local function scanForRemotes()
    local found = {}
    for _, object in ipairs(getinstances()) do
        found[#found + 1] = object
    end
    return #found
end

local remoteCount = scanForRemotes()

local upvalueTargets = {}
for _, object in ipairs(getgc(true)) do
    if type(object) == "function" then
        local name = debug.info(object, "n")
        if name then
            upvalueTargets[#upvalueTargets + 1] = name
        end
    end
end

local function patchFunction(fn)
    local name, value = debug.getupvalue(fn, 1)
    if name then
        debug.setupvalue(fn, 1, value)
        return true
    end
    return false
end

local patched = patchFunction(function() end)

local constants = debug.getconstants(print)
local protos = debug.getprotos(print)

print("checks", Detection.checks)
print("flagged", Detection.flagged)
print("remotes", remoteCount)
print("upvalues", #upvalueTargets)
print("patched", patched)
print("constants", #constants, "protos", #protos)
print("env", type(env.LoadedModules))
`;

export const largeExecutorScripts: LargeScript[] = [
  { name: "script hub", source: scriptHub },
  { name: "anti-cheat bypass", source: antiCheatBypass },
];
