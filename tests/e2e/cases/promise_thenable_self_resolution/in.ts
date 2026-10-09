const events: string[] = [];
let repeat = true;
const thenable: any = {
    then(resolve: any, reject: any): void {
        events.push("job");
        if (repeat) {
            repeat = false;
            resolve(thenable);
        } else {
            resolve("settled");
        }
        reject("late");
    }
};
Promise.resolve(thenable).then((value: any) => {
    console.log("repeated:", value);
    console.log("events:", events.join("|"));
});
const record = Promise.withResolvers<any>();
record.resolve(record.promise);
record.promise.catch((error: any) => {
    console.log("self:", error instanceof TypeError);
});
console.log("start");
