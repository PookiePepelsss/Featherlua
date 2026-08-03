--!strict

-- Generated module bundle

local service0 = game:GetService("Players")
local remote0 = game:GetService("ReplicatedStorage"):WaitForChild("Remote0")
local connection0
connection0 = service0.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection0:Disconnect()
		remote0:FireServer("overflow", accumulated)
	end
end)


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


local CATALOG_3 = {
	{ id = 300, name = "item_0", price = 125, rarity = "common", stackable = true },
	{ id = 301, name = "item_1", price = 250, rarity = "legendary", stackable = true },
	{ id = 302, name = "item_2", price = 375, rarity = "legendary", stackable = true },
	{ id = 303, name = "item_3", price = 500, rarity = "legendary", stackable = true },
	{ id = 304, name = "item_4", price = 625, rarity = "epic", stackable = false },
	{ id = 305, name = "item_5", price = 750, rarity = "epic", stackable = true },
	{ id = 306, name = "item_6", price = 875, rarity = "legendary", stackable = true },
	{ id = 307, name = "item_7", price = 1000, rarity = "legendary", stackable = false },
	{ id = 308, name = "item_8", price = 1125, rarity = "common", stackable = true },
	{ id = 309, name = "item_9", price = 1250, rarity = "rare", stackable = false },
	{ id = 310, name = "item_10", price = 1375, rarity = "common", stackable = true },
	{ id = 311, name = "item_11", price = 1500, rarity = "legendary", stackable = false },
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
	{ id = 600, name = "item_0", price = 125, rarity = "epic", stackable = true },
	{ id = 601, name = "item_1", price = 250, rarity = "common", stackable = false },
	{ id = 602, name = "item_2", price = 375, rarity = "rare", stackable = false },
	{ id = 603, name = "item_3", price = 500, rarity = "common", stackable = false },
	{ id = 604, name = "item_4", price = 625, rarity = "epic", stackable = true },
	{ id = 605, name = "item_5", price = 750, rarity = "common", stackable = false },
	{ id = 606, name = "item_6", price = 875, rarity = "epic", stackable = true },
	{ id = 607, name = "item_7", price = 1000, rarity = "common", stackable = false },
	{ id = 608, name = "item_8", price = 1125, rarity = "rare", stackable = true },
	{ id = 609, name = "item_9", price = 1250, rarity = "rare", stackable = true },
	{ id = 610, name = "item_10", price = 1375, rarity = "rare", stackable = true },
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


local Class7 = {}
Class7.__index = Class7

function Class7.new(config)
	local self = setmetatable({}, Class7)
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

function Class7:getHealth(): number
	return self.health
end

function Class7:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class7: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class7:getStamina(): number
	return self.stamina
end

function Class7:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class7: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class7:getLevel(): number
	return self.level
end

function Class7:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class7: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class7:getScore(): number
	return self.score
end

function Class7:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class7: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class7:getEnergy(): number
	return self.energy
end

function Class7:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class7: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class7:onChanged(callback)
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

function Class7:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class7 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
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


local CATALOG_11 = {
	{ id = 1100, name = "item_0", price = 125, rarity = "legendary", stackable = true },
	{ id = 1101, name = "item_1", price = 250, rarity = "common", stackable = true },
	{ id = 1102, name = "item_2", price = 375, rarity = "rare", stackable = false },
	{ id = 1103, name = "item_3", price = 500, rarity = "rare", stackable = true },
	{ id = 1104, name = "item_4", price = 625, rarity = "common", stackable = false },
	{ id = 1105, name = "item_5", price = 750, rarity = "epic", stackable = false },
	{ id = 1106, name = "item_6", price = 875, rarity = "epic", stackable = true },
	{ id = 1107, name = "item_7", price = 1000, rarity = "common", stackable = true },
	{ id = 1108, name = "item_8", price = 1125, rarity = "epic", stackable = false },
	{ id = 1109, name = "item_9", price = 1250, rarity = "common", stackable = true },
	{ id = 1110, name = "item_10", price = 1375, rarity = "rare", stackable = false },
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


local service13 = game:GetService("TweenService")
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


local CATALOG_19 = {
	{ id = 1900, name = "item_0", price = 125, rarity = "rare", stackable = true },
	{ id = 1901, name = "item_1", price = 250, rarity = "rare", stackable = true },
	{ id = 1902, name = "item_2", price = 375, rarity = "common", stackable = false },
	{ id = 1903, name = "item_3", price = 500, rarity = "common", stackable = false },
	{ id = 1904, name = "item_4", price = 625, rarity = "legendary", stackable = true },
	{ id = 1905, name = "item_5", price = 750, rarity = "common", stackable = false },
	{ id = 1906, name = "item_6", price = 875, rarity = "common", stackable = true },
	{ id = 1907, name = "item_7", price = 1000, rarity = "rare", stackable = true },
	{ id = 1908, name = "item_8", price = 1125, rarity = "common", stackable = false },
	{ id = 1909, name = "item_9", price = 1250, rarity = "legendary", stackable = true },
	{ id = 1910, name = "item_10", price = 1375, rarity = "epic", stackable = true },
	{ id = 1911, name = "item_11", price = 1500, rarity = "rare", stackable = false },
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


print("loaded", 20)