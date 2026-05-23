function Target(this: any, value: any): any {
    this.value = value;
}

function Other(this: any): any {
}

const otherNewTarget: any = new Proxy(Other as any, {});

function trapConstruct(target: any, args: any, newTarget: any): any {
    return {
        value: args[0],
        targetType: typeof target,
        newTargetType: typeof newTarget,
        sameNewTarget: Object.is(newTarget, otherNewTarget),
    };
}

const ctor: any = new Proxy(Target as any, { construct: trapConstruct as any });
const made: any = Reflect.construct(ctor, ["x"], otherNewTarget);

console.log("made:", made.value, made.targetType, made.newTargetType, made.sameNewTarget);
