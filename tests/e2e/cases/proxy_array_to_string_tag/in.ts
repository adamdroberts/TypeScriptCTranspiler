const arrayProxy: any = new Proxy([1, 2], {});
const nestedArrayProxy: any = new Proxy(arrayProxy, {});
const objectProxy: any = new Proxy({ length: 2 }, {});

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
