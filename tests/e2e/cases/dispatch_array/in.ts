const queue = new DispatchQueue("array");

const syncValues = dispatch.sync(queue, () => [1, 2, 3]);
console.log("sync", syncValues.join(","));

dispatch.async(queue, () => [4, 5, 6]).then((values) => {
    console.log("async", values.join(","));
});
