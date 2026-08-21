const pending = 1024;
let completed = 0;
let objectValid = true;
let setValid = true;
let assignedValid = true;
let parameterValid = true;
let methodValid = true;
let arrowValid = true;
let closureValid = true;

async function retainDynamicContainers(index: number): Promise<string> {
    const marker: any = {
        value: "marker-" + index + "-" + "x".repeat(64),
    };
    const seen = new Set<string>();
    seen.add("seen-" + index + "-" + "y".repeat(64));
    await new Promise<string>((resolve) => setImmediate(() => resolve("tick")));
    return (marker.value === "marker-" + index + "-" + "x".repeat(64) ? "o" : "-") +
        (seen.has("seen-" + index + "-" + "y".repeat(64)) ? "s" : "-");
}

async function retainAssignedDynamic(index: number): Promise<boolean> {
    let marker: any;
    marker = { value: "assigned-" + index + "-" + "z".repeat(64) };
    await new Promise<string>((resolve) => setImmediate(() => resolve("tick")));
    return marker.value === "assigned-" + index + "-" + "z".repeat(64);
}

async function retainDynamicParameter(index: number, marker: any): Promise<boolean> {
    await new Promise<string>((resolve) => setImmediate(() => resolve("tick")));
    return marker.value === "parameter-" + index + "-" + "p".repeat(64);
}

class DynamicRetainer {
    async retain(index: number, marker: any): Promise<boolean> {
        await new Promise<string>((resolve) => setImmediate(() => resolve("tick")));
        return marker.value === "method-" + index + "-" + "m".repeat(64);
    }
}

const retainArrow = async (index: number, marker: any): Promise<boolean> => {
    await new Promise<string>((resolve) => setImmediate(() => resolve("tick")));
    return marker.value === "arrow-" + index + "-" + "a".repeat(64);
};

const retainer = new DynamicRetainer();

function makeRetainingClosure(index: number): () => Promise<boolean> {
    let marker: any = { value: "stale" };
    const retain = (): Promise<boolean> => new Promise<boolean>((resolve) => {
        setImmediate(() => resolve(marker.value === "closure-" + index + "-" + "c".repeat(64)));
    });
    marker = { value: "closure-" + index + "-" + "c".repeat(64) };
    return retain;
}

for (let index = 0; index < pending; index++) {
    retainDynamicContainers(index).then((result) => {
        objectValid = objectValid && result.startsWith("o");
        setValid = setValid && result.endsWith("s");
        completed++;
        if (completed === pending * 6) console.log("async-container-gc-root", objectValid, setValid, assignedValid, parameterValid, methodValid, arrowValid, closureValid, completed);
    });
    retainAssignedDynamic(index).then((result) => {
        assignedValid = assignedValid && result;
        completed++;
        if (completed === pending * 6) console.log("async-container-gc-root", objectValid, setValid, assignedValid, parameterValid, methodValid, arrowValid, closureValid, completed);
    });
    retainDynamicParameter(index, { value: "parameter-" + index + "-" + "p".repeat(64) }).then((result) => {
        parameterValid = parameterValid && result;
        completed++;
        if (completed === pending * 6) console.log("async-container-gc-root", objectValid, setValid, assignedValid, parameterValid, methodValid, arrowValid, closureValid, completed);
    });
    retainer.retain(index, { value: "method-" + index + "-" + "m".repeat(64) }).then((result) => {
        methodValid = methodValid && result;
        completed++;
        if (completed === pending * 6) console.log("async-container-gc-root", objectValid, setValid, assignedValid, parameterValid, methodValid, arrowValid, closureValid, completed);
    });
    retainArrow(index, { value: "arrow-" + index + "-" + "a".repeat(64) }).then((result) => {
        arrowValid = arrowValid && result;
        completed++;
        if (completed === pending * 6) console.log("async-container-gc-root", objectValid, setValid, assignedValid, parameterValid, methodValid, arrowValid, closureValid, completed);
    });
    makeRetainingClosure(index)().then((result) => {
        closureValid = closureValid && result;
        completed++;
        if (completed === pending * 6) console.log("async-container-gc-root", objectValid, setValid, assignedValid, parameterValid, methodValid, arrowValid, closureValid, completed);
    });
}
