interface RecordOwner { value: string | undefined; count: any; }
class Base {
    value: string | undefined;
    constructor(value: string) { this.value = value; }
}
class Owner extends Base {
    payload: any = { text: "owned" };
    constructor() { super("base"); }
}
function setStatic(): void { StaticOwner.value = "static:" + String(7); }
class StaticOwner { static value: string | undefined; }
function record(): RecordOwner { return { value: "record:" + String(8), count: 5n }; }
const owner = new Owner(), item = record();
console.log(owner.value, owner.payload.text, item.value);
item.value = undefined;
console.log(item.value ?? "missing");
item.value ??= "restored:" + String(9);
const previous: any = item.count++, next: any = --item.count;
console.log(item.value, String(previous), String(next), String(item.count));
Reflect.set(item, "value", "reflect");
Object.assign(item, { value: "assign" });
console.log(item.value);
setStatic(); console.log(StaticOwner.value);
const boxed: any = owner;
boxed.value = "boxed"; console.log(owner.value);
for (let index = 0; index < 2; index++) {
    const local = record();
    console.log(local.value, String(local.count));
}
