console.log("imul", Math.imul(0xffffffff, 5), Math.imul(0x7fffffff, 2), Math.imul(123456, 789));
console.log("clz32", Math.clz32(1), Math.clz32(1000), Math.clz32(0), Math.clz32(-1), Math.clz32(NaN));
console.log("fround", Math.fround(1.337), Math.fround(Math.PI), Math.fround(Infinity));
