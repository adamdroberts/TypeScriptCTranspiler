const methods: any = Array.prototype;
const sourceValues: any[] = ["deleted", 3];
delete sourceValues[0];
const source: any = sourceValues;
Object.setPrototypeOf(source, { 0: 2 });

let visits = 0;
function double(value: any): any {
    visits++;
    return value * 2;
}
function keepEven(value: any): boolean {
    return value % 2 === 0;
}
function sum(acc: any, value: any): any {
    return acc + value;
}

const mapped: any = Reflect.apply(methods.map, source, [double]);
const filtered: any = Reflect.apply(methods.filter, source, [keepEven]);
const reduced: any = Reflect.apply(methods.reduce, source, [sum, 0]);

console.log("map:", mapped.join("|"), visits, Object.hasOwn(mapped, "0"));
console.log("filter:", filtered.join("|"));
console.log("reduce:", reduced);

const trueHoleValues: any[] = ["deleted", 3];
delete trueHoleValues[0];
const trueHole: any = trueHoleValues;
let holeVisits = 0;
Reflect.apply(methods.forEach, trueHole, [(): void => { holeVisits++; }]);
console.log("hole visits:", holeVisits);
