import { owner, marker, effects, Receiver } from "./source";
const omitted = owner.defaults();
console.log("default", omitted[0] === marker, omitted[1] === marker, omitted[2]);
const explicit: any = Reflect.apply(owner.defaults, owner, [null]);
console.log("actual", explicit[0] === null, explicit[1] === null, explicit[2]);
const pattern = owner.pattern([undefined, 99, { value: 17 }, marker, null]);
console.log("pattern", pattern[0] === marker, pattern[1], pattern[2][0] === marker, pattern[2][1] === null);
const read = owner.retained();
console.log("capture", read() === marker);
const scope = owner.scope();
console.log("scope", scope[0], scope[1]() === marker);
const native: any = Reflect.apply(owner.native, new Receiver(), []);
console.log("native", native[0], native[1] === marker);
async function verify(): Promise<void> {
    const delayed = await owner.delayed();
    console.log("async", delayed === marker);
    const iterator = owner.steps();
    const paused = iterator.next();
    const done = iterator.next();
    console.log("generator", paused.value === marker, paused.done, done.value === marker, done.done);
    console.log("effects", effects);
}
verify().catch((error: any) => { console.log("failure", String(error)); throw error; });
