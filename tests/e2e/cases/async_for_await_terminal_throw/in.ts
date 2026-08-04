async function throwAfter(iterator: any): Promise<string> {
    for await (const _item of iterator) {
    }
    throw "after-loop";
}

throwAfter(["item"]).catch((reason: any): void => {
    console.log("throw:", reason);
});
