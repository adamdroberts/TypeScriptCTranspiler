import { EventEmitter, on } from "node:events";

let seen = "";
function mark(label: string): any {
    seen += label;
    return undefined;
}

const emitter = new EventEmitter();
const iterator: any = on(emitter, "data", { signal: mark("s") });
const next: Promise<any> = iterator.next();
emitter.emit("data", "value");
next.then((result: any) => {
    console.log("value:", result.value[0]);
    console.log("options:", seen);
    iterator.return();
});
