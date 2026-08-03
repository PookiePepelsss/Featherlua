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


local CATALOG_2 = {
	{ id = 200, name = "item_0", price = 125, rarity = "rare", stackable = true },
	{ id = 201, name = "item_1", price = 250, rarity = "epic", stackable = true },
	{ id = 202, name = "item_2", price = 375, rarity = "legendary", stackable = true },
	{ id = 203, name = "item_3", price = 500, rarity = "rare", stackable = true },
	{ id = 204, name = "item_4", price = 625, rarity = "common", stackable = true },
	{ id = 205, name = "item_5", price = 750, rarity = "epic", stackable = true },
	{ id = 206, name = "item_6", price = 875, rarity = "epic", stackable = false },
	{ id = 207, name = "item_7", price = 1000, rarity = "legendary", stackable = true },
	{ id = 208, name = "item_8", price = 1125, rarity = "rare", stackable = false },
	{ id = 209, name = "item_9", price = 1250, rarity = "legendary", stackable = true },
	{ id = 210, name = "item_10", price = 1375, rarity = "rare", stackable = true },
	{ id = 211, name = "item_11", price = 1500, rarity = "rare", stackable = true },
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


local service7 = game:GetService("RunService")
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


local Class8 = {}
Class8.__index = Class8

function Class8.new(config)
	local self = setmetatable({}, Class8)
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

function Class8:getHealth(): number
	return self.health
end

function Class8:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class8: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class8:getStamina(): number
	return self.stamina
end

function Class8:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class8: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class8:getLevel(): number
	return self.level
end

function Class8:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class8: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class8:getScore(): number
	return self.score
end

function Class8:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class8: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class8:getEnergy(): number
	return self.energy
end

function Class8:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class8: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class8:onChanged(callback)
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

function Class8:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class8 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
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


local service11 = game:GetService("TweenService")
local remote11 = game:GetService("ReplicatedStorage"):WaitForChild("Remote11")
local connection11
connection11 = service11.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection11:Disconnect()
		remote11:FireServer("overflow", accumulated)
	end
end)


local service12 = game:GetService("RunService")
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


