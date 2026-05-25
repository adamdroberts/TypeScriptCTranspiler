const nums = [0];
console.log("nums:", Object.assign(nums, [1, 2, 3]) === nums, nums.length, nums.join("|"));

const words = ["_"];
console.log("string:", Object.assign(words, "ab") === words, words.length, words.join("|"));

const fromDynamicObject = [10];
const dynamicObject: any = { 1: 20, 2: 30, extra: 40 };
Object.assign(fromDynamicObject, dynamicObject);
console.log("dynamic object:", fromDynamicObject.length, fromDynamicObject.join("|"));

const fromDynamicArray = [0];
const dynamicArray: any = [5, 6];
Object.assign(fromDynamicArray, dynamicArray);
console.log("dynamic array:", fromDynamicArray.length, fromDynamicArray.join("|"));

const fromDynamicString = ["_"];
const dynamicString: any = "cd";
Object.assign(fromDynamicString, dynamicString);
console.log("dynamic string:", fromDynamicString.length, fromDynamicString.join("|"));

class NumericSource {
    [1] = 20;
    [2] = 30;
    extra = 40;
}
const fromTypedObject = [10];
const typedObject = new NumericSource();
Object.assign(fromTypedObject, typedObject);
console.log("typed object:", fromTypedObject.length, fromTypedObject.join("|"));

let primitiveCalls = 0;
function primitiveSource(): number {
    primitiveCalls = primitiveCalls + 1;
    return 99;
}

const primitiveSources = [1, 2];
Object.assign(primitiveSources, primitiveSource(), false, 10n, Symbol("p"));
console.log("primitive sources:", primitiveCalls, primitiveSources.length, primitiveSources.join("|"));

function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (e: any) {
        console.log(label + ":", e);
    }
}

const sealed = [5, 6];
Object.seal(sealed);
report("sealed assign", (): any => Object.assign(sealed, [7, 8, 9]) === sealed);
console.log("sealed:", sealed.length, sealed.join("|"));

const frozen = [1, 2];
Object.freeze(frozen);
report("frozen assign", (): any => Object.assign(frozen, [3, 4]) === frozen);
console.log("frozen:", frozen.join("|"));
