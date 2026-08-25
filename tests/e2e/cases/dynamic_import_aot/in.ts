console.log("before");

const loaded = import("./lazy");
const runtimeOptions: any = { with: { type: "javascript" } };

console.log("after");

loaded.then((namespace) => {
    console.log(namespace.value);
    return import("./lazy").then((again) => {
        console.log(namespace === again);
    });
}).then(() => import("./lazy", runtimeOptions)).then((attributed) => {
    console.log("runtime-options:" + String(attributed.value));
}).then(() => import("./lazy", 1 as any).then(
    () => console.log("invalid-options:false"),
    (error: any) => console.log("invalid-options:" + String(error instanceof TypeError)),
));
