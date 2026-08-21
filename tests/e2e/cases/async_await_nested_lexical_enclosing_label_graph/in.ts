async function nestedCompletion(): Promise<string> {
    {
        let outerIndex = 0;
        outer: while (await Promise.resolve(outerIndex < 3)) {
            console.log("outer", outerIndex);
            outerIndex++;
            for (let inner = 0; inner < 2; inner++) {
                console.log("inner", inner);
                if (inner === 0) {
                    if (outerIndex === 1) continue outer;
                    break outer;
                }
            }
            console.log("unreachable");
        }
        console.log("tail", outerIndex);
    }
    return await Promise.resolve("done");
}

async function immediate(): Promise<string> {
    return "immediate";
}

nestedCompletion().then(value => console.log("result", value));
immediate().then(value => console.log("result", value));
