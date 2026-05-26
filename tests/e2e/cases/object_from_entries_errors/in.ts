function report(label: string, fn: () => any): void {
    try {
        console.log(label + ":", fn());
    } catch (err: any) {
        console.log(label + ":", err);
    }
}

const nil: any = null;
const num: any = 1;
const badEntry: any = [1];
const shortEntry: any = [["x"]];
const good: any = [["ok", 3]];

report("null", (): any => Object.fromEntries(nil));
report("number", (): any => Object.fromEntries(num));
report("bad entry", (): any => Object.fromEntries(badEntry));
report("short entry", (): any => Object.fromEntries(shortEntry));
const made: any = Object.fromEntries(good);
console.log("good:", made.ok);
