const labelKey = "label";
const describeKey = "describe";
const prefixKey = "prefix";
const makeKey = "make";

class Box {
    [labelKey]: string = "empty";
    static [prefixKey]: string = "B";

    constructor(label: string) {
        this.label = label;
    }

    [describeKey](): string {
        return Box.prefix + ":" + this.label;
    }

    static [makeKey](label: string): Box {
        return new Box(label);
    }
}

class Quoted {
    "name": string = "quoted";

    "say"(): string {
        return this.name;
    }
}

const box = Box.make("one");
console.log("box:", box.describe());
Box.prefix = "C";
box.label = "two";
console.log("box updated:", box.describe(), Box.prefix);

const q = new Quoted();
console.log("quoted:", q.say(), q.name);