local function deepCopy13(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy13(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber13(value: number): string
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

local function retry13(attempts, callback)
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


local service17 = game:GetService("TweenService")
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
	{ id = 2000, name = "item_0", price = 125, rarity = "epic", stackable = true },
	{ id = 2001, name = "item_1", price = 250, rarity = "common", stackable = false },
	{ id = 2002, name = "item_2", price = 375, rarity = "epic", stackable = false },
	{ id = 2003, name = "item_3", price = 500, rarity = "legendary", stackable = false },
	{ id = 2004, name = "item_4", price = 625, rarity = "common", stackable = false },
	{ id = 2005, name = "item_5", price = 750, rarity = "legendary", stackable = true },
	{ id = 2006, name = "item_6", price = 875, rarity = "rare", stackable = false },
	{ id = 2007, name = "item_7", price = 1000, rarity = "rare", stackable = true },
	{ id = 2008, name = "item_8", price = 1125, rarity = "common", stackable = true },
	{ id = 2009, name = "item_9", price = 1250, rarity = "rare", stackable = true },
	{ id = 2010, name = "item_10", price = 1375, rarity = "epic", stackable = true },
	{ id = 2011, name = "item_11", price = 1500, rarity = "epic", stackable = true },
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


local Class22 = {}
Class22.__index = Class22

function Class22.new(config)
	local self = setmetatable({}, Class22)
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

function Class22:getHealth(): number
	return self.health
end

function Class22:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class22: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class22:getStamina(): number
	return self.stamina
end

function Class22:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class22: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class22:getLevel(): number
	return self.level
end

function Class22:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class22: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class22:getScore(): number
	return self.score
end

function Class22:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class22: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class22:getEnergy(): number
	return self.energy
end

function Class22:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class22: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class22:onChanged(callback)
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

function Class22:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class22 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
end


local service23 = game:GetService("Players")
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


local service24 = game:GetService("ReplicatedStorage")
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


local CATALOG_25 = {
	{ id = 2500, name = "item_0", price = 125, rarity = "legendary", stackable = true },
	{ id = 2501, name = "item_1", price = 250, rarity = "common", stackable = true },
	{ id = 2502, name = "item_2", price = 375, rarity = "rare", stackable = true },
	{ id = 2503, name = "item_3", price = 500, rarity = "common", stackable = false },
	{ id = 2504, name = "item_4", price = 625, rarity = "rare", stackable = false },
	{ id = 2505, name = "item_5", price = 750, rarity = "common", stackable = true },
	{ id = 2506, name = "item_6", price = 875, rarity = "common", stackable = false },
	{ id = 2507, name = "item_7", price = 1000, rarity = "common", stackable = true },
	{ id = 2508, name = "item_8", price = 1125, rarity = "rare", stackable = true },
	{ id = 2509, name = "item_9", price = 1250, rarity = "epic", stackable = true },
	{ id = 2510, name = "item_10", price = 1375, rarity = "epic", stackable = false },
	{ id = 2511, name = "item_11", price = 1500, rarity = "common", stackable = false },
}

local INDEX_25 = {}
for _, entry in ipairs(CATALOG_25) do
	INDEX_25[entry.name] = entry
end

local function priceOf25(name: string): number
	local entry = INDEX_25[name]
	if not entry then
		return 0
	end
	return entry.price
end


local CATALOG_26 = {
	{ id = 2600, name = "item_0", price = 125, rarity = "common", stackable = false },
	{ id = 2601, name = "item_1", price = 250, rarity = "rare", stackable = false },
	{ id = 2602, name = "item_2", price = 375, rarity = "rare", stackable = false },
	{ id = 2603, name = "item_3", price = 500, rarity = "legendary", stackable = true },
	{ id = 2604, name = "item_4", price = 625, rarity = "epic", stackable = false },
	{ id = 2605, name = "item_5", price = 750, rarity = "common", stackable = false },
	{ id = 2606, name = "item_6", price = 875, rarity = "epic", stackable = true },
	{ id = 2607, name = "item_7", price = 1000, rarity = "common", stackable = true },
	{ id = 2608, name = "item_8", price = 1125, rarity = "common", stackable = false },
	{ id = 2609, name = "item_9", price = 1250, rarity = "common", stackable = false },
	{ id = 2610, name = "item_10", price = 1375, rarity = "legendary", stackable = false },
	{ id = 2611, name = "item_11", price = 1500, rarity = "legendary", stackable = false },
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


local service27 = game:GetService("ReplicatedStorage")
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


local CATALOG_29 = {
	{ id = 2900, name = "item_0", price = 125, rarity = "legendary", stackable = true },
	{ id = 2901, name = "item_1", price = 250, rarity = "rare", stackable = true },
	{ id = 2902, name = "item_2", price = 375, rarity = "common", stackable = false },
	{ id = 2903, name = "item_3", price = 500, rarity = "common", stackable = true },
	{ id = 2904, name = "item_4", price = 625, rarity = "legendary", stackable = false },
	{ id = 2905, name = "item_5", price = 750, rarity = "common", stackable = false },
	{ id = 2906, name = "item_6", price = 875, rarity = "common", stackable = false },
	{ id = 2907, name = "item_7", price = 1000, rarity = "epic", stackable = true },
	{ id = 2908, name = "item_8", price = 1125, rarity = "legendary", stackable = false },
	{ id = 2909, name = "item_9", price = 1250, rarity = "legendary", stackable = true },
	{ id = 2910, name = "item_10", price = 1375, rarity = "epic", stackable = false },
	{ id = 2911, name = "item_11", price = 1500, rarity = "legendary", stackable = true },
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


local CATALOG_32 = {
	{ id = 3200, name = "item_0", price = 125, rarity = "epic", stackable = true },
	{ id = 3201, name = "item_1", price = 250, rarity = "rare", stackable = false },
	{ id = 3202, name = "item_2", price = 375, rarity = "legendary", stackable = true },
	{ id = 3203, name = "item_3", price = 500, rarity = "legendary", stackable = false },
	{ id = 3204, name = "item_4", price = 625, rarity = "epic", stackable = false },
	{ id = 3205, name = "item_5", price = 750, rarity = "rare", stackable = true },
	{ id = 3206, name = "item_6", price = 875, rarity = "legendary", stackable = false },
	{ id = 3207, name = "item_7", price = 1000, rarity = "legendary", stackable = true },
	{ id = 3208, name = "item_8", price = 1125, rarity = "common", stackable = true },
	{ id = 3209, name = "item_9", price = 1250, rarity = "epic", stackable = false },
	{ id = 3210, name = "item_10", price = 1375, rarity = "legendary", stackable = true },
	{ id = 3211, name = "item_11", price = 1500, rarity = "common", stackable = true },
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


local service33 = game:GetService("Workspace")
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


local CATALOG_34 = {
	{ id = 3400, name = "item_0", price = 125, rarity = "rare", stackable = false },
	{ id = 3401, name = "item_1", price = 250, rarity = "legendary", stackable = false },
	{ id = 3402, name = "item_2", price = 375, rarity = "epic", stackable = true },
	{ id = 3403, name = "item_3", price = 500, rarity = "epic", stackable = true },
	{ id = 3404, name = "item_4", price = 625, rarity = "epic", stackable = true },
	{ id = 3405, name = "item_5", price = 750, rarity = "common", stackable = true },
	{ id = 3406, name = "item_6", price = 875, rarity = "epic", stackable = false },
	{ id = 3407, name = "item_7", price = 1000, rarity = "legendary", stackable = false },
	{ id = 3408, name = "item_8", price = 1125, rarity = "epic", stackable = true },
	{ id = 3409, name = "item_9", price = 1250, rarity = "rare", stackable = false },
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


local CATALOG_36 = {
	{ id = 3600, name = "item_0", price = 125, rarity = "epic", stackable = true },
	{ id = 3601, name = "item_1", price = 250, rarity = "legendary", stackable = true },
	{ id = 3602, name = "item_2", price = 375, rarity = "epic", stackable = false },
	{ id = 3603, name = "item_3", price = 500, rarity = "epic", stackable = true },
	{ id = 3604, name = "item_4", price = 625, rarity = "rare", stackable = false },
	{ id = 3605, name = "item_5", price = 750, rarity = "legendary", stackable = true },
	{ id = 3606, name = "item_6", price = 875, rarity = "rare", stackable = true },
	{ id = 3607, name = "item_7", price = 1000, rarity = "legendary", stackable = true },
	{ id = 3608, name = "item_8", price = 1125, rarity = "legendary", stackable = true },
	{ id = 3609, name = "item_9", price = 1250, rarity = "epic", stackable = true },
	{ id = 3610, name = "item_10", price = 1375, rarity = "common", stackable = true },
	{ id = 3611, name = "item_11", price = 1500, rarity = "legendary", stackable = false },
}

local INDEX_36 = {}
for _, entry in ipairs(CATALOG_36) do
	INDEX_36[entry.name] = entry
end

local function priceOf36(name: string): number
	local entry = INDEX_36[name]
	if not entry then
		return 0
	end
	return entry.price
end


local service37 = game:GetService("Workspace")
local remote37 = game:GetService("ReplicatedStorage"):WaitForChild("Remote37")
local connection37
connection37 = service37.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection37:Disconnect()
		remote37:FireServer("overflow", accumulated)
	end
end)


local Class38 = {}
Class38.__index = Class38

function Class38.new(config)
	local self = setmetatable({}, Class38)
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

function Class38:getHealth(): number
	return self.health
end

function Class38:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class38: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class38:getStamina(): number
	return self.stamina
end

function Class38:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class38: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class38:getLevel(): number
	return self.level
end

function Class38:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class38: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class38:getScore(): number
	return self.score
end

function Class38:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class38: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class38:getEnergy(): number
	return self.energy
end

function Class38:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class38: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class38:onChanged(callback)
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

function Class38:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class38 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
end


local service39 = game:GetService("Workspace")
local remote39 = game:GetService("ReplicatedStorage"):WaitForChild("Remote39")
local connection39
connection39 = service39.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection39:Disconnect()
		remote39:FireServer("overflow", accumulated)
	end
end)


local service40 = game:GetService("RunService")
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


local CATALOG_41 = {
	{ id = 4100, name = "item_0", price = 125, rarity = "legendary", stackable = false },
	{ id = 4101, name = "item_1", price = 250, rarity = "epic", stackable = true },
	{ id = 4102, name = "item_2", price = 375, rarity = "legendary", stackable = false },
	{ id = 4103, name = "item_3", price = 500, rarity = "legendary", stackable = true },
	{ id = 4104, name = "item_4", price = 625, rarity = "epic", stackable = false },
	{ id = 4105, name = "item_5", price = 750, rarity = "legendary", stackable = false },
	{ id = 4106, name = "item_6", price = 875, rarity = "epic", stackable = true },
	{ id = 4107, name = "item_7", price = 1000, rarity = "epic", stackable = false },
	{ id = 4108, name = "item_8", price = 1125, rarity = "rare", stackable = false },
	{ id = 4109, name = "item_9", price = 1250, rarity = "common", stackable = true },
	{ id = 4110, name = "item_10", price = 1375, rarity = "common", stackable = false },
	{ id = 4111, name = "item_11", price = 1500, rarity = "common", stackable = false },
}

local INDEX_41 = {}
for _, entry in ipairs(CATALOG_41) do
	INDEX_41[entry.name] = entry
end

local function priceOf41(name: string): number
	local entry = INDEX_41[name]
	if not entry then
		return 0
	end
	return entry.price
end


local function deepCopy42(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy42(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber42(value: number): string
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

local function retry42(attempts, callback)
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


local service43 = game:GetService("TweenService")
local remote43 = game:GetService("ReplicatedStorage"):WaitForChild("Remote43")
local connection43
connection43 = service43.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection43:Disconnect()
		remote43:FireServer("overflow", accumulated)
	end
end)


local Class44 = {}
Class44.__index = Class44

function Class44.new(config)
	local self = setmetatable({}, Class44)
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

function Class44:getHealth(): number
	return self.health
end

function Class44:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class44: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class44:getStamina(): number
	return self.stamina
end

function Class44:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class44: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class44:getLevel(): number
	return self.level
end

function Class44:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class44: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class44:getScore(): number
	return self.score
end

function Class44:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class44: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class44:getEnergy(): number
	return self.energy
end

function Class44:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class44: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class44:onChanged(callback)
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

function Class44:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class44 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
end


local Class45 = {}
Class45.__index = Class45

function Class45.new(config)
	local self = setmetatable({}, Class45)
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

function Class45:getHealth(): number
	return self.health
end

function Class45:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class45: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class45:getStamina(): number
	return self.stamina
end

function Class45:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class45: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class45:getLevel(): number
	return self.level
end

function Class45:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class45: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class45:getScore(): number
	return self.score
end

function Class45:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class45: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class45:getEnergy(): number
	return self.energy
end

function Class45:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class45: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class45:onChanged(callback)
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

function Class45:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class45 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
end


local CATALOG_46 = {
	{ id = 4600, name = "item_0", price = 125, rarity = "epic", stackable = false },
	{ id = 4601, name = "item_1", price = 250, rarity = "common", stackable = false },
	{ id = 4602, name = "item_2", price = 375, rarity = "epic", stackable = false },
	{ id = 4603, name = "item_3", price = 500, rarity = "rare", stackable = true },
	{ id = 4604, name = "item_4", price = 625, rarity = "common", stackable = false },
	{ id = 4605, name = "item_5", price = 750, rarity = "epic", stackable = false },
	{ id = 4606, name = "item_6", price = 875, rarity = "legendary", stackable = true },
	{ id = 4607, name = "item_7", price = 1000, rarity = "epic", stackable = true },
	{ id = 4608, name = "item_8", price = 1125, rarity = "rare", stackable = true },
	{ id = 4609, name = "item_9", price = 1250, rarity = "legendary", stackable = false },
	{ id = 4610, name = "item_10", price = 1375, rarity = "common", stackable = true },
	{ id = 4611, name = "item_11", price = 1500, rarity = "legendary", stackable = true },
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


local function deepCopy47(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy47(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber47(value: number): string
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

local function retry47(attempts, callback)
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


local service48 = game:GetService("TweenService")
local remote48 = game:GetService("ReplicatedStorage"):WaitForChild("Remote48")
local connection48
connection48 = service48.Heartbeat:Connect(function(deltaTime)
	local accumulated = 0
	for step = 1, 8 do
		if step % 3 == 0 then
			continue
		end
		accumulated = accumulated + deltaTime * step
	end
	if accumulated > 1000000 then
		connection48:Disconnect()
		remote48:FireServer("overflow", accumulated)
	end
end)


local Class49 = {}
Class49.__index = Class49

function Class49.new(config)
	local self = setmetatable({}, Class49)
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

function Class49:getHealth(): number
	return self.health
end

function Class49:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class49: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class49:getStamina(): number
	return self.stamina
end

function Class49:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class49: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class49:getLevel(): number
	return self.level
end

function Class49:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class49: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class49:getScore(): number
	return self.score
end

function Class49:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class49: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class49:getEnergy(): number
	return self.energy
end

function Class49:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class49: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class49:onChanged(callback)
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

function Class49:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class49 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
end


local Class50 = {}
Class50.__index = Class50

function Class50.new(config)
	local self = setmetatable({}, Class50)
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

function Class50:getHealth(): number
	return self.health
end

function Class50:addHealth(amount: number)
	if type(amount) ~= "number" then
		warn("Class50: expected number for health")
		return self
	end
	self.health = self.health + amount
	if self.health > 100 then
		self.health = 100
	end
	self._dirty = true
	return self
end

function Class50:getStamina(): number
	return self.stamina
end

function Class50:addStamina(amount: number)
	if type(amount) ~= "number" then
		warn("Class50: expected number for stamina")
		return self
	end
	self.stamina = self.stamina + amount
	if self.stamina > 125 then
		self.stamina = 125
	end
	self._dirty = true
	return self
end

function Class50:getLevel(): number
	return self.level
end

function Class50:addLevel(amount: number)
	if type(amount) ~= "number" then
		warn("Class50: expected number for level")
		return self
	end
	self.level = self.level + amount
	if self.level > 150 then
		self.level = 150
	end
	self._dirty = true
	return self
end

function Class50:getScore(): number
	return self.score
end

function Class50:addScore(amount: number)
	if type(amount) ~= "number" then
		warn("Class50: expected number for score")
		return self
	end
	self.score = self.score + amount
	if self.score > 175 then
		self.score = 175
	end
	self._dirty = true
	return self
end

function Class50:getEnergy(): number
	return self.energy
end

function Class50:addEnergy(amount: number)
	if type(amount) ~= "number" then
		warn("Class50: expected number for energy")
		return self
	end
	self.energy = self.energy + amount
	if self.energy > 200 then
		self.energy = 200
	end
	self._dirty = true
	return self
end

function Class50:onChanged(callback)
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

function Class50:flush()
	if not self._dirty then
		return
	end
	for _, callback in ipairs(self._listeners) do
		local ok, err = pcall(callback, self)
		if not ok then
			warn("Class50 listener failed: " .. tostring(err))
		end
	end
	self._dirty = false
end


local function deepCopy51(source)
	if type(source) ~= "table" then
		return source
	end
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = deepCopy51(value)
	end
	return setmetatable(copy, getmetatable(source))
end

local function formatNumber51(value: number): string
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

local function retry51(attempts, callback)
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


print("loaded", 52)