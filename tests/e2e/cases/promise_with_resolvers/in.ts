const fulfilled = Promise.withResolvers<string>();
fulfilled.promise.then((value) => console.log("fulfilled", value));
fulfilled.resolve("resolved");

const adopted = Promise.withResolvers<string>();
adopted.promise.then((value) => console.log("adopted", value));
adopted.resolve(Promise.resolve("adopted-value"));

const rejected = Promise.withResolvers<string>();
rejected.promise.catch((reason) => console.log("rejected", reason));
rejected.reject("rejected-value");
