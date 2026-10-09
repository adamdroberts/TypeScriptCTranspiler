import { Shared as Left, Record as LeftRecord } from "./left";
import { Shared as Right, Record as RightRecord } from "./right";
class Child extends Left {}
const left = new Left(), right = new Right(), child = new Child();
const leftRecord: LeftRecord = { value: 13 }, rightRecord: RightRecord = { value: "record" };
console.log("modules:", left.method(), right.method(), Left.method(), Right.method());
console.log("records:", leftRecord.value, rightRecord.value);
console.log("brands:", left instanceof Left, left instanceof Right, child instanceof Left, child instanceof Right);
class λ { value: number = 17; method(): number { return this.value; } }
class Map { value: number = 19; method(): number { return this.value; } }
class Date { value: number = 23; method(): number { return this.value; } }
console.log("spellings:", new λ().method(), new Map().method(), new Date().method());
const constructor: any = λ;
console.log("public:", constructor.name);
namespace First { export class Shared { value: number = 29; } export function make(): Shared { return new Shared(); } }
namespace Second { export class Shared { value: string = "namespace"; } export function make(): Shared { return new Shared(); } }
console.log("namespaces:", First.make().value, Second.make().value);
