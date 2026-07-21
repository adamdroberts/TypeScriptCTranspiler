const queue = new DispatchQueue("collections");

const syncMap = dispatch.sync(queue, () => new Map<string, number>([["answer", 42]]));
console.log("map", syncMap.get("answer"));

dispatch.async(queue, () => new Set<number>([2, 4, 6])).then((values) => {
    console.log("set", values.size, values.has(4), values.has(5));
});
