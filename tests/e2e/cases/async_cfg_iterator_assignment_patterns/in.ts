let trace = "";

function fallback(tag: string): string {
    trace += tag + ">";
    return "fallback";
}

function targetReceiver(target: any): any {
    trace += "R>";
    return target;
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

async function propertyAssignments(): Promise<string> {
    const target: any = { named: "", slots: [0, 0] };
    const rows: any = [["left", 7], ["right", 8]];
    let index = 0;
    const output: any = [];
    for ([targetReceiver(target).named, targetReceiver(target).slots[index++]] of rows) {
        const piece = await Promise.resolve(
            target.named + String(target.slots[index - 1]) + ";",
        );
        output.push(piece);
    }
    return output.join("") + String(index);
}

async function typedElementAssignments(): Promise<string> {
    const target: number[] = [0, 0];
    let index = 0;
    for (target[index++] of [4, 5]) {
        await Promise.resolve(index);
    }
    return target.join(":") + ":" + String(index);
}

async function asyncPropertyAssignments(): Promise<string> {
    const target: any = {};
    const rows: any = [{ value: "first" }, { value: "last" }];
    for await ({ value: target.current } of rows) {
        await Promise.resolve(target.current);
    }
    return target.current;
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
    .then((result) => {
        console.log("async:", result, trace);
        return propertyAssignments();
    })
    .then((result) => {
        console.log("property:", result, trace);
        return typedElementAssignments();
    })
    .then((result) => {
        console.log("typed element:", result, trace);
        return asyncPropertyAssignments();
    })
    .then((result) => console.log("async property:", result, trace));
