const events: string[] = [];

const thenable: any = {
    marker: "executor",
    then: function(this: any, resolve: any, reject: any): void {
        events.push("then:" + this.marker);
        resolve(Promise.resolve(this.marker + "-value"));
        reject("late");
    },
};

new Promise<any>((resolve) => {
    events.push("executor");
    resolve(thenable);
}).then((value: any) => {
    console.log("resolved:", value);
});

new Promise<any>((resolve) => {
    resolve(Promise.resolve("nested"));
}).then((value: any) => {
    console.log("nested:", value);
});

console.log("events:", events.join("|"));
