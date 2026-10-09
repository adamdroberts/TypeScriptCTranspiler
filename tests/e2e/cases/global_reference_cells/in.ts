export {};
const root: any = globalThis;
function retained(): any {return globalThis;}
const descriptor: any = Object.getOwnPropertyDescriptor(root, "globalThis");
console.log("descriptor:", descriptor.writable, descriptor.enumerable, descriptor.configurable);
root.globalThis = 17;
console.log("cell:", globalThis === (17 as any), retained() === 17, root.globalThis === 17);
root.globalThis = root;
Object.defineProperty(root, "globalThis", {get(): any {return 23;}, configurable: true});
console.log("accessor:", globalThis === (23 as any), retained() === 23);
Object.defineProperty(root, "globalThis", descriptor);
delete root.globalThis;
let missing = false;
try {retained();} catch (error) {missing = error instanceof ReferenceError;}
console.log("absent:", typeof globalThis, missing);
Object.defineProperty(root, "globalThis", descriptor);
const receiver: any = Function("return this;");
console.log("receiver:", receiver.call(null) === root, receiver.call(undefined) === root);
async function readLater(): Promise<any> {await 0;return globalThis;}
const pending = readLater();
root.globalThis = 31;
pending.then((value: any): void => {
    console.log("suspended:", value === 31);
    root.globalThis = root;
});
