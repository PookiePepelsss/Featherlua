local goto = 2
local t = { goto = goto * 3 }
t.goto = t.goto + 1
local function f(goto)
    return goto - 1
end
print(goto, t.goto, t["goto"], f(goto))
