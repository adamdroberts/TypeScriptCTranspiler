function markSync(value: string): string {
    console.log("mark:" + value);
    return value;
}

function markAsync(value: string): Promise<string> {
    return new Promise<string>((resolve) => setImmediate(() => {
        console.log("mark:" + value);
        resolve(value);
    }));
}

async function declarationValue(flag: boolean): Promise<string> {
    const value = flag ? await markAsync("decl-await") : markSync("decl-sync");
    return value;
}

async function assignmentValue(flag: boolean): Promise<string> {
    let value = "initial";
    value = flag ? markSync("assign-sync") : await markAsync("assign-await");
    return value;
}

async function expressionValue(flag: boolean): Promise<string> {
    flag ? await markAsync("expr-await") : markSync("expr-sync");
    return flag ? "expr-true" : "expr-false";
}

async function throwValue(flag: boolean): Promise<string> {
    throw flag ? await markAsync("throw-await") : markSync("throw-sync");
}

async function nestedValue(route: number): Promise<string> {
    return route === 0
        ? await markAsync("nested-zero")
        : route === 1
            ? markSync("nested-one")
            : await markAsync("nested-two");
}

async function switchValue(flag: boolean): Promise<string> {
    switch (flag ? await Promise.resolve(1) : await Promise.resolve(2)) {
        case 1:
            return "switch-one";
        default:
            return "switch-two";
    }
}

declarationValue(true).then((value) => console.log(value));
declarationValue(false).then((value) => console.log(value));
assignmentValue(true).then((value) => console.log(value));
assignmentValue(false).then((value) => console.log(value));
expressionValue(true).then((value) => console.log(value));
expressionValue(false).then((value) => console.log(value));
throwValue(true).then(
    (value) => console.log(value),
    (reason) => console.log("throw:" + reason),
);
throwValue(false).then(
    (value) => console.log(value),
    (reason) => console.log("throw:" + reason),
);
nestedValue(0).then((value) => console.log(value));
nestedValue(1).then((value) => console.log(value));
nestedValue(2).then((value) => console.log(value));
switchValue(true).then((value) => console.log(value));
switchValue(false).then((value) => console.log(value));
