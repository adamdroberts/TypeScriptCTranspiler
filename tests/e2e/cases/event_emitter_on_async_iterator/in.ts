import { EventEmitter, on } from "events";

const emitter = new EventEmitter();
const iterator: any = on(emitter, "data");
console.log("methods", iterator.next.name, iterator.next.length, Object.hasOwn(iterator.next, "prototype"), iterator.return.name, iterator.return.length, Object.hasOwn(iterator.return, "prototype"));
try {
    Reflect.construct(iterator.next, []);
    console.log("construct", "ok");
} catch (err: any) {
    console.log("construct", err);
}
const first: Promise<any> = iterator.next();
emitter.emit("data", "one", 2);
first.then((result: any) => {
    console.log("first", result.done, result.value[0], result.value[1]);
    const second: Promise<any> = iterator.next();
    emitter.emit("data", "two");
    second.then((nextResult: any) => {
        console.log("second", nextResult.done, nextResult.value[0]);
        const closed: Promise<any> = iterator.return("closed");
        closed.then((closedResult: any) => console.log("closed", closedResult.done, closedResult.value));
    });
});
