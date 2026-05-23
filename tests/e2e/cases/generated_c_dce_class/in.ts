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

class DeadStaticBox {
    static label = "dead";
    static count = 3 + 4;

    static read(): number {
        return DeadStaticBox.count;
    }
}

function keepStaticEffect(): number {
    console.log("static effect");
    return 1;
}

class StaticEffectBox {
    static value = keepStaticEffect();
}

console.log(new UsedBox(5).read());
