const events: string[] = [];

const methodProto: any = {
    then: function(resolve: any, reject: any): void {
        events.push("method then");
        resolve("method value");
        reject("late");
    },
};

const methodChild: any = Object.create(methodProto);
methodChild.label = "child";

Promise.resolve(methodChild)
    .then((value: any) => {
        console.log("inherited method:", value);
        return value;
    });

const getterProto: any = {};
Object.defineProperty(getterProto, "then", {
    get: function(): any {
        events.push("getter read");
        return function(resolve: any, reject: any): void {
            events.push("getter call");
            resolve("getter value");
            reject("late");
        };
    },
});

const getterChild: any = Object.create(getterProto);

Promise.resolve(getterChild)
    .then((value: any) => {
        console.log("inherited getter:", value);
        return value;
    });

console.log("events:", events.join("|"));
