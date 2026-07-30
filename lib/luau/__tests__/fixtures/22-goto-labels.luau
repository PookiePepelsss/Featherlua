do
    goto skip
    print("unreachable")
    ::skip::
end
::retry::
local ok = check()
if not ok then
    goto retry
end
