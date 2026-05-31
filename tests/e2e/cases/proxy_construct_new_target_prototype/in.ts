function Target(this: any, value: any): void {
    this.value = value;
}

function DirectNewTarget(this: any): void {}
function ProxyNewTarget(this: any): void {}
function FunctionProtoNewTarget(this: any): void {}
function ArrayProtoNewTarget(this: any): void {}
function FunctionProto(this: any): void {}

const targetCtor: any = Target as any;
const directProto: any = { marker: "direct-proto" };
const directNewTarget: any = DirectNewTarget as any;
directNewTarget.prototype = directProto;
const direct: any = Reflect.construct(targetCtor, ["direct"], directNewTarget);
console.log("direct:", direct.value, Object.getPrototypeOf(direct) === directProto, direct.marker);

const events: string[] = [];
const proxyProto: any = { marker: "proxy-proto" };
const proxyNewTarget: any = new Proxy(ProxyNewTarget as any, {
    get: function(target: any, prop: any, receiver: any): any {
        events.push("get:" + String(prop));
        if (prop === "prototype") return proxyProto;
        return Reflect.get(target, prop, receiver);
    } as any,
});
const proxied: any = Reflect.construct(targetCtor, ["proxy"], proxyNewTarget);
console.log("proxy:", proxied.value, Object.getPrototypeOf(proxied) === proxyProto, proxied.marker, events.join("|"));

const functionProto: any = FunctionProto as any;
const functionProtoNewTarget: any = FunctionProtoNewTarget as any;
functionProtoNewTarget.prototype = functionProto;
const functionProtoResult: any = Reflect.construct(targetCtor, ["function"], functionProtoNewTarget);
console.log("function proto:", functionProtoResult.value, Object.getPrototypeOf(functionProtoResult) === functionProto);

const arrayProto: any = ["array-proto"];
const arrayProtoNewTarget: any = ArrayProtoNewTarget as any;
arrayProtoNewTarget.prototype = arrayProto;
const arrayProtoResult: any = Reflect.construct(targetCtor, ["array"], arrayProtoNewTarget);
console.log("array proto:", arrayProtoResult.value, Object.getPrototypeOf(arrayProtoResult) === arrayProto);

const revoked = Proxy.revocable(ProxyNewTarget as any, {});
revoked.revoke();
try {
    const fail: any = Reflect.construct(targetCtor, ["revoked"], revoked.proxy);
    console.log("revoked:", fail.value);
} catch (err: any) {
    console.log("revoked:", err);
}
