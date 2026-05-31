const promise = Promise.resolve("dynamic-promise-value");
const thenable: any = {
    then: function(resolve: any): void {
        resolve(promise);
    }
};

Promise.resolve(thenable).then((value: any) => {
    console.log("resolved:", value);
});

const p: any = Promise.resolve("direct-promise-value");
Promise.resolve(p).then((value: any) => {
    console.log("direct promise:", value);
});
