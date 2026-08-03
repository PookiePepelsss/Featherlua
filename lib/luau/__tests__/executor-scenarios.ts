export interface ExecutorScenario {
  name: string;
  source: string;
  globals: string[];
  members?: string[];
}

export const executorScenarios: ExecutorScenario[] = [
  {
    name: "RemoteEvent arguments",
    source: 'local r=game:GetService("ReplicatedStorage"):WaitForChild("Action")\nr:FireServer("equip",42,nil,{slot=3,enabled=true})',
    globals: ["game"],
    members: ["GetService", "WaitForChild", "FireServer"],
  },
  {
    name: "RemoteFunction arguments and result",
    source: 'local r=game:GetService("ReplicatedStorage"):WaitForChild("Query")\nlocal value=r:InvokeServer("lookup",{id=7},true)\nprint(value)',
    globals: ["game", "print"],
    members: ["GetService", "WaitForChild", "InvokeServer"],
  },
  {
    name: "global executor environments",
    source: 'getgenv().enabled=true\ngetrenv().marker="runtime"\nshared.cache=shared.cache or {}',
    globals: ["getgenv", "getrenv", "shared"],
  },
  {
    name: "hookfunction and newcclosure",
    source: 'local old\nold=hookfunction(target,newcclosure(function(...)return old(...)end))',
    globals: ["hookfunction", "target", "newcclosure"],
  },
  {
    name: "hookmetamethod namecall",
    source: 'local old\nold=hookmetamethod(game,"__namecall",newcclosure(function(self,...)local m=getnamecallmethod()if m=="FireServer"then return old(self,...)end return old(self,...)end))',
    globals: ["hookmetamethod", "game", "newcclosure", "getnamecallmethod"],
  },
  {
    name: "raw metatable readonly state",
    source: 'local mt=getrawmetatable(game)\nlocal state=isreadonly(mt)\nsetreadonly(mt,false)\nlocal old=mt.__index\nmt.__index=newcclosure(function(self,key)return old(self,key)end)\nsetreadonly(mt,state)',
    globals: ["getrawmetatable", "game", "isreadonly", "setreadonly", "newcclosure"],
    members: ["__index"],
  },
  {
    name: "garbage collector enumeration",
    source: 'for _,object in ipairs(getgc(true))do if type(object)=="function"then local info=debug.info(object,"n")print(info)end end',
    globals: ["ipairs", "getgc", "type", "debug", "print"],
    members: ["info"],
  },
  {
    name: "registry enumeration",
    source: 'local registry=getreg()\nfor key,value in pairs(registry)do if key~=nil then print(value)end end',
    globals: ["getreg", "pairs", "print"],
  },
  {
    name: "debug upvalues",
    source: 'local name,value=debug.getupvalue(target,1)\ndebug.setupvalue(target,1,value)\nprint(name)',
    globals: ["debug", "target", "print"],
    members: ["getupvalue", "setupvalue"],
  },
  {
    name: "debug constants",
    source: 'local values=debug.getconstants(target)\nlocal first=debug.getconstant(target,1)\ndebug.setconstant(target,1,first)\nprint(#values)',
    globals: ["debug", "target", "print"],
    members: ["getconstants", "getconstant", "setconstant"],
  },
  {
    name: "debug prototypes",
    source: 'local protos=debug.getprotos(target)\nlocal proto=debug.getproto(target,1)\ndebug.setproto(target,1,proto)\nprint(#protos)',
    globals: ["debug", "target", "print"],
    members: ["getprotos", "getproto", "setproto"],
  },
  {
    name: "debug stack",
    source: 'local frame=debug.getstack(1)\ndebug.setstack(1,1,frame[1])\nprint(frame)',
    globals: ["debug", "print"],
    members: ["getstack", "setstack"],
  },
  {
    name: "signal connections",
    source: 'local signal=game:GetService("Players").PlayerAdded\nfor _,connection in ipairs(getconnections(signal))do if connection.Enabled then connection:Disable()connection:Enable()end end',
    globals: ["game", "ipairs", "getconnections"],
    members: ["GetService", "PlayerAdded", "Enabled", "Disable", "Enable"],
  },
  {
    name: "signal and detector firing",
    source: 'firesignal(button.MouseButton1Click,"payload",9)\nfireclickdetector(detector,2)\nfiretouchinterest(partA,partB,0)\nfiretouchinterest(partA,partB,1)',
    globals: ["firesignal", "button", "fireclickdetector", "detector", "firetouchinterest", "partA", "partB"],
    members: ["MouseButton1Click"],
  },
  {
    name: "instance reference and cache APIs",
    source: 'local service=cloneref(game:GetService("CoreGui"))\nlocal same=compareinstances(service,game.CoreGui)\ncache.invalidate(service)\nprint(same)',
    globals: ["cloneref", "game", "compareinstances", "cache", "print"],
    members: ["GetService", "CoreGui", "invalidate"],
  },
  {
    name: "executor GUI protection",
    source: 'local gui=Instance.new("ScreenGui")\nprotectgui(gui)\ngui.Parent=gethui()\nunprotectgui(gui)',
    globals: ["Instance", "protectgui", "gethui", "unprotectgui"],
    members: ["new", "Parent"],
  },
  {
    name: "filesystem operations",
    source: 'if not isfolder("workspace")then makefolder("workspace")end\nwritefile("workspace/data.txt","payload")\nappendfile("workspace/data.txt","more")\nlocal data=readfile("workspace/data.txt")\nlocal files=listfiles("workspace")\nprint(data,#files,isfile("workspace/data.txt"))',
    globals: ["isfolder", "makefolder", "writefile", "appendfile", "readfile", "listfiles", "print", "isfile"],
  },
  {
    name: "HTTP request aliases",
    source: 'local response=(request or http_request or syn.request)({Url="https://example.invalid/api",Method="POST",Headers={["X-Test"]="1"},Body="{}"})\nprint(response.StatusCode,response.Body)',
    globals: ["request", "http_request", "syn", "print"],
    members: ["request", "StatusCode", "Body"],
  },
  {
    name: "WebSocket connection",
    source: 'local socket=WebSocket.connect("wss://example.invalid/socket")\nsocket:Send("hello")\nlocal connection=socket.OnMessage:Connect(function(message)print(message)end)\nconnection:Disconnect()\nsocket:Close()',
    globals: ["WebSocket", "print"],
    members: ["connect", "Send", "OnMessage", "Connect", "Disconnect", "Close"],
  },
  {
    name: "cryptography helpers",
    source: 'local encoded=crypt.base64.encode("payload")\nlocal decoded=crypt.base64.decode(encoded)\nlocal digest=crypt.hash(decoded,"sha256")\nlocal key=crypt.generatekey()\nprint(digest,key)',
    globals: ["crypt", "print"],
    members: ["base64", "encode", "decode", "hash", "generatekey"],
  },
  {
    name: "clipboard and custom assets",
    source: 'setclipboard("copied text")\nlocal asset=getcustomasset("workspace/icon.png")\nprint(asset)',
    globals: ["setclipboard", "getcustomasset", "print"],
  },
  {
    name: "teleport queue",
    source: 'queue_on_teleport("getgenv().rejoined=true")\nqueueonteleport("print(1)")',
    globals: ["queue_on_teleport", "queueonteleport"],
  },
  {
    name: "thread identity",
    source: 'local previous=getthreadidentity()\nsetthreadidentity(8)\nprint(getthreadcontext())\nsetthreadcontext(previous)',
    globals: ["getthreadidentity", "setthreadidentity", "print", "getthreadcontext", "setthreadcontext"],
  },
  {
    name: "Drawing API",
    source: 'local line=Drawing.new("Line")\nline.From=Vector2.new(0,0)\nline.To=Vector2.new(100,100)\nline.Color=Color3.new(1,0,0)\nline.Visible=true\nline:Remove()',
    globals: ["Drawing", "Vector2", "Color3"],
    members: ["new", "From", "To", "Color", "Visible", "Remove"],
  },
  {
    name: "bytecode and decompiler APIs",
    source: 'local bytecode=getscriptbytecode(script)\nlocal source=decompile(script)\nlocal dumped=dumpstring(function()return 42 end)\nprint(#bytecode,#source,#dumped)',
    globals: ["getscriptbytecode", "script", "decompile", "dumpstring", "print"],
  },
  {
    name: "loadstring compilation",
    source: 'local chunk,errorMessage=loadstring("return function(a,b)return a+b end")\nif not chunk then error(errorMessage)end\nlocal add=chunk()\nprint(add(2,3))',
    globals: ["loadstring", "error", "print"],
  },
  {
    name: "executor identification",
    source: 'local name,version=identifyexecutor()\nlocal second=getexecutorname()\nprint(name,version,second)',
    globals: ["identifyexecutor", "getexecutorname", "print"],
  },
  {
    name: "mouse and keyboard input",
    source: 'mouse1move(10,20)\nmouse1press()\nmouse1release()\nkeypress(0x41)\nkeyrelease(0x41)\nmouse2click()\nmousescroll(-1)',
    globals: ["mouse1move", "mouse1press", "mouse1release", "keypress", "keyrelease", "mouse2click", "mousescroll"],
  },
  {
    name: "hidden properties",
    source: 'local value,hidden=gethiddenproperty(instance,"Property")\nsethiddenproperty(instance,"Property",value)\nprint(hidden)',
    globals: ["gethiddenproperty", "instance", "sethiddenproperty", "print"],
  },
  {
    name: "simulation radius",
    source: 'setsimulationradius(1000,1000)\nsethiddenproperty(game:GetService("Players").LocalPlayer,"SimulationRadius",1000)',
    globals: ["setsimulationradius", "sethiddenproperty", "game"],
    members: ["GetService", "LocalPlayer"],
  },
  {
    name: "closure inspection",
    source: 'local wrapped=newcclosure(function(a)return a end)\nprint(iscclosure(wrapped),islclosure(wrapped),isexecutorclosure(wrapped),checkclosure(wrapped))',
    globals: ["newcclosure", "print", "iscclosure", "islclosure", "isexecutorclosure", "checkclosure"],
  },
  {
    name: "console helpers",
    source: 'rconsoleclear()\nrconsolename("Compressor Test")\nrconsoleprint("@@GREEN@@ready")\nconsolewarn("warning")\nconsoleerror("error")',
    globals: ["rconsoleclear", "rconsolename", "rconsoleprint", "consolewarn", "consoleerror"],
  },
  {
    name: "task and thread helpers",
    source: 'local thread=task.spawn(function()task.wait()print("done")end)\nlocal running=coroutine.running()\nprint(thread,running)',
    globals: ["task", "print", "coroutine"],
    members: ["spawn", "wait", "running"],
  },
  {
    name: "script environments and closures",
    source: 'local env=getsenv(script)\nlocal closure=getscriptclosure(script)\nlocal modules=getloadedmodules()\nprint(env,closure,#modules)',
    globals: ["getsenv", "script", "getscriptclosure", "getloadedmodules", "print"],
  },
  {
    name: "instance enumeration",
    source: 'local all=getinstances()\nlocal nilInstances=getnilinstances()\nfor _,item in ipairs(nilInstances)do print(item:GetFullName())end\nprint(#all)',
    globals: ["getinstances", "getnilinstances", "ipairs", "print"],
    members: ["GetFullName"],
  },
  {
    name: "network ownership",
    source: 'if isnetworkowner(part)then part.AssemblyLinearVelocity=Vector3.new(0,10,0)end\nprint(getsimulationradius())',
    globals: ["isnetworkowner", "part", "Vector3", "print", "getsimulationradius"],
    members: ["AssemblyLinearVelocity", "new"],
  },
  {
    name: "message box",
    source: 'local choice=messagebox("Continue?","Executor",4)\nprint(choice)',
    globals: ["messagebox", "print"],
  },
  {
    name: "fast flags",
    source: 'local old=getfflag("ExampleFlag")\nsetfflag("ExampleFlag","True")\nprint(old)',
    globals: ["getfflag", "setfflag", "print"],
  },
  {
    name: "scriptability controls",
    source: 'local old=setscriptable(instance,"Property",true)\nlocal current=isscriptable(instance,"Property")\nsetscriptable(instance,"Property",old)\nprint(current)',
    globals: ["setscriptable", "instance", "isscriptable", "print"],
  },
  {
    name: "custom signals",
    source: 'local signal=create_signal()\nlocal connection=signal:Connect(function(a,b,c)print(a,b,c)end)\nsignal:Fire("payload",nil,{value=5})\nconnection:Disconnect()\nsignal:Destroy()',
    globals: ["create_signal", "print"],
    members: ["Connect", "Fire", "Disconnect", "Destroy"],
  },
  {
    name: "varargs forwarded through a hook chain",
    source: 'local old\nold=hookfunction(target,newcclosure(function(...)local n=select("#",...)local a,b,c=...\nprint(n,a,b,c)return old(...)end))\nold(1,nil,"three")',
    globals: ["hookfunction", "target", "newcclosure", "select", "print"],
  },
  {
    name: "nil holes preserved in remote arguments",
    source: 'local payload={1,nil,3}\nlocal n=select("#",1,nil,3)\nfiresignal(button.Event,1,nil,3)\nprint(n,#payload,payload[1],payload[3])',
    globals: ["select", "firesignal", "button", "print"],
  },
  {
    name: "method vs dot call on the same object",
    source: 'local obj={value=7}\nfunction obj:getSelf()return self.value end\nfunction obj.getPlain(v)return v end\nprint(obj:getSelf(),obj.getPlain(9))',
    globals: ["print"],
    members: ["getSelf", "getPlain", "value"],
  },
  {
    name: "closure captures loop variable per iteration",
    source: 'local fns={}\nfor i=1,3 do fns[i]=function()return i end end\nprint(fns[1](),fns[2](),fns[3]())',
    globals: ["print"],
  },
  {
    name: "upvalue shared between two closures",
    source: 'local function counter()local n=0\nreturn function()n=n+1 return n end,function()return n end end\nlocal inc,get=counter()\ninc()inc()\nprint(get())',
    globals: ["print"],
  },
  {
    name: "string escapes survive compression",
    source: 'local quote="say \\"hi\\""\nlocal tab="a\\tb"\nlocal newline="l1\\nl2"\nlocal decimal="\\65\\66"\nprint(quote,tab,newline,decimal,#decimal)',
    globals: ["print"],
  },
  {
    name: "numeric edge values",
    source: 'local hex=0xFF\nlocal exp=1e3\nlocal frac=0.5\nlocal neg=-0.25\nlocal big=1e15\nprint(hex,exp,frac,neg,big,hex+exp)',
    globals: ["print"],
  },
  {
    name: "pcall captures error message",
    source: 'local ok,err=pcall(function()error("boom")end)\nlocal ok2,err2=pcall(function()error({code=7})end)\nprint(ok,tostring(err):match("boom")~=nil,ok2,type(err2))',
    globals: ["pcall", "error", "print", "tostring", "type"],
  },
  {
    name: "table with mixed array and hash parts",
    source: 'local t={1,2,3,name="mixed",[10]=true}\nlocal count=0\nfor k,v in pairs(t)do count=count+1 end\nprint(#t,t.name,t[10],count)',
    globals: ["pairs", "print"],
  },
  {
    name: "nested pcall and xpcall with a handler",
    source: 'local ok,err=xpcall(function()error("inner")end,function(m)return "handled:"..tostring(m)end)\nlocal outer=pcall(function()return pcall(function()error("deep")end)end)\nprint(ok,tostring(err):match("handled")~=nil,outer)',
    globals: ["xpcall", "error", "pcall", "print", "tostring"],
  },
  {
    name: "table.unpack over an explicit range",
    source: 'local t={10,20,30,40}\nlocal a,b=table.unpack(t,2,3)\nlocal n=select("#",table.unpack(t,1,4))\nprint(a,b,n)',
    globals: ["table", "select", "print"],
    members: ["unpack"],
  },
  {
    name: "compound assignment operators",
    source: 'local n=10\nn+=5\nn-=3\nn*=2\nn/=4\nlocal s="a"\ns..="b"\nprint(n,s)',
    globals: ["print"],
  },
];
