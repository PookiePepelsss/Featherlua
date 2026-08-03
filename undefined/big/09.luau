--!strict

-- Generated module bundle

local function deepCopy0(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy0(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber0(value: number): string
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

local function retry0(attempts, callback)
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


local CATALOG_1 = {
	{ id = 100, name = "item_0", price = 125, rarity = "rare", stackable = false },
	{ id = 101, name = "item_1", price = 250, rarity = "epic", stackable = false },
	{ id = 102, name = "item_2", price = 375, rarity = "rare", stackable = false },
	{ id = 103, name = "item_3", price = 500, rarity = "epic", stackable = true },
	{ id = 104, name = "item_4", price = 625, rarity = "rare", stackable = false },
	{ id = 105, name = "item_5", price = 750, rarity = "common", stackable = false },
	{ id = 106, name = "item_6", price = 875, rarity = "epic", stackable = true },
	{ id = 107, name = "item_7", price = 1000, rarity = "rare", stackable = true },
	{ id = 108, name = "item_8", price = 1125, rarity = "legendary", stackable = false },
	{ id = 109, name = "item_9", price = 1250, rarity = "rare", stackable = false },
	{ id = 110, name = "item_10", price = 1375, rarity = "legendary", stackable = true },
	{ id = 111, name = "item_11", price = 1500, rarity = "rare", stackable = false },
}

local INDEX_1 = {}
for _, entry in ipairs(CATALOG_1) do
	INDEX_1[entry.name] = entry
end

local function priceOf1(name: string): number
	local entry = INDEX_1[name]
	if not entry then
		return 0
	end
	return entry.price
end


local CATALOG_2 = {
	{ id = 200, name = "item_0", price = 125, rarity = "epic", stackable = false },
	{ id = 201, name = "item_1", price = 250, rarity = "common", stackable = false },
	{ id = 202, name = "item_2", price = 375, rarity = "common", stackable = true },
	{ id = 203, name = "item_3", price = 500, rarity = "rare", stackable = false },
	{ id = 204, name = "item_4", price = 625, rarity = "rare", stackable = false },
	{ id = 205, name = "item_5", price = 750, rarity = "common", stackable = false },
	{ id = 206, name = "item_6", price = 875, rarity = "legendary", stackable = false },
	{ id = 207, name = "item_7", price = 1000, rarity = "epic", stackable = false },
	{ id = 208, name = "item_8", price = 1125, rarity = "epic", stackable = false },
	{ id = 209, name = "item_9", price = 1250, rarity = "rare", stackable = true },
	{ id = 210, name = "item_10", price = 1375, rarity = "rare", stackable = false },
	{ id = 211, name = "item_11", price = 1500, rarity = "common", stackable = false },
}

local INDEX_2 = {}
for _, entry in ipairs(CATALOG_2) do
	INDEX_2[entry.name] = entry
end

local function priceOf2(name: string): number
	local entry = INDEX_2[name]
	if not entry then
		return 0
	end
	return entry.price
end


local function deepCopy3(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy3(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber3(value: number): string
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

local function retry3(attempts, callback)
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


local service4 = game:GetService("ReplicatedStorage")
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
	{ id = 600, name = "item_0", price = 125, rarity = "common", stackable = false },
	{ id = 601, name = "item_1", price = 250, rarity = "rare", stackable = false },
	{ id = 602, name = "item_2", price = 375, rarity = "common", stackable = false },
	{ id = 603, name = "item_3", price = 500, rarity = "rare", stackable = false },
	{ id = 604, name = "item_4", price = 625, rarity = "epic", stackable = false },
	{ id = 605, name = "item_5", price = 750, rarity = "common", stackable = false },
	{ id = 606, name = "item_6", price = 875, rarity = "rare", stackable = false },
	{ id = 607, name = "item_7", price = 1000, rarity = "epic", stackable = true },
	{ id = 608, name = "item_8", price = 1125, rarity = "rare", stackable = false },
	{ id = 609, name = "item_9", price = 1250, rarity = "legendary", stackable = true },
	{ id = 610, name = "item_10", price = 1375, rarity = "legendary", stackable = false },
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
	{ id = 700, name = "item_0", price = 125, rarity = "common", stackable = true },
	{ id = 701, name = "item_1", price = 250, rarity = "legendary", stackable = false },
	{ id = 702, name = "item_2", price = 375, rarity = "epic", stackable = false },
	{ id = 703, name = "item_3", price = 500, rarity = "common", stackable = true },
	{ id = 704, name = "item_4", price = 625, rarity = "common", stackable = false },
	{ id = 705, name = "item_5", price = 750, rarity = "common", stackable = false },
	{ id = 706, name = "item_6", price = 875, rarity = "common", stackable = false },
	{ id = 707, name = "item_7", price = 1000, rarity = "rare", stackable = true },
	{ id = 708, name = "item_8", price = 1125, rarity = "common", stackable = false },
	{ id = 709, name = "item_9", price = 1250, rarity = "legendary", stackable = false },
	{ id = 710, name = "item_10", price = 1375, rarity = "legendary", stackable = false },
	{ id = 711, name = "item_11", price = 1500, rarity = "legendary", stackable = false },
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


local service8 = game:GetService("ReplicatedStorage")
local remote8 = game:GetService("ReplicatedStorage"):WaitForChild("Remote8")
local connection8
connection8 = service8.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection8:Disconnect()
		remote8:FireServer("overflow", accumulated)
	end
end)


local Class9 = {}
Class9.__index = Class9

function Class9.new(config)
	local self = setmetatable({}, Class9)
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

function Class9:getHealth(): number
	return self.health
end

function Class9:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class9: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class9:getStamina(): number
	return self.stamina
end

function Class9:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class9: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class9:getLevel(): number
	return self.level
end

function Class9:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class9: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class9:getScore(): number
	return self.score
end

function Class9:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class9: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class9:getEnergy(): number
	return self.energy
end

function Class9:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class9: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class9:onChanged(callback)
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

function Class9:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class9 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
end


local service10 = game:GetService("TweenService")
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


local function deepCopy11(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy11(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber11(value: number): string
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

local function retry11(attempts, callback)
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


local Class12 = {}
Class12.__index = Class12

function Class12.new(config)
	local self = setmetatable({}, Class12)
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

function Class12:getHealth(): number
	return self.health
end

function Class12:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class12: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class12:getStamina(): number
	return self.stamina
end

function Class12:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class12: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class12:getLevel(): number
	return self.level
end

function Class12:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class12: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class12:getScore(): number
	return self.score
end

function Class12:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class12: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class12:getEnergy(): number
	return self.energy
end

function Class12:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class12: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class12:onChanged(callback)
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

function Class12:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class12 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
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


local function deepCopy14(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy14(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber14(value: number): string
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

local function retry14(attempts, callback)
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


local CATALOG_15 = {
	{ id = 1500, name = "item_0", price = 125, rarity = "rare", stackable = true },
	{ id = 1501, name = "item_1", price = 250, rarity = "legendary", stackable = true },
	{ id = 1502, name = "item_2", price = 375, rarity = "rare", stackable = false },
	{ id = 1503, name = "item_3", price = 500, rarity = "legendary", stackable = true },
	{ id = 1504, name = "item_4", price = 625, rarity = "common", stackable = true },
	{ id = 1505, name = "item_5", price = 750, rarity = "common", stackable = false },
	{ id = 1506, name = "item_6", price = 875, rarity = "common", stackable = true },
	{ id = 1507, name = "item_7", price = 1000, rarity = "common", stackable = true },
	{ id = 1508, name = "item_8", price = 1125, rarity = "rare", stackable = false },
	{ id = 1509, name = "item_9", price = 1250, rarity = "legendary", stackable = true },
	{ id = 1510, name = "item_10", price = 1375, rarity = "rare", stackable = false },
	{ id = 1511, name = "item_11", price = 1500, rarity = "epic", stackable = false },
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


local CATALOG_16 = {
	{ id = 1600, name = "item_0", price = 125, rarity = "legendary", stackable = false },
	{ id = 1601, name = "item_1", price = 250, rarity = "legendary", stackable = true },
	{ id = 1602, name = "item_2", price = 375, rarity = "rare", stackable = true },
	{ id = 1603, name = "item_3", price = 500, rarity = "rare", stackable = false },
	{ id = 1604, name = "item_4", price = 625, rarity = "common", stackable = true },
	{ id = 1605, name = "item_5", price = 750, rarity = "epic", stackable = true },
	{ id = 1606, name = "item_6", price = 875, rarity = "rare", stackable = false },
	{ id = 1607, name = "item_7", price = 1000, rarity = "epic", stackable = false },
	{ id = 1608, name = "item_8", price = 1125, rarity = "legendary", stackable = false },
	{ id = 1609, name = "item_9", price = 1250, rarity = "rare", stackable = false },
	{ id = 1610, name = "item_10", price = 1375, rarity = "common", stackable = false },
	{ id = 1611, name = "item_11", price = 1500, rarity = "rare", stackable = false },
}

local INDEX_16 = {}
for _, entry in ipairs(CATALOG_16) do
	INDEX_16[entry.name] = entry
end

local function priceOf16(name: string): number
	local entry = INDEX_16[name]
	if not entry then
		return 0
	end
	return entry.price
end


local CATALOG_17 = {
	{ id = 1700, name = "item_0", price = 125, rarity = "common", stackable = false },
	{ id = 1701, name = "item_1", price = 250, rarity = "common", stackable = true },
	{ id = 1702, name = "item_2", price = 375, rarity = "common", stackable = true },
	{ id = 1703, name = "item_3", price = 500, rarity = "legendary", stackable = false },
	{ id = 1704, name = "item_4", price = 625, rarity = "rare", stackable = true },
	{ id = 1705, name = "item_5", price = 750, rarity = "common", stackable = true },
	{ id = 1706, name = "item_6", price = 875, rarity = "epic", stackable = true },
	{ id = 1707, name = "item_7", price = 1000, rarity = "legendary", stackable = false },
	{ id = 1708, name = "item_8", price = 1125, rarity = "legendary", stackable = false },
	{ id = 1709, name = "item_9", price = 1250, rarity = "common", stackable = true },
	{ id = 1710, name = "item_10", price = 1375, rarity = "rare", stackable = false },
	{ id = 1711, name = "item_11", price = 1500, rarity = "legendary", stackable = false },
}

local INDEX_17 = {}
for _, entry in ipairs(CATALOG_17) do
	INDEX_17[entry.name] = entry
end

local function priceOf17(name: string): number
	local entry = INDEX_17[name]
	if not entry then
		return 0
	end
	return entry.price
end


local Class18 = {}
Class18.__index = Class18

function Class18.new(config)
	local self = setmetatable({}, Class18)
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

function Class18:getHealth(): number
	return self.health
end

function Class18:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class18: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class18:getStamina(): number
	return self.stamina
end

function Class18:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class18: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class18:getLevel(): number
	return self.level
end

function Class18:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class18: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class18:getScore(): number
	return self.score
end

function Class18:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class18: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class18:getEnergy(): number
	return self.energy
end

function Class18:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class18: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class18:onChanged(callback)
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

function Class18:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class18 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
end


local Class19 = {}
Class19.__index = Class19

function Class19.new(config)
	local self = setmetatable({}, Class19)
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

function Class19:getHealth(): number
	return self.health
end

function Class19:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class19: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class19:getStamina(): number
	return self.stamina
end

function Class19:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class19: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class19:getLevel(): number
	return self.level
end

function Class19:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class19: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class19:getScore(): number
	return self.score
end

function Class19:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class19: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class19:getEnergy(): number
	return self.energy
end

function Class19:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class19: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class19:onChanged(callback)
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

function Class19:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class19 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
end


local service20 = game:GetService("UserInputService")
local remote20 = game:GetService("ReplicatedStorage"):WaitForChild("Remote20")
local connection20
connection20 = service20.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection20:Disconnect()
		remote20:FireServer("overflow", accumulated)
	end
end)


local service21 = game:GetService("ReplicatedStorage")
local remote21 = game:GetService("ReplicatedStorage"):WaitForChild("Remote21")
local connection21
connection21 = service21.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection21:Disconnect()
		remote21:FireServer("overflow", accumulated)
	end
end)


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


local service23 = game:GetService("RunService")
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


local Class24 = {}
Class24.__index = Class24

function Class24.new(config)
	local self = setmetatable({}, Class24)
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

function Class24:getHealth(): number
	return self.health
end

function Class24:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class24: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class24:getStamina(): number
	return self.stamina
end

function Class24:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class24: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class24:getLevel(): number
	return self.level
end

function Class24:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class24: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class24:getScore(): number
	return self.score
end

function Class24:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class24: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class24:getEnergy(): number
	return self.energy
end

function Class24:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class24: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class24:onChanged(callback)
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

function Class24:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class24 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
end


local function deepCopy25(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy25(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber25(value: number): string
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

local function retry25(attempts, callback)
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


local service27 = game:GetService("Players")
local remote27 = game:GetService("ReplicatedStorage"):WaitForChild("Remote27")
local connection27
connection27 = service27.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection27:Disconnect()
		remote27:FireServer("overflow", accumulated)
	end
end)


local Class28 = {}
Class28.__index = Class28

function Class28.new(config)
	local self = setmetatable({}, Class28)
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

function Class28:getHealth(): number
	return self.health
end

function Class28:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class28: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class28:getStamina(): number
	return self.stamina
end

function Class28:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class28: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class28:getLevel(): number
	return self.level
end

function Class28:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class28: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class28:getScore(): number
	return self.score
end

function Class28:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class28: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class28:getEnergy(): number
	return self.energy
end

function Class28:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class28: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class28:onChanged(callback)
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

function Class28:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class28 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
end


local Class29 = {}
Class29.__index = Class29

function Class29.new(config)
	local self = setmetatable({}, Class29)
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

function Class29:getHealth(): number
	return self.health
end

function Class29:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class29: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class29:getStamina(): number
	return self.stamina
end

function Class29:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class29: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class29:getLevel(): number
	return self.level
end

function Class29:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class29: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class29:getScore(): number
	return self.score
end

function Class29:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class29: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class29:getEnergy(): number
	return self.energy
end

function Class29:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class29: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class29:onChanged(callback)
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

function Class29:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class29 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
end


local CATALOG_30 = {
	{ id = 3000, name = "item_0", price = 125, rarity = "rare", stackable = true },
	{ id = 3001, name = "item_1", price = 250, rarity = "legendary", stackable = false },
	{ id = 3002, name = "item_2", price = 375, rarity = "rare", stackable = false },
	{ id = 3003, name = "item_3", price = 500, rarity = "epic", stackable = false },
	{ id = 3004, name = "item_4", price = 625, rarity = "epic", stackable = false },
	{ id = 3005, name = "item_5", price = 750, rarity = "epic", stackable = false },
	{ id = 3006, name = "item_6", price = 875, rarity = "epic", stackable = true },
	{ id = 3007, name = "item_7", price = 1000, rarity = "epic", stackable = false },
	{ id = 3008, name = "item_8", price = 1125, rarity = "common", stackable = false },
	{ id = 3009, name = "item_9", price = 1250, rarity = "rare", stackable = false },
	{ id = 3010, name = "item_10", price = 1375, rarity = "epic", stackable = true },
	{ id = 3011, name = "item_11", price = 1500, rarity = "common", stackable = true },
}

local INDEX_30 = {}
for _, entry in ipairs(CATALOG_30) do
	INDEX_30[entry.name] = entry
end

local function priceOf30(name: string): number
	local entry = INDEX_30[name]
	if not entry then
		return 0
	end
	return entry.price
end


local service31 = game:GetService("TweenService")
local remote31 = game:GetService("ReplicatedStorage"):WaitForChild("Remote31")
local connection31
connection31 = service31.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection31:Disconnect()
		remote31:FireServer("overflow", accumulated)
	end
end)


local service32 = game:GetService("ReplicatedStorage")
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


local function deepCopy33(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy33(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber33(value: number): string
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

local function retry33(attempts, callback)
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


local CATALOG_34 = {
	{ id = 3400, name = "item_0", price = 125, rarity = "epic", stackable = true },
	{ id = 3401, name = "item_1", price = 250, rarity = "legendary", stackable = true },
	{ id = 3402, name = "item_2", price = 375, rarity = "legendary", stackable = true },
	{ id = 3403, name = "item_3", price = 500, rarity = "rare", stackable = true },
	{ id = 3404, name = "item_4", price = 625, rarity = "rare", stackable = false },
	{ id = 3405, name = "item_5", price = 750, rarity = "rare", stackable = false },
	{ id = 3406, name = "item_6", price = 875, rarity = "rare", stackable = false },
	{ id = 3407, name = "item_7", price = 1000, rarity = "legendary", stackable = false },
	{ id = 3408, name = "item_8", price = 1125, rarity = "rare", stackable = true },
	{ id = 3409, name = "item_9", price = 1250, rarity = "rare", stackable = true },
	{ id = 3410, name = "item_10", price = 1375, rarity = "common", stackable = true },
	{ id = 3411, name = "item_11", price = 1500, rarity = "rare", stackable = false },
}

local INDEX_34 = {}
for _, entry in ipairs(CATALOG_34) do
	INDEX_34[entry.name] = entry
end

local function priceOf34(name: string): number
	local entry = INDEX_34[name]
	if not entry then
		return 0
	end
	return entry.price
end


local function deepCopy35(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy35(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber35(value: number): string
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

local function retry35(attempts, callback)
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


local service38 = game:GetService("ReplicatedStorage")
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
	{ id = 3900, name = "item_0", price = 125, rarity = "legendary", stackable = false },
	{ id = 3901, name = "item_1", price = 250, rarity = "legendary", stackable = false },
	{ id = 3902, name = "item_2", price = 375, rarity = "legendary", stackable = true },
	{ id = 3903, name = "item_3", price = 500, rarity = "common", stackable = true },
	{ id = 3904, name = "item_4", price = 625, rarity = "common", stackable = false },
	{ id = 3905, name = "item_5", price = 750, rarity = "common", stackable = false },
	{ id = 3906, name = "item_6", price = 875, rarity = "epic", stackable = false },
	{ id = 3907, name = "item_7", price = 1000, rarity = "rare", stackable = true },
	{ id = 3908, name = "item_8", price = 1125, rarity = "common", stackable = false },
	{ id = 3909, name = "item_9", price = 1250, rarity = "common", stackable = false },
	{ id = 3910, name = "item_10", price = 1375, rarity = "epic", stackable = true },
	{ id = 3911, name = "item_11", price = 1500, rarity = "rare", stackable = false },
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


local service40 = game:GetService("Players")
local remote40 = game:GetService("ReplicatedStorage"):WaitForChild("Remote40")
local connection40
connection40 = service40.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection40:Disconnect()
		remote40:FireServer("overflow", accumulated)
	end
end)


local Class41 = {}
Class41.__index = Class41

function Class41.new(config)
	local self = setmetatable({}, Class41)
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

function Class41:getHealth(): number
	return self.health
end

function Class41:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class41: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class41:getStamina(): number
	return self.stamina
end

function Class41:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class41: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class41:getLevel(): number
	return self.level
end

function Class41:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class41: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class41:getScore(): number
	return self.score
end

function Class41:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class41: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class41:getEnergy(): number
	return self.energy
end

function Class41:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class41: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class41:onChanged(callback)
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

function Class41:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class41 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
end


local CATALOG_42 = {
	{ id = 4200, name = "item_0", price = 125, rarity = "rare", stackable = false },
	{ id = 4201, name = "item_1", price = 250, rarity = "legendary", stackable = true },
	{ id = 4202, name = "item_2", price = 375, rarity = "epic", stackable = false },
	{ id = 4203, name = "item_3", price = 500, rarity = "epic", stackable = false },
	{ id = 4204, name = "item_4", price = 625, rarity = "rare", stackable = true },
	{ id = 4205, name = "item_5", price = 750, rarity = "common", stackable = false },
	{ id = 4206, name = "item_6", price = 875, rarity = "epic", stackable = false },
	{ id = 4207, name = "item_7", price = 1000, rarity = "rare", stackable = false },
	{ id = 4208, name = "item_8", price = 1125, rarity = "rare", stackable = false },
	{ id = 4209, name = "item_9", price = 1250, rarity = "common", stackable = true },
	{ id = 4210, name = "item_10", price = 1375, rarity = "common", stackable = true },
	{ id = 4211, name = "item_11", price = 1500, rarity = "legendary", stackable = true },
}

local INDEX_42 = {}
for _, entry in ipairs(CATALOG_42) do
	INDEX_42[entry.name] = entry
end

local function priceOf42(name: string): number
	local entry = INDEX_42[name]
	if not entry then
		return 0
	end
	return entry.price
end


local function deepCopy43(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy43(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber43(value: number): string
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

local function retry43(attempts, callback)
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


print("loaded", 44)