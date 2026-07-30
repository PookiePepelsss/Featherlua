local x = 1
do
    local x = 2
    do
        local x = 3
        print(x)
    end
    print(x)
end
print(x)
