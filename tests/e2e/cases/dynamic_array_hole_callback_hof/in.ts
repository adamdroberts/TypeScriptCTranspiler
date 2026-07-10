const values: any = [1, 2, 3];
delete values[1];

let eachTotal: any = 0;
let eachCalls = 0;
function visit(value: any): void {
    eachTotal += value;
    eachCalls += 1;
}
values.forEach(visit);

let someCalls = 0;
function isThree(value: any): boolean {
    someCalls += 1;
    return value === 3;
}
const hasThree = values.some(isThree);

let everyCalls = 0;
function isPositive(value: any): boolean {
    everyCalls += 1;
    return value > 0;
}
const allPositive = values.every(isPositive);

console.log("forEach:", eachTotal, eachCalls);
console.log("some:", hasThree, someCalls);
console.log("every:", allPositive, everyCalls);
