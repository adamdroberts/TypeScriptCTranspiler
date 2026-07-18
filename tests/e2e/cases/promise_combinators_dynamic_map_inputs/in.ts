function entryText(entry: any): string {
    return String(entry[0]) + ":" + String(entry[1]);
}

function settledText(item: any): string {
    return item.status === "fulfilled"
        ? item.status + ":" + entryText(item.value)
        : item.status + ":" + String(item.reason);
}

const allInput = new Map<any, any>([
    ["all-a", "A"] as ObjectEntry<any, any>,
    ["all-b", "B"] as ObjectEntry<any, any>,
]);

Promise.all(allInput)
    .then((items: any[]): any[] => {
        console.log("all map:", items.map(entryText).join(","));
        return items;
    });

const raceInput = new Map<any, any>([
    ["race-a", "A"] as ObjectEntry<any, any>,
    ["race-b", "B"] as ObjectEntry<any, any>,
]);

Promise.race(raceInput)
    .then((entry: any): any => {
        console.log("race map:", entryText(entry));
        return entry;
    });

const anyInput = new Map<any, any>([
    ["any-a", "A"] as ObjectEntry<any, any>,
    ["any-b", "B"] as ObjectEntry<any, any>,
]);

Promise.any(anyInput)
    .then((entry: any): any => {
        console.log("any map:", entryText(entry));
        return entry;
    });

const settledInput = new Map<any, any>([
    ["settled-a", "A"] as ObjectEntry<any, any>,
    ["settled-b", "B"] as ObjectEntry<any, any>,
]);

Promise.allSettled(settledInput)
    .then((items: any[]): any[] => {
        console.log("settled map:", items.map(settledText).join(","));
        return items;
    });
