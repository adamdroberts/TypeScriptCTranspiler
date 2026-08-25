export {};

function joinCallbacks(callbacks: Array<() => string>): string {
    let result = "";
    for (let index = 0; index < callbacks.length; index++) {
        if (index !== 0) result += ",";
        result += callbacks[index]();
    }
    return result;
}

const values: any[] = ["alpha", 2, Symbol("gamma"), "omega"];
const retained: Array<() => string> = [];
for (const value of values) {
    retained.push(() => typeof value === "symbol" ? value.toString() : String(value));
}
console.log(joinCallbacks(retained));

const mutated: Array<() => string> = [];
for (let value of ["left", "right"]) {
    let current = value;
    mutated.push(() => {
        current += "!";
        return current;
    });
}
console.log(joinCallbacks(mutated));
console.log(joinCallbacks(mutated));

let shared: any = "";
const assigned: Array<() => string> = [];
for (shared of ["first", "last"]) {
    assigned.push(() => String(shared));
}
console.log(joinCallbacks(assigned));

function retainedKeys(): string {
    const callbacks: Array<() => string> = [];
    for (const key in { one: 1, two: 2, three: 3 }) {
        callbacks.push(() => key);
    }
    return joinCallbacks(callbacks);
}
console.log(retainedKeys());
