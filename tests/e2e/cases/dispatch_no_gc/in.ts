const queue = new DispatchQueue("no-gc");
const pool = DispatchQueue.concurrent();

const syncValue = dispatch.sync(queue, () => "sync");
console.log(syncValue);

dispatch.async(pool, () => [1, 2, 3]).then((values) => {
    console.log("array", values.length);
});

dispatch.group(pool, [
    () => 20,
    () => 22,
]).then((values) => {
    console.log("group", values.join("+"));
});
