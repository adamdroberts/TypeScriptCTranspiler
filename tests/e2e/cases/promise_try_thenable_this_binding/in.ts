const events: string[] = [];

const direct: any = {
    marker: "try-direct",
    then: function(this: any, resolve: any, reject: any): void {
        events.push("direct this:" + this.marker);
        resolve(this.marker + " value");
        reject("late");
    },
};

Promise.try(() => direct)
    .then((value: any) => {
        console.log("try direct:", value);
        return value;
    });

const getterProto: any = {};
Object.defineProperty(getterProto, "then", {
    get: function(): any {
        events.push("getter read");
        return function(this: any, resolve: any): void {
            events.push("getter this:" + this.marker);
            resolve(this.marker + " value");
        };
    },
});

const getterChild: any = Object.create(getterProto);
getterChild.marker = "try-child";

Promise.try(() => getterChild)
    .then((value: any) => {
        console.log("try getter:", value);
        return value;
    });

console.log("events:", events.join("|"));
