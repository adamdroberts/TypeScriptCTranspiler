const arr: any = [1, 2, 3];
const proxy: any = new Proxy(arr, {});
const nested: any = new Proxy(proxy, {});
const objectProxy: any = new Proxy({ length: 3 }, {});

console.log(
    "arrays:",
    Array.isArray(arr),
    Array.isArray(proxy),
    Array.isArray(nested),
    Array.isArray(objectProxy),
);
console.log("length:", proxy.length, nested[1]);

const revocable: any = Proxy.revocable([4, 5], {});
console.log("revocable before:", Array.isArray(revocable.proxy));
revocable.revoke();
try {
    console.log("revocable after:", Array.isArray(revocable.proxy));
} catch (err: any) {
    console.log("revocable after:", String(err));
}
