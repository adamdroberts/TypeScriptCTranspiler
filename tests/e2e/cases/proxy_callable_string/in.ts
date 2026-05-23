function add(this: any, left: any, right: any): any {
    return this.base + left + right;
}

const callable: any = new Proxy(add as any, {});
const objectProxy: any = new Proxy({ value: 1 }, {});

console.log("strings:", String(add), String(callable), String(objectProxy));
console.log("types:", typeof callable, typeof objectProxy);
