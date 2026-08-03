--!strict

-- Generated module bundle

local Class0 = {}
Class0.__index = Class0

function Class0.new(config)
	local self = setmetatable({}, Class0)
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

function Class0:getHealth(): number
	return self.health
end

function Class0:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class0: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class0:getStamina(): number
	return self.stamina
end

function Class0:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class0: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class0:getLevel(): number
	return self.level
end

function Class0:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class0: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class0:getScore(): number
	return self.score
end

function Class0:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class0: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class0:getEnergy(): number
	return self.energy
end

function Class0:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class0: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class0:onChanged(callback)
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

function Class0:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class0 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
end


local service1 = game:GetService("ReplicatedStorage")
local remote1 = game:GetService("ReplicatedStorage"):WaitForChild("Remote1")
local connection1
connection1 = service1.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection1:Disconnect()
		remote1:FireServer("overflow", accumulated)
	end
end)


local service2 = game:GetService("UserInputService")
local remote2 = game:GetService("ReplicatedStorage"):WaitForChild("Remote2")
local connection2
connection2 = service2.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection2:Disconnect()
		remote2:FireServer("overflow", accumulated)
	end
end)


local CATALOG_3 = {
	{ id = 300, name = "item_0", price = 125, rarity = "epic", stackable = false },
	{ id = 301, name = "item_1", price = 250, rarity = "epic", stackable = true },
	{ id = 302, name = "item_2", price = 375, rarity = "epic", stackable = false },
	{ id = 303, name = "item_3", price = 500, rarity = "epic", stackable = false },
	{ id = 304, name = "item_4", price = 625, rarity = "legendary", stackable = false },
	{ id = 305, name = "item_5", price = 750, rarity = "common", stackable = true },
	{ id = 306, name = "item_6", price = 875, rarity = "epic", stackable = false },
	{ id = 307, name = "item_7", price = 1000, rarity = "rare", stackable = false },
	{ id = 308, name = "item_8", price = 1125, rarity = "epic", stackable = true },
	{ id = 309, name = "item_9", price = 1250, rarity = "legendary", stackable = true },
	{ id = 310, name = "item_10", price = 1375, rarity = "rare", stackable = true },
	{ id = 311, name = "item_11", price = 1500, rarity = "epic", stackable = false },
}

local INDEX_3 = {}
for _, entry in ipairs(CATALOG_3) do
	INDEX_3[entry.name] = entry
end

local function priceOf3(name: string): number
	local entry = INDEX_3[name]
	if not entry then
		return 0
	end
	return entry.price
end


local Class4 = {}
Class4.__index = Class4

function Class4.new(config)
	local self = setmetatable({}, Class4)
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

function Class4:getHealth(): number
	return self.health
end

function Class4:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class4: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class4:getStamina(): number
	return self.stamina
end

function Class4:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class4: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class4:getLevel(): number
	return self.level
end

function Class4:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class4: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class4:getScore(): number
	return self.score
end

function Class4:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class4: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class4:getEnergy(): number
	return self.energy
end

function Class4:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class4: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class4:onChanged(callback)
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

function Class4:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class4 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
end


