let calls = 0;

function bump(): number {
    calls += 1;
    return 42;
}

class Box {
    value: number;
    constructor(value: number) {
        this.value = value;
    }
}

const n = 3;
const s = "hello";
const flag = true;
const nums = [1, 2, 3];
const box = new Box(5);
const re = /box/;

console.log("number:", typeof n);
console.log("string:", typeof s);
console.log("boolean:", typeof flag);
console.log("array:", typeof nums);
console.log("class:", typeof box);
console.log("regexp:", typeof re);
console.log("null:", typeof null);
console.log("undefined:", typeof undefined);
const callType: string = typeof bump();
console.log("call:", callType, calls);
