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


local service1 = game:GetService("Workspace")
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


local service2 = game:GetService("Players")
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
	{ id = 400, name = "item_0", price = 125, rarity = "common", stackable = true },
	{ id = 401, name = "item_1", price = 250, rarity = "common", stackable = false },
	{ id = 402, name = "item_2", price = 375, rarity = "common", stackable = true },
	{ id = 403, name = "item_3", price = 500, rarity = "epic", stackable = false },
	{ id = 404, name = "item_4", price = 625, rarity = "rare", stackable = true },
	{ id = 405, name = "item_5", price = 750, rarity = "epic", stackable = true },
	{ id = 406, name = "item_6", price = 875, rarity = "epic", stackable = false },
	{ id = 407, name = "item_7", price = 1000, rarity = "legendary", stackable = false },
	{ id = 408, name = "item_8", price = 1125, rarity = "epic", stackable = true },
	{ id = 409, name = "item_9", price = 1250, rarity = "epic", stackable = true },
	{ id = 410, name = "item_10", price = 1375, rarity = "legendary", stackable = true },
	{ id = 411, name = "item_11", price = 1500, rarity = "epic", stackable = true },
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


local CATALOG_5 = {
	{ id = 500, name = "item_0", price = 125, rarity = "common", stackable = true },
	{ id = 501, name = "item_1", price = 250, rarity = "common", stackable = false },
	{ id = 502, name = "item_2", price = 375, rarity = "legendary", stackable = true },
	{ id = 503, name = "item_3", price = 500, rarity = "legendary", stackable = false },
	{ id = 504, name = "item_4", price = 625, rarity = "rare", stackable = true },
	{ id = 505, name = "item_5", price = 750, rarity = "common", stackable = true },
	{ id = 506, name = "item_6", price = 875, rarity = "rare", stackable = true },
	{ id = 507, name = "item_7", price = 1000, rarity = "rare", stackable = true },
	{ id = 508, name = "item_8", price = 1125, rarity = "rare", stackable = false },
	{ id = 509, name = "item_9", price = 1250, rarity = "epic", stackable = false },
	{ id = 510, name = "item_10", price = 1375, rarity = "rare", stackable = true },
	{ id = 511, name = "item_11", price = 1500, rarity = "epic", stackable = false },
}

local INDEX_5 = {}
for _, entry in ipairs(CATALOG_5) do
	INDEX_5[entry.name] = entry
end

local function priceOf5(name: string): number
	local entry = INDEX_5[name]
	if not entry then
		return 0
	end
	return entry.price
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


local service7 = game:GetService("Players")
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
	{ id = 800, name = "item_0", price = 125, rarity = "common", stackable = false },
	{ id = 801, name = "item_1", price = 250, rarity = "rare", stackable = false },
	{ id = 802, name = "item_2", price = 375, rarity = "legendary", stackable = false },
	{ id = 803, name = "item_3", price = 500, rarity = "common", stackable = true },
	{ id = 804, name = "item_4", price = 625, rarity = "legendary", stackable = true },
	{ id = 805, name = "item_5", price = 750, rarity = "legendary", stackable = false },
	{ id = 806, name = "item_6", price = 875, rarity = "rare", stackable = true },
	{ id = 807, name = "item_7", price = 1000, rarity = "common", stackable = true },
	{ id = 808, name = "item_8", price = 1125, rarity = "legendary", stackable = true },
	{ id = 809, name = "item_9", price = 1250, rarity = "epic", stackable = true },
	{ id = 810, name = "item_10", price = 1375, rarity = "rare", stackable = true },
	{ id = 811, name = "item_11", price = 1500, rarity = "legendary", stackable = false },
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


local service9 = game:GetService("Players")
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


