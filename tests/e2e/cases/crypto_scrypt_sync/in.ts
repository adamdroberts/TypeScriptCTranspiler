import crypto, { scryptSync as namedScryptSync } from "node:crypto";
import * as cryptoNs from "crypto";

// 1. Basic default with string/string
const res1 = crypto.scryptSync("password", "salt", 32);
console.log("scrypt ss default:", res1.toString("hex"));

// 2. Custom sb
const res2 = crypto.scryptSync("password", Buffer.from("salt"), 32, { N: 1024, r: 8, p: 1 });
console.log("scrypt sb custom:", res2.toString("hex"));

// 3. Custom bs
const res3 = crypto.scryptSync(Buffer.from("password"), "salt", 64, { N: 512, r: 4, p: 2 });
console.log("scrypt bs custom:", res3.toString("hex"));

// 4. Custom bb
const res4 = crypto.scryptSync(Buffer.from("password"), Buffer.from("salt"), 16, { N: 256, r: 8, p: 1 });
console.log("scrypt bb custom:", res4.toString("hex"));

// 5. Named import support
const res5 = namedScryptSync("password", "salt", 32, { cost: 1024, blockSize: 8, parallelization: 1 });
console.log("named import:", res5.toString("hex") === res2.toString("hex"));

// 6. Namespace import support
const res6 = cryptoNs.scryptSync("password", "salt", 32, { N: 1024, r: 8, p: 1 });
console.log("namespace import:", res6.toString("hex") === res2.toString("hex"));

// 7. Ignored trailing arguments support
let sideEffect = 0;
const res7 = crypto.scryptSync("password", "salt", 32, undefined, (sideEffect = 42));
console.log("ignored args:", res7.toString("hex") === res1.toString("hex"), sideEffect);

// 8. Errors
function tryCatch(fn: () => void) {
    try {
        fn();
    } catch (e) {
        console.log("error:", String(e));
    }
}

tryCatch(() => {
    crypto.scryptSync("password", "salt", -1);
});

tryCatch(() => {
    crypto.scryptSync("password", "salt", 32, { N: 3 });
});

tryCatch(() => {
    crypto.scryptSync("password", "salt", 32, { r: -1 });
});

tryCatch(() => {
    crypto.scryptSync("password", "salt", 32, { p: 0 });
});

tryCatch(() => {
    crypto.scryptSync("password", "salt", 32, { maxmem: -5 });
});
