"use strict";
const events: string[] = [];
class Owner {
    static initial: any = (events.push("initial:" + Object.hasOwn(this, "later")), this.identity());
    static backing: any = 3;
    static empty: any;
    static { events.push("block:" + Owner.backing + ":" + Object.hasOwn(this, "later")); }
    static later: any = (events.push("later"), this.backing + 1);
    static identity(): typeof Owner { return this; }
    static get value(): any { events.push("get"); return this.backing; }
    static set value(next: any) { events.push("set:" + next); this.backing = next; }
    static [Symbol.iterator](): any { return this; }
}
const alias: any = Owner;
console.log("initialization:", events.join("|"), alias.initial === Owner, alias.empty === undefined);
const descriptor: any = Object.getOwnPropertyDescriptor(Owner, "value");
const receiver: any = { backing: 30 };
console.log("descriptors:", descriptor.enumerable, descriptor.configurable, descriptor.get.name, descriptor.set.name);
console.log("receivers:", descriptor.get.call(receiver), alias.identity.call(receiver) === receiver, alias[Symbol.iterator].call(receiver) === receiver);
descriptor.set.call(receiver, 31);
console.log("setter:", receiver.backing, alias.backing);
events.length = 0;
Owner.value += (events.push("rhs"), 2);
console.log("compound:", Owner.value, events.join("|"));
Object.defineProperty(alias, "backing", { value: "boxed", writable: false, configurable: true });
let rejected = false;
try { Owner.backing = 9; } catch (error) { rejected = error instanceof TypeError; }
console.log("retained:", Owner.backing, rejected, Object.getOwnPropertyDescriptor(Owner, "backing").writable);
delete alias.later;
console.log("deleted:", Owner.later, Object.hasOwn(alias, "later"));
Owner.later = { restored: true };
console.log("recreated:", alias.later.restored);
