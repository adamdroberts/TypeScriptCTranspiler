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
console.log("buffer:", Reflect.get(bytes, "0", receiver()), Reflect.get(bytes, "length", receiver()), sideEffects);
