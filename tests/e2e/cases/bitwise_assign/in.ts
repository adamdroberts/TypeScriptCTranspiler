let a = 6;
a &= 3;
console.log("and:", a);

let b = 4;
b |= 1;
console.log("or:", b);

let c = 7;
c ^= 3;
console.log("xor:", c);

let d = 3;
d <<= 2;
console.log("shl:", d);

let e = -8;
e >>= 1;
console.log("shr:", e);

let f = -1;
f >>>= 1;
console.log("ushr:", f);
