const thenable: any = {
    then(resolve: any, reject: any): void {
        console.log("metadata:", resolve.name, resolve.length, reject.name, reject.length);
        console.log("prototype:", Object.hasOwn(resolve, "prototype"), Object.hasOwn(reject, "prototype"));
        try {
            Reflect.construct(resolve, []);
            console.log("construct:", "ok");
        } catch (err: any) {
            console.log("construct:", err);
        }
        resolve("settled");
    },
};

Promise.resolve(thenable).then((value: any) => {
    console.log("value:", value);
});
