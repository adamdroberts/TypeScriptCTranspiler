function catchTyped(index: number): string {
    try {
        return [1, 2, 3].with(index, 9).join(",");
    } catch (err) {
        return String(err);
    }
}

const dynamicNums: any = [1, 2, 3];

function catchDynamic(index: number): string {
    try {
        return dynamicNums.with(index, "x").join(",");
    } catch (err) {
        return String(err);
    }
}

console.log("typed high:", catchTyped(3));
console.log("typed low:", catchTyped(-4));
console.log("typed inf:", catchTyped(Infinity));
console.log("dynamic high:", catchDynamic(3));
console.log("dynamic low:", catchDynamic(-4));
console.log("dynamic inf:", catchDynamic(Infinity));
console.log("valid:", catchTyped(-1), catchDynamic(1), dynamicNums.join(","));
