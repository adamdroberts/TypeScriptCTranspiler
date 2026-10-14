const stats: any = fs.statSync("package.json");
const descriptor: any = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(stats), "atime");
const receiver: any = { atimeMs: 0 };
const result: any = descriptor.get.call(receiver);
console.log("get:", result.getTime(), receiver.atime === result);
const marker: any = {};
const setter: any = {};
console.log("set:", descriptor.set.call(setter, marker) === undefined, setter.atime === marker);
for (const target of ["primitive", Object.freeze({})]) {
    let getterError = false, setterError = false;
    try { descriptor.get.call(target); } catch (error) { getterError = error instanceof TypeError; }
    try { descriptor.set.call(target, marker); } catch (error) { setterError = error instanceof TypeError; }
    console.log("abrupt:", getterError, setterError);
}
