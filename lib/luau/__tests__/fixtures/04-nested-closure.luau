local function makeCounter()
    local count = 0
    local function increment()
        count = count + 1
        return count
    end
    return increment
end
