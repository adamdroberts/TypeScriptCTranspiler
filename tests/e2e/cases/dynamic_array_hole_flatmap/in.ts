const values: any = [1, 2, 3];
delete values[1];
let calls = 0;

function expand(value: any): any[] {
    calls += 1;
    return [value, value + 10];
}

const flattened: any = values.flatMap(expand);
console.log("flatMap:", Object.keys(flattened).join("|"), flattened.join("|"), calls);
