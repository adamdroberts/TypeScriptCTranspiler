// @ts-nocheck

let assignmentTrace = "";
const assignmentTarget: any = { left: "", right: "" };

function assignmentKey(marker: string, key: string): Promise<string> {
    assignmentTrace += marker + ">";
    return Promise.resolve(key);
}

function assignmentFallback(marker: string, value: string): Promise<string> {
    assignmentTrace += marker + ">";
    return Promise.resolve(value);
}

function assignmentReceiver(marker: string): any {
    assignmentTrace += marker + ">";
    return assignmentTarget;
}

function assignmentIndex(marker: string, key: string): string {
    assignmentTrace += marker + ">";
    return key;
}

function asyncAssignmentReceiver(marker: string): Promise<any> {
    assignmentTrace += marker + ">";
    return Promise.resolve(assignmentTarget);
}

function asyncAssignmentIndex(marker: string, key: string): Promise<string> {
    assignmentTrace += marker + ">";
    return Promise.resolve(key);
}

async function ordinaryAssignments(): Promise<string> {
    let named: any = "";
    for ({
        [await assignmentKey("K", "value")]:
            assignmentReceiver("R")[assignmentIndex("I", "left")] =
                await assignmentFallback("D", "fallback"),
        named = await assignmentFallback("N", "missing"),
    } of [{ value: "one", named: "seen" }, {}]) {
        await Promise.resolve();
    }
    return assignmentTarget.left + ":" + named + ":" + assignmentTrace;
}

function rejectingAssignment(): Promise<string> {
    return Promise.reject("iterator assignment rejected");
}

function assignmentRows(rows: any[]): any {
    let index = 0;
    const iterator: any = {};
    iterator.next = (): Promise<any> => {
        assignmentTrace += "Xnext>";
        if (index >= rows.length) return Promise.resolve({ done: true });
        return Promise.resolve({ value: rows[index++], done: false });
    };
    iterator.return = (): Promise<any> => {
        assignmentTrace += "Xreturn>";
        return Promise.resolve({ done: true });
    };
    iterator[Symbol.asyncIterator] = (): any => iterator;
    return iterator;
}

async function asyncAssignments(): Promise<string> {
    for await ({
        [await assignmentKey("A", "value")]:
            (await asyncAssignmentReceiver("Q"))[await asyncAssignmentIndex("J", "right")] =
                await rejectingAssignment(),
    } of assignmentRows([{ value: "async" }, {}])) {
        await Promise.resolve();
    }
    return "unreachable";
}

ordinaryAssignments()
    .then((result) => {
        console.log("ordinary assignment:", result);
        return asyncAssignments();
    })
    .then(
        (result) => console.log("unexpected:", result),
        (reason) => console.log(
            "async assignment:",
            reason,
            assignmentTarget.right,
            assignmentTrace,
        ),
    );
