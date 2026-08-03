--!strict

-- Generated module bundle

local service0 = game:GetService("RunService")
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


local service1 = game:GetService("TweenService")
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


local service3 = game:GetService("RunService")
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


local Class6 = {}
Class6.__index = Class6

function Class6.new(config)
	local self = setmetatable({}, Class6)
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

function Class6:getHealth(): number
	return self.health
end

function Class6:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class6: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class6:getStamina(): number
	return self.stamina
end

function Class6:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class6: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class6:getLevel(): number
	return self.level
end

function Class6:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class6: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class6:getScore(): number
	return self.score
end

function Class6:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class6: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class6:getEnergy(): number
	return self.energy
end

function Class6:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class6: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class6:onChanged(callback)
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

function Class6:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class6 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
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


local CATALOG_8 = {
	{ id = 800, name = "item_0", price = 125, rarity = "rare", stackable = true },
	{ id = 801, name = "item_1", price = 250, rarity = "epic", stackable = true },
	{ id = 802, name = "item_2", price = 375, rarity = "common", stackable = false },
	{ id = 803, name = "item_3", price = 500, rarity = "epic", stackable = false },
	{ id = 804, name = "item_4", price = 625, rarity = "epic", stackable = true },
	{ id = 805, name = "item_5", price = 750, rarity = "epic", stackable = true },
	{ id = 806, name = "item_6", price = 875, rarity = "rare", stackable = false },
	{ id = 807, name = "item_7", price = 1000, rarity = "common", stackable = false },
	{ id = 808, name = "item_8", price = 1125, rarity = "common", stackable = false },
	{ id = 809, name = "item_9", price = 1250, rarity = "rare", stackable = true },
	{ id = 810, name = "item_10", price = 1375, rarity = "legendary", stackable = true },
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


local CATALOG_9 = {
	{ id = 900, name = "item_0", price = 125, rarity = "common", stackable = true },
	{ id = 901, name = "item_1", price = 250, rarity = "rare", stackable = false },
	{ id = 902, name = "item_2", price = 375, rarity = "rare", stackable = true },
	{ id = 903, name = "item_3", price = 500, rarity = "rare", stackable = false },
	{ id = 904, name = "item_4", price = 625, rarity = "legendary", stackable = false },
	{ id = 905, name = "item_5", price = 750, rarity = "rare", stackable = false },
	{ id = 906, name = "item_6", price = 875, rarity = "rare", stackable = true },
	{ id = 907, name = "item_7", price = 1000, rarity = "common", stackable = true },
	{ id = 908, name = "item_8", price = 1125, rarity = "common", stackable = false },
	{ id = 909, name = "item_9", price = 1250, rarity = "common", stackable = true },
	{ id = 910, name = "item_10", price = 1375, rarity = "legendary", stackable = true },
	{ id = 911, name = "item_11", price = 1500, rarity = "common", stackable = true },
}

local INDEX_9 = {}
for _, entry in ipairs(CATALOG_9) do
	INDEX_9[entry.name] = entry
end

local function priceOf9(name: string): number
	local entry = INDEX_9[name]
	if not entry then
		return 0
	end
	return entry.price
end


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


local service18 = game:GetService("Workspace")
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


local CATALOG_23 = {
	{ id = 2300, name = "item_0", price = 125, rarity = "rare", stackable = false },
	{ id = 2301, name = "item_1", price = 250, rarity = "legendary", stackable = true },
	{ id = 2302, name = "item_2", price = 375, rarity = "rare", stackable = false },
	{ id = 2303, name = "item_3", price = 500, rarity = "common", stackable = false },
	{ id = 2304, name = "item_4", price = 625, rarity = "rare", stackable = false },
	{ id = 2305, name = "item_5", price = 750, rarity = "legendary", stackable = false },
	{ id = 2306, name = "item_6", price = 875, rarity = "common", stackable = true },
	{ id = 2307, name = "item_7", price = 1000, rarity = "legendary", stackable = true },
	{ id = 2308, name = "item_8", price = 1125, rarity = "epic", stackable = false },
	{ id = 2309, name = "item_9", price = 1250, rarity = "common", stackable = true },
	{ id = 2310, name = "item_10", price = 1375, rarity = "rare", stackable = false },
	{ id = 2311, name = "item_11", price = 1500, rarity = "epic", stackable = true },
}

local INDEX_23 = {}
for _, entry in ipairs(CATALOG_23) do
	INDEX_23[entry.name] = entry
end

local function priceOf23(name: string): number
	local entry = INDEX_23[name]
	if not entry then
		return 0
	end
	return entry.price
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


local service29 = game:GetService("TweenService")
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
	{ id = 3000, name = "item_0", price = 125, rarity = "legendary", stackable = true },
	{ id = 3001, name = "item_1", price = 250, rarity = "rare", stackable = false },
	{ id = 3002, name = "item_2", price = 375, rarity = "legendary", stackable = true },
	{ id = 3003, name = "item_3", price = 500, rarity = "legendary", stackable = false },
	{ id = 3004, name = "item_4", price = 625, rarity = "rare", stackable = true },
	{ id = 3005, name = "item_5", price = 750, rarity = "epic", stackable = true },
	{ id = 3006, name = "item_6", price = 875, rarity = "common", stackable = true },
	{ id = 3007, name = "item_7", price = 1000, rarity = "epic", stackable = true },
	{ id = 3008, name = "item_8", price = 1125, rarity = "common", stackable = false },
	{ id = 3009, name = "item_9", price = 1250, rarity = "legendary", stackable = false },
	{ id = 3010, name = "item_10", price = 1375, rarity = "rare", stackable = true },
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


local Class31 = {}
Class31.__index = Class31

function Class31.new(config)
	local self = setmetatable({}, Class31)
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

function Class31:getHealth(): number
	return self.health
end

function Class31:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class31: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class31:getStamina(): number
	return self.stamina
end

function Class31:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class31: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class31:getLevel(): number
	return self.level
end

function Class31:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class31: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class31:getScore(): number
	return self.score
end

function Class31:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class31: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class31:getEnergy(): number
	return self.energy
end

function Class31:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class31: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class31:onChanged(callback)
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

function Class31:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class31 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
end


local CATALOG_32 = {
	{ id = 3200, name = "item_0", price = 125, rarity = "rare", stackable = true },
	{ id = 3201, name = "item_1", price = 250, rarity = "rare", stackable = true },
	{ id = 3202, name = "item_2", price = 375, rarity = "legendary", stackable = true },
	{ id = 3203, name = "item_3", price = 500, rarity = "rare", stackable = true },
	{ id = 3204, name = "item_4", price = 625, rarity = "rare", stackable = true },
	{ id = 3205, name = "item_5", price = 750, rarity = "legendary", stackable = true },
	{ id = 3206, name = "item_6", price = 875, rarity = "epic", stackable = false },
	{ id = 3207, name = "item_7", price = 1000, rarity = "rare", stackable = false },
	{ id = 3208, name = "item_8", price = 1125, rarity = "common", stackable = false },
	{ id = 3209, name = "item_9", price = 1250, rarity = "common", stackable = true },
	{ id = 3210, name = "item_10", price = 1375, rarity = "epic", stackable = false },
	{ id = 3211, name = "item_11", price = 1500, rarity = "rare", stackable = false },
}

local INDEX_32 = {}
for _, entry in ipairs(CATALOG_32) do
	INDEX_32[entry.name] = entry
end

local function priceOf32(name: string): number
	local entry = INDEX_32[name]
	if not entry then
		return 0
	end
	return entry.price
end


local service33 = game:GetService("TweenService")
local remote33 = game:GetService("ReplicatedStorage"):WaitForChild("Remote33")
local connection33
connection33 = service33.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection33:Disconnect()
		remote33:FireServer("overflow", accumulated)
	end
end)


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


