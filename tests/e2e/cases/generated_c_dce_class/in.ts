class UsedBox {
    value: number;

    constructor(value: number) {
        this.value = value;
    }

    read(): number {
        class DeadLocalBox {
            value: number;

            constructor(value: number) {
                this.value = value;
            }

            read(): number {
                return this.value;
            }
        }

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

class DeadBase {
    value: number;

    constructor(value: number) {
        this.value = value;
    }

    read(): number {
        return this.value;
    }
}

class DeadDerived extends DeadBase {
    extra(): number {
        return this.read() + 1;
    }
}

const dead_method_name = "read";

class DeadComputedBox {
    [dead_method_name](): number {
        return 1;
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

namespace DeadClassNamespace {
    class DeadNamespaceBox {
        value: number;

        constructor(value: number) {
            this.value = value;
        }

        read(): number {
            return this.value;
        }
    }
}

console.log(new UsedBox(5).read());
