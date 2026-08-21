async function collect(first: boolean): Promise<string> {
    const left: any = [1, 2];
    const right: any = [3, 4];
    let output = "";
    for (const value of (
        first
            ? await Promise.resolve(left)
            : await Promise.resolve(right)
    )) {
        output += await Promise.resolve(String(value));
    }
    return output;
}

async function collectKeys(): Promise<string> {
    const object: any = { alpha: 1, beta: 2 };
    let output = "";
    for (const key in await Promise.resolve(object)) {
        output += await Promise.resolve(key + "=" + String(object[key]) + ";");
    }
    return output;
}

async function rejectSource(): Promise<any> {
    const rejected: Promise<any> = Promise.reject("sync-source-failure");
    for (const _value of await rejected) {
        return "unreachable";
    }
}

collect(true)
    .then((result) => {
        console.log("left:", result);
        return collect(false);
    })
    .then((result) => {
        console.log("right:", result);
        return collectKeys();
    })
    .then((result) => {
        console.log("keys:", result);
        return rejectSource();
    })
    .then(
        (result) => console.log("unexpected:", result),
        (reason) => console.log("rejected:", reason),
    );
