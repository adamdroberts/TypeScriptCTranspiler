function Target(this: any): void {}
function ReflectTarget(this: any): void {}

function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (err: any) {
        console.log(label + ":", err);
    }
}

const target: any = Target as any;
const proxy: any = new Proxy(target, {});
const nextProto: any = { marker: "next" };
proxy.prototype = nextProto;

console.log("assign:", target.prototype === nextProto, proxy.prototype.marker);

const reflectTarget: any = ReflectTarget as any;
const reflectProxy: any = new Proxy(reflectTarget, {});
const reflectProto: any = { marker: "reflect" };

console.log(
    "reflect:",
    Reflect.set(reflectProxy, "prototype", reflectProto),
    reflectTarget.prototype === reflectProto,
    reflectProxy.prototype.marker,
);

const revoked: any = Proxy.revocable(function Revoked(this: any): void {}, {});
revoked.revoke();
report("revoked set", (): any => Reflect.set(revoked.proxy, "prototype", {}));
