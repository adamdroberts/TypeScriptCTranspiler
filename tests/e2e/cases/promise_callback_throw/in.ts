Promise.resolve("start")
    .then((value: string): string => {
        console.log("then before throw:", value);
        throw "then boom";
    })
    .catch((reason: string) => {
        console.log("then caught:", reason);
        return "after then";
    })
    .then((value: string) => {
        console.log("then recovered:", value);
    });

Promise.reject<string>("first")
    .catch((reason: string): string => {
        console.log("catch before throw:", reason);
        throw "catch boom";
    })
    .catch((reason: string) => {
        console.log("catch caught:", reason);
        return "after catch";
    })
    .then((value: string) => {
        console.log("catch recovered:", value);
    });

Promise.resolve("ok")
    .finally(() => {
        throw "finally boom";
    })
    .catch((reason: string) => {
        console.log("finally fulfilled caught:", reason);
        return "after finally fulfilled";
    })
    .then((value: string) => {
        console.log("finally fulfilled recovered:", value);
    });

Promise.reject<string>("original")
    .finally(() => {
        throw "finally replace";
    })
    .catch((reason: string) => {
        console.log("finally rejected caught:", reason);
        return "after finally rejected";
    });

Promise.reject<string>("keep")
    .finally(() => {
        console.log("finally keep");
    })
    .catch((reason: string) => {
        console.log("finally kept reason:", reason);
        return "done";
    });
