function make(value: number): () => number { return () => value; }
const retained: any[] = [];
for (let index = 0; index < 257; index++) retained.push(make(index));
const first: any = retained[0], last: any = retained[256];
first.tag = "retained";
console.log(first === retained[0], first === last, first(), last(), retained[0].tag);
const owner: any = {};
Object.defineProperty(owner, "value", { get: first });
const before: any = Object.getOwnPropertyDescriptor(owner, "value").get;
for (let index = 0; index < retained.length; index++) retained[index]();
const after: any = Object.getOwnPropertyDescriptor(owner, "value").get;
console.log(before === first, before === after, owner.value);
