const arrayProxy = new Proxy([1, 2], {});
const nestedArrayProxy = new Proxy(arrayProxy, {});
const objectProxy = new Proxy({ length: 2 }, {});

console.log(
    "arrays:",
    Array.isArray(arrayProxy),
    Array.isArray(nestedArrayProxy),
    Array.isArray(objectProxy),
);

console.log(
    "tags:",
    Object.prototype.toString.call(arrayProxy),
    Object.prototype.toString.call(nestedArrayProxy),
    Object.prototype.toString.call(objectProxy),
);

const revocable: any = Proxy.revocable(["x"], {});
console.log("revocable before:", Object.prototype.toString.call(revocable.proxy));
revocable.revoke();
try {
    console.log("revocable after:", Object.prototype.toString.call(revocable.proxy));
} catch (err: any) {
    console.log("revocable after:", String(err));
}
