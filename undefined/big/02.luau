--!strict

-- Generated module bundle

local CATALOG_0 = {
	{ id = 0, name = "item_0", price = 125, rarity = "epic", stackable = true },
	{ id = 1, name = "item_1", price = 250, rarity = "legendary", stackable = true },
	{ id = 2, name = "item_2", price = 375, rarity = "epic", stackable = true },
	{ id = 3, name = "item_3", price = 500, rarity = "legendary", stackable = true },
	{ id = 4, name = "item_4", price = 625, rarity = "legendary", stackable = false },
	{ id = 5, name = "item_5", price = 750, rarity = "legendary", stackable = false },
	{ id = 6, name = "item_6", price = 875, rarity = "epic", stackable = false },
	{ id = 7, name = "item_7", price = 1000, rarity = "rare", stackable = true },
	{ id = 8, name = "item_8", price = 1125, rarity = "common", stackable = true },
	{ id = 9, name = "item_9", price = 1250, rarity = "rare", stackable = true },
	{ id = 10, name = "item_10", price = 1375, rarity = "rare", stackable = false },
	{ id = 11, name = "item_11", price = 1500, rarity = "rare", stackable = false },
}

local INDEX_0 = {}
for _, entry in ipairs(CATALOG_0) do
	INDEX_0[entry.name] = entry
end

local function priceOf0(name: string): number
	local entry = INDEX_0[name]
	if not entry then
		return 0
	end
	return entry.price
end


