// @ts-nocheck

let trace = "";

function failDefault(): string {
    throw "binding-failure";
}

async function objectBinding(): Promise<string> {
    try {
        await Promise.reject({ code: "E", nested: { value: 3 }, extra: "x" });
    } catch ({ code, nested: { value } = failDefault(), ...rest }) {
        return code + ":" + String(value) + ":" + rest.extra;
    }
    return "unreachable";
}

async function arrayBinding(): Promise<string> {
    try {
        await Promise.reject(["head", "skip", "tail"]);
    } catch ([head, , ...tail]) {
        return head + ":" + tail.join(",");
    }
    return "unreachable";
}

async function throwingBinding(): Promise<string> {
    try {
        try {
            await Promise.reject({});
        } catch ({ missing = failDefault() }) {
            return missing;
        }
    } finally {
        trace += await Promise.resolve("cleanup");
    }
    return "unreachable";
}

objectBinding()
    .then((result) => {
        console.log("object:", result);
        return arrayBinding();
    })
    .then((result) => {
        console.log("array:", result);
        return throwingBinding();
    })
    .then(
        (result) => console.log("unexpected:", result),
        (reason) => console.log("binding:", reason, trace),
    );
