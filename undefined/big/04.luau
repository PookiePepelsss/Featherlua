--!strict

-- Generated module bundle

local CATALOG_0 = {
	{ id = 0, name = "item_0", price = 125, rarity = "epic", stackable = true },
	{ id = 1, name = "item_1", price = 250, rarity = "rare", stackable = true },
	{ id = 2, name = "item_2", price = 375, rarity = "epic", stackable = true },
	{ id = 3, name = "item_3", price = 500, rarity = "legendary", stackable = true },
	{ id = 4, name = "item_4", price = 625, rarity = "common", stackable = true },
	{ id = 5, name = "item_5", price = 750, rarity = "legendary", stackable = false },
	{ id = 6, name = "item_6", price = 875, rarity = "epic", stackable = false },
	{ id = 7, name = "item_7", price = 1000, rarity = "common", stackable = false },
	{ id = 8, name = "item_8", price = 1125, rarity = "epic", stackable = false },
	{ id = 9, name = "item_9", price = 1250, rarity = "common", stackable = false },
	{ id = 10, name = "item_10", price = 1375, rarity = "common", stackable = true },
	{ id = 11, name = "item_11", price = 1500, rarity = "rare", stackable = true },
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


local CATALOG_1 = {
	{ id = 100, name = "item_0", price = 125, rarity = "common", stackable = false },
	{ id = 101, name = "item_1", price = 250, rarity = "rare", stackable = true },
	{ id = 102, name = "item_2", price = 375, rarity = "epic", stackable = false },
	{ id = 103, name = "item_3", price = 500, rarity = "legendary", stackable = false },
	{ id = 104, name = "item_4", price = 625, rarity = "legendary", stackable = true },
	{ id = 105, name = "item_5", price = 750, rarity = "common", stackable = true },
	{ id = 106, name = "item_6", price = 875, rarity = "common", stackable = false },
	{ id = 107, name = "item_7", price = 1000, rarity = "legendary", stackable = true },
	{ id = 108, name = "item_8", price = 1125, rarity = "rare", stackable = true },
	{ id = 109, name = "item_9", price = 1250, rarity = "common", stackable = true },
	{ id = 110, name = "item_10", price = 1375, rarity = "epic", stackable = true },
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


local function deepCopy2(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy2(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber2(value: number): string
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

local function retry2(attempts, callback)
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


local service3 = game:GetService("Players")
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


local service6 = game:GetService("RunService")
local remote6 = game:GetService("ReplicatedStorage"):WaitForChild("Remote6")
local connection6
connection6 = service6.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection6:Disconnect()
		remote6:FireServer("overflow", accumulated)
	end
end)


local function deepCopy7(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy7(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber7(value: number): string
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

local function retry7(attempts, callback)
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


local CATALOG_8 = {
	{ id = 800, name = "item_0", price = 125, rarity = "epic", stackable = true },
	{ id = 801, name = "item_1", price = 250, rarity = "common", stackable = false },
	{ id = 802, name = "item_2", price = 375, rarity = "epic", stackable = false },
	{ id = 803, name = "item_3", price = 500, rarity = "epic", stackable = false },
	{ id = 804, name = "item_4", price = 625, rarity = "legendary", stackable = true },
	{ id = 805, name = "item_5", price = 750, rarity = "epic", stackable = true },
	{ id = 806, name = "item_6", price = 875, rarity = "legendary", stackable = false },
	{ id = 807, name = "item_7", price = 1000, rarity = "rare", stackable = true },
	{ id = 808, name = "item_8", price = 1125, rarity = "common", stackable = false },
	{ id = 809, name = "item_9", price = 1250, rarity = "rare", stackable = true },
	{ id = 810, name = "item_10", price = 1375, rarity = "epic", stackable = false },
	{ id = 811, name = "item_11", price = 1500, rarity = "common", stackable = false },
}

local INDEX_8 = {}
for _, entry in ipairs(CATALOG_8) do
	INDEX_8[entry.name] = entry
end

local function priceOf8(name: string): number
	local entry = INDEX_8[name]
	if not entry then
		return 0
	end
	return entry.price
end


local service9 = game:GetService("RunService")
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


local CATALOG_10 = {
	{ id = 1000, name = "item_0", price = 125, rarity = "common", stackable = true },
	{ id = 1001, name = "item_1", price = 250, rarity = "common", stackable = false },
	{ id = 1002, name = "item_2", price = 375, rarity = "epic", stackable = false },
	{ id = 1003, name = "item_3", price = 500, rarity = "common", stackable = false },
	{ id = 1004, name = "item_4", price = 625, rarity = "legendary", stackable = true },
	{ id = 1005, name = "item_5", price = 750, rarity = "rare", stackable = true },
	{ id = 1006, name = "item_6", price = 875, rarity = "epic", stackable = false },
	{ id = 1007, name = "item_7", price = 1000, rarity = "rare", stackable = false },
	{ id = 1008, name = "item_8", price = 1125, rarity = "epic", stackable = true },
	{ id = 1009, name = "item_9", price = 1250, rarity = "common", stackable = true },
	{ id = 1010, name = "item_10", price = 1375, rarity = "epic", stackable = true },
	{ id = 1011, name = "item_11", price = 1500, rarity = "common", stackable = false },
}

local INDEX_10 = {}
for _, entry in ipairs(CATALOG_10) do
	INDEX_10[entry.name] = entry
end

local function priceOf10(name: string): number
	local entry = INDEX_10[name]
	if not entry then
		return 0
	end
	return entry.price
end


local CATALOG_11 = {
	{ id = 1100, name = "item_0", price = 125, rarity = "rare", stackable = true },
	{ id = 1101, name = "item_1", price = 250, rarity = "epic", stackable = false },
	{ id = 1102, name = "item_2", price = 375, rarity = "rare", stackable = true },
	{ id = 1103, name = "item_3", price = 500, rarity = "rare", stackable = true },
	{ id = 1104, name = "item_4", price = 625, rarity = "common", stackable = true },
	{ id = 1105, name = "item_5", price = 750, rarity = "rare", stackable = true },
	{ id = 1106, name = "item_6", price = 875, rarity = "rare", stackable = false },
	{ id = 1107, name = "item_7", price = 1000, rarity = "epic", stackable = true },
	{ id = 1108, name = "item_8", price = 1125, rarity = "common", stackable = false },
	{ id = 1109, name = "item_9", price = 1250, rarity = "rare", stackable = true },
	{ id = 1110, name = "item_10", price = 1375, rarity = "epic", stackable = true },
	{ id = 1111, name = "item_11", price = 1500, rarity = "common", stackable = true },
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


local Class13 = {}
Class13.__index = Class13

function Class13.new(config)
	local self = setmetatable({}, Class13)
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

function Class13:getHealth(): number
	return self.health
end

function Class13:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class13: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class13:getStamina(): number
	return self.stamina
end

function Class13:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class13: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class13:getLevel(): number
	return self.level
end

function Class13:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class13: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class13:getScore(): number
	return self.score
end

function Class13:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class13: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class13:getEnergy(): number
	return self.energy
end

function Class13:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class13: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class13:onChanged(callback)
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

function Class13:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class13 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
end


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


local service15 = game:GetService("Workspace")
local remote15 = game:GetService("ReplicatedStorage"):WaitForChild("Remote15")
local connection15
connection15 = service15.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection15:Disconnect()
		remote15:FireServer("overflow", accumulated)
	end
end)


local Class16 = {}
Class16.__index = Class16

function Class16.new(config)
	local self = setmetatable({}, Class16)
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

function Class16:getHealth(): number
	return self.health
end

function Class16:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class16: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class16:getStamina(): number
	return self.stamina
end

function Class16:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class16: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class16:getLevel(): number
	return self.level
end

function Class16:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class16: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class16:getScore(): number
	return self.score
end

function Class16:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class16: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class16:getEnergy(): number
	return self.energy
end

function Class16:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class16: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class16:onChanged(callback)
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

function Class16:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class16 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
end


local CATALOG_17 = {
	{ id = 1700, name = "item_0", price = 125, rarity = "rare", stackable = true },
	{ id = 1701, name = "item_1", price = 250, rarity = "rare", stackable = true },
	{ id = 1702, name = "item_2", price = 375, rarity = "legendary", stackable = false },
	{ id = 1703, name = "item_3", price = 500, rarity = "rare", stackable = false },
	{ id = 1704, name = "item_4", price = 625, rarity = "legendary", stackable = false },
	{ id = 1705, name = "item_5", price = 750, rarity = "rare", stackable = true },
	{ id = 1706, name = "item_6", price = 875, rarity = "legendary", stackable = true },
	{ id = 1707, name = "item_7", price = 1000, rarity = "common", stackable = true },
	{ id = 1708, name = "item_8", price = 1125, rarity = "rare", stackable = true },
	{ id = 1709, name = "item_9", price = 1250, rarity = "rare", stackable = false },
	{ id = 1710, name = "item_10", price = 1375, rarity = "epic", stackable = true },
	{ id = 1711, name = "item_11", price = 1500, rarity = "epic", stackable = false },
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


local CATALOG_19 = {
	{ id = 1900, name = "item_0", price = 125, rarity = "epic", stackable = true },
	{ id = 1901, name = "item_1", price = 250, rarity = "epic", stackable = false },
	{ id = 1902, name = "item_2", price = 375, rarity = "legendary", stackable = true },
	{ id = 1903, name = "item_3", price = 500, rarity = "legendary", stackable = false },
	{ id = 1904, name = "item_4", price = 625, rarity = "rare", stackable = true },
	{ id = 1905, name = "item_5", price = 750, rarity = "epic", stackable = false },
	{ id = 1906, name = "item_6", price = 875, rarity = "rare", stackable = false },
	{ id = 1907, name = "item_7", price = 1000, rarity = "epic", stackable = true },
	{ id = 1908, name = "item_8", price = 1125, rarity = "common", stackable = false },
	{ id = 1909, name = "item_9", price = 1250, rarity = "rare", stackable = false },
	{ id = 1910, name = "item_10", price = 1375, rarity = "rare", stackable = false },
	{ id = 1911, name = "item_11", price = 1500, rarity = "legendary", stackable = true },
}

local INDEX_19 = {}
for _, entry in ipairs(CATALOG_19) do
	INDEX_19[entry.name] = entry
end

local function priceOf19(name: string): number
	local entry = INDEX_19[name]
	if not entry then
		return 0
	end
	return entry.price
end


local service20 = game:GetService("Workspace")
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


local function deepCopy21(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy21(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber21(value: number): string
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

local function retry21(attempts, callback)
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


local function deepCopy23(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy23(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber23(value: number): string
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

local function retry23(attempts, callback)
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


print("loaded", 24)