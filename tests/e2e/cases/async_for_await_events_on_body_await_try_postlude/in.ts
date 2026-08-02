import { EventEmitter, on } from "node:events";

async function collect(iterator: any, output: string[]): Promise<string> {
    for await (const item of iterator) {
        await Promise.resolve(item);
        try {
            if (item[0] === "throw") throw "try-failure";
            output.push("try:" + item[0]);
        } catch (reason: any) {
            output.push("catch:" + reason);
        } finally {
            output.push("finally");
        }
        break;
    }
    return output.join(",");
}

const successEmitter = new EventEmitter();
const successIterator: any = on(successEmitter, "data");
collect(successIterator, []).then((value: string): void => {
    console.log("try-success:", value);

    const throwEmitter = new EventEmitter();
    const throwIterator: any = on(throwEmitter, "data");
    collect(throwIterator, []).then((throwValue: string): void => {
        console.log("try-throw:", throwValue);
    });
    throwEmitter.emit("data", "throw");
});
successEmitter.emit("data", "ok");
