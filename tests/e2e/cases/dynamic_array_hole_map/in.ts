const values: any = [1, 2, 3];
delete values[1];
let calls = 0;
function mapValue(value: any, index: number): number {
    calls += 1;
    return value * 2 + index;
}
const mapped: any = values.map(mapValue);

console.log("map:", Object.keys(mapped).join("|"), Object.hasOwn(mapped, "1"), String(mapped[1]), mapped[0], mapped[2], calls);
