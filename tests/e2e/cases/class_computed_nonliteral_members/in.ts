const labelKey = ("la" + "bel") as "label";
const describeKey = (`de${"scribe"}`) as "describe";
const prefixKey = ("pre" + "fix") as "prefix";
const makeKey = (`ma${"ke"}`) as "make";
const valueKey = ("val" + "ue") as "value";

class Box {
    [labelKey]: string = "empty";
    stored: number = 2;
    static [prefixKey]: string = "B";

    constructor(label: string) {
        this.label = label;
    }

    [describeKey](): string {
        return Box.prefix + ":" + this.label + ":" + String(this.value);
    }

    static [makeKey](label: string): Box {
        return new Box(label);
    }

    get [valueKey](): number {
        return this.stored + 1;
    }

    set [valueKey](next: number) {
        this.stored = next * 2;
    }
}

const box = Box.make("one");
console.log("box:", box.describe());
Box.prefix = "C";
box.label = "two";
console.log("set:", box.value = 4, box.value);
console.log("box updated:", box.describe(), Box.prefix);
