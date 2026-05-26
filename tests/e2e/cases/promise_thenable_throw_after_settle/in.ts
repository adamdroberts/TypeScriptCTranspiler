const events: string[] = [];

const resolveThenThrow: any = {
    then: function(resolve: any, reject: any): void {
        events.push("resolve then throw");
        resolve("kept");
        throw "late resolve throw";
    },
};

Promise.resolve(resolveThenThrow)
    .then((value: any) => {
        console.log("resolve kept:", value);
        return value;
    })
    .catch((reason: any) => {
        console.log("resolve rejected:", reason);
        return "bad";
    });

const rejectThenThrow: any = {
    then: function(resolve: any, reject: any): void {
        events.push("reject then throw");
        reject("kept reason");
        throw "late reject throw";
    },
};

Promise.resolve(rejectThenThrow)
    .then((value: any) => {
        console.log("reject fulfilled:", value);
        return value;
    })
    .catch((reason: any) => {
        console.log("reject kept:", reason);
        return "handled";
    });

console.log("events:", events.join("|"));
