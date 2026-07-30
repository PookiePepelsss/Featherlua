local x = 1
local function useX()
    return x
end
local wrapper = function(x)
    return x + useX()
end
