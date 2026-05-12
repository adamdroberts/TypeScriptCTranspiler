const a: any = "5";
const b: any = 3;

console.log("and:", a & b);
console.log("or:", a | 2);
console.log("xor:", a ^ 1);
console.log("shl:", a << 2);
console.log("shr:", -8 >> 1);

const neg: any = -1;
const bad: any = "x";
console.log("ushr:", neg >>> 1);
console.log("nan:", bad & 7);

let acc: any = "6";
acc &= 3;
console.log("and eq:", acc);
acc |= 8;
console.log("or eq:", acc);
acc ^= 2;
console.log("xor eq:", acc);
acc <<= 1;
console.log("shl eq:", acc);
acc >>= 2;
console.log("shr eq:", acc);
acc >>>= 1;
console.log("ushr eq:", acc);

const obj: any = { x: "12", y: -16 };
obj.x &= 10;
obj.y >>>= 2;
console.log("props:", obj.x, obj.y);

const arr: any = [5, -8];
arr[0] ^= 3;
arr[1] >>= 1;
console.log("array:", arr[0], arr[1]);