local function deepCopy5(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy5(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber5(value: number): string
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

local function retry5(attempts, callback)
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


local CATALOG_6 = {
	{ id = 600, name = "item_0", price = 125, rarity = "legendary", stackable = false },
	{ id = 601, name = "item_1", price = 250, rarity = "legendary", stackable = false },
	{ id = 602, name = "item_2", price = 375, rarity = "common", stackable = true },
	{ id = 603, name = "item_3", price = 500, rarity = "common", stackable = true },
	{ id = 604, name = "item_4", price = 625, rarity = "legendary", stackable = true },
	{ id = 605, name = "item_5", price = 750, rarity = "rare", stackable = false },
	{ id = 606, name = "item_6", price = 875, rarity = "rare", stackable = true },
	{ id = 607, name = "item_7", price = 1000, rarity = "rare", stackable = false },
	{ id = 608, name = "item_8", price = 1125, rarity = "legendary", stackable = false },
	{ id = 609, name = "item_9", price = 1250, rarity = "epic", stackable = true },
	{ id = 610, name = "item_10", price = 1375, rarity = "common", stackable = false },
	{ id = 611, name = "item_11", price = 1500, rarity = "epic", stackable = false },
}

local INDEX_6 = {}
for _, entry in ipairs(CATALOG_6) do
	INDEX_6[entry.name] = entry
end

local function priceOf6(name: string): number
	local entry = INDEX_6[name]
	if not entry then
		return 0
	end
	return entry.price
end


local CATALOG_7 = {
	{ id = 700, name = "item_0", price = 125, rarity = "legendary", stackable = true },
	{ id = 701, name = "item_1", price = 250, rarity = "rare", stackable = false },
	{ id = 702, name = "item_2", price = 375, rarity = "legendary", stackable = false },
	{ id = 703, name = "item_3", price = 500, rarity = "legendary", stackable = false },
	{ id = 704, name = "item_4", price = 625, rarity = "common", stackable = false },
	{ id = 705, name = "item_5", price = 750, rarity = "common", stackable = true },
	{ id = 706, name = "item_6", price = 875, rarity = "epic", stackable = false },
	{ id = 707, name = "item_7", price = 1000, rarity = "epic", stackable = true },
	{ id = 708, name = "item_8", price = 1125, rarity = "legendary", stackable = true },
	{ id = 709, name = "item_9", price = 1250, rarity = "rare", stackable = true },
	{ id = 710, name = "item_10", price = 1375, rarity = "rare", stackable = false },
	{ id = 711, name = "item_11", price = 1500, rarity = "rare", stackable = false },
}

local INDEX_7 = {}
for _, entry in ipairs(CATALOG_7) do
	INDEX_7[entry.name] = entry
end

local function priceOf7(name: string): number
	local entry = INDEX_7[name]
	if not entry then
		return 0
	end
	return entry.price
end


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


local service9 = game:GetService("TweenService")
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


local service10 = game:GetService("Players")
local remote10 = game:GetService("ReplicatedStorage"):WaitForChild("Remote10")
local connection10
connection10 = service10.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection10:Disconnect()
		remote10:FireServer("overflow", accumulated)
	end
end)


local CATALOG_11 = {
	{ id = 1100, name = "item_0", price = 125, rarity = "epic", stackable = true },
	{ id = 1101, name = "item_1", price = 250, rarity = "legendary", stackable = false },
	{ id = 1102, name = "item_2", price = 375, rarity = "legendary", stackable = false },
	{ id = 1103, name = "item_3", price = 500, rarity = "epic", stackable = true },
	{ id = 1104, name = "item_4", price = 625, rarity = "rare", stackable = false },
	{ id = 1105, name = "item_5", price = 750, rarity = "epic", stackable = false },
	{ id = 1106, name = "item_6", price = 875, rarity = "rare", stackable = false },
	{ id = 1107, name = "item_7", price = 1000, rarity = "rare", stackable = true },
	{ id = 1108, name = "item_8", price = 1125, rarity = "legendary", stackable = true },
	{ id = 1109, name = "item_9", price = 1250, rarity = "legendary", stackable = true },
	{ id = 1110, name = "item_10", price = 1375, rarity = "epic", stackable = true },
	{ id = 1111, name = "item_11", price = 1500, rarity = "rare", stackable = false },
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


local CATALOG_12 = {
	{ id = 1200, name = "item_0", price = 125, rarity = "epic", stackable = true },
	{ id = 1201, name = "item_1", price = 250, rarity = "rare", stackable = true },
	{ id = 1202, name = "item_2", price = 375, rarity = "epic", stackable = true },
	{ id = 1203, name = "item_3", price = 500, rarity = "legendary", stackable = false },
	{ id = 1204, name = "item_4", price = 625, rarity = "legendary", stackable = false },
	{ id = 1205, name = "item_5", price = 750, rarity = "common", stackable = false },
	{ id = 1206, name = "item_6", price = 875, rarity = "rare", stackable = true },
	{ id = 1207, name = "item_7", price = 1000, rarity = "epic", stackable = false },
	{ id = 1208, name = "item_8", price = 1125, rarity = "rare", stackable = true },
	{ id = 1209, name = "item_9", price = 1250, rarity = "rare", stackable = false },
	{ id = 1210, name = "item_10", price = 1375, rarity = "legendary", stackable = false },
	{ id = 1211, name = "item_11", price = 1500, rarity = "rare", stackable = true },
}

local INDEX_12 = {}
for _, entry in ipairs(CATALOG_12) do
	INDEX_12[entry.name] = entry
end

local function priceOf12(name: string): number
	local entry = INDEX_12[name]
	if not entry then
		return 0
	end
	return entry.price
end


local service13 = game:GetService("UserInputService")
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
	{ id = 1400, name = "item_0", price = 125, rarity = "common", stackable = true },
	{ id = 1401, name = "item_1", price = 250, rarity = "common", stackable = false },
	{ id = 1402, name = "item_2", price = 375, rarity = "epic", stackable = false },
	{ id = 1403, name = "item_3", price = 500, rarity = "epic", stackable = false },
	{ id = 1404, name = "item_4", price = 625, rarity = "rare", stackable = true },
	{ id = 1405, name = "item_5", price = 750, rarity = "rare", stackable = false },
	{ id = 1406, name = "item_6", price = 875, rarity = "rare", stackable = true },
	{ id = 1407, name = "item_7", price = 1000, rarity = "legendary", stackable = true },
	{ id = 1408, name = "item_8", price = 1125, rarity = "epic", stackable = true },
	{ id = 1409, name = "item_9", price = 1250, rarity = "epic", stackable = true },
	{ id = 1410, name = "item_10", price = 1375, rarity = "epic", stackable = false },
	{ id = 1411, name = "item_11", price = 1500, rarity = "legendary", stackable = true },
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


local CATALOG_15 = {
	{ id = 1500, name = "item_0", price = 125, rarity = "rare", stackable = true },
	{ id = 1501, name = "item_1", price = 250, rarity = "epic", stackable = true },
	{ id = 1502, name = "item_2", price = 375, rarity = "common", stackable = false },
	{ id = 1503, name = "item_3", price = 500, rarity = "rare", stackable = true },
	{ id = 1504, name = "item_4", price = 625, rarity = "common", stackable = true },
	{ id = 1505, name = "item_5", price = 750, rarity = "rare", stackable = true },
	{ id = 1506, name = "item_6", price = 875, rarity = "common", stackable = true },
	{ id = 1507, name = "item_7", price = 1000, rarity = "rare", stackable = true },
	{ id = 1508, name = "item_8", price = 1125, rarity = "common", stackable = false },
	{ id = 1509, name = "item_9", price = 1250, rarity = "legendary", stackable = true },
	{ id = 1510, name = "item_10", price = 1375, rarity = "rare", stackable = false },
	{ id = 1511, name = "item_11", price = 1500, rarity = "legendary", stackable = true },
}

local INDEX_15 = {}
for _, entry in ipairs(CATALOG_15) do
	INDEX_15[entry.name] = entry
end

local function priceOf15(name: string): number
	local entry = INDEX_15[name]
	if not entry then
		return 0
	end
	return entry.price
end


local service16 = game:GetService("TweenService")
local remote16 = game:GetService("ReplicatedStorage"):WaitForChild("Remote16")
local connection16
connection16 = service16.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection16:Disconnect()
		remote16:FireServer("overflow", accumulated)
	end
end)


local Class17 = {}
Class17.__index = Class17

function Class17.new(config)
	local self = setmetatable({}, Class17)
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

function Class17:getHealth(): number
	return self.health
end

function Class17:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class17: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class17:getStamina(): number
	return self.stamina
end

function Class17:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class17: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class17:getLevel(): number
	return self.level
end

function Class17:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class17: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class17:getScore(): number
	return self.score
end

function Class17:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class17: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class17:getEnergy(): number
	return self.energy
end

function Class17:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class17: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class17:onChanged(callback)
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

function Class17:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class17 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
end


local CATALOG_18 = {
	{ id = 1800, name = "item_0", price = 125, rarity = "rare", stackable = true },
	{ id = 1801, name = "item_1", price = 250, rarity = "legendary", stackable = true },
	{ id = 1802, name = "item_2", price = 375, rarity = "epic", stackable = false },
	{ id = 1803, name = "item_3", price = 500, rarity = "legendary", stackable = false },
	{ id = 1804, name = "item_4", price = 625, rarity = "common", stackable = true },
	{ id = 1805, name = "item_5", price = 750, rarity = "rare", stackable = true },
	{ id = 1806, name = "item_6", price = 875, rarity = "legendary", stackable = true },
	{ id = 1807, name = "item_7", price = 1000, rarity = "epic", stackable = true },
	{ id = 1808, name = "item_8", price = 1125, rarity = "epic", stackable = true },
	{ id = 1809, name = "item_9", price = 1250, rarity = "legendary", stackable = true },
	{ id = 1810, name = "item_10", price = 1375, rarity = "rare", stackable = false },
	{ id = 1811, name = "item_11", price = 1500, rarity = "epic", stackable = true },
}

local INDEX_18 = {}
for _, entry in ipairs(CATALOG_18) do
	INDEX_18[entry.name] = entry
end

local function priceOf18(name: string): number
	local entry = INDEX_18[name]
	if not entry then
		return 0
	end
	return entry.price
end


local function deepCopy19(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy19(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber19(value: number): string
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

local function retry19(attempts, callback)
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


local CATALOG_20 = {
	{ id = 2000, name = "item_0", price = 125, rarity = "epic", stackable = false },
	{ id = 2001, name = "item_1", price = 250, rarity = "common", stackable = false },
	{ id = 2002, name = "item_2", price = 375, rarity = "epic", stackable = false },
	{ id = 2003, name = "item_3", price = 500, rarity = "epic", stackable = true },
	{ id = 2004, name = "item_4", price = 625, rarity = "legendary", stackable = false },
	{ id = 2005, name = "item_5", price = 750, rarity = "rare", stackable = false },
	{ id = 2006, name = "item_6", price = 875, rarity = "common", stackable = true },
	{ id = 2007, name = "item_7", price = 1000, rarity = "common", stackable = false },
	{ id = 2008, name = "item_8", price = 1125, rarity = "common", stackable = true },
	{ id = 2009, name = "item_9", price = 1250, rarity = "rare", stackable = true },
	{ id = 2010, name = "item_10", price = 1375, rarity = "legendary", stackable = false },
	{ id = 2011, name = "item_11", price = 1500, rarity = "common", stackable = true },
}

local INDEX_20 = {}
for _, entry in ipairs(CATALOG_20) do
	INDEX_20[entry.name] = entry
end

local function priceOf20(name: string): number
	local entry = INDEX_20[name]
	if not entry then
		return 0
	end
	return entry.price
end


local CATALOG_21 = {
	{ id = 2100, name = "item_0", price = 125, rarity = "rare", stackable = false },
	{ id = 2101, name = "item_1", price = 250, rarity = "epic", stackable = true },
	{ id = 2102, name = "item_2", price = 375, rarity = "epic", stackable = true },
	{ id = 2103, name = "item_3", price = 500, rarity = "common", stackable = false },
	{ id = 2104, name = "item_4", price = 625, rarity = "legendary", stackable = true },
	{ id = 2105, name = "item_5", price = 750, rarity = "legendary", stackable = false },
	{ id = 2106, name = "item_6", price = 875, rarity = "common", stackable = false },
	{ id = 2107, name = "item_7", price = 1000, rarity = "common", stackable = true },
	{ id = 2108, name = "item_8", price = 1125, rarity = "common", stackable = false },
	{ id = 2109, name = "item_9", price = 1250, rarity = "rare", stackable = true },
	{ id = 2110, name = "item_10", price = 1375, rarity = "rare", stackable = false },
	{ id = 2111, name = "item_11", price = 1500, rarity = "common", stackable = true },
}

local INDEX_21 = {}
for _, entry in ipairs(CATALOG_21) do
	INDEX_21[entry.name] = entry
end

local function priceOf21(name: string): number
	local entry = INDEX_21[name]
	if not entry then
		return 0
	end
	return entry.price
end


local function deepCopy22(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy22(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber22(value: number): string
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

local function retry22(attempts, callback)
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


local service23 = game:GetService("Workspace")
local remote23 = game:GetService("ReplicatedStorage"):WaitForChild("Remote23")
local connection23
connection23 = service23.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection23:Disconnect()
		remote23:FireServer("overflow", accumulated)
	end
end)


local service24 = game:GetService("TweenService")
local remote24 = game:GetService("ReplicatedStorage"):WaitForChild("Remote24")
local connection24
connection24 = service24.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection24:Disconnect()
		remote24:FireServer("overflow", accumulated)
	end
end)


local Class25 = {}
Class25.__index = Class25

function Class25.new(config)
	local self = setmetatable({}, Class25)
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

function Class25:getHealth(): number
	return self.health
end

function Class25:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class25: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class25:getStamina(): number
	return self.stamina
end

function Class25:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class25: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class25:getLevel(): number
	return self.level
end

function Class25:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class25: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class25:getScore(): number
	return self.score
end

function Class25:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class25: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class25:getEnergy(): number
	return self.energy
end

function Class25:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class25: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class25:onChanged(callback)
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

function Class25:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class25 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
end


local Class26 = {}
Class26.__index = Class26

function Class26.new(config)
	local self = setmetatable({}, Class26)
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

function Class26:getHealth(): number
	return self.health
end

function Class26:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class26: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class26:getStamina(): number
	return self.stamina
end

function Class26:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class26: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class26:getLevel(): number
	return self.level
end

function Class26:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class26: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class26:getScore(): number
	return self.score
end

function Class26:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class26: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class26:getEnergy(): number
	return self.energy
end

function Class26:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class26: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class26:onChanged(callback)
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

function Class26:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class26 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
end


local Class27 = {}
Class27.__index = Class27

function Class27.new(config)
	local self = setmetatable({}, Class27)
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

function Class27:getHealth(): number
	return self.health
end

function Class27:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class27: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class27:getStamina(): number
	return self.stamina
end

function Class27:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class27: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class27:getLevel(): number
	return self.level
end

function Class27:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class27: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class27:getScore(): number
	return self.score
end

function Class27:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class27: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class27:getEnergy(): number
	return self.energy
end

function Class27:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class27: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class27:onChanged(callback)
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

function Class27:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class27 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
end


local function deepCopy28(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy28(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber28(value: number): string
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

local function retry28(attempts, callback)
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


local function deepCopy29(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy29(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber29(value: number): string
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

local function retry29(attempts, callback)
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


local Class30 = {}
Class30.__index = Class30

function Class30.new(config)
	local self = setmetatable({}, Class30)
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

function Class30:getHealth(): number
	return self.health
end

function Class30:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class30: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class30:getStamina(): number
	return self.stamina
end

function Class30:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class30: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class30:getLevel(): number
	return self.level
end

function Class30:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class30: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class30:getScore(): number
	return self.score
end

function Class30:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class30: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class30:getEnergy(): number
	return self.energy
end

function Class30:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class30: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class30:onChanged(callback)
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

function Class30:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class30 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
end


local function deepCopy31(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy31(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber31(value: number): string
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

local function retry31(attempts, callback)
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


local service32 = game:GetService("TweenService")
local remote32 = game:GetService("ReplicatedStorage"):WaitForChild("Remote32")
local connection32
connection32 = service32.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection32:Disconnect()
		remote32:FireServer("overflow", accumulated)
	end
end)


local Class33 = {}
Class33.__index = Class33

function Class33.new(config)
	local self = setmetatable({}, Class33)
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

function Class33:getHealth(): number
	return self.health
end

function Class33:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class33: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class33:getStamina(): number
	return self.stamina
end

function Class33:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class33: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class33:getLevel(): number
	return self.level
end

function Class33:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class33: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class33:getScore(): number
	return self.score
end

function Class33:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class33: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class33:getEnergy(): number
	return self.energy
end

function Class33:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class33: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class33:onChanged(callback)
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

function Class33:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class33 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
end


local function deepCopy34(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy34(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber34(value: number): string
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

local function retry34(attempts, callback)
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


local service35 = game:GetService("RunService")
local remote35 = game:GetService("ReplicatedStorage"):WaitForChild("Remote35")
local connection35
connection35 = service35.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection35:Disconnect()
		remote35:FireServer("overflow", accumulated)
	end
end)


local Class36 = {}
Class36.__index = Class36

function Class36.new(config)
	local self = setmetatable({}, Class36)
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

function Class36:getHealth(): number
	return self.health
end

function Class36:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class36: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class36:getStamina(): number
	return self.stamina
end

function Class36:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class36: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class36:getLevel(): number
	return self.level
end

function Class36:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class36: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class36:getScore(): number
	return self.score
end

function Class36:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class36: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class36:getEnergy(): number
	return self.energy
end

function Class36:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class36: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class36:onChanged(callback)
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

function Class36:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class36 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
end


local Class37 = {}
Class37.__index = Class37

function Class37.new(config)
	local self = setmetatable({}, Class37)
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

function Class37:getHealth(): number
	return self.health
end

function Class37:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class37: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class37:getStamina(): number
	return self.stamina
end

function Class37:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class37: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class37:getLevel(): number
	return self.level
end

function Class37:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class37: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class37:getScore(): number
	return self.score
end

function Class37:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class37: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class37:getEnergy(): number
	return self.energy
end

function Class37:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class37: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class37:onChanged(callback)
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

function Class37:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class37 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
end


local service38 = game:GetService("UserInputService")
local remote38 = game:GetService("ReplicatedStorage"):WaitForChild("Remote38")
local connection38
connection38 = service38.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection38:Disconnect()
		remote38:FireServer("overflow", accumulated)
	end
end)


local CATALOG_39 = {
	{ id = 3900, name = "item_0", price = 125, rarity = "legendary", stackable = true },
	{ id = 3901, name = "item_1", price = 250, rarity = "legendary", stackable = true },
	{ id = 3902, name = "item_2", price = 375, rarity = "epic", stackable = true },
	{ id = 3903, name = "item_3", price = 500, rarity = "epic", stackable = true },
	{ id = 3904, name = "item_4", price = 625, rarity = "legendary", stackable = true },
	{ id = 3905, name = "item_5", price = 750, rarity = "epic", stackable = true },
	{ id = 3906, name = "item_6", price = 875, rarity = "epic", stackable = true },
	{ id = 3907, name = "item_7", price = 1000, rarity = "legendary", stackable = false },
	{ id = 3908, name = "item_8", price = 1125, rarity = "legendary", stackable = false },
	{ id = 3909, name = "item_9", price = 1250, rarity = "epic", stackable = true },
	{ id = 3910, name = "item_10", price = 1375, rarity = "rare", stackable = true },
	{ id = 3911, name = "item_11", price = 1500, rarity = "rare", stackable = true },
}

local INDEX_39 = {}
for _, entry in ipairs(CATALOG_39) do
	INDEX_39[entry.name] = entry
end

local function priceOf39(name: string): number
	local entry = INDEX_39[name]
	if not entry then
		return 0
	end
	return entry.price
end


local CATALOG_40 = {
	{ id = 4000, name = "item_0", price = 125, rarity = "common", stackable = false },
	{ id = 4001, name = "item_1", price = 250, rarity = "common", stackable = true },
	{ id = 4002, name = "item_2", price = 375, rarity = "epic", stackable = false },
	{ id = 4003, name = "item_3", price = 500, rarity = "epic", stackable = false },
	{ id = 4004, name = "item_4", price = 625, rarity = "common", stackable = true },
	{ id = 4005, name = "item_5", price = 750, rarity = "legendary", stackable = true },
	{ id = 4006, name = "item_6", price = 875, rarity = "rare", stackable = true },
	{ id = 4007, name = "item_7", price = 1000, rarity = "common", stackable = false },
	{ id = 4008, name = "item_8", price = 1125, rarity = "epic", stackable = false },
	{ id = 4009, name = "item_9", price = 1250, rarity = "common", stackable = false },
	{ id = 4010, name = "item_10", price = 1375, rarity = "legendary", stackable = false },
	{ id = 4011, name = "item_11", price = 1500, rarity = "common", stackable = true },
}

local INDEX_40 = {}
for _, entry in ipairs(CATALOG_40) do
	INDEX_40[entry.name] = entry
end

local function priceOf40(name: string): number
	local entry = INDEX_40[name]
	if not entry then
		return 0
	end
	return entry.price
end


local service41 = game:GetService("UserInputService")
local remote41 = game:GetService("ReplicatedStorage"):WaitForChild("Remote41")
local connection41
connection41 = service41.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection41:Disconnect()
		remote41:FireServer("overflow", accumulated)
	end
end)


local service42 = game:GetService("TweenService")
local remote42 = game:GetService("ReplicatedStorage"):WaitForChild("Remote42")
local connection42
connection42 = service42.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection42:Disconnect()
		remote42:FireServer("overflow", accumulated)
	end
end)


local Class43 = {}
Class43.__index = Class43

function Class43.new(config)
	local self = setmetatable({}, Class43)
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

function Class43:getHealth(): number
	return self.health
end

function Class43:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class43: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class43:getStamina(): number
	return self.stamina
end

function Class43:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class43: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class43:getLevel(): number
	return self.level
end

function Class43:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class43: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class43:getScore(): number
	return self.score
end

function Class43:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class43: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class43:getEnergy(): number
	return self.energy
end

function Class43:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class43: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class43:onChanged(callback)
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

function Class43:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class43 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
end


local service44 = game:GetService("Players")
local remote44 = game:GetService("ReplicatedStorage"):WaitForChild("Remote44")
local connection44
connection44 = service44.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection44:Disconnect()
		remote44:FireServer("overflow", accumulated)
	end
end)


local service45 = game:GetService("TweenService")
local remote45 = game:GetService("ReplicatedStorage"):WaitForChild("Remote45")
local connection45
connection45 = service45.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection45:Disconnect()
		remote45:FireServer("overflow", accumulated)
	end
end)


local CATALOG_46 = {
	{ id = 4600, name = "item_0", price = 125, rarity = "common", stackable = true },
	{ id = 4601, name = "item_1", price = 250, rarity = "legendary", stackable = false },
	{ id = 4602, name = "item_2", price = 375, rarity = "epic", stackable = true },
	{ id = 4603, name = "item_3", price = 500, rarity = "common", stackable = true },
	{ id = 4604, name = "item_4", price = 625, rarity = "epic", stackable = false },
	{ id = 4605, name = "item_5", price = 750, rarity = "legendary", stackable = true },
	{ id = 4606, name = "item_6", price = 875, rarity = "rare", stackable = false },
	{ id = 4607, name = "item_7", price = 1000, rarity = "common", stackable = true },
	{ id = 4608, name = "item_8", price = 1125, rarity = "legendary", stackable = false },
	{ id = 4609, name = "item_9", price = 1250, rarity = "rare", stackable = false },
	{ id = 4610, name = "item_10", price = 1375, rarity = "epic", stackable = true },
	{ id = 4611, name = "item_11", price = 1500, rarity = "rare", stackable = false },
}

local INDEX_46 = {}
for _, entry in ipairs(CATALOG_46) do
	INDEX_46[entry.name] = entry
end

local function priceOf46(name: string): number
	local entry = INDEX_46[name]
	if not entry then
		return 0
	end
	return entry.price
end


local CATALOG_47 = {
	{ id = 4700, name = "item_0", price = 125, rarity = "rare", stackable = false },
	{ id = 4701, name = "item_1", price = 250, rarity = "legendary", stackable = true },
	{ id = 4702, name = "item_2", price = 375, rarity = "common", stackable = false },
	{ id = 4703, name = "item_3", price = 500, rarity = "common", stackable = false },
	{ id = 4704, name = "item_4", price = 625, rarity = "legendary", stackable = true },
	{ id = 4705, name = "item_5", price = 750, rarity = "epic", stackable = false },
	{ id = 4706, name = "item_6", price = 875, rarity = "common", stackable = true },
	{ id = 4707, name = "item_7", price = 1000, rarity = "epic", stackable = true },
	{ id = 4708, name = "item_8", price = 1125, rarity = "legendary", stackable = true },
	{ id = 4709, name = "item_9", price = 1250, rarity = "legendary", stackable = false },
	{ id = 4710, name = "item_10", price = 1375, rarity = "common", stackable = false },
	{ id = 4711, name = "item_11", price = 1500, rarity = "epic", stackable = true },
}

local INDEX_47 = {}
for _, entry in ipairs(CATALOG_47) do
	INDEX_47[entry.name] = entry
end

local function priceOf47(name: string): number
	local entry = INDEX_47[name]
	if not entry then
		return 0
	end
	return entry.price
end


print("loaded", 48)