async function collect(values: any): Promise<string> {
    let output = "";
    for (const value of values) {
        output += await Promise.resolve(String(value));
    }
    return output + "!";
}

async function sequence(): Promise<string> {
    let output = "";
    output += await Promise.resolve("A");
    output += await Promise.resolve("B");
    return output + "!";
}

collect([1, 2, 3])
    .then((result) => {
        console.log("loop:", result);
        return sequence();
    })
    .then((result) => console.log("sequence:", result));
