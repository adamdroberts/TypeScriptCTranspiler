function Target(this: any, value: any): any {
    this.value = value;
    this.kind = "target";
}

function constructTrap(target: any, args: any, newTarget: any): any {
    return {
        value: args[0],
        targetType: typeof target,
        newTargetType: typeof newTarget,
        targetIsInner: Object.is(target, Inner),
        newTargetIsOuter: Object.is(newTarget, Outer),
    };
}

const Inner: any = new Proxy(Target as any, {});
const Outer: any = new Proxy(Inner, { construct: constructTrap as any });

const direct: any = new Outer("direct");
console.log("direct:", direct.value, direct.targetType, direct.newTargetType, direct.targetIsInner, direct.newTargetIsOuter);

const holder: any = { Ctor: Outer };
const property: any = new holder.Ctor("property");
console.log("property:", property.value, property.targetType, property.newTargetType, property.targetIsInner, property.newTargetIsOuter);

const parenthesized: any = new (Outer)("parenthesized");
console.log("parenthesized:", parenthesized.value, parenthesized.targetType, parenthesized.newTargetType, parenthesized.targetIsInner, parenthesized.newTargetIsOuter);

const spreadValues: any = ["spread"];
const spread: any = new Outer(...spreadValues);
console.log("spread:", spread.value, spread.targetType, spread.newTargetType, spread.targetIsInner, spread.newTargetIsOuter);

const revocable: any = Proxy.revocable(Target as any, {});
const nestedRevocable: any = new Proxy(revocable.proxy, {});
console.log("revoked type before:", typeof nestedRevocable);
const before: any = new nestedRevocable("before");
console.log("revoked before:", before.value, before.kind);
revocable.revoke();
console.log("revoked type after:", typeof nestedRevocable);
try {
    console.log("revoked after:", new nestedRevocable("after"));
} catch (e: any) {
    console.log("revoked after:", e);
}
