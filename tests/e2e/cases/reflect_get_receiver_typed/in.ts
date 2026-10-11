interface Box {
    name: string;
    count: number;
}

const values = [11, 22, 33];
const box: Box = { name: "Ada", count: 3 };
const bytes = Buffer.from("AZ");

let sideEffects = 0;

function receiver(): number {
    sideEffects = sideEffects + 1;
    return sideEffects;
}

console.log("array:", Reflect.get(values, "1", receiver()), Reflect.get(values, "length", receiver()), sideEffects);
console.log("object:", Reflect.get(box, "name", receiver()), Reflect.get(box, "count", receiver()), sideEffects);
console.log("buffer-index:", Reflect.get(bytes, "0", receiver()), sideEffects);
let incompatibleReceiver = false;
try {
    Reflect.get(bytes, "length", receiver());
} catch (error) {
    incompatibleReceiver = error instanceof TypeError;
}
console.log("buffer-length-receiver:", incompatibleReceiver, sideEffects);
console.log("buffer-length:", Reflect.get(bytes, "length", bytes));
const replacement = Buffer.from("ABC");
console.log("buffer-length-other:", Reflect.get(bytes, "length", replacement));
