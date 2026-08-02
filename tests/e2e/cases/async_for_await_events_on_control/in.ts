import { EventEmitter, on } from "node:events";

async function breakAfterFirst(iterator: any, output: string[]): Promise<string> {
    for await (const item of iterator) {
        output.push(item[0]);
        break;
    }
    return output.join(",");
}

async function continueOnce(iterator: any): Promise<string> {
    for await (const _item of iterator) {
        continue;
    }
    return "continued";
}

const breakEmitter = new EventEmitter();
const breakIterator: any = on(breakEmitter, "data");
breakAfterFirst(breakIterator, []).then((value: string): void => {
    console.log("break:", value);

    const continueEmitter = new EventEmitter();
    const continueIterator: any = on(continueEmitter, "data");
    continueOnce(continueIterator).then((continued: string): void => {
        console.log("continue:", continued);
    });
    continueEmitter.emit("data", "skip");
    continueIterator.return();
});
breakEmitter.emit("data", "stop");
