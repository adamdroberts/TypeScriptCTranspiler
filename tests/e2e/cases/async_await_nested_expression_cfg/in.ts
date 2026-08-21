function source<T>(label: string, value: T): Promise<T> {
    console.log("source", label);
    return Promise.resolve(value);
}

function combine(left: number, right: number): number {
    return left * 10 + right;
}

function rejectNumber(marker: any): Promise<number> {
    return Promise.reject(marker);
}

async function arithmetic(): Promise<string> {
    let outer = 0;
    while (await Promise.resolve(outer < 1)) {
        let inner = 0;
        while (await Promise.resolve(inner < 1)) {
            const single = 1 + await source("single", 2);
            let multiple = 0;
            multiple = (await source("left", 3)) + (await source("right", 4));
            const called = combine(await source("call-left", 5), await source("call-right", 6));
            const negated = -(await source("unary", 2));
            console.log("arithmetic", single, multiple, called, negated);
            return "arithmetic-done";
        }
    }
    return "unreachable";
}

async function aggregate(): Promise<string> {
    let outer = 0;
    while (await Promise.resolve(outer < 1)) {
        let inner = 0;
        while (await Promise.resolve(inner < 1)) {
            const text = `value:${await source("template-a", "A")}:${await source("template-b", "B")}`;
            const array = [await source("array-a", 1), ...(await source("array-spread", [2, 3]))];
            const object: any = {
                first: await source("object-a", 7),
                ...(await source("object-spread", { second: 8 })),
            };
            const property = (await source<any>("property-object", { value: 12 })).value;
            const element = (await source("element-array", [4, 5]))[1];
            console.log("statement", await source("statement-a", 9), await source("statement-b", 10));
            console.log("aggregate", text, array.join(","), object.first, object.second, property, element);
            return "aggregate-done";
        }
    }
    return "unreachable";
}

async function shortCircuit(): Promise<string> {
    let outer = 0;
    while (await Promise.resolve(outer < 1)) {
        let inner = 0;
        while (await Promise.resolve(inner < 1)) {
            const andValue: any = (await source<any>("and-left", 0)) &&
                (await source<any>("and-skipped", 9));
            const orValue: any = (await source<any>("or-left", "kept")) ||
                (await source<any>("or-skipped", "bad"));
            const nullishValue: any = (await source<any>("nullish-left", null)) ??
                (await source<any>("nullish-right", "fallback"));
            console.log("short", andValue, orValue, nullishValue);
            return "short-done";
        }
    }
    return "unreachable";
}

async function caughtExpression(marker: any): Promise<string> {
    let outer = 0;
    while (await Promise.resolve(outer < 1)) {
        let inner = 0;
        while (await Promise.resolve(inner < 1)) {
            try {
                const value = 1 + await rejectNumber(marker);
                console.log("unreachable", value);
            } catch (reason) {
                console.log("expression-caught", reason === marker, (reason as any).code);
            } finally {
                await Promise.resolve(undefined);
                console.log("expression-finally");
            }
            return "caught-done";
        }
    }
    return "unreachable";
}

async function immediate(): Promise<string> {
    return "immediate";
}

const marker: any = { code: 11 };
arithmetic().then(value => console.log("result", value));
aggregate().then(value => console.log("result", value));
shortCircuit().then(value => console.log("result", value));
caughtExpression(marker).then(value => console.log("result", value));
immediate().then(value => console.log("result", value));
