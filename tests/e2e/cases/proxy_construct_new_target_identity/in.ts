function Target(this: any, value: any): void {
    this.value = value;
}

let directCtor: any;
let outerCtor: any;

function directTrap(target: any, args: any, newTarget: any): any {
    return {
        value: args[0],
        targetType: typeof target,
        sameNewTarget: Object.is(newTarget, directCtor),
    };
}

function nestedTrap(target: any, args: any, newTarget: any): any {
    return {
        value: args[0],
        targetType: typeof target,
        sameOuterNewTarget: Object.is(newTarget, outerCtor),
    };
}

directCtor = new Proxy(Target as any, { construct: directTrap as any });
const direct: any = new directCtor("direct");
console.log("direct:", direct.value, direct.targetType, direct.sameNewTarget);

const innerCtor: any = new Proxy(Target as any, { construct: nestedTrap as any });
outerCtor = new Proxy(innerCtor, {});
const nested: any = new outerCtor("nested");
console.log("nested:", nested.value, nested.targetType, nested.sameOuterNewTarget);
