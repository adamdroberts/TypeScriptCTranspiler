async function collectAny(values: any, output: string[]): Promise<string> {
    for await (const value of values) {
        output.push(value);
    }
    return output.join(",");
}

async function collectNumbers(values: any, output: string[]): Promise<string> {
    for await (const value of values) {
        output.push(String(value));
    }
    return output.join(",");
}

async function collectString(value: any, output: string[]): Promise<string> {
    for await (const character of value) {
        output.push(character);
    }
    return output.join("|");
}

collectAny([Promise.resolve("a"), "b"], []).then((value: string): void => {
    console.log("any:", value);
});
collectNumbers([1, 2, 3], []).then((value: string): void => {
    console.log("numbers:", value);
});
collectString("xy", []).then((value: string): void => {
    console.log("string:", value);
});
