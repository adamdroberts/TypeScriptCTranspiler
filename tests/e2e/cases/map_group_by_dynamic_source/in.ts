function join(values: any[] | undefined): string {
    return values === undefined ? "(none)" : JSON.stringify(values);
}

const dynamicArray: any = [1, "two", true, 4];
const arrayGroups: Map<string, any[]> = Map.groupBy(dynamicArray, (value: any, index: number) => {
    return index < 2 ? "front" : typeof value;
});

console.log("array size:", arrayGroups.size);
console.log("array front:", join(arrayGroups.get("front")));
console.log("array boolean:", join(arrayGroups.get("boolean")));
console.log("array number:", join(arrayGroups.get("number")));

const dynamicString: any = "abacad";
function charKey(value: any, index: number): string {
    return index < 3 ? "front" : value;
}
const stringGroups: Map<string, any[]> = Map.groupBy(dynamicString, charKey);

console.log("string size:", stringGroups.size);
console.log("string front:", join(stringGroups.get("front")));
console.log("string a:", join(stringGroups.get("a")));
console.log("string c:", join(stringGroups.get("c")));
console.log("string d:", join(stringGroups.get("d")));
