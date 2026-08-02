import { EventEmitter, on } from "events";

const seen: string[] = [];
function mark(label: string, value: number): number {
    seen.push(label);
    return value;
}

const emitter = new EventEmitter();
const iterator: any = on(emitter, "data", {
    highWaterMark: mark("high", 2),
    lowWaterMark: mark("low", 1),
});
console.log("evaluated:", seen.join(","));
const next: Promise<any> = iterator.next();
emitter.emit("data", "value");
next.then((result: any) => {
    console.log("item:", result.done, result.value[0]);
    iterator.return();
});
