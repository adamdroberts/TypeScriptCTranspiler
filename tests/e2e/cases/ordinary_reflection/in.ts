interface RecordOwner { value: number; text: string; }
class Owner {
    value: number;
    constructor(value: number) { this.value = value; }
}
const record: RecordOwner = { value: 11, text: "record" };
const alias = record;
console.log("record:", Object.keys(alias).join(","), Object.values(alias).join(","));
console.log("entries:", Object.entries(alias)[0][0], Object.entries(alias)[0][1]);
console.log("descriptor:", Object.getOwnPropertyDescriptor(alias, "value")!.value, Object.hasOwn(alias, "text"));
Reflect.set(alias, "value", 13);
console.log("write:", Reflect.get(alias, "value"), alias.value);
const owner = new Owner(17);
console.log("class:", Object.getOwnPropertyNames(owner).join(","), Object.prototype.hasOwnProperty.call(owner, "value"));
const values: number[] = [19, 23];
console.log("array:", Object.getOwnPropertyDescriptor(values, "1")!.value, Reflect.get(values, "length"), Object.values(values).join(","));
console.log("prototype:", Object.prototype.propertyIsEnumerable.call(values, "length"), Object.prototype.hasOwnProperty.call(values, "1"));
const constructor: any = Object;
const saved = constructor.keys;
constructor.keys = function(target: any): string[] { return ["custom", String(target.value)]; };
console.log("lookup:", Object.keys(alias).join(","));
constructor.keys = saved;
console.log("primitive:", Object.keys("A😀").join(","), Object.values("A😀").join(""));
