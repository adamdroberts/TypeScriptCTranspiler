const grand: any = { root: 1 };
const parent: any = Object.create(grand);
const child: any = Object.create(parent);
const other: any = {};

console.log("grand-child:", grand.isPrototypeOf(child));
console.log("parent-child:", parent.isPrototypeOf(child));
console.log("child-parent:", child.isPrototypeOf(parent));
console.log("other-child:", other.isPrototypeOf(child));
console.log("self:", child.isPrototypeOf(child));
console.log("nonobject:", grand.isPrototypeOf(1 as any));
