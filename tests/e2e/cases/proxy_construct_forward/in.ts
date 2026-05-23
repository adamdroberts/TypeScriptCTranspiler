function Target(this: any, value: any): any {
    this.value = value;
    this.kind = "receiver:" + typeof this;
}

function Override(this: any, value: any): any {
    this.value = "ignored";
    return { value, marker: "override" };
}

const ForwardTarget: any = new Proxy(Target as any, {});
const ForwardOverride: any = new Proxy(Override as any, {});

const made: any = Reflect.construct(ForwardTarget, ["x"]);
const overridden: any = Reflect.construct(ForwardOverride, ["y"]);

console.log("made:", made.value, made.kind, typeof ForwardTarget);
console.log("override:", overridden.value, overridden.marker, typeof ForwardOverride);
