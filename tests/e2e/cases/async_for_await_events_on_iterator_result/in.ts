import { EventEmitter, on } from "node:events";

async function consumeInvalidNext(iterator: any): Promise<string> {
    for await (const _item of iterator) {
        return "unexpected";
    }
    return "empty";
}

const emitter = new EventEmitter();
const iterator: any = on(emitter, "data");
iterator.next = (): Promise<any> => Promise.resolve(42);
consumeInvalidNext(iterator).then((value: string): void => {
    console.log("next-non-object-unexpected:", value);
}, (reason: any): void => {
    console.log("next-non-object:", reason);
});
