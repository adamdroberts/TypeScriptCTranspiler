function ignored(label: string): string {
    console.log("ignored:", label);
    return label;
}

interface Point {
    name: string;
}

const grand: any = { root: 1 };
const parent: any = Object.create(grand);
const child: any = Object.create(parent);
const other: any = {};
const typed: Point = { name: "typed" };

console.log("grand-child:", Object.prototype.isPrototypeOf.call(grand, child, ignored("grand")));
console.log("parent-child:", Object.prototype.isPrototypeOf.call(parent, child, ignored("parent")));
console.log("child-parent:", Object.prototype.isPrototypeOf.call(child, parent, ignored("child")));
console.log("other-child:", Object.prototype.isPrototypeOf.call(other, child));
console.log("self:", Object.prototype.isPrototypeOf.call(child, child));
console.log("nonobject-target:", Object.prototype.isPrototypeOf.call(1 as any, child, ignored("number")));
console.log("nonobject-value:", Object.prototype.isPrototypeOf.call(grand, 1 as any));
console.log("typed-target:", Object.prototype.isPrototypeOf.call(typed, child, ignored("typed")));
