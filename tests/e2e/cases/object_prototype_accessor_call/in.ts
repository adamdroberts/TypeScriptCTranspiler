let trace = "";
let stored = 3;

function mark(label: string): string {
    trace += label;
    return label;
}

function readScore(this: any): number {
    trace += "G";
    return stored + this.bump;
}

function writeScore(this: any, value: number): void {
    trace += "S";
    stored = value + this.bump;
}

const obj: any = { bump: 2 };

Object.prototype.__defineGetter__.call(obj, "score", readScore, mark("g"));
Object.prototype.__defineSetter__.call(obj, "score", writeScore, mark("s"));
console.log("define:", trace);
console.log("read:", obj.score, trace);
obj.score = 10;
console.log("write:", stored, trace);

const desc: any = Object.getOwnPropertyDescriptor(obj, "score");
const child: any = Object.create(obj);
child.bump = 5;
console.log(
    "lookup:",
    Object.prototype.__lookupGetter__.call(child, "score", mark("l")) === desc.get,
    Object.prototype.__lookupSetter__.call(child, "score", mark("L")) === desc.set,
    trace,
);

const data: any = Object.create(obj);
Object.defineProperty(data, "score", { value: 99 });
console.log(
    "data:",
    Object.prototype.__lookupGetter__.call(data, "score"),
    Object.prototype.__lookupSetter__.call(data, "score"),
    data.score,
);
