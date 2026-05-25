const dynamicArray: any = [1, "two", true, 4];
const arrayGroups = Object.groupBy(dynamicArray, (value: any, index: number) => {
    return index < 2 ? "front" : typeof value;
}) as any;

console.log("array front:", JSON.stringify(arrayGroups.front));
console.log("array boolean:", JSON.stringify(arrayGroups.boolean));
console.log("array number:", JSON.stringify(arrayGroups.number));

const dynamicString: any = "abacad";
function charKey(value: any, index: number): string {
    return index < 3 ? "front" : value;
}
const stringGroups = Object.groupBy(dynamicString, charKey) as any;

console.log("string front:", JSON.stringify(stringGroups.front));
console.log("string a:", JSON.stringify(stringGroups.a));
console.log("string c:", JSON.stringify(stringGroups.c));
console.log("string d:", JSON.stringify(stringGroups.d));
