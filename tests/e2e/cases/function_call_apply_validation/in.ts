function show(this: any, first?: any): string {
    return this.tag + ":" + String(first);
}

function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (err) {
        console.log(label + ":", String(err));
    }
}

const dynamicShow: any = show;

report("bad number", (): any => dynamicShow.apply({ tag: "bad" }, 123));
report("bad string", (): any => dynamicShow.apply({ tag: "bad" }, "xy"));
report("bad boolean", (): any => dynamicShow.apply({ tag: "bad" }, true));
console.log("valid:", dynamicShow.apply({ tag: "ok" }, { 0: "x", length: 1 }));
