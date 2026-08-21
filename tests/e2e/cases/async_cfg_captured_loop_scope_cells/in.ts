async function iteratorBodyScopes(): Promise<string> {
    const readers: any = [];
    for (const outer of [1, 2]) {
        let local = outer;
        let dynamic: any = { value: outer };
        {
            const nested = local + 10;
            readers.push((): any => `${local}:${nested}:${dynamic.value}`);
        }
        await Promise.resolve();
        dynamic = { value: outer + 20 };
    }
    return readers[0]() + "/" + readers[1]();
}

async function conditionalScopes(): Promise<string> {
    const readers: any = [];
    let index = 0;
    while (index < 2) {
        if (index === 0) {
            const selected = "left";
            readers.push((): any => selected);
        } else {
            const selected = "right";
            readers.push((): any => selected);
        }
        index++;
        await Promise.resolve();
    }
    return readers[0]() + "/" + readers[1]();
}

async function protectedScopes(): Promise<string> {
    const readers: any = [];
    for (const value of [3, 4]) {
        try {
            const protectedValue = value;
            readers.push((): any => protectedValue);
            await Promise.resolve();
        } finally {
            const finalizedValue = value + 10;
            readers.push((): any => finalizedValue);
            await Promise.resolve();
        }
    }
    return readers[0]() + ":" + readers[1]() + "/" + readers[2]() + ":" + readers[3]();
}

iteratorBodyScopes()
    .then((result) => {
        console.log("iterator body:", result);
        return conditionalScopes();
    })
    .then((result) => {
        console.log("conditional:", result);
        return protectedScopes();
    })
    .then((result) => console.log("protected:", result));
