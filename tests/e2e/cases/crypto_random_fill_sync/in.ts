import { randomFillSync } from "node:crypto";
import * as cryptoNS from "crypto";
import cryptoDefault from "crypto";

const buf1 = Buffer.alloc(10);
buf1.fill(0);
// fill whole buffer using default import
const res1 = cryptoDefault.randomFillSync(buf1);
const sameObj1 = res1 === buf1;
// check that all values in buf1 are modified
let count1 = 0;
for (let i = 0; i < buf1.length; i++) {
    if (buf1[i] !== 0) count1++;
}

const buf2 = Buffer.alloc(10);
buf2.fill(0);
// fill with offset using namespace import
const res2 = cryptoNS.randomFillSync(buf2, 4);
const sameObj2 = res2 === buf2;
let part1Ok = true;
for (let i = 0; i < 4; i++) {
    if (buf2[i] !== 0) part1Ok = false;
}
let count2 = 0;
for (let i = 4; i < 10; i++) {
    if (buf2[i] !== 0) count2++;
}

const buf3 = Buffer.alloc(10);
buf3.fill(0);
// fill with offset and size using named import
const res3 = randomFillSync(buf3, 2, 5);
const sameObj3 = res3 === buf3;
let part2Ok = true;
for (let i = 0; i < 2; i++) {
    if (buf3[i] !== 0) part2Ok = false;
}
for (let i = 7; i < 10; i++) {
    if (buf3[i] !== 0) part2Ok = false;
}
let count3 = 0;
for (let i = 2; i < 7; i++) {
    if (buf3[i] !== 0) count3++;
}

const buf4 = Buffer.alloc(10);
buf4.fill(0);
// global object, trailing arguments ignored
const res4 = crypto.randomFillSync(buf4, 3, 4, "ignored1", 123);
const sameObj4 = res4 === buf4;
let part3Ok = true;
for (let i = 0; i < 3; i++) {
    if (buf4[i] !== 0) part3Ok = false;
}
for (let i = 7; i < 10; i++) {
    if (buf4[i] !== 0) part3Ok = false;
}
let count4 = 0;
for (let i = 3; i < 7; i++) {
    if (buf4[i] !== 0) count4++;
}

// Error handling validations
function checkError(fn: () => void): string {
    try {
        fn();
        return "no error";
    } catch (err) {
        return String(err);
    }
}

const err1 = checkError(() => { crypto.randomFillSync(buf1, -1); });
const err2 = checkError(() => { crypto.randomFillSync(buf1, 11); });
const err3 = checkError(() => { crypto.randomFillSync(buf1, 2, -1); });
const err4 = checkError(() => { crypto.randomFillSync(buf1, 2, 9); });
const err5 = checkError(() => { crypto.randomFillSync(buf1, NaN); });
const err6 = checkError(() => { crypto.randomFillSync(buf1, 2, Infinity); });

console.log("res1:", sameObj1, count1 > 0);
console.log("res2:", sameObj2, part1Ok, count2 > 0);
console.log("res3:", sameObj3, part2Ok, count3 > 0);
console.log("res4:", sameObj4, part3Ok, count4 > 0);
console.log("err1:", err1.includes("offset"));
console.log("err2:", err2.includes("offset"));
console.log("err3:", err3.includes("size"));
console.log("err4:", err4.includes("size") || err4.includes("bounds"));
console.log("err5:", err5.includes("offset"));
console.log("err6:", err6.includes("size"));
