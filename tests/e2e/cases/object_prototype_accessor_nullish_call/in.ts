function getter(): number {
    return 1;
}

function setter(_value: number): void {
}

function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (err) {
        console.log(label + ":", String(err));
    }
}

report("define getter null", (): any => Object.prototype.__defineGetter__.call(null, "x", getter));
report("define setter undefined", (): any => Object.prototype.__defineSetter__.call(undefined, "x", setter));
report("lookup getter null", (): any => Object.prototype.__lookupGetter__.call(null, "x"));
report("lookup setter undefined", (): any => Object.prototype.__lookupSetter__.call(undefined, "x"));
