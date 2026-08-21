function condition(label: string, index: number, limit: number, rejectAt: number): Promise<boolean> {
    console.log("condition", label + ":" + index);
    return index === rejectAt
        ? Promise.reject(label + "-error")
        : Promise.resolve(index < limit);
}

async function nestedLoop(label: string, limit: number, rejectAt: number): Promise<string> {
    {
        let index = 0;
        while (await condition(label, index, limit, rejectAt)) {
            console.log("body", label + ":" + index);
            index++;
        }
        console.log("tail", label + ":" + index);
    }
    return label + "-done";
}

async function immediate(): Promise<string> {
    return "immediate";
}

async function nestedDoLoop(): Promise<string> {
    {
        let index = 0;
        do {
            console.log("body", "do:" + index);
            index++;
        } while (await condition("do", index, 1, -1));
        console.log("tail", "do:" + index);
    }
    return "do-done";
}

async function nestedForLoop(): Promise<string> {
    {
        for (let index = 0; await condition("for", index, 1, -1); index++) {
            console.log("body", "for:" + index);
        }
        console.log("tail", "for");
    }
    return "for-done";
}

nestedLoop("normal", 2, -1).then(value => console.log("result", value));
nestedLoop("reject", 3, 1).catch(reason => console.log("rejected", reason));
nestedDoLoop().then(value => console.log("result", value));
nestedForLoop().then(value => console.log("result", value));
immediate().then(value => console.log("result", value));
