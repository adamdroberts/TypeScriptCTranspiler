let trace = "";
let stored = 2;

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

const obj: any = { bump: 1 };

obj.__defineGetter__("score", readScore, mark("g"));
obj.__defineSetter__("score", writeScore, mark("s"));
console.log("define:", trace);
console.log("read:", obj.score, trace);
obj.score = 10;
console.log("write:", stored, trace);

const desc: any = Object.getOwnPropertyDescriptor(obj, "score");
console.log("desc:", desc.enumerable, desc.configurable, typeof desc.get, typeof desc.set);
console.log("lookup:", obj.__lookupGetter__("score", mark("l")) === desc.get, obj.__lookupSetter__("score", mark("L")) === desc.set, trace);

const child: any = Object.create(obj);
child.bump = 5;
console.log("child:", child.__lookupGetter__("score") === desc.get, child.score);
child.score = 20;
console.log("child write:", stored, trace);

const data: any = Object.create(obj);
Object.defineProperty(data, "score", { value: 99 });
console.log("data:", data.__lookupGetter__("score"), data.__lookupSetter__("score"), data.score);
