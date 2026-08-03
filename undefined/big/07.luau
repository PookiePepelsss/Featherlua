--!strict

-- Generated module bundle

local CATALOG_0 = {
	{ id = 0, name = "item_0", price = 125, rarity = "epic", stackable = true },
	{ id = 1, name = "item_1", price = 250, rarity = "legendary", stackable = false },
	{ id = 2, name = "item_2", price = 375, rarity = "common", stackable = false },
	{ id = 3, name = "item_3", price = 500, rarity = "common", stackable = true },
	{ id = 4, name = "item_4", price = 625, rarity = "rare", stackable = true },
	{ id = 5, name = "item_5", price = 750, rarity = "common", stackable = false },
	{ id = 6, name = "item_6", price = 875, rarity = "rare", stackable = true },
	{ id = 7, name = "item_7", price = 1000, rarity = "common", stackable = false },
	{ id = 8, name = "item_8", price = 1125, rarity = "rare", stackable = false },
	{ id = 9, name = "item_9", price = 1250, rarity = "rare", stackable = true },
	{ id = 10, name = "item_10", price = 1375, rarity = "epic", stackable = false },
	{ id = 11, name = "item_11", price = 1500, rarity = "epic", stackable = true },
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
	{ id = 100, name = "item_0", price = 125, rarity = "legendary", stackable = true },
	{ id = 101, name = "item_1", price = 250, rarity = "common", stackable = true },
	{ id = 102, name = "item_2", price = 375, rarity = "legendary", stackable = true },
	{ id = 103, name = "item_3", price = 500, rarity = "rare", stackable = false },
	{ id = 104, name = "item_4", price = 625, rarity = "epic", stackable = false },
	{ id = 105, name = "item_5", price = 750, rarity = "epic", stackable = true },
	{ id = 106, name = "item_6", price = 875, rarity = "rare", stackable = true },
	{ id = 107, name = "item_7", price = 1000, rarity = "legendary", stackable = false },
	{ id = 108, name = "item_8", price = 1125, rarity = "epic", stackable = false },
	{ id = 109, name = "item_9", price = 1250, rarity = "rare", stackable = false },
	{ id = 110, name = "item_10", price = 1375, rarity = "common", stackable = true },
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


local service2 = game:GetService("Workspace")
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
	{ id = 300, name = "item_0", price = 125, rarity = "common", stackable = true },
	{ id = 301, name = "item_1", price = 250, rarity = "rare", stackable = false },
	{ id = 302, name = "item_2", price = 375, rarity = "rare", stackable = false },
	{ id = 303, name = "item_3", price = 500, rarity = "epic", stackable = false },
	{ id = 304, name = "item_4", price = 625, rarity = "legendary", stackable = false },
	{ id = 305, name = "item_5", price = 750, rarity = "legendary", stackable = false },
	{ id = 306, name = "item_6", price = 875, rarity = "common", stackable = false },
	{ id = 307, name = "item_7", price = 1000, rarity = "common", stackable = false },
	{ id = 308, name = "item_8", price = 1125, rarity = "epic", stackable = false },
	{ id = 309, name = "item_9", price = 1250, rarity = "rare", stackable = true },
	{ id = 310, name = "item_10", price = 1375, rarity = "rare", stackable = true },
	{ id = 311, name = "item_11", price = 1500, rarity = "rare", stackable = true },
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


local service6 = game:GetService("UserInputService")
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
	{ id = 800, name = "item_0", price = 125, rarity = "legendary", stackable = true },
	{ id = 801, name = "item_1", price = 250, rarity = "epic", stackable = false },
	{ id = 802, name = "item_2", price = 375, rarity = "epic", stackable = false },
	{ id = 803, name = "item_3", price = 500, rarity = "rare", stackable = true },
	{ id = 804, name = "item_4", price = 625, rarity = "common", stackable = false },
	{ id = 805, name = "item_5", price = 750, rarity = "legendary", stackable = false },
	{ id = 806, name = "item_6", price = 875, rarity = "legendary", stackable = false },
	{ id = 807, name = "item_7", price = 1000, rarity = "legendary", stackable = false },
	{ id = 808, name = "item_8", price = 1125, rarity = "legendary", stackable = false },
	{ id = 809, name = "item_9", price = 1250, rarity = "rare", stackable = false },
	{ id = 810, name = "item_10", price = 1375, rarity = "common", stackable = false },
	{ id = 811, name = "item_11", price = 1500, rarity = "legendary", stackable = true },
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


local CATALOG_10 = {
	{ id = 1000, name = "item_0", price = 125, rarity = "legendary", stackable = false },
	{ id = 1001, name = "item_1", price = 250, rarity = "legendary", stackable = false },
	{ id = 1002, name = "item_2", price = 375, rarity = "common", stackable = false },
	{ id = 1003, name = "item_3", price = 500, rarity = "legendary", stackable = false },
	{ id = 1004, name = "item_4", price = 625, rarity = "legendary", stackable = false },
	{ id = 1005, name = "item_5", price = 750, rarity = "common", stackable = true },
	{ id = 1006, name = "item_6", price = 875, rarity = "common", stackable = false },
	{ id = 1007, name = "item_7", price = 1000, rarity = "epic", stackable = false },
	{ id = 1008, name = "item_8", price = 1125, rarity = "common", stackable = false },
	{ id = 1009, name = "item_9", price = 1250, rarity = "rare", stackable = false },
	{ id = 1010, name = "item_10", price = 1375, rarity = "legendary", stackable = false },
	{ id = 1011, name = "item_11", price = 1500, rarity = "rare", stackable = false },
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
	{ id = 1100, name = "item_0", price = 125, rarity = "rare", stackable = false },
	{ id = 1101, name = "item_1", price = 250, rarity = "legendary", stackable = true },
	{ id = 1102, name = "item_2", price = 375, rarity = "common", stackable = false },
	{ id = 1103, name = "item_3", price = 500, rarity = "common", stackable = false },
	{ id = 1104, name = "item_4", price = 625, rarity = "legendary", stackable = true },
	{ id = 1105, name = "item_5", price = 750, rarity = "rare", stackable = true },
	{ id = 1106, name = "item_6", price = 875, rarity = "epic", stackable = true },
	{ id = 1107, name = "item_7", price = 1000, rarity = "legendary", stackable = false },
	{ id = 1108, name = "item_8", price = 1125, rarity = "epic", stackable = true },
	{ id = 1109, name = "item_9", price = 1250, rarity = "legendary", stackable = false },
	{ id = 1110, name = "item_10", price = 1375, rarity = "legendary", stackable = false },
	{ id = 1111, name = "item_11", price = 1500, rarity = "legendary", stackable = false },
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
	{ id = 1200, name = "item_0", price = 125, rarity = "common", stackable = false },
	{ id = 1201, name = "item_1", price = 250, rarity = "common", stackable = true },
	{ id = 1202, name = "item_2", price = 375, rarity = "epic", stackable = true },
	{ id = 1203, name = "item_3", price = 500, rarity = "rare", stackable = true },
	{ id = 1204, name = "item_4", price = 625, rarity = "rare", stackable = true },
	{ id = 1205, name = "item_5", price = 750, rarity = "common", stackable = true },
	{ id = 1206, name = "item_6", price = 875, rarity = "legendary", stackable = false },
	{ id = 1207, name = "item_7", price = 1000, rarity = "epic", stackable = false },
	{ id = 1208, name = "item_8", price = 1125, rarity = "legendary", stackable = false },
	{ id = 1209, name = "item_9", price = 1250, rarity = "legendary", stackable = false },
	{ id = 1210, name = "item_10", price = 1375, rarity = "legendary", stackable = true },
	{ id = 1211, name = "item_11", price = 1500, rarity = "epic", stackable = true },
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


local service15 = game:GetService("ReplicatedStorage")
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


local function deepCopy17(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy17(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber17(value: number): string
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

local function retry17(attempts, callback)
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


local service18 = game:GetService("ReplicatedStorage")
local remote18 = game:GetService("ReplicatedStorage"):WaitForChild("Remote18")
local connection18
connection18 = service18.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection18:Disconnect()
		remote18:FireServer("overflow", accumulated)
	end
end)


local CATALOG_19 = {
	{ id = 1900, name = "item_0", price = 125, rarity = "common", stackable = false },
	{ id = 1901, name = "item_1", price = 250, rarity = "rare", stackable = false },
	{ id = 1902, name = "item_2", price = 375, rarity = "epic", stackable = false },
	{ id = 1903, name = "item_3", price = 500, rarity = "epic", stackable = false },
	{ id = 1904, name = "item_4", price = 625, rarity = "legendary", stackable = false },
	{ id = 1905, name = "item_5", price = 750, rarity = "legendary", stackable = false },
	{ id = 1906, name = "item_6", price = 875, rarity = "rare", stackable = true },
	{ id = 1907, name = "item_7", price = 1000, rarity = "common", stackable = false },
	{ id = 1908, name = "item_8", price = 1125, rarity = "legendary", stackable = true },
	{ id = 1909, name = "item_9", price = 1250, rarity = "epic", stackable = true },
	{ id = 1910, name = "item_10", price = 1375, rarity = "common", stackable = true },
	{ id = 1911, name = "item_11", price = 1500, rarity = "epic", stackable = false },
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


local function deepCopy20(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy20(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber20(value: number): string
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

local function retry20(attempts, callback)
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


local service21 = game:GetService("RunService")
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


local CATALOG_24 = {
	{ id = 2400, name = "item_0", price = 125, rarity = "common", stackable = true },
	{ id = 2401, name = "item_1", price = 250, rarity = "rare", stackable = true },
	{ id = 2402, name = "item_2", price = 375, rarity = "rare", stackable = false },
	{ id = 2403, name = "item_3", price = 500, rarity = "legendary", stackable = true },
	{ id = 2404, name = "item_4", price = 625, rarity = "common", stackable = false },
	{ id = 2405, name = "item_5", price = 750, rarity = "legendary", stackable = true },
	{ id = 2406, name = "item_6", price = 875, rarity = "legendary", stackable = true },
	{ id = 2407, name = "item_7", price = 1000, rarity = "common", stackable = true },
	{ id = 2408, name = "item_8", price = 1125, rarity = "common", stackable = false },
	{ id = 2409, name = "item_9", price = 1250, rarity = "rare", stackable = true },
	{ id = 2410, name = "item_10", price = 1375, rarity = "rare", stackable = false },
	{ id = 2411, name = "item_11", price = 1500, rarity = "rare", stackable = false },
}

local INDEX_24 = {}
for _, entry in ipairs(CATALOG_24) do
	INDEX_24[entry.name] = entry
end

local function priceOf24(name: string): number
	local entry = INDEX_24[name]
	if not entry then
		return 0
	end
	return entry.price
end


local service25 = game:GetService("ReplicatedStorage")
local remote25 = game:GetService("ReplicatedStorage"):WaitForChild("Remote25")
local connection25
connection25 = service25.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection25:Disconnect()
		remote25:FireServer("overflow", accumulated)
	end
end)


local CATALOG_26 = {
	{ id = 2600, name = "item_0", price = 125, rarity = "epic", stackable = false },
	{ id = 2601, name = "item_1", price = 250, rarity = "rare", stackable = true },
	{ id = 2602, name = "item_2", price = 375, rarity = "legendary", stackable = true },
	{ id = 2603, name = "item_3", price = 500, rarity = "rare", stackable = false },
	{ id = 2604, name = "item_4", price = 625, rarity = "epic", stackable = true },
	{ id = 2605, name = "item_5", price = 750, rarity = "rare", stackable = true },
	{ id = 2606, name = "item_6", price = 875, rarity = "rare", stackable = true },
	{ id = 2607, name = "item_7", price = 1000, rarity = "epic", stackable = false },
	{ id = 2608, name = "item_8", price = 1125, rarity = "legendary", stackable = false },
	{ id = 2609, name = "item_9", price = 1250, rarity = "epic", stackable = false },
	{ id = 2610, name = "item_10", price = 1375, rarity = "rare", stackable = false },
	{ id = 2611, name = "item_11", price = 1500, rarity = "epic", stackable = false },
}

local INDEX_26 = {}
for _, entry in ipairs(CATALOG_26) do
	INDEX_26[entry.name] = entry
end

local function priceOf26(name: string): number
	local entry = INDEX_26[name]
	if not entry then
		return 0
	end
	return entry.price
end


local service27 = game:GetService("UserInputService")
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


local CATALOG_28 = {
	{ id = 2800, name = "item_0", price = 125, rarity = "legendary", stackable = true },
	{ id = 2801, name = "item_1", price = 250, rarity = "legendary", stackable = false },
	{ id = 2802, name = "item_2", price = 375, rarity = "epic", stackable = false },
	{ id = 2803, name = "item_3", price = 500, rarity = "epic", stackable = false },
	{ id = 2804, name = "item_4", price = 625, rarity = "common", stackable = true },
	{ id = 2805, name = "item_5", price = 750, rarity = "legendary", stackable = false },
	{ id = 2806, name = "item_6", price = 875, rarity = "common", stackable = true },
	{ id = 2807, name = "item_7", price = 1000, rarity = "legendary", stackable = false },
	{ id = 2808, name = "item_8", price = 1125, rarity = "common", stackable = true },
	{ id = 2809, name = "item_9", price = 1250, rarity = "common", stackable = false },
	{ id = 2810, name = "item_10", price = 1375, rarity = "legendary", stackable = false },
	{ id = 2811, name = "item_11", price = 1500, rarity = "rare", stackable = false },
}

local INDEX_28 = {}
for _, entry in ipairs(CATALOG_28) do
	INDEX_28[entry.name] = entry
end

local function priceOf28(name: string): number
	local entry = INDEX_28[name]
	if not entry then
		return 0
	end
	return entry.price
end


local service29 = game:GetService("UserInputService")
local remote29 = game:GetService("ReplicatedStorage"):WaitForChild("Remote29")
local connection29
connection29 = service29.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection29:Disconnect()
		remote29:FireServer("overflow", accumulated)
	end
end)


local CATALOG_30 = {
	{ id = 3000, name = "item_0", price = 125, rarity = "common", stackable = true },
	{ id = 3001, name = "item_1", price = 250, rarity = "legendary", stackable = true },
	{ id = 3002, name = "item_2", price = 375, rarity = "rare", stackable = false },
	{ id = 3003, name = "item_3", price = 500, rarity = "common", stackable = false },
	{ id = 3004, name = "item_4", price = 625, rarity = "legendary", stackable = true },
	{ id = 3005, name = "item_5", price = 750, rarity = "rare", stackable = true },
	{ id = 3006, name = "item_6", price = 875, rarity = "epic", stackable = true },
	{ id = 3007, name = "item_7", price = 1000, rarity = "rare", stackable = false },
	{ id = 3008, name = "item_8", price = 1125, rarity = "epic", stackable = false },
	{ id = 3009, name = "item_9", price = 1250, rarity = "common", stackable = false },
	{ id = 3010, name = "item_10", price = 1375, rarity = "rare", stackable = false },
	{ id = 3011, name = "item_11", price = 1500, rarity = "common", stackable = false },
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


local function deepCopy32(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy32(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber32(value: number): string
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

local function retry32(attempts, callback)
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


local CATALOG_34 = {
	{ id = 3400, name = "item_0", price = 125, rarity = "common", stackable = false },
	{ id = 3401, name = "item_1", price = 250, rarity = "legendary", stackable = false },
	{ id = 3402, name = "item_2", price = 375, rarity = "common", stackable = false },
	{ id = 3403, name = "item_3", price = 500, rarity = "epic", stackable = true },
	{ id = 3404, name = "item_4", price = 625, rarity = "rare", stackable = false },
	{ id = 3405, name = "item_5", price = 750, rarity = "legendary", stackable = false },
	{ id = 3406, name = "item_6", price = 875, rarity = "common", stackable = false },
	{ id = 3407, name = "item_7", price = 1000, rarity = "epic", stackable = true },
	{ id = 3408, name = "item_8", price = 1125, rarity = "rare", stackable = false },
	{ id = 3409, name = "item_9", price = 1250, rarity = "legendary", stackable = false },
	{ id = 3410, name = "item_10", price = 1375, rarity = "common", stackable = true },
	{ id = 3411, name = "item_11", price = 1500, rarity = "common", stackable = true },
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


local CATALOG_35 = {
	{ id = 3500, name = "item_0", price = 125, rarity = "common", stackable = true },
	{ id = 3501, name = "item_1", price = 250, rarity = "legendary", stackable = true },
	{ id = 3502, name = "item_2", price = 375, rarity = "rare", stackable = false },
	{ id = 3503, name = "item_3", price = 500, rarity = "epic", stackable = false },
	{ id = 3504, name = "item_4", price = 625, rarity = "epic", stackable = false },
	{ id = 3505, name = "item_5", price = 750, rarity = "common", stackable = true },
	{ id = 3506, name = "item_6", price = 875, rarity = "legendary", stackable = false },
	{ id = 3507, name = "item_7", price = 1000, rarity = "legendary", stackable = false },
	{ id = 3508, name = "item_8", price = 1125, rarity = "common", stackable = true },
	{ id = 3509, name = "item_9", price = 1250, rarity = "epic", stackable = false },
	{ id = 3510, name = "item_10", price = 1375, rarity = "legendary", stackable = true },
	{ id = 3511, name = "item_11", price = 1500, rarity = "epic", stackable = false },
}

local INDEX_35 = {}
for _, entry in ipairs(CATALOG_35) do
	INDEX_35[entry.name] = entry
end

local function priceOf35(name: string): number
	local entry = INDEX_35[name]
	if not entry then
		return 0
	end
	return entry.price
end


print("loaded", 36)