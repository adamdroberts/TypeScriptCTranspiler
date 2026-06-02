let seen = "";
function mark(label: string): number {
  seen += label;
  return 1;
}

console.log("imul", Math.imul(0xffffffff, 5, mark("i")), Math.imul(0x7fffffff, 2), Math.imul(123456, 789));
console.log("clz32", Math.clz32(1, mark("c")), Math.clz32(1000), Math.clz32(0), Math.clz32(-1), Math.clz32(NaN));
console.log("fround", Math.fround(1.337, mark("f")), Math.fround(Math.PI), Math.fround(Infinity));
console.log("f16round", Math.f16round(1.337, mark("h")), Math.f16round(Math.PI), Math.f16round(100000), 1 / Math.f16round(-0), Math.f16round(0.00000003));
console.log("ignored", seen);
