function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (err: any) {
        console.log(label + ":", err);
    }
}

const direct: any = Proxy.revocable({ value: 1 }, {});
console.log("metadata:", direct.revoke.name, direct.revoke.length, Object.hasOwn(direct.revoke, "prototype"));
report("construct", (): any => Reflect.construct(direct.revoke, []));
console.log("direct before:", direct.proxy.value);
console.log("direct first:", direct.revoke("ignored"));
console.log("direct second:", direct.revoke());
report("direct after", (): any => direct.proxy.value);

const detached: any = Proxy.revocable({ value: 2 }, {});
const revoke: any = detached.revoke;
console.log("detached before:", detached.proxy.value);
console.log("detached first:", revoke.call({ ignored: true }, "extra"));
console.log("detached second:", revoke.apply(null, []));
report("detached after", (): any => detached.proxy.value);
