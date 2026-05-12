const echoKey = "echo";
const staticEchoKey = "staticEcho";

class Box {
    label: string;

    constructor(label: string) {
        this.label = label;
    }

    id<T>(x: T): T {
        const y: T = x;
        return y;
    }

    wrap<T>(x: T): T[] {
        return [x];
    }

    describe<T>(x: T): string {
        return this.label + ":" + x;
    }

    [echoKey]<T>(x: T): T {
        return x;
    }

    pick<T>(a: T, b: T): T {
        return b;
    }

    static single<T>(x: T): T[] {
        return [x];
    }

    static pick<T>(a: T, b: T): T {
        return b;
    }

    static [staticEchoKey]<T>(x: T): T {
        return x;
    }
}

class ChildBox extends Box {
    constructor(label: string) {
        super(label);
    }
}

const box = new Box("base");
const child = new ChildBox("child");

const n = box.id<number>(42);
const s = box.id("ok");
const wrapped = box.wrap(7);
wrapped.push(8);

const made = Box.single("z");
const pair = [10, 11];
const words = ["left", "right"];

console.log("n:", n);
console.log("s:", s);
console.log("wrapped:", wrapped.join(","));
console.log("describe:", box.describe(5));
console.log("static:", made.join("|"));
console.log("child:", child.describe(9));
console.log("computed generic:", box.echo<number>(12));
console.log("computed static generic:", Box.staticEcho("ok"));
console.log("spread method:", box.pick<number>(...(pair as [number, number])));
console.log("spread static:", Box.pick<string>(...(words as [string, string])));
