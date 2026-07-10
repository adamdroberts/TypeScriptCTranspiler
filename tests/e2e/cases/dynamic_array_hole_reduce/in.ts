const values: any = [1, 2, 3];
delete values[1];
let calls = 0;

function add(total: any, value: any): any {
    calls += 1;
    return total + value;
}

const sum: any = values.reduce(add, 0);
console.log("reduce:", sum, calls);
