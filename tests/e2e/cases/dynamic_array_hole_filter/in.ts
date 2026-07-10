const values: any = [1, 2, 3, 4];
delete values[1];
let calls = 0;

function keepOdd(value: any): boolean {
    calls += 1;
    return value % 2 === 1;
}

const filtered: any = values.filter(keepOdd);
console.log("filter:", Object.keys(filtered).join("|"), filtered.join("|"), calls);
