import crypto, { pbkdf2Sync as namedPbkdf2Sync } from "node:crypto";
import * as cryptoNs from "crypto";

// 1. Basic sha256 with string/string
const res1 = crypto.pbkdf2Sync("password", "salt", 1000, 32, "sha256");
console.log("sha256 ss:", res1.toString("hex"));

// 2. sha1 with string/Buffer
const res2 = crypto.pbkdf2Sync("password", Buffer.from("salt"), 1000, 20, "sha1");
console.log("sha1 sb:", res2.toString("hex"));

// 3. sha512 with Buffer/string
const res3 = crypto.pbkdf2Sync(Buffer.from("password"), "salt", 1000, 64, "sha512");
console.log("sha512 bs:", res3.toString("hex"));

// 4. sha256 with Buffer/Buffer
const res4 = crypto.pbkdf2Sync(Buffer.from("password"), Buffer.from("salt"), 1000, 16, "sha256");
console.log("sha256 bb:", res4.toString("hex"));

// 5. Named import support
const res5 = namedPbkdf2Sync("password", "salt", 1000, 32, "sha256");
console.log("named import:", res5.toString("hex") === res1.toString("hex"));

// 6. Namespace import support
const res6 = cryptoNs.pbkdf2Sync("password", "salt", 1000, 32, "sha256");
console.log("namespace import:", res6.toString("hex") === res1.toString("hex"));

// 7. Ignored trailing arguments support
let sideEffect = 0;
const res7 = crypto.pbkdf2Sync("password", "salt", 1000, 32, "sha256", (sideEffect = 42));
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
    crypto.pbkdf2Sync("password", "salt", 0, 32, "sha256");
});

tryCatch(() => {
    crypto.pbkdf2Sync("password", "salt", 1000, -1, "sha256");
});

tryCatch(() => {
    crypto.pbkdf2Sync("password", "salt", 1000, 32, "md5" as any);
});
