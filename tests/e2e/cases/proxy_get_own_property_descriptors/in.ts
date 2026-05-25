const events: string[] = [];
const target: any = {};

function ownKeys(target: any): any {
    events.push("ownKeys");
    return ["visible", "hidden", "skip"];
}

function getOwnPropertyDescriptor(target: any, prop: any): any {
    events.push("desc:" + String(prop));
    if (prop === "visible") {
        return { value: 1, writable: true, enumerable: true, configurable: true };
    }
    if (prop === "hidden") {
        return { value: "h", writable: false, enumerable: false, configurable: true };
    }
    return undefined;
}

const proxy: any = new Proxy(target, {
    ownKeys: ownKeys as any,
    getOwnPropertyDescriptor: getOwnPropertyDescriptor as any,
});

const descs: any = Object.getOwnPropertyDescriptors(proxy);

console.log("keys:", Object.keys(descs).join("|"));
console.log("visible:", descs.visible.value, descs.visible.writable, descs.visible.enumerable, descs.visible.configurable);
console.log("hidden:", descs.hidden.value, descs.hidden.writable, descs.hidden.enumerable, descs.hidden.configurable);
console.log("skip:", Object.hasOwn(descs, "skip"));
console.log("events:", events.join("|"));
