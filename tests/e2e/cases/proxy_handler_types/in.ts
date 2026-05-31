function makeDynamic(x: any): any {
    return x;
}

const target = { foo: "target_foo", bar: "target_bar" };
const handlerFunc = makeDynamic(() => {});
const handlerArr = makeDynamic([]);

const proxy1: any = new Proxy(target, handlerFunc);
const proxy2: any = new Proxy(target, handlerArr);

console.log(proxy1.foo);
console.log(proxy2.bar);
