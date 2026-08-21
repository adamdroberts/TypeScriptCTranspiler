let events = "";

function resource(tag: string): any {
    const value: any = {};
    value[Symbol.asyncDispose] = (): Promise<void> => {
        events += tag;
        return Promise.resolve();
    };
    return value;
}

async function scoped(flag: boolean): Promise<string> {
    let result = "";
    {
        await using held: any = await Promise.resolve(resource(flag ? "T" : "F"));
        result += await Promise.resolve("b");
        if (flag) return result;
    }
    result += await Promise.resolve("a");
    return result;
}

async function loop(): Promise<string> {
    let seen = "";
    for (let index = 0; index < 2; index++) {
        await using held: any = await Promise.resolve(resource(String(index)));
        seen += await Promise.resolve(String(index));
        if (index === 0) continue;
        break;
    }
    return seen;
}

async function failure(): Promise<void> {
    await using held: any = await Promise.resolve(resource("X"));
    await Promise.resolve();
    throw "body-error";
}

scoped(true)
    .then((result) => {
        console.log("return:", result, events);
        return scoped(false);
    })
    .then((result) => {
        console.log("fallthrough:", result, events);
        return failure().then(
            (_ignored: any) => loop(),
            (reason) => {
                console.log("throw:", reason, events);
                return loop();
            },
        );
    })
    .then((result) => console.log("loop:", result, events));