local CATALOG_11 = {
	{ id = 1100, name = "item_0", price = 125, rarity = "epic", stackable = false },
	{ id = 1101, name = "item_1", price = 250, rarity = "common", stackable = true },
	{ id = 1102, name = "item_2", price = 375, rarity = "rare", stackable = false },
	{ id = 1103, name = "item_3", price = 500, rarity = "epic", stackable = true },
	{ id = 1104, name = "item_4", price = 625, rarity = "epic", stackable = false },
	{ id = 1105, name = "item_5", price = 750, rarity = "legendary", stackable = false },
	{ id = 1106, name = "item_6", price = 875, rarity = "epic", stackable = true },
	{ id = 1107, name = "item_7", price = 1000, rarity = "rare", stackable = true },
	{ id = 1108, name = "item_8", price = 1125, rarity = "common", stackable = true },
	{ id = 1109, name = "item_9", price = 1250, rarity = "rare", stackable = false },
	{ id = 1110, name = "item_10", price = 1375, rarity = "epic", stackable = true },
	{ id = 1111, name = "item_11", price = 1500, rarity = "epic", stackable = false },
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


local service12 = game:GetService("UserInputService")
local remote12 = game:GetService("ReplicatedStorage"):WaitForChild("Remote12")
local connection12
connection12 = service12.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection12:Disconnect()
		remote12:FireServer("overflow", accumulated)
	end
end)


local CATALOG_13 = {
	{ id = 1300, name = "item_0", price = 125, rarity = "common", stackable = false },
	{ id = 1301, name = "item_1", price = 250, rarity = "rare", stackable = false },
	{ id = 1302, name = "item_2", price = 375, rarity = "epic", stackable = true },
	{ id = 1303, name = "item_3", price = 500, rarity = "common", stackable = false },
	{ id = 1304, name = "item_4", price = 625, rarity = "common", stackable = true },
	{ id = 1305, name = "item_5", price = 750, rarity = "common", stackable = true },
	{ id = 1306, name = "item_6", price = 875, rarity = "common", stackable = true },
	{ id = 1307, name = "item_7", price = 1000, rarity = "rare", stackable = false },
	{ id = 1308, name = "item_8", price = 1125, rarity = "rare", stackable = true },
	{ id = 1309, name = "item_9", price = 1250, rarity = "common", stackable = true },
	{ id = 1310, name = "item_10", price = 1375, rarity = "rare", stackable = true },
	{ id = 1311, name = "item_11", price = 1500, rarity = "epic", stackable = false },
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


local service14 = game:GetService("Players")
local remote14 = game:GetService("ReplicatedStorage"):WaitForChild("Remote14")
local connection14
connection14 = service14.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection14:Disconnect()
		remote14:FireServer("overflow", accumulated)
	end
end)


