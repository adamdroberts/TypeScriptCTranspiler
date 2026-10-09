class Owner {
    value: number = 3;
    static value: number = 5;
    method(): number { return this.value; }
    static method(): number { return Owner.value; }
    get slot(): number { return this.value + 1; }
    set slot(value: number) { this.value = value; }
    static get slot(): number { return Owner.value + 2; }
    static set slot(value: number) { Owner.value = value; }
    get_slot(): number { return 17; }
    static get_slot(): number { return 19; }
    echo<T>(value: T): T { return value; }
    static echo<T>(value: T): T { return value; }
    ["λ"](): number { return 23; }
    static ["λ"](): number { return 29; }
}
class Child extends Owner {}
const owner = new Owner(), child = new Child();
console.log("scope:", owner.method(), Owner.method(), child.method());
owner.slot = 7; Owner.slot = 11;
console.log("accessors:", owner.slot, Owner.slot, owner.get_slot(), Owner.get_slot());
console.log("generic:", owner.echo(13), Owner.echo("text"));
console.log("keys:", owner.λ(), Owner.λ());
const instance: any = owner, constructor: any = Owner;
console.log("values:", instance.method.call(instance), constructor.method.call(constructor));
interface Step { done: boolean; value: number; }
class Counter {
    current: number = 0;
    static next(): number { return 997; }
    next(): Step { const value = this.current++; return { done: value >= 3, value }; }
    static [Symbol.iterator](): number[] { return [991]; }
    [Symbol.iterator](): Counter { return this; }
}
let sum = 0;
for (const value of new Counter()) sum += value;
console.log("protocol:", sum, Counter.next());
