local x = 1
local y = x :: number
local z = (y :: any) :: number
local function pair()
    return 1, 2
end
local first = pair() :: number
print(select("#", pair() :: any))
print(x, y, z, first)
