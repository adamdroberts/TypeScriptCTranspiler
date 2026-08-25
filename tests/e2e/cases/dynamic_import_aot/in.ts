console.log("before");

const loaded = import("./lazy");

console.log("after");

loaded.then((namespace) => {
    console.log(namespace.value);
    return import("./lazy").then((again) => {
        console.log(namespace === again);
    });
});
