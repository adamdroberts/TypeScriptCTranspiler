import {setTimeout as delay} from "node:timers/promises";
async function run(prefix:string):Promise<void>{
 const cause=prefix+"cause";
 const ordinary=new Error(prefix+"ordinary",{cause});
 const aggregate=new AggregateError([prefix+"first"],prefix+"aggregate",{cause});
 const primary={label:prefix+"primary"},secondary={label:prefix+"secondary"};
 const suppressed=new SuppressedError(primary,secondary,prefix+"suppressed");
 await delay(1);
 console.log("causes:",ordinary.cause,aggregate.cause);
 console.log("errors:",aggregate.errors.join("|"));
 console.log("suppressed:",suppressed.error===primary,suppressed.suppressed===secondary);
}
run("retained-");

const empty = new Error();
const explicit = new Error(undefined, {cause: undefined});
const attributes = Object.getOwnPropertyDescriptor(explicit, "cause")!;
console.log("presence:", Object.hasOwn(empty, "message"), Object.hasOwn(explicit, "cause"), attributes.writable, attributes.enumerable, attributes.configurable);
explicit.message = "changed";
explicit.name = "Renamed";
console.log("mutation:", explicit.toString(), String(explicit));
delete explicit.cause;
console.log("deleted:", "cause" in explicit);
let order = "";
const iterable = {[Symbol.iterator]() { order += "iterator"; return [1, 2][Symbol.iterator](); }};
const ordered = new AggregateError(iterable, {toString() {order += "message-"; return "many";}});
console.log("iterable:", order, ordered.errors.join(","), Error.prototype.toString.call({name:"Custom", message:"value"}));
