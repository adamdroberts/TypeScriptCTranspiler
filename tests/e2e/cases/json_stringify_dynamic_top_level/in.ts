const dynamicUndefined: any = undefined;
const dynamicNull: any = null;
const dynamicNumber: any = 0;
function dynamicFunctionSource(): number { return 1; }
const dynamicFunction: any = dynamicFunctionSource;
const dynamicArray: any = [undefined, null];
const dynamicObject: any = { missing: undefined, present: null };

console.log("static undefined:", JSON.stringify(undefined) === undefined);
console.log("dynamic undefined:", JSON.stringify(dynamicUndefined) === undefined);
console.log("dynamic null:", JSON.stringify(dynamicNull));
console.log("dynamic number:", JSON.stringify(dynamicNumber));
console.log("dynamic function:", JSON.stringify(dynamicFunction) === undefined);
console.log("array:", JSON.stringify(dynamicArray));
console.log("object:", JSON.stringify(dynamicObject));
