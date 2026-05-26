let marks = "";

function mark(label: string): any {
    marks += label;
    return label;
}

function report(label: string, fn: () => Map<any, any>): void {
    try {
        const map = fn();
        console.log(label + ":", map.size, map.get("x"), map.get(NaN), map.get(-0));
    } catch (err: any) {
        console.log(label + ":", err);
    }
}

const nil: any = null;
const undef: any = undefined;
const pairs: any = [["x", 1], ["x", 2], [NaN, "nan"], [-0, "zero"], [0, "zero2"]];
const bad: any = 1;
const badEntry: any = [1];
const shortEntry: any = [["x"]];
const text: any = "ab";

report("null", (): Map<any, any> => new Map<any, any>(nil, mark("a")));
report("undefined", (): Map<any, any> => new Map<any, any>(undef));
report("pairs", (): Map<any, any> => new Map<any, any>(pairs));
const roundTrip: any = Array.from(new Map<any, any>(pairs));
console.log("entries:", roundTrip.length, roundTrip[0][0], roundTrip[0][1], roundTrip[1][0], roundTrip[1][1], roundTrip[2][0], roundTrip[2][1]);
report("bad", (): Map<any, any> => new Map<any, any>(bad, mark("b")));
report("bad entry", (): Map<any, any> => new Map<any, any>(badEntry));
report("short entry", (): Map<any, any> => new Map<any, any>(shortEntry));
report("string entry", (): Map<any, any> => new Map<any, any>(text));
console.log("marks:", marks);
