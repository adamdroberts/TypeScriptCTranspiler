const values: any[] = ["keep", "drop", "last"];
const deleted = delete values[1];
console.log("delete:", deleted, values.length, values.join("|"), Object.hasOwn(values, "1"), Object.keys(values).join("|"));
console.log("names:", Object.getOwnPropertyNames(values).join("|"));
console.log("values:", Object.values(values).join("|"));
const entries: any = Object.entries(values);
console.log("entries:", entries[0][0] + ":" + entries[0][1] + "|" + entries[1][0] + ":" + entries[1][1]);
const descriptors: any = Object.getOwnPropertyDescriptors(values);
console.log("descriptors:", Object.keys(descriptors).join("|"), Object.hasOwn(descriptors, "1"), Object.hasOwn(descriptors, "2"));
console.log("reads:", values.at(1), values.indexOf(undefined), values.lastIndexOf(undefined), values.includes(undefined), values.includes("missing"));
const tailHole: any[] = ["first", "last"];
delete tailHole[1];
console.log("pop hole:", tailHole.pop(), tailHole.length, Object.hasOwn(tailHole, "0"));
const headHole: any[] = ["first", "last"];
delete headHole[0];
console.log("shift hole:", headHole.shift(), headHole.length, Object.hasOwn(headHole, "0"), headHole[0]);
const hofValues: any[] = [1, 2, 3];
delete hofValues[1];
let forEachCalls = 0;
let mapCalls = 0;
let flatMapCalls = 0;
let filterCalls = 0;
function countForEach(_value: any): number { forEachCalls++; return forEachCalls; }
function mapHole(value: any): any { mapCalls++; return value * 2; }
function flatMapHole(value: any): any[] { flatMapCalls++; return [value * 2]; }
function filterHole(value: any): boolean { filterCalls++; return value % 2 === 1; }
function someHole(value: any): boolean { someCalls++; return value === 3; }
function everyHole(value: any): boolean { everyCalls++; return value > 0; }
hofValues.forEach(countForEach);
const mappedHoles = hofValues.map(mapHole);
const flatMappedHoles = hofValues.flatMap(flatMapHole);
const filteredHoles = hofValues.filter(filterHole);
const reducedHoles = hofValues.reduce((total: number, value: any) => total + Number(value), 0);
const foundHoleIndex = hofValues.findIndex((value: any) => value === undefined);
let someCalls = 0;
let everyCalls = 0;
const hasThree = hofValues.some(someHole);
const allPositive = hofValues.every(everyHole);
console.log("hof holes:", forEachCalls, Object.keys(mappedHoles).join("|"), Object.hasOwn(mappedHoles, "1"), mapCalls, flatMappedHoles.join("|"), flatMapCalls, filteredHoles.join("|"), filterCalls, reducedHoles, foundHoleIndex, hasThree, someCalls, allPositive, everyCalls);
const fromHoles: any[] = Array.from(hofValues);
const fromMappedHoles: string[] = Array.from(hofValues, (value: any) => value === undefined ? "missing" : String(value));
console.log("from holes:", Object.keys(fromHoles).join("|"), Object.hasOwn(fromHoles, "1"), fromHoles[1], fromMappedHoles.join("|"));
const iteratorValues = hofValues.values();
const iteratorEntries = hofValues.entries();
console.log("iter holes:", Object.keys(iteratorValues).join("|"), Object.hasOwn(iteratorValues, "1"), iteratorValues[1], iteratorEntries[1][0], iteratorEntries[1][1]);
let forOfHoles = "";
for (const value of hofValues) forOfHoles += String(value) + "|";
console.log("for-of holes:", forOfHoles);
const staticSpread: any[] = [...hofValues];
const dynamicSparse: any = hofValues;
const dynamicSpread: any[] = [...dynamicSparse];
console.log("spread holes:", Object.keys(staticSpread).join("|"), staticSpread[1], Object.keys(dynamicSpread).join("|"), dynamicSpread[1]);
function collectSpread(...values: any[]): string { return values.join("|"); }
console.log("call spread holes:", collectSpread(...hofValues));
const arrayOfSpread: any[] = Array.of(...hofValues);
console.log("Array.of spread holes:", Object.keys(arrayOfSpread).join("|"), arrayOfSpread[1]);
