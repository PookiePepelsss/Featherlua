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
	{ id = 100, name = "item_0", price = 125, rarity = "epic", stackable = true },
	{ id = 101, name = "item_1", price = 250, rarity = "common", stackable = true },
	{ id = 102, name = "item_2", price = 375, rarity = "common", stackable = false },
	{ id = 103, name = "item_3", price = 500, rarity = "epic", stackable = false },
	{ id = 104, name = "item_4", price = 625, rarity = "epic", stackable = false },
	{ id = 105, name = "item_5", price = 750, rarity = "legendary", stackable = false },
	{ id = 106, name = "item_6", price = 875, rarity = "rare", stackable = true },
	{ id = 107, name = "item_7", price = 1000, rarity = "rare", stackable = false },
	{ id = 108, name = "item_8", price = 1125, rarity = "epic", stackable = true },
	{ id = 109, name = "item_9", price = 1250, rarity = "epic", stackable = true },
	{ id = 110, name = "item_10", price = 1375, rarity = "rare", stackable = true },
	{ id = 111, name = "item_11", price = 1500, rarity = "common", stackable = false },
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


local CATALOG_4 = {
	{ id = 400, name = "item_0", price = 125, rarity = "legendary", stackable = true },
	{ id = 401, name = "item_1", price = 250, rarity = "rare", stackable = false },
	{ id = 402, name = "item_2", price = 375, rarity = "common", stackable = false },
	{ id = 403, name = "item_3", price = 500, rarity = "legendary", stackable = true },
	{ id = 404, name = "item_4", price = 625, rarity = "epic", stackable = true },
	{ id = 405, name = "item_5", price = 750, rarity = "rare", stackable = false },
	{ id = 406, name = "item_6", price = 875, rarity = "common", stackable = true },
	{ id = 407, name = "item_7", price = 1000, rarity = "rare", stackable = false },
	{ id = 408, name = "item_8", price = 1125, rarity = "legendary", stackable = false },
	{ id = 409, name = "item_9", price = 1250, rarity = "epic", stackable = false },
	{ id = 410, name = "item_10", price = 1375, rarity = "common", stackable = true },
	{ id = 411, name = "item_11", price = 1500, rarity = "rare", stackable = true },
}

local INDEX_4 = {}
for _, entry in ipairs(CATALOG_4) do
	INDEX_4[entry.name] = entry
end

local function priceOf4(name: string): number
	local entry = INDEX_4[name]
	if not entry then
		return 0
	end
	return entry.price
end


local service5 = game:GetService("Players")
local remote5 = game:GetService("ReplicatedStorage"):WaitForChild("Remote5")
local connection5
connection5 = service5.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection5:Disconnect()
		remote5:FireServer("overflow", accumulated)
	end
end)


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


local service7 = game:GetService("UserInputService")
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


