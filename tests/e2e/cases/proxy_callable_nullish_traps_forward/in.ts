function add(this: any, value: any): any {
    return this.base + ":" + value;
}

function Target(this: any, value: any): any {
    this.value = value;
}

function Hybrid(this: any, value: any): any {
    this.value = value;
    return this.base + ":" + value;
}

const nullApply: any = new Proxy(add as any, {
    apply: null as any,
});
console.log("null apply:", Reflect.apply(nullApply, { base: "ctx" }, ["x"]));

const undefinedConstruct: any = new Proxy(Target as any, {
    construct: undefined as any,
});
const made: any = Reflect.construct(undefinedConstruct, ["y"]);
console.log("undefined construct:", made.value);

const bothNullish: any = new Proxy(Hybrid as any, {
    apply: undefined as any,
    construct: null as any,
});
const called: any = Reflect.apply(bothNullish, { base: "ctx" }, ["z"]);
const built: any = new bothNullish("w");
console.log("both:", called, built.value);
