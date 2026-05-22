const events: string[] = [];

function Target(this: any, value: any): void {
    this.value = value;
}

function trapConstruct(target: any, args: any, newTarget: any): any {
    events.push("construct:" + String(args[0]) + ":" + String(typeof target) + ":" + String(typeof newTarget));
    return { value: args[0] * 2, marker: "made" };
}

const Ctor: any = new Proxy(Target as any, { construct: trapConstruct as any });
const made: any = Reflect.construct(Ctor, [21]);

console.log("made:", made.value, made.marker);
console.log("events:", events.join("|"));
