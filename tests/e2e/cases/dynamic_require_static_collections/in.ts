const moduleMap = {
    first: "./map_a",
    second: "./map_b",
} as const;

function loadFromMap(key: "first" | "second"): void {
    require(moduleMap[key]);
}

const moduleList = ["./array_a", "./array_b"] as const;

function loadFromArray(index: number): void {
    require(moduleList[index]);
}

loadFromMap("second");
loadFromArray(1);
console.log("static collection requires done");