local function deepCopy36(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy36(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber36(value: number): string
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

local function retry36(attempts, callback)
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


local CATALOG_37 = {
	{ id = 3700, name = "item_0", price = 125, rarity = "legendary", stackable = true },
	{ id = 3701, name = "item_1", price = 250, rarity = "legendary", stackable = true },
	{ id = 3702, name = "item_2", price = 375, rarity = "common", stackable = false },
	{ id = 3703, name = "item_3", price = 500, rarity = "legendary", stackable = false },
	{ id = 3704, name = "item_4", price = 625, rarity = "common", stackable = false },
	{ id = 3705, name = "item_5", price = 750, rarity = "rare", stackable = false },
	{ id = 3706, name = "item_6", price = 875, rarity = "legendary", stackable = false },
	{ id = 3707, name = "item_7", price = 1000, rarity = "rare", stackable = true },
	{ id = 3708, name = "item_8", price = 1125, rarity = "rare", stackable = false },
	{ id = 3709, name = "item_9", price = 1250, rarity = "rare", stackable = false },
	{ id = 3710, name = "item_10", price = 1375, rarity = "rare", stackable = true },
	{ id = 3711, name = "item_11", price = 1500, rarity = "common", stackable = false },
}

local INDEX_37 = {}
for _, entry in ipairs(CATALOG_37) do
	INDEX_37[entry.name] = entry
end

local function priceOf37(name: string): number
	local entry = INDEX_37[name]
	if not entry then
		return 0
	end
	return entry.price
end


local function deepCopy38(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy38(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber38(value: number): string
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

local function retry38(attempts, callback)
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


local Class39 = {}
Class39.__index = Class39

function Class39.new(config)
	local self = setmetatable({}, Class39)
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

function Class39:getHealth(): number
	return self.health
end

function Class39:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class39: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class39:getStamina(): number
	return self.stamina
end

function Class39:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class39: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class39:getLevel(): number
	return self.level
end

function Class39:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class39: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class39:getScore(): number
	return self.score
end

function Class39:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class39: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class39:getEnergy(): number
	return self.energy
end

function Class39:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class39: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class39:onChanged(callback)
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

function Class39:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class39 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
end


print("loaded", 40)