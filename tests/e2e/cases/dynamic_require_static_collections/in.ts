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

function loadFromLocalMap(key: "first" | "second"): void {
    const localMap = {
        first: "./local_map_a",
        second: "./local_map_b",
    } as const;
    require(localMap[key]);
}

function loadFromLocalArray(index: number): void {
    const localList = ["./local_array_a", "./local_array_b"] as const;
    require(localList[index]);
}

loadFromMap("second");
loadFromArray(1);
loadFromLocalMap("second");
loadFromLocalArray(1);
console.log("static collection requires done");
