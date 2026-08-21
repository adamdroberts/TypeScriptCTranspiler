let trace = "";

async function choose(value: number): Promise<string> {
    let result = "";
    switch (await Promise.resolve(value)) {
        case await (trace += "A>", Promise.resolve(1)):
            result = "one";
            break;
        default:
            result = "default";
            break;
        case true
            ? await (trace += "B>", Promise.resolve(2))
            : await (trace += "X>", Promise.resolve(20)):
            result = "two";
            break;
        case await (trace += "C>", Promise.resolve(3)):
            result = "three";
            break;
    }
    return result;
}

async function failCase(): Promise<string> {
    const rejected: Promise<number> = Promise.reject("case-failure");
    try {
        switch (0) {
            case await (trace += "R>", rejected):
                return "unreachable";
            default:
                return "also-unreachable";
        }
    } finally {
        trace += await Promise.resolve("F>");
    }
}

async function chooseString(value: string): Promise<string> {
    switch (value) {
        case await Promise.resolve("match"):
            return "hit";
        default:
            return "miss";
    }
}

choose(1)
    .then((result) => {
        console.log("first:", result, trace);
        return choose(2);
    })
    .then((result) => {
        console.log("middle:", result, trace);
        return choose(9);
    })
    .then((result) => {
        console.log("default:", result, trace);
        return chooseString("match");
    })
    .then((result) => {
        console.log("string:", result, trace);
        return failCase();
    })
    .then(
        (result) => console.log("unexpected:", result),
        (reason) => console.log("rejected:", reason, trace),
    );
