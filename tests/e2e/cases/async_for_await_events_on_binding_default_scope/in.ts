import { EventEmitter, on } from "node:events";

async function collectBindings(iterator: any, output: string[]): Promise<string> {
    for await (const [{
        first,
        second = first,
        nested: { value = second } = ({ other: first } as any),
    }] of iterator) {
        output.push(first);
        output.push(second);
        output.push(value);
        break;
    }
    return output.join(",");
}

const emitter = new EventEmitter();
const iterator: any = on(emitter, "data");
const item = { first: "alpha" };
collectBindings(iterator, []).then((value: string): void => {
    console.log("binding-default-scope:", value);
});
emitter.emit("data", item);
