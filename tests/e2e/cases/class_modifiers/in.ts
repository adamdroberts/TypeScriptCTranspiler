abstract class Shape {
    protected readonly label: string;

    constructor(label: string) {
        this.label = label;
    }

    abstract area(): number;

    public describe(): string {
        return this.label;
    }
}

class Square extends Shape {
    private readonly side: number;

    constructor(label: string, side: number) {
        super(label);
        this.side = side;
    }

    public area(): number {
        return this.side * this.side;
    }

    public labelText(): string {
        return this.label;
    }
}

const s = new Square("box", 4);
console.log(s.describe());
console.log("area:", s.area());
console.log("label:", s.labelText());
