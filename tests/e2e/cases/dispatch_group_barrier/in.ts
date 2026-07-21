const pool = DispatchQueue.concurrent();

dispatch.group(pool, [
    () => 1,
    () => 2,
    () => 3,
]).then((values) => {
    console.log("group", values.join(","));
});

dispatch.barrier(pool, () => "ready").then((value) => {
    console.log("barrier", value);
});
