import { EventEmitter, on } from "node:events";

async function collect(iterator: any, output: string[]): Promise<string> {
    for await (const item of iterator) {
        await Promise.resolve(output.push(item));
        break;
    }
    return output.join(",");
}

async function collectPostlude(iterator: any, output: string[]): Promise<string> {
    for await (const item of iterator) {
        await Promise.resolve(item);
        output.push(item);
        break;
    }
    return output.join(",");
}

async function rejectBody(iterator: any): Promise<string> {
    for await (const _item of iterator) {
        await Promise.reject("body-failure");
        break;
    }
    return "fulfilled";
}

async function returnBody(iterator: any): Promise<string> {
    for await (const item of iterator) {
        return await Promise.resolve(item);
    }
    return "empty";
}

async function returnAfterAwait(iterator: any): Promise<string> {
    for await (const item of iterator) {
        await Promise.resolve(item);
        return item;
    }
    return "empty";
}

async function throwAfterAwait(iterator: any): Promise<string> {
    for await (const item of iterator) {
        await Promise.resolve(item);
        throw item;
    }
    return "empty";
}

async function twoAwaits(iterator: any, output: string[]): Promise<string> {
    for await (const item of iterator) {
        await Promise.resolve(item);
        output.push(item);
        await Promise.resolve(item + "-second");
        output.push("done");
        return output.join(",");
    }
    return "empty";
}

async function twoAwaitsReject(iterator: any): Promise<string> {
    for await (const item of iterator) {
        await Promise.resolve(item);
        await Promise.reject("second-body-failure");
        return item;
    }
    return "empty";
}

async function awaitThenBranch(iterator: any, output: string[]): Promise<string> {
    for await (const [item] of iterator) {
        await Promise.resolve(item);
        if (item === "stop") {
            output.push(item);
            break;
        } else {
            output.push(item);
            continue;
        }
    }
    return output.join(",");
}

const emitter = new EventEmitter();
const iterator: any = on(emitter, "data");
collect(iterator, []).then((value: string): void => {
    console.log("body-await:", value);

    const postludeEmitter = new EventEmitter();
    const postludeIterator: any = on(postludeEmitter, "data");
    collectPostlude(postludeIterator, []).then((postludeValue: string): void => {
        console.log("body-postlude:", postludeValue);

        const rejectionEmitter = new EventEmitter();
        const rejectionIterator: any = on(rejectionEmitter, "data");
        rejectBody(rejectionIterator).then((rejectionValue: string): void => {
            console.log("body-reject-unexpected:", rejectionValue);
        }, (reason: any): void => {
            console.log("body-reject:", reason);

            const returnEmitter = new EventEmitter();
            const returnIterator: any = on(returnEmitter, "data");
            returnBody(returnIterator).then((returnValue: string): void => {
                console.log("body-return-await:", returnValue);

                const postReturnEmitter = new EventEmitter();
                const postReturnIterator: any = on(postReturnEmitter, "data");
                returnAfterAwait(postReturnIterator).then((postReturnValue: string): void => {
                    console.log("body-return-after-await:", postReturnValue);

                    const postThrowEmitter = new EventEmitter();
                    const postThrowIterator: any = on(postThrowEmitter, "data");
                    throwAfterAwait(postThrowIterator).then((unexpectedValue: string): void => {
                        console.log("body-throw-after-await-unexpected:", unexpectedValue);
                    }, (reason: any): void => {
                        console.log("body-throw-after-await:", reason);

                        const twoAwaitEmitter = new EventEmitter();
                        const twoAwaitIterator: any = on(twoAwaitEmitter, "data");
                        twoAwaits(twoAwaitIterator, []).then((twoAwaitValue: string): void => {
                            console.log("body-two-awaits:", twoAwaitValue);

                            const twoAwaitRejectEmitter = new EventEmitter();
                            const twoAwaitRejectIterator: any = on(twoAwaitRejectEmitter, "data");
                            twoAwaitsReject(twoAwaitRejectIterator).then((unexpectedValue: string): void => {
                                console.log("body-two-awaits-reject-unexpected:", unexpectedValue);
                            }, (reason: any): void => {
                                console.log("body-two-awaits-reject:", reason);

                                const branchEmitter = new EventEmitter();
                                const branchIterator: any = on(branchEmitter, "data");
                                awaitThenBranch(branchIterator, []).then((branchValue: string): void => {
                                    console.log("body-await-if:", branchValue);
                                });
                                branchEmitter.emit("data", "keep");
                                branchEmitter.emit("data", "stop");
                            });
                            twoAwaitRejectEmitter.emit("data", "ignored");
                        });
                        twoAwaitEmitter.emit("data", "two");
                    });
                    postThrowEmitter.emit("data", "post-throw");
                });
                postReturnEmitter.emit("data", "post-return");
            });
            returnEmitter.emit("data", "returned");
        });
        rejectionEmitter.emit("data", "ignored");
    });
    postludeEmitter.emit("data", "postlude");
});
emitter.emit("data", "first");
