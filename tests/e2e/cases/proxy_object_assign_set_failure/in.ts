function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (e: any) {
        console.log(label + ":", e);
    }
}

const events: string[] = [];
let targetProxy: any;

function falseSet(target: any, prop: any, value: any, receiver: any): boolean {
    events.push(String(prop) + ":" + String(value) + ":" + String(receiver === targetProxy));
    return false;
}

targetProxy = new Proxy({}, { set: falseSet as any });

report("assign false", (): any => Object.assign(targetProxy, { x: 1 }) === targetProxy);
console.log("target:", targetProxy.x);
console.log("events:", events.join("|"));
