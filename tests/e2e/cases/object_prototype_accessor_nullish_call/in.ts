function getter(): number {
    return 1;
}

function setter(_value: number): void {
}

let trace = "";

function mark(label: string): string {
    trace += label;
    return label;
}

function getGetter(): any {
    trace += "G";
    return getter;
}

function getSetter(): any {
    trace += "S";
    return setter;
}

function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (err) {
        console.log(label + ":", String(err));
    }
}

report("define getter null", (): any => Object.prototype.__defineGetter__.call(null, mark("g"), getGetter(), mark("i")));
report("define setter undefined", (): any => Object.prototype.__defineSetter__.call(undefined, mark("s"), getSetter(), mark("j")));
report("lookup getter null", (): any => Object.prototype.__lookupGetter__.call(null, mark("l"), mark("m")));
report("lookup setter undefined", (): any => Object.prototype.__lookupSetter__.call(undefined, mark("L"), mark("M")));
console.log("trace:", trace);
