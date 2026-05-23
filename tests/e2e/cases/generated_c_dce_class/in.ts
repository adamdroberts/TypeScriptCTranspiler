class UsedBox {
    value: number;

    constructor(value: number) {
        this.value = value;
    }

    read(): number {
        return this.value + 2;
    }
}

class DeadBox {
    value: number;

    constructor(value: number) {
        this.value = value * 99;
    }

    read(): number {
        return this.value;
    }
}

console.log(new UsedBox(5).read());
