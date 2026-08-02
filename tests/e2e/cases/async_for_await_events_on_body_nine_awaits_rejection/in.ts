import { EventEmitter, on } from "node:events";

async function consume(iterator: any): Promise<string> {
    for await (const item of iterator) {
        await Promise.resolve(item);
        const first = item[0];
        await Promise.resolve(first);
        let second: string;
        second = first + "-second";
        await Promise.resolve(second);
        const third = second + "-third";
        await Promise.resolve(third);
        const fourth = third + "-fourth";
        await Promise.resolve(fourth);
        const fifth = fourth + "-fifth";
        await Promise.resolve(fifth);
        const sixth = fifth + "-sixth";
        await Promise.resolve(sixth);
        const seventh = sixth + "-seventh";
        await Promise.resolve(seventh);
        const eighth = seventh + "-eighth";
        await Promise.reject("ninth-rejection");
        break;
    }
    return "unexpected-fulfillment";
}

const emitter = new EventEmitter();
const iterator: any = on(emitter, "data");
consume(iterator).then((value: string): void => {
    console.log("body-nine-awaits-rejected: unexpected", value);
}, (reason: any): void => {
    console.log("body-nine-awaits-rejected:", reason);
});
emitter.emit("data", "item");
