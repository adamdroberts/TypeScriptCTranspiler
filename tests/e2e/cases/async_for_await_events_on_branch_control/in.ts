import { EventEmitter, on } from "node:events";

async function continueBreak(iterator: any): Promise<string> {
    for await (const item of iterator) {
        if (item[0] === "skip") continue;
        else break;
    }
    return "continued";
}

async function returnBranch(iterator: any, output: string[]): Promise<string> {
    for await (const item of iterator) {
        if (item[0] === "return") return item[0];
        else output.push(item[0]);
    }
    return output.join(",");
}

async function throwBranch(iterator: any, output: string[]): Promise<string> {
    for await (const item of iterator) {
        if (item[0] === "fail") throw item[0];
        else output.push(item[0]);
    }
    return output.join(",");
}

const firstEmitter = new EventEmitter();
const firstIterator: any = on(firstEmitter, "data");
continueBreak(firstIterator).then((value: string): void => {
    console.log("branch-controls:", value);

    const returnEmitter = new EventEmitter();
    const returnIterator: any = on(returnEmitter, "data");
    returnBranch(returnIterator, []).then((returned: string): void => {
        console.log("branch-return:", returned);

        const throwEmitter = new EventEmitter();
        const throwIterator: any = on(throwEmitter, "data");
        throwBranch(throwIterator, []).catch((reason: any): void => {
            console.log("branch-throw:", reason);
        });
        throwEmitter.emit("data", "fail");
    });
    returnEmitter.emit("data", "return");
});
firstEmitter.emit("data", "skip");
firstEmitter.emit("data", "stop");
