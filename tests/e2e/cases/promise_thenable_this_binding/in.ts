const events: string[] = [];

const direct: any = {
    marker: "direct",
    then: function(this: any, resolve: any, reject: any): void {
        events.push("direct this:" + this.marker);
        resolve(this.marker + " value");
        reject("late");
    },
};

Promise.resolve(direct)
    .then((value: any) => {
        console.log("direct:", value);
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
getterChild.marker = "child";

Promise.resolve(getterChild)
    .then((value: any) => {
        console.log("getter:", value);
        return value;
    });

console.log("events:", events.join("|"));