local function deepCopy15(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy15(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber15(value: number): string
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

local function retry15(attempts, callback)
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


local function deepCopy16(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy16(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber16(value: number): string
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

local function retry16(attempts, callback)
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


local service17 = game:GetService("RunService")
local remote17 = game:GetService("ReplicatedStorage"):WaitForChild("Remote17")
local connection17
connection17 = service17.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection17:Disconnect()
		remote17:FireServer("overflow", accumulated)
	end
end)


local service18 = game:GetService("Players")
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


local service19 = game:GetService("TweenService")
local remote19 = game:GetService("ReplicatedStorage"):WaitForChild("Remote19")
local connection19
connection19 = service19.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection19:Disconnect()
		remote19:FireServer("overflow", accumulated)
	end
end)


local CATALOG_20 = {
	{ id = 2000, name = "item_0", price = 125, rarity = "legendary", stackable = true },
	{ id = 2001, name = "item_1", price = 250, rarity = "epic", stackable = false },
	{ id = 2002, name = "item_2", price = 375, rarity = "epic", stackable = false },
	{ id = 2003, name = "item_3", price = 500, rarity = "rare", stackable = true },
	{ id = 2004, name = "item_4", price = 625, rarity = "legendary", stackable = false },
	{ id = 2005, name = "item_5", price = 750, rarity = "rare", stackable = false },
	{ id = 2006, name = "item_6", price = 875, rarity = "legendary", stackable = false },
	{ id = 2007, name = "item_7", price = 1000, rarity = "epic", stackable = true },
	{ id = 2008, name = "item_8", price = 1125, rarity = "rare", stackable = true },
	{ id = 2009, name = "item_9", price = 1250, rarity = "epic", stackable = false },
	{ id = 2010, name = "item_10", price = 1375, rarity = "legendary", stackable = true },
	{ id = 2011, name = "item_11", price = 1500, rarity = "legendary", stackable = false },
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
	{ id = 2102, name = "item_2", price = 375, rarity = "rare", stackable = false },
	{ id = 2103, name = "item_3", price = 500, rarity = "common", stackable = false },
	{ id = 2104, name = "item_4", price = 625, rarity = "legendary", stackable = false },
	{ id = 2105, name = "item_5", price = 750, rarity = "rare", stackable = false },
	{ id = 2106, name = "item_6", price = 875, rarity = "common", stackable = true },
	{ id = 2107, name = "item_7", price = 1000, rarity = "epic", stackable = true },
	{ id = 2108, name = "item_8", price = 1125, rarity = "legendary", stackable = false },
	{ id = 2109, name = "item_9", price = 1250, rarity = "common", stackable = false },
	{ id = 2110, name = "item_10", price = 1375, rarity = "epic", stackable = true },
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


local CATALOG_22 = {
	{ id = 2200, name = "item_0", price = 125, rarity = "rare", stackable = true },
	{ id = 2201, name = "item_1", price = 250, rarity = "legendary", stackable = false },
	{ id = 2202, name = "item_2", price = 375, rarity = "common", stackable = true },
	{ id = 2203, name = "item_3", price = 500, rarity = "epic", stackable = false },
	{ id = 2204, name = "item_4", price = 625, rarity = "common", stackable = false },
	{ id = 2205, name = "item_5", price = 750, rarity = "epic", stackable = false },
	{ id = 2206, name = "item_6", price = 875, rarity = "rare", stackable = true },
	{ id = 2207, name = "item_7", price = 1000, rarity = "epic", stackable = true },
	{ id = 2208, name = "item_8", price = 1125, rarity = "legendary", stackable = false },
	{ id = 2209, name = "item_9", price = 1250, rarity = "epic", stackable = true },
	{ id = 2210, name = "item_10", price = 1375, rarity = "legendary", stackable = true },
	{ id = 2211, name = "item_11", price = 1500, rarity = "epic", stackable = true },
}

local INDEX_22 = {}
for _, entry in ipairs(CATALOG_22) do
	INDEX_22[entry.name] = entry
end

local function priceOf22(name: string): number
	local entry = INDEX_22[name]
	if not entry then
		return 0
	end
	return entry.price
end


local Class23 = {}
Class23.__index = Class23

function Class23.new(config)
	local self = setmetatable({}, Class23)
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

function Class23:getHealth(): number
	return self.health
end

function Class23:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class23: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class23:getStamina(): number
	return self.stamina
end

function Class23:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class23: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class23:getLevel(): number
	return self.level
end

function Class23:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class23: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class23:getScore(): number
	return self.score
end

function Class23:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class23: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class23:getEnergy(): number
	return self.energy
end

function Class23:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class23: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class23:onChanged(callback)
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

function Class23:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class23 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
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


local function deepCopy26(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy26(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber26(value: number): string
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

local function retry26(attempts, callback)
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


local CATALOG_27 = {
	{ id = 2700, name = "item_0", price = 125, rarity = "epic", stackable = true },
	{ id = 2701, name = "item_1", price = 250, rarity = "legendary", stackable = false },
	{ id = 2702, name = "item_2", price = 375, rarity = "rare", stackable = false },
	{ id = 2703, name = "item_3", price = 500, rarity = "epic", stackable = true },
	{ id = 2704, name = "item_4", price = 625, rarity = "rare", stackable = false },
	{ id = 2705, name = "item_5", price = 750, rarity = "common", stackable = false },
	{ id = 2706, name = "item_6", price = 875, rarity = "legendary", stackable = true },
	{ id = 2707, name = "item_7", price = 1000, rarity = "common", stackable = false },
	{ id = 2708, name = "item_8", price = 1125, rarity = "rare", stackable = false },
	{ id = 2709, name = "item_9", price = 1250, rarity = "legendary", stackable = true },
	{ id = 2710, name = "item_10", price = 1375, rarity = "legendary", stackable = true },
	{ id = 2711, name = "item_11", price = 1500, rarity = "common", stackable = false },
}

local INDEX_27 = {}
for _, entry in ipairs(CATALOG_27) do
	INDEX_27[entry.name] = entry
end

local function priceOf27(name: string): number
	local entry = INDEX_27[name]
	if not entry then
		return 0
	end
	return entry.price
end


print("loaded", 28)