local function deepCopy1(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy1(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber1(value: number): string
	local formatted = tostring(value)
	local rounds = 0
	while true do
		local replaced
		formatted, replaced = formatted:gsub("^(-?%d+)(%d%d%d)", "%1,%2")
		rounds = rounds + 1
		if replaced == 0 or rounds > 20 then
			break
		end
	end
	return formatted
end

local function retry1(attempts, callback)
	local lastError = "unknown error"
	for attempt = 1, attempts do
		local ok, result = pcall(callback, attempt)
		if ok then
			return true, result
		end
		lastError = result
		task.wait(0.25 * attempt)
	end
	return false, lastError
end


local Class2 = {}
Class2.__index = Class2

function Class2.new(config)
	local self = setmetatable({}, Class2)
	config = config or {}
	self.health = config.health or 10
	self.stamina = config.stamina or 15
	self.level = config.level or 20
	self.score = config.score or 25
	self.energy = config.energy or 30
	self._dirty = false
	self._listeners = {}
	return self
end

function Class2:getHealth(): number
	return self.health
end

function Class2:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class2: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class2:getStamina(): number
	return self.stamina
end

function Class2:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class2: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class2:getLevel(): number
	return self.level
end

function Class2:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class2: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class2:getScore(): number
	return self.score
end

function Class2:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class2: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class2:getEnergy(): number
	return self.energy
end

function Class2:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class2: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class2:onChanged(callback)
	self._listeners[#self._listeners + 1] = callback
	return function()
		for index, entry in ipairs(self._listeners) do
			if entry == callback then
				table.remove(self._listeners, index)
				break
			end
		end
	end
end

function Class2:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class2 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
end


local service3 = game:GetService("TweenService")
local remote3 = game:GetService("ReplicatedStorage"):WaitForChild("Remote3")
local connection3
connection3 = service3.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection3:Disconnect()
		remote3:FireServer("overflow", accumulated)
	end
end)


local service4 = game:GetService("Workspace")
local remote4 = game:GetService("ReplicatedStorage"):WaitForChild("Remote4")
local connection4
connection4 = service4.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection4:Disconnect()
		remote4:FireServer("overflow", accumulated)
	end
end)


local Class5 = {}
Class5.__index = Class5

function Class5.new(config)
	local self = setmetatable({}, Class5)
	config = config or {}
	self.health = config.health or 10
	self.stamina = config.stamina or 15
	self.level = config.level or 20
	self.score = config.score or 25
	self.energy = config.energy or 30
	self._dirty = false
	self._listeners = {}
	return self
end

function Class5:getHealth(): number
	return self.health
end

function Class5:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class5: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class5:getStamina(): number
	return self.stamina
end

function Class5:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class5: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class5:getLevel(): number
	return self.level
end

function Class5:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class5: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class5:getScore(): number
	return self.score
end

function Class5:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class5: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class5:getEnergy(): number
	return self.energy
end

function Class5:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class5: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class5:onChanged(callback)
	self._listeners[#self._listeners + 1] = callback
	return function()
		for index, entry in ipairs(self._listeners) do
			if entry == callback then
				table.remove(self._listeners, index)
				break
			end
		end
	end
end

function Class5:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class5 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
end


local function deepCopy6(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy6(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber6(value: number): string
	local formatted = tostring(value)
	local rounds = 0
	while true do
		local replaced
		formatted, replaced = formatted:gsub("^(-?%d+)(%d%d%d)", "%1,%2")
		rounds = rounds + 1
		if replaced == 0 or rounds > 20 then
			break
		end
	end
	return formatted
end

local function retry6(attempts, callback)
	local lastError = "unknown error"
	for attempt = 1, attempts do
		local ok, result = pcall(callback, attempt)
		if ok then
			return true, result
		end
		lastError = result
		task.wait(0.25 * attempt)
	end
	return false, lastError
end


local service7 = game:GetService("ReplicatedStorage")
local remote7 = game:GetService("ReplicatedStorage"):WaitForChild("Remote7")
local connection7
connection7 = service7.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection7:Disconnect()
		remote7:FireServer("overflow", accumulated)
	end
end)


local function deepCopy8(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy8(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber8(value: number): string
	local formatted = tostring(value)
	local rounds = 0
	while true do
		local replaced
		formatted, replaced = formatted:gsub("^(-?%d+)(%d%d%d)", "%1,%2")
		rounds = rounds + 1
		if replaced == 0 or rounds > 20 then
			break
		end
	end
	return formatted
end

local function retry8(attempts, callback)
	local lastError = "unknown error"
	for attempt = 1, attempts do
		local ok, result = pcall(callback, attempt)
		if ok then
			return true, result
		end
		lastError = result
		task.wait(0.25 * attempt)
	end
	return false, lastError
end


local service9 = game:GetService("ReplicatedStorage")
local remote9 = game:GetService("ReplicatedStorage"):WaitForChild("Remote9")
local connection9
connection9 = service9.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection9:Disconnect()
		remote9:FireServer("overflow", accumulated)
	end
end)


local function deepCopy10(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy10(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber10(value: number): string
	local formatted = tostring(value)
	local rounds = 0
	while true do
		local replaced
		formatted, replaced = formatted:gsub("^(-?%d+)(%d%d%d)", "%1,%2")
		rounds = rounds + 1
		if replaced == 0 or rounds > 20 then
			break
		end
	end
	return formatted
end

local function retry10(attempts, callback)
	local lastError = "unknown error"
	for attempt = 1, attempts do
		local ok, result = pcall(callback, attempt)
		if ok then
			return true, result
		end
		lastError = result
		task.wait(0.25 * attempt)
	end
	return false, lastError
end


local CATALOG_11 = {
	{ id = 1100, name = "item_0", price = 125, rarity = "epic", stackable = false },
	{ id = 1101, name = "item_1", price = 250, rarity = "common", stackable = false },
	{ id = 1102, name = "item_2", price = 375, rarity = "common", stackable = false },
	{ id = 1103, name = "item_3", price = 500, rarity = "legendary", stackable = false },
	{ id = 1104, name = "item_4", price = 625, rarity = "rare", stackable = false },
	{ id = 1105, name = "item_5", price = 750, rarity = "legendary", stackable = false },
	{ id = 1106, name = "item_6", price = 875, rarity = "rare", stackable = true },
	{ id = 1107, name = "item_7", price = 1000, rarity = "common", stackable = true },
	{ id = 1108, name = "item_8", price = 1125, rarity = "rare", stackable = true },
	{ id = 1109, name = "item_9", price = 1250, rarity = "common", stackable = false },
	{ id = 1110, name = "item_10", price = 1375, rarity = "rare", stackable = true },
	{ id = 1111, name = "item_11", price = 1500, rarity = "rare", stackable = true },
}

local INDEX_11 = {}
for _, entry in ipairs(CATALOG_11) do
	INDEX_11[entry.name] = entry
end

local function priceOf11(name: string): number
	local entry = INDEX_11[name]
	if not entry then
		return 0
	end
	return entry.price
end


local function deepCopy12(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy12(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber12(value: number): string
	local formatted = tostring(value)
	local rounds = 0
	while true do
		local replaced
		formatted, replaced = formatted:gsub("^(-?%d+)(%d%d%d)", "%1,%2")
		rounds = rounds + 1
		if replaced == 0 or rounds > 20 then
			break
		end
	end
	return formatted
end

local function retry12(attempts, callback)
	local lastError = "unknown error"
	for attempt = 1, attempts do
		local ok, result = pcall(callback, attempt)
		if ok then
			return true, result
		end
		lastError = result
		task.wait(0.25 * attempt)
	end
	return false, lastError
end


local service13 = game:GetService("RunService")
local remote13 = game:GetService("ReplicatedStorage"):WaitForChild("Remote13")
local connection13
connection13 = service13.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection13:Disconnect()
		remote13:FireServer("overflow", accumulated)
	end
end)


local CATALOG_14 = {
	{ id = 1400, name = "item_0", price = 125, rarity = "epic", stackable = true },
	{ id = 1401, name = "item_1", price = 250, rarity = "common", stackable = false },
	{ id = 1402, name = "item_2", price = 375, rarity = "legendary", stackable = false },
	{ id = 1403, name = "item_3", price = 500, rarity = "epic", stackable = false },
	{ id = 1404, name = "item_4", price = 625, rarity = "common", stackable = false },
	{ id = 1405, name = "item_5", price = 750, rarity = "rare", stackable = true },
	{ id = 1406, name = "item_6", price = 875, rarity = "legendary", stackable = true },
	{ id = 1407, name = "item_7", price = 1000, rarity = "common", stackable = false },
	{ id = 1408, name = "item_8", price = 1125, rarity = "epic", stackable = true },
	{ id = 1409, name = "item_9", price = 1250, rarity = "common", stackable = false },
	{ id = 1410, name = "item_10", price = 1375, rarity = "epic", stackable = false },
	{ id = 1411, name = "item_11", price = 1500, rarity = "common", stackable = true },
}

local INDEX_14 = {}
for _, entry in ipairs(CATALOG_14) do
	INDEX_14[entry.name] = entry
end

local function priceOf14(name: string): number
	local entry = INDEX_14[name]
	if not entry then
		return 0
	end
	return entry.price
end


local Class15 = {}
Class15.__index = Class15

function Class15.new(config)
	local self = setmetatable({}, Class15)
	config = config or {}
	self.health = config.health or 10
	self.stamina = config.stamina or 15
	self.level = config.level or 20
	self.score = config.score or 25
	self.energy = config.energy or 30
	self._dirty = false
	self._listeners = {}
	return self
end

function Class15:getHealth(): number
	return self.health
end

function Class15:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class15: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class15:getStamina(): number
	return self.stamina
end

function Class15:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class15: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class15:getLevel(): number
	return self.level
end

function Class15:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class15: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class15:getScore(): number
	return self.score
end

function Class15:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class15: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class15:getEnergy(): number
	return self.energy
end

function Class15:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class15: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class15:onChanged(callback)
	self._listeners[#self._listeners + 1] = callback
	return function()
		for index, entry in ipairs(self._listeners) do
			if entry == callback then
				table.remove(self._listeners, index)
				break
			end
		end
	end
end

function Class15:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class15 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
end


print("loaded", 16)