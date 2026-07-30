local a, b = 1, 2
a, b = b, a
local function two()
    return 1, 2
end
local x, y = two()
