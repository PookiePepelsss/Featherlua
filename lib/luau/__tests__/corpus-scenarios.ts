export const corpusScenarios = [
  {
    name: "inventory totals",
    source: `local items={{name="potion",price=12,count=3},{name="key",price=40,count=1},{name="map",price=8,count=2}}
local total=0
for _,item in ipairs(items) do total+=item.price*item.count end
print(total)`,
  },
  {
    name: "event dispatcher",
    source: `local listeners={}
local function on(name,callback)
 local list=listeners[name] or {}
 listeners[name]=list
 list[#list+1]=callback
end
local function emit(name,value)
 for _,callback in ipairs(listeners[name] or {}) do callback(value) end
end
on("score",function(value) print(value*2) end)
emit("score",21)`,
  },
  {
    name: "memoized fibonacci",
    source: `local cache={[0]=0,[1]=1}
local function fib(n)
 local found=cache[n]
 if found then return found end
 local value=fib(n-1)+fib(n-2)
 cache[n]=value
 return value
end
print(fib(12))`,
  },
  {
    name: "state machine",
    source: `local state="idle"
local transitions={idle={start="running"},running={stop="idle",pause="paused"},paused={start="running"}}
for _,event in ipairs({"start","pause","start","stop"}) do
 state=(transitions[state] or {})[event] or state
end
print(state)`,
  },
  {
    name: "vector style math",
    source: `local function add(a,b) return {x=a.x+b.x,y=a.y+b.y} end
local function scale(a,n) return {x=a.x*n,y=a.y*n} end
local result=scale(add({x=2,y=3},{x=4,y=5}),3)
print(result.x,result.y)`,
  },
  {
    name: "configuration merge",
    source: `local defaults={volume=5,quality="high",enabled=true}
local supplied={volume=8,enabled=false}
local result={}
for key,value in pairs(defaults) do result[key]=value end
for key,value in pairs(supplied) do result[key]=value end
print(result.volume,result.quality,result.enabled)`,
  },
  {
    name: "queue processing",
    source: `local queue={3,1,4,1,5}
local sum=0
while #queue>0 do
 local value=table.remove(queue,1)
 if value%2==0 then sum+=value*2 else sum+=value end
end
print(sum)`,
  },
  {
    name: "string report",
    source: `local names={"Ada","Lin","Mia"}
local parts={}
for index,name in ipairs(names) do parts[index]=index..":"..name end
print(table.concat(parts,"|"))`,
  },
  {
    name: "closure counter",
    source: `local function counter(start)
 local value=start
 return function(step) value+=step return value end
end
local nextValue=counter(10)
print(nextValue(2),nextValue(5),nextValue(-1))`,
  },
  {
    name: "protected call",
    source: `local function divide(a,b)
 assert(b~=0,"zero")
 return a/b
end
local ok,value=pcall(divide,20,4)
print(ok,value)`,
  },
  {
    name: "recursive table walk",
    source: `local function count(value)
 if type(value)~="table" then return 1 end
 local total=0
 for _,child in pairs(value) do total+=count(child) end
 return total
end
print(count({1,{2,3},{a=4,b={5,6}}}))`,
  },
  {
    name: "numeric for filtering",
    source: `local values={}
for index=1,30 do
 if index%3==0 and index%5~=0 then values[#values+1]=index end
end
print(#values,values[1],values[#values])`,
  },
] as const;
