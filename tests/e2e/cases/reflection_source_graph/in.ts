const receiver: any = { body: "17;" };
const target: any = { get source(): string { return this.body; } };
const read: any = Reflect.get.bind(null, target);
console.log(eval(read("source", receiver)));
const key = Symbol("private-looking");
const owner: any = { ["19;"]: 0 };
Object.defineProperty(owner, key, { value: 1 });
console.log(eval(Object.getOwnPropertyNames(owner)[0]));
console.log(Reflect.ownKeys(owner).length, Object.getOwnPropertySymbols(owner)[0] === key);
class Holder {
    #body = "23;";
    read(): any { return Reflect.get({ get body() { return "29;"; } }, "body"); }
    keys(): any { return Reflect.ownKeys(this); }
}
const holder = new Holder();
console.log(eval(holder.read()), holder.keys().length);
console.log("complete");
