let trace = "";

async function nestedLabels(exitOuter: boolean): Promise<string> {
    let result = "";
    outer: {
        result += await Promise.resolve("a");
        inner: {
            result += await Promise.resolve("b");
            if (exitOuter) break outer;
            result += await Promise.resolve("c");
            break inner;
        }
        result += "d";
    }
    return result;
}

async function finalizingLabel(): Promise<string> {
    let result = "";
    region: {
        try {
            result += await Promise.resolve("work");
            break region;
        } finally {
            result += await Promise.resolve("/cleanup");
        }
        result += "/unreachable";
    }
    return result;
}

function source(): any {
    let done = false;
    const iterator: any = {};
    iterator.next = (): Promise<any> => {
        trace += "next>";
        if (done) return Promise.resolve({ done: true });
        done = true;
        return Promise.resolve({ value: "item", done: false });
    };
    iterator.return = (): Promise<any> => {
        trace += "return>";
        return Promise.resolve({ done: true });
    };
    iterator[Symbol.asyncIterator] = (): any => iterator;
    return iterator;
}

async function iteratorLabel(): Promise<string> {
    let result = "";
    exit: {
        for await (const value of source()) {
            result += await Promise.resolve(value);
            break exit;
        }
        result += "/unreachable";
    }
    return result;
}

nestedLabels(true)
    .then((result) => {
        console.log("outer:", result);
        return nestedLabels(false);
    })
    .then((result) => {
        console.log("inner:", result);
        return finalizingLabel();
    })
    .then((result) => {
        console.log("finally:", result);
        return iteratorLabel();
    })
    .then((result) => console.log("iterator:", result, trace));
