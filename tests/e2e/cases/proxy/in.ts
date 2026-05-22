const target: any = {
    message1: "hello",
    message2: "everyone"
};

function myGet(target: any, prop: any, receiver: any): any {
    if (prop === "message2") return "everyone";
    return "hi";
}

const handler1: any = {
    get: myGet as any
};
const proxy1: any = new Proxy(target, handler1);

console.log(proxy1.message1); // hello
console.log(proxy1.message2); // everyone

proxy1.message1 = "hi";
console.log(proxy1.message1); // hi
console.log(target.message1); // hi

const handler2: any = {};
const target2: any = {};
const revocable: any = Proxy.revocable(target2, handler2);

console.log(revocable.proxy["test"]); // undefined
revocable.revoke();
try {
    console.log(revocable.proxy["test"]); // error
} catch (e: any) {
    console.log(e);
}
