// Test structuredClone for dynamic primitives, arrays, plain objects, circular references, and errors

console.log("=== Primitives ===");
console.log("undefined:", structuredClone(undefined) === undefined);
console.log("null:", structuredClone(null) === null);
console.log("true:", structuredClone(true) === true);
console.log("false:", structuredClone(false) === false);
console.log("number:", structuredClone(42.5) === 42.5);
console.log("string:", structuredClone("hello world") === "hello world");

console.log("\n=== Simple Arrays ===");
const arr = [1, "two", { three: 3 }];
const clonedArr: any = structuredClone(arr);
console.log("array unequal:", arr !== clonedArr);
console.log("array length:", clonedArr.length);
console.log("array[0]:", clonedArr[0]);
console.log("array[1]:", clonedArr[1]);
console.log("array[2] unequal:", arr[2] !== clonedArr[2]);
console.log("array[2].three:", clonedArr[2].three);

console.log("\n=== Plain Objects ===");
const obj = {
    a: 10,
    b: "hello",
    c: {
        nested: true,
        val: null
    }
};
const clonedObj: any = structuredClone(obj);
console.log("obj unequal:", obj !== clonedObj);
console.log("obj.a:", clonedObj.a);
console.log("obj.b:", clonedObj.b);
console.log("obj.c unequal:", obj.c !== clonedObj.c);
console.log("obj.c.nested:", clonedObj.c.nested);
console.log("obj.c.val:", clonedObj.c.val);

console.log("\n=== Circular Objects and Arrays ===");
const cyclicObj: any = { name: "cycle" };
cyclicObj.self = cyclicObj;

const clonedCyclicObj: any = structuredClone(cyclicObj);
console.log("cyclicObj unequal:", cyclicObj !== clonedCyclicObj);
console.log("cyclicObj.name:", clonedCyclicObj.name);
console.log("cyclicObj.self === cyclicObj:", clonedCyclicObj.self === clonedCyclicObj);

const cyclicArr: any = [100];
cyclicArr.push(cyclicArr);

const clonedCyclicArr: any = structuredClone(cyclicArr);
console.log("cyclicArr unequal:", cyclicArr !== clonedCyclicArr);
console.log("cyclicArr[0]:", clonedCyclicArr[0]);
console.log("cyclicArr[1] === cyclicArr:", clonedCyclicArr[1] === clonedCyclicArr);

console.log("\n=== Duplicate References ===");
const inner = { x: 1 };
const dupObj = { a: inner, b: inner };
const clonedDupObj: any = structuredClone(dupObj);
console.log("dupObj.a unequal inner:", clonedDupObj.a !== inner);
console.log("dupObj.a === dupObj.b:", clonedDupObj.a === clonedDupObj.b);

console.log("\n=== Ignored Arguments ===");
let ignored = 0;
const ignoredClone: any = structuredClone({ ok: true }, ignored = 7);
console.log("ignored evaluated:", ignored);
console.log("ignored clone ok:", ignoredClone.ok);

console.log("\n=== Rejection / Error Handling ===");
function tryClone(val: any) {
    try {
        structuredClone(val);
        console.log("Success (unexpected)");
    } catch (err) {
        console.log("Caught expected error:", String(err));
    }
}

console.log("Function clone:");
tryClone(() => {});

console.log("Proxy clone:");
tryClone(new Proxy({}, {}));

console.log("Class instance / custom prototype clone:");
class MyClass {}
tryClone(new MyClass());
