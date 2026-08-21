function value(label: string): Promise<string> {
    console.log("source", label);
    return Promise.resolve(label);
}

async function returned(): Promise<string> {
    return (await value("return-a")) + ":" + (await value("return-b"));
}

async function thrown(): Promise<string> {
    try {
        throw (await value("throw-a")) + ":" + (await value("throw-b"));
    } catch (reason) {
        return "caught:" + reason;
    } finally {
        await Promise.resolve(undefined);
        console.log("finally");
    }
}

returned().then((result: string): void => console.log(result));
thrown().then((result: string): void => console.log(result));
