let trace = "";

function fallback(tag: string): string {
    trace += tag + ">";
    return "fallback";
}

async function dynamicPatterns(): Promise<string> {
    const rows: any = [
        [{ present: "kept", extra: 4 }, "T1", "T2"],
        [{ extra: 5 }, "U1"],
    ];
    let output = "";
    for (const [{ present = fallback("D"), ...rest }, ...tail] of rows) {
        output += await Promise.resolve(
            present + ":" + String(rest.extra) + ":" + tail.join(",") + ";",
        );
    }
    return output;
}

async function typedPatterns(): Promise<string> {
    const rows: Array<[number, string]> = [[2, "left"], [3, "right"]];
    let output = "";
    for (const [count, text] of rows) {
        output += await Promise.resolve(text + String(count) + ";");
    }
    return output;
}

async function nullishPattern(): Promise<string> {
    const rows: any = [null];
    for (const [value] of rows) {
        return await Promise.resolve(String(value));
    }
    return "unreachable";
}

dynamicPatterns()
    .then((result) => {
        console.log("dynamic:", result, trace);
        return typedPatterns();
    })
    .then((result) => {
        console.log("typed:", result, trace);
        return nullishPattern();
    })
    .then(
        (result) => console.log("unexpected:", result),
        (reason) => console.log("nullish:", reason),
    );
