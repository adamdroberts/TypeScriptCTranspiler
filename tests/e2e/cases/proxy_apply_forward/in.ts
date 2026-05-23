function add(this: any, left: any, right: any): any {
    return this.base + left + right;
}

const callable: any = new Proxy(add as any, {});

console.log("type:", typeof callable);
console.log("apply:", Reflect.apply(callable, { base: 10 }, [2, 3]));
