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

const typedValues: any[] = ["deleted", 3];
delete typedValues[0];
const typedProto: any = Object.create(Array.prototype);
typedProto[0] = 2;
Object.setPrototypeOf(typedValues, typedProto);
let typedVisits = 0;
function typedDouble(value: any): number {
    typedVisits++;
    return Number(value) * 2;
}
const typedMapped = typedValues.map(typedDouble);
const typedFiltered = typedValues.filter((value: any): boolean => Number(value) % 2 === 0);
const typedReduced = typedValues.reduce((acc: number, value: any): number => acc + Number(value), 0);
const typedFlatMapped = typedValues.flatMap((value: any): number[] => [Number(value)]);
console.log(
    "typed:",
    typedMapped.join("|"),
    typedFiltered.join("|"),
    typedReduced,
    typedFlatMapped.join("|"),
    typedVisits,
    typedValues.some((value: any): boolean => Number(value) === 2),
    typedValues.every((value: any): boolean => Number(value) > 0),
);

const typedHoles: any[] = ["deleted", 3];
delete typedHoles[0];
let typedHoleVisits = 0;
function visitTypedHole(_value: any): void {
    typedHoleVisits++;
}
typedHoles.forEach(visitTypedHole);
const foundHole = typedHoles.find((value: any): boolean => value === undefined);
const foundHoleIndex = typedHoles.findIndex((value: any): boolean => value === undefined);
const foundLastHoleIndex = typedHoles.findLastIndex((value: any): boolean => value === undefined);
console.log("typed holes:", typedHoleVisits, foundHole === undefined, foundHoleIndex, foundLastHoleIndex);
