class Base {
    args: any[];
    target: any;
    constructor(first: any, ...rest: any[]) {
        this.args = [first, ...rest];
        this.target = new.target;
    }
}
class Derived extends Base {
    label = "derived";
}
class Explicit extends Base {
    label = "explicit";
    constructor(...args: any[]) { super(args[0], ...args.slice(1)); }
}
const marker = {};
const value = new Derived(marker, undefined, 17);
const explicit = new Explicit(marker, 23, 29);
console.log(value.args.length, value.args[0] === marker, value.args[1] === undefined,
    value.args[2], value.target === Derived, value.label, value instanceof Base);
console.log(explicit.args.length, explicit.args[0] === marker,
    explicit.args[1], explicit.args[2], explicit.target === Explicit, explicit.label);
const saved = Object.getPrototypeOf(Derived);
function replacement(first: any) { return {first}; }
Object.setPrototypeOf(Derived, replacement);
const replaced: any = new Derived(marker);
console.log(replaced.first === marker, replaced.label);
Object.setPrototypeOf(Derived, saved);
