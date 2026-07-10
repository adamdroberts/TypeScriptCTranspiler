const values: any = [1, 2, 3];
delete values[0];
let calls = 0;

function add(total: any, value: any): any {
    calls += 1;
    return total + value;
}

const sum: any = values.reduce(add);
console.log("reduce:", sum, calls);

const reverseValues: any = [1, 2, 3];
delete reverseValues[1];
let reverseCalls = 0;
function addRight(total: any, value: any): any {
    reverseCalls += 1;
    return total + value;
}
const reverseSum: any = reverseValues.reduceRight(addRight);
console.log("reduceRight:", reverseSum, reverseCalls);

const empty: any = [1];
delete empty[0];
try {
    empty.reduce(add);
} catch (error) {
    console.log("empty:", String(error));
}
