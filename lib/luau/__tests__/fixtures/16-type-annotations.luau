type Point = { x: number, y: number }
export type Alias<T> = T | nil

local function distance(a: Point, b: Point): number
    return ((a.x - b.x) ^ 2 + (a.y - b.y) ^ 2) ^ 0.5
end

local function identity<T>(x: T): T
    return x
end

local origin: Point = { x = 0, y = 0 }

local function sum(...: number): number
    local total = 0
    for _, n in ipairs({ ... }) do
        total = total + n
    end
    return total
end
