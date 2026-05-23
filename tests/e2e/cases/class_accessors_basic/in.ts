class Box {
    stored: number = 2;

    get value(): number {
        return this.stored + 1;
    }

    set value(next: number) {
        this.stored = next * 2;
    }

    static total: number = 3;

    static get label(): string {
        return "L" + String(Box.total);
    }

    static set count(next: number) {
        Box.total = next;
    }
}

const box = new Box();
console.log("initial:", box.value);
console.log("assign:", box.value = 4, box.value);
Box.count = 7;
console.log("static:", Box.label);