local CATALOG_8 = {
	{ id = 800, name = "item_0", price = 125, rarity = "rare", stackable = true },
	{ id = 801, name = "item_1", price = 250, rarity = "legendary", stackable = true },
	{ id = 802, name = "item_2", price = 375, rarity = "common", stackable = false },
	{ id = 803, name = "item_3", price = 500, rarity = "legendary", stackable = false },
	{ id = 804, name = "item_4", price = 625, rarity = "common", stackable = false },
	{ id = 805, name = "item_5", price = 750, rarity = "rare", stackable = true },
	{ id = 806, name = "item_6", price = 875, rarity = "common", stackable = true },
	{ id = 807, name = "item_7", price = 1000, rarity = "rare", stackable = true },
	{ id = 808, name = "item_8", price = 1125, rarity = "rare", stackable = false },
	{ id = 809, name = "item_9", price = 1250, rarity = "epic", stackable = false },
	{ id = 810, name = "item_10", price = 1375, rarity = "epic", stackable = false },
	{ id = 811, name = "item_11", price = 1500, rarity = "epic", stackable = true },
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


local service9 = game:GetService("UserInputService")
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


local Class10 = {}
Class10.__index = Class10

function Class10.new(config)
	local self = setmetatable({}, Class10)
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

function Class10:getHealth(): number
	return self.health
end

function Class10:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class10: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class10:getStamina(): number
	return self.stamina
end

function Class10:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class10: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class10:getLevel(): number
	return self.level
end

function Class10:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class10: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class10:getScore(): number
	return self.score
end

function Class10:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class10: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class10:getEnergy(): number
	return self.energy
end

function Class10:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class10: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class10:onChanged(callback)
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

function Class10:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class10 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
end


local Class11 = {}
Class11.__index = Class11

function Class11.new(config)
	local self = setmetatable({}, Class11)
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

function Class11:getHealth(): number
	return self.health
end

function Class11:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class11: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class11:getStamina(): number
	return self.stamina
end

function Class11:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class11: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class11:getLevel(): number
	return self.level
end

function Class11:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class11: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class11:getScore(): number
	return self.score
end

function Class11:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class11: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class11:getEnergy(): number
	return self.energy
end

function Class11:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class11: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class11:onChanged(callback)
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

function Class11:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class11 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
end


local CATALOG_12 = {
	{ id = 1200, name = "item_0", price = 125, rarity = "epic", stackable = true },
	{ id = 1201, name = "item_1", price = 250, rarity = "rare", stackable = false },
	{ id = 1202, name = "item_2", price = 375, rarity = "common", stackable = true },
	{ id = 1203, name = "item_3", price = 500, rarity = "legendary", stackable = false },
	{ id = 1204, name = "item_4", price = 625, rarity = "epic", stackable = true },
	{ id = 1205, name = "item_5", price = 750, rarity = "epic", stackable = false },
	{ id = 1206, name = "item_6", price = 875, rarity = "rare", stackable = true },
	{ id = 1207, name = "item_7", price = 1000, rarity = "common", stackable = false },
	{ id = 1208, name = "item_8", price = 1125, rarity = "epic", stackable = false },
	{ id = 1209, name = "item_9", price = 1250, rarity = "rare", stackable = true },
	{ id = 1210, name = "item_10", price = 1375, rarity = "epic", stackable = false },
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


local CATALOG_13 = {
	{ id = 1300, name = "item_0", price = 125, rarity = "common", stackable = true },
	{ id = 1301, name = "item_1", price = 250, rarity = "rare", stackable = true },
	{ id = 1302, name = "item_2", price = 375, rarity = "common", stackable = false },
	{ id = 1303, name = "item_3", price = 500, rarity = "epic", stackable = true },
	{ id = 1304, name = "item_4", price = 625, rarity = "rare", stackable = true },
	{ id = 1305, name = "item_5", price = 750, rarity = "epic", stackable = false },
	{ id = 1306, name = "item_6", price = 875, rarity = "rare", stackable = true },
	{ id = 1307, name = "item_7", price = 1000, rarity = "common", stackable = false },
	{ id = 1308, name = "item_8", price = 1125, rarity = "rare", stackable = true },
	{ id = 1309, name = "item_9", price = 1250, rarity = "legendary", stackable = false },
	{ id = 1310, name = "item_10", price = 1375, rarity = "rare", stackable = false },
	{ id = 1311, name = "item_11", price = 1500, rarity = "rare", stackable = true },
}

local INDEX_13 = {}
for _, entry in ipairs(CATALOG_13) do
	INDEX_13[entry.name] = entry
end

local function priceOf13(name: string): number
	local entry = INDEX_13[name]
	if not entry then
		return 0
	end
	return entry.price
end


local Class14 = {}
Class14.__index = Class14

function Class14.new(config)
	local self = setmetatable({}, Class14)
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

function Class14:getHealth(): number
	return self.health
end

function Class14:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class14: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class14:getStamina(): number
	return self.stamina
end

function Class14:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class14: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class14:getLevel(): number
	return self.level
end

function Class14:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class14: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class14:getScore(): number
	return self.score
end

function Class14:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class14: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class14:getEnergy(): number
	return self.energy
end

function Class14:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class14: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class14:onChanged(callback)
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

function Class14:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class14 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
end


local CATALOG_15 = {
	{ id = 1500, name = "item_0", price = 125, rarity = "epic", stackable = true },
	{ id = 1501, name = "item_1", price = 250, rarity = "rare", stackable = true },
	{ id = 1502, name = "item_2", price = 375, rarity = "epic", stackable = false },
	{ id = 1503, name = "item_3", price = 500, rarity = "common", stackable = false },
	{ id = 1504, name = "item_4", price = 625, rarity = "legendary", stackable = true },
	{ id = 1505, name = "item_5", price = 750, rarity = "rare", stackable = true },
	{ id = 1506, name = "item_6", price = 875, rarity = "rare", stackable = false },
	{ id = 1507, name = "item_7", price = 1000, rarity = "legendary", stackable = false },
	{ id = 1508, name = "item_8", price = 1125, rarity = "legendary", stackable = true },
	{ id = 1509, name = "item_9", price = 1250, rarity = "rare", stackable = false },
	{ id = 1510, name = "item_10", price = 1375, rarity = "common", stackable = false },
	{ id = 1511, name = "item_11", price = 1500, rarity = "common", stackable = false },
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


local service16 = game:GetService("Players")
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


local CATALOG_17 = {
	{ id = 1700, name = "item_0", price = 125, rarity = "rare", stackable = true },
	{ id = 1701, name = "item_1", price = 250, rarity = "common", stackable = false },
	{ id = 1702, name = "item_2", price = 375, rarity = "rare", stackable = true },
	{ id = 1703, name = "item_3", price = 500, rarity = "rare", stackable = true },
	{ id = 1704, name = "item_4", price = 625, rarity = "legendary", stackable = false },
	{ id = 1705, name = "item_5", price = 750, rarity = "rare", stackable = false },
	{ id = 1706, name = "item_6", price = 875, rarity = "legendary", stackable = false },
	{ id = 1707, name = "item_7", price = 1000, rarity = "epic", stackable = true },
	{ id = 1708, name = "item_8", price = 1125, rarity = "rare", stackable = true },
	{ id = 1709, name = "item_9", price = 1250, rarity = "epic", stackable = true },
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


local function deepCopy18(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy18(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber18(value: number): string
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

local function retry18(attempts, callback)
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


local CATALOG_19 = {
	{ id = 1900, name = "item_0", price = 125, rarity = "epic", stackable = true },
	{ id = 1901, name = "item_1", price = 250, rarity = "epic", stackable = true },
	{ id = 1902, name = "item_2", price = 375, rarity = "epic", stackable = false },
	{ id = 1903, name = "item_3", price = 500, rarity = "rare", stackable = true },
	{ id = 1904, name = "item_4", price = 625, rarity = "rare", stackable = false },
	{ id = 1905, name = "item_5", price = 750, rarity = "common", stackable = false },
	{ id = 1906, name = "item_6", price = 875, rarity = "legendary", stackable = true },
	{ id = 1907, name = "item_7", price = 1000, rarity = "rare", stackable = true },
	{ id = 1908, name = "item_8", price = 1125, rarity = "legendary", stackable = true },
	{ id = 1909, name = "item_9", price = 1250, rarity = "rare", stackable = false },
	{ id = 1910, name = "item_10", price = 1375, rarity = "epic", stackable = false },
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


local Class20 = {}
Class20.__index = Class20

function Class20.new(config)
	local self = setmetatable({}, Class20)
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

function Class20:getHealth(): number
	return self.health
end

function Class20:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class20: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class20:getStamina(): number
	return self.stamina
end

function Class20:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class20: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class20:getLevel(): number
	return self.level
end

function Class20:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class20: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class20:getScore(): number
	return self.score
end

function Class20:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class20: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class20:getEnergy(): number
	return self.energy
end

function Class20:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class20: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class20:onChanged(callback)
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

function Class20:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class20 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
end


local Class21 = {}
Class21.__index = Class21

function Class21.new(config)
	local self = setmetatable({}, Class21)
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

function Class21:getHealth(): number
	return self.health
end

function Class21:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class21: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class21:getStamina(): number
	return self.stamina
end

function Class21:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class21: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class21:getLevel(): number
	return self.level
end

function Class21:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class21: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class21:getScore(): number
	return self.score
end

function Class21:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class21: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class21:getEnergy(): number
	return self.energy
end

function Class21:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class21: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class21:onChanged(callback)
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

function Class21:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class21 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
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


local service25 = game:GetService("Players")
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


local service26 = game:GetService("Players")
local remote26 = game:GetService("ReplicatedStorage"):WaitForChild("Remote26")
local connection26
connection26 = service26.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection26:Disconnect()
		remote26:FireServer("overflow", accumulated)
	end
end)


local function deepCopy27(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy27(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber27(value: number): string
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

local function retry27(attempts, callback)
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


local CATALOG_29 = {
	{ id = 2900, name = "item_0", price = 125, rarity = "common", stackable = false },
	{ id = 2901, name = "item_1", price = 250, rarity = "legendary", stackable = true },
	{ id = 2902, name = "item_2", price = 375, rarity = "legendary", stackable = true },
	{ id = 2903, name = "item_3", price = 500, rarity = "common", stackable = true },
	{ id = 2904, name = "item_4", price = 625, rarity = "rare", stackable = false },
	{ id = 2905, name = "item_5", price = 750, rarity = "epic", stackable = false },
	{ id = 2906, name = "item_6", price = 875, rarity = "legendary", stackable = false },
	{ id = 2907, name = "item_7", price = 1000, rarity = "epic", stackable = true },
	{ id = 2908, name = "item_8", price = 1125, rarity = "legendary", stackable = false },
	{ id = 2909, name = "item_9", price = 1250, rarity = "rare", stackable = true },
	{ id = 2910, name = "item_10", price = 1375, rarity = "rare", stackable = false },
	{ id = 2911, name = "item_11", price = 1500, rarity = "rare", stackable = false },
}

local INDEX_29 = {}
for _, entry in ipairs(CATALOG_29) do
	INDEX_29[entry.name] = entry
end

local function priceOf29(name: string): number
	local entry = INDEX_29[name]
	if not entry then
		return 0
	end
	return entry.price
end


local CATALOG_30 = {
	{ id = 3000, name = "item_0", price = 125, rarity = "epic", stackable = false },
	{ id = 3001, name = "item_1", price = 250, rarity = "epic", stackable = true },
	{ id = 3002, name = "item_2", price = 375, rarity = "rare", stackable = false },
	{ id = 3003, name = "item_3", price = 500, rarity = "epic", stackable = false },
	{ id = 3004, name = "item_4", price = 625, rarity = "epic", stackable = false },
	{ id = 3005, name = "item_5", price = 750, rarity = "legendary", stackable = false },
	{ id = 3006, name = "item_6", price = 875, rarity = "common", stackable = false },
	{ id = 3007, name = "item_7", price = 1000, rarity = "rare", stackable = false },
	{ id = 3008, name = "item_8", price = 1125, rarity = "legendary", stackable = true },
	{ id = 3009, name = "item_9", price = 1250, rarity = "common", stackable = true },
	{ id = 3010, name = "item_10", price = 1375, rarity = "rare", stackable = false },
	{ id = 3011, name = "item_11", price = 1500, rarity = "epic", stackable = true },
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


local service31 = game:GetService("UserInputService")
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


print("loaded", 32)