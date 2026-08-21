const pending = 1024;
let completed = 0;
let valid = true;

function later(index: number): Promise<string> {
    return new Promise<string>((resolve) => {
        setImmediate(() => resolve("rooted-" + index + "-" + "x".repeat(64)));
    });
}

for (let index = 0; index < pending; index++) {
    later(index).then((value) => {
        valid = valid && value.startsWith("rooted-") && value.endsWith("-" + "x".repeat(64));
        completed++;
        if (completed === pending) console.log("promise-gc-root", valid, completed);
    });
}
