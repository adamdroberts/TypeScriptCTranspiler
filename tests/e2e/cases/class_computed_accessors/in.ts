const valueKey = "value";
const staticKey = "label";

class Box {
    stored: number = 2;
    static labelText: string = "A";

    get [valueKey](): number {
        return this.stored + 1;
    }

    set [valueKey](next: number) {
        this.stored = next * 2;
    }

    static get [staticKey](): string {
        return Box.labelText;
    }

    static set [staticKey](next: string) {
        Box.labelText = next;
    }
}

const box = new Box();
console.log("initial:", box.value);
console.log("set:", box.value = 4, box.value);
console.log("compound:", box.value += 1, box.value);
console.log("static:", Box.label);
Box.label += "B";
console.log("static updated:", Box.label);
