const target = new EventTarget();
const event = new Event("save", { cancelable: true });
let trace = "";

function mark(label: string): string {
    trace += label;
    return label;
}

console.log("target enum:", Object.keys(target, mark("k")).length, Object.values(target, mark("v")).length, Object.entries(target, mark("e")).length);
console.log("event enum:", Object.keys(event, mark("K")).length, Object.values(event, mark("V")).length, Object.entries(event, mark("E")).length);
console.log("names:", Object.getOwnPropertyNames(target, mark("n")).length, Reflect.ownKeys(target, mark("r")).length, Object.getOwnPropertyNames(event, mark("N")).length, Reflect.ownKeys(event, mark("R")).length);

const targetDesc: any = Object.getOwnPropertyDescriptor(target, "addEventListener", mark("d"));
const eventDesc: any = Object.getOwnPropertyDescriptor(event, "type", mark("D"));
const targetDescs: any = Object.getOwnPropertyDescriptors(target, mark("s"));
const eventDescs: any = Object.getOwnPropertyDescriptors(event, mark("S"));
const reflectTargetDesc: any = Reflect.getOwnPropertyDescriptor(target, "dispatchEvent", mark("g"));
const reflectEventDesc: any = Reflect.getOwnPropertyDescriptor(event, "cancelable", mark("G"));
console.log("desc:", String(targetDesc), String(eventDesc), Object.keys(targetDescs).length, Object.keys(eventDescs).length, String(reflectTargetDesc), String(reflectEventDesc));
console.log("own:", Object.hasOwn(target, "addEventListener", mark("h")), Object.hasOwn(event, "type", mark("H")), target.hasOwnProperty("dispatchEvent", mark("p")), event.propertyIsEnumerable("cancelable", mark("i")));
console.log("tag:", Object.prototype.toString.call(target, mark("t")), Object.prototype.toString.call(event, mark("T")));
console.log("trace:", trace);
