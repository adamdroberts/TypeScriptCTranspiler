export {};
function effect(value:string):string{console.log(value);return value;}
function fail():never{throw "marker";}
const pure={method(){return "__unused_object_body__"},get value(){return "__unused_object_body__"},set value(input:string){console.log("__unused_object_body__",input)}};
const nested={...{value:{get unused(){return "__unused_object_body__"}}}};
const key={[effect("key")](){return "retained_key_body"}};
const coercion={[{toString(){return effect("coercion")}} as any]:17};
const data={value:effect("data"),method(){return "retained_data_body"}};
const spread={...{get value(){return effect("spread")}},method(){return "retained_spread_body"}};
const source={value:"before"};
Object.defineProperty(source,"value",{get(){return effect("alias")},enumerable:true});
const alias={...source};
const setter={...{set value(input:string){effect(input)}}};
console.log(Object.keys(setter).join(","),setter.value===undefined);
try{const abrupt={first:effect("before abrupt"),value:fail(),after:effect("unreached")};}catch(error){console.log(error==="marker");}
function inspect(value:any){console.log(value.read());}
const escaped={read(){return effect("escape")}};inspect(escaped);
console.log("done");
