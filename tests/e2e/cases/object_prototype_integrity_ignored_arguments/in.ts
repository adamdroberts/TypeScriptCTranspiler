let marks = "";
function mark(label: string): string {
    marks += label;
    return label;
}

const proto: any = { marker: "proto" };
const dynamicTarget: any = Object.create(proto);
console.log("proto:", Object.getPrototypeOf(dynamicTarget, mark("a")).marker);

const extensible: any = { x: 1 };
console.log("ext before:", Object.isExtensible(extensible, mark("b")));
console.log("prevent:", Object.preventExtensions(extensible, mark("c")) === extensible, Object.isExtensible(extensible));

const sealed: any = { y: 2 };
console.log("seal:", Object.seal(sealed, mark("d")) === sealed, Object.isSealed(sealed, mark("e")));

const frozen: any = { z: 3 };
console.log("freeze:", Object.freeze(frozen, mark("f")) === frozen, Object.isFrozen(frozen, mark("g")));

const primitive: any = 7;
console.log(
    "primitive:",
    Object.isExtensible(primitive, mark("h")),
    Object.isSealed(primitive, mark("i")),
    Object.isFrozen(primitive, mark("j")),
    Object.freeze(primitive, mark("k")),
);

const nextProto: any = { tag: "next" };
const setTarget: any = {};
console.log(
    "set proto:",
    Object.setPrototypeOf(setTarget, nextProto, mark("l")) === setTarget,
    Object.getPrototypeOf(setTarget).tag,
);

const values = [1, 2];
console.log("array:", Object.isExtensible(values, mark("m")), Object.preventExtensions(values, mark("n")) === values);

function sample(): void {}
console.log("function:", Object.isExtensible(sample, mark("o")));
console.log("marks:", marks);
