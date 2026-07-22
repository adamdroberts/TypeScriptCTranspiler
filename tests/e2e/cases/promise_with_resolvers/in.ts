const fulfilled = Promise.withResolvers<string>();
fulfilled.promise.then((value) => console.log("fulfilled", value));
fulfilled.resolve("resolved");

const adopted = Promise.withResolvers<string>();
adopted.promise.then((value) => console.log("adopted", value));
adopted.resolve(Promise.resolve("adopted-value"));

const rejected = Promise.withResolvers<string>();
rejected.promise.catch((reason) => console.log("rejected", reason));
rejected.reject("rejected-value");

function typedPromiseFromRecord(): Promise<string> {
    const deferred = Promise.withResolvers<string>();
    const promise: Promise<string> = deferred.promise;
    deferred.resolve(Promise.resolve("typed-value"));
    return promise;
}

typedPromiseFromRecord().then((value) => console.log("typed", value));
