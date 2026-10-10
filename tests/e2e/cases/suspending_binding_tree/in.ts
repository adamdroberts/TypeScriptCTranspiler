import { events, reset, iterable, fallback, Owner, receiver } from "./source";
let moduleTarget: any = 0;
async function verify(): Promise<void> {
    let first: any = 0, nested: any = 0, rest: any;
    reset();
    const source = iterable([undefined, 5, { value: 17 }, 19, 23]);
    const result = ([first = await fallback(11), , { value: nested }, ...rest] = source);
    console.log("array", first, nested, rest.join("|"), result === source, events);
    reset();
    const [declared = await fallback(29)] = iterable([undefined]);
    console.log("declaration", declared, events);
    const owner = new Owner();
    reset();
    [(await receiver(owner)).value = await fallback(31)] = iterable([undefined]);
    console.log("accessor", owner.value, events);
    const slots: number[] = [0];
    [owner.field = await fallback(37), slots[await Promise.resolve(0)] = await fallback(41)] = iterable([undefined, undefined]);
    await Promise.resolve(0);
    console.log("retained", owner.field, slots.join("|"));
    const symbol = Symbol("key"), object: any = { [symbol]: undefined, extra: 43 };
    const objectResult = ({ [await Promise.resolve(symbol)]: first = await fallback(47), ...rest } = object);
    console.log("object", first, rest.extra, Object.getOwnPropertySymbols(rest).length, objectResult === object);
    [moduleTarget = await fallback(53)] = iterable([undefined]);
    await Promise.resolve(0);
    console.log("module", moduleTarget);
}
verify().catch((error: any) => { console.log("failure", String(error)); throw error; });
