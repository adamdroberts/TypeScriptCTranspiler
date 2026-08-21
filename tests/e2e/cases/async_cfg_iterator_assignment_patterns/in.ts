let trace = "";

function fallback(tag: string): string {
    trace += tag + ">";
    return "fallback";
}

async function ordinaryAssignments(): Promise<string> {
    const rows: any = [
        ["A", { value: "kept" }, "R1", "R2"],
        ["B", {}, "R3"],
    ];
    let head: any;
    let value: any;
    let tail: any;
    let output = "";
    for ([head, { value = fallback("D") }, ...tail] of rows) {
        output += await Promise.resolve(
            head + ":" + value + ":" + tail.join(",") + ";",
        );
    }
    return output;
}

async function objectAssignments(): Promise<string> {
    const rows: any = [
        { name: "left", count: 2, extra: "E1" },
        { name: "right", extra: "E2" },
    ];
    let name: any;
    let count: any;
    let rest: any;
    let output = "";
    for ({ name, count = fallback("O"), ...rest } of rows) {
        output += await Promise.resolve(
            name + ":" + String(count) + ":" + rest.extra + ";",
        );
    }
    return output;
}

async function asyncAssignments(): Promise<string> {
    const rows: any = [["x", 1], ["y", 2]];
    let key: any;
    let value: any;
    let output = "";
    for await ([key, value] of rows) {
        output += await Promise.resolve(key + String(value));
    }
    return output;
}

ordinaryAssignments()
    .then((result) => {
        console.log("ordinary:", result, trace);
        return objectAssignments();
    })
    .then((result) => {
        console.log("object:", result, trace);
        return asyncAssignments();
    })
    .then((result) => console.log("async:", result, trace));
