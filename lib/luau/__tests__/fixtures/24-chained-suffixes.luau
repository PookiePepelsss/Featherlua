local a = { b = { c = { d = function(self, x) return self, x end } } }
local result = a.b.c:d(1)[2]
