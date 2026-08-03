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
	{ id = 100, name = "item_0", price = 125, rarity = "legendary", stackable = true },
	{ id = 101, name = "item_1", price = 250, rarity = "epic", stackable = false },
	{ id = 102, name = "item_2", price = 375, rarity = "rare", stackable = true },
	{ id = 103, name = "item_3", price = 500, rarity = "epic", stackable = true },
	{ id = 104, name = "item_4", price = 625, rarity = "common", stackable = true },
	{ id = 105, name = "item_5", price = 750, rarity = "common", stackable = true },
	{ id = 106, name = "item_6", price = 875, rarity = "common", stackable = true },
	{ id = 107, name = "item_7", price = 1000, rarity = "rare", stackable = false },
	{ id = 108, name = "item_8", price = 1125, rarity = "common", stackable = false },
	{ id = 109, name = "item_9", price = 1250, rarity = "epic", stackable = false },
	{ id = 110, name = "item_10", price = 1375, rarity = "common", stackable = false },
	{ id = 111, name = "item_11", price = 1500, rarity = "epic", stackable = true },
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


local Class3 = {}
Class3.__index = Class3

function Class3.new(config)
	local self = setmetatable({}, Class3)
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

function Class3:getHealth(): number
	return self.health
end

function Class3:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class3: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class3:getStamina(): number
	return self.stamina
end

function Class3:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class3: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class3:getLevel(): number
	return self.level
end

function Class3:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class3: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class3:getScore(): number
	return self.score
end

function Class3:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class3: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class3:getEnergy(): number
	return self.energy
end

function Class3:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class3: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class3:onChanged(callback)
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

function Class3:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class3 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
end


local function deepCopy4(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy4(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber4(value: number): string
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

local function retry4(attempts, callback)
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


local service6 = game:GetService("Workspace")
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
	{ id = 800, name = "item_0", price = 125, rarity = "common", stackable = false },
	{ id = 801, name = "item_1", price = 250, rarity = "rare", stackable = false },
	{ id = 802, name = "item_2", price = 375, rarity = "legendary", stackable = true },
	{ id = 803, name = "item_3", price = 500, rarity = "legendary", stackable = false },
	{ id = 804, name = "item_4", price = 625, rarity = "rare", stackable = true },
	{ id = 805, name = "item_5", price = 750, rarity = "common", stackable = false },
	{ id = 806, name = "item_6", price = 875, rarity = "legendary", stackable = false },
	{ id = 807, name = "item_7", price = 1000, rarity = "rare", stackable = false },
	{ id = 808, name = "item_8", price = 1125, rarity = "common", stackable = false },
	{ id = 809, name = "item_9", price = 1250, rarity = "common", stackable = false },
	{ id = 810, name = "item_10", price = 1375, rarity = "epic", stackable = false },
	{ id = 811, name = "item_11", price = 1500, rarity = "rare", stackable = false },
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


local function deepCopy9(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy9(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber9(value: number): string
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

local function retry9(attempts, callback)
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


local CATALOG_10 = {
	{ id = 1000, name = "item_0", price = 125, rarity = "rare", stackable = true },
	{ id = 1001, name = "item_1", price = 250, rarity = "epic", stackable = false },
	{ id = 1002, name = "item_2", price = 375, rarity = "epic", stackable = false },
	{ id = 1003, name = "item_3", price = 500, rarity = "rare", stackable = true },
	{ id = 1004, name = "item_4", price = 625, rarity = "legendary", stackable = true },
	{ id = 1005, name = "item_5", price = 750, rarity = "legendary", stackable = false },
	{ id = 1006, name = "item_6", price = 875, rarity = "epic", stackable = false },
	{ id = 1007, name = "item_7", price = 1000, rarity = "epic", stackable = true },
	{ id = 1008, name = "item_8", price = 1125, rarity = "rare", stackable = true },
	{ id = 1009, name = "item_9", price = 1250, rarity = "epic", stackable = true },
	{ id = 1010, name = "item_10", price = 1375, rarity = "rare", stackable = true },
	{ id = 1011, name = "item_11", price = 1500, rarity = "rare", stackable = true },
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
	{ id = 1100, name = "item_0", price = 125, rarity = "common", stackable = false },
	{ id = 1101, name = "item_1", price = 250, rarity = "rare", stackable = true },
	{ id = 1102, name = "item_2", price = 375, rarity = "legendary", stackable = true },
	{ id = 1103, name = "item_3", price = 500, rarity = "legendary", stackable = true },
	{ id = 1104, name = "item_4", price = 625, rarity = "legendary", stackable = false },
	{ id = 1105, name = "item_5", price = 750, rarity = "legendary", stackable = false },
	{ id = 1106, name = "item_6", price = 875, rarity = "rare", stackable = false },
	{ id = 1107, name = "item_7", price = 1000, rarity = "common", stackable = false },
	{ id = 1108, name = "item_8", price = 1125, rarity = "common", stackable = true },
	{ id = 1109, name = "item_9", price = 1250, rarity = "legendary", stackable = true },
	{ id = 1110, name = "item_10", price = 1375, rarity = "legendary", stackable = false },
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


print("loaded", 12)