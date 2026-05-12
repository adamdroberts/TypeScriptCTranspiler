class Point {
    x: number;
    y: number;
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
    distanceTo(other: Point): number {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    toLabel(): string {
        return `(${this.x}, ${this.y})`;
    }
}

const a = new Point(0, 0);
const b = new Point(3, 4);
const coords = [5, 12];
const c = new Point(...(coords as [number, number]));
console.log(a.toLabel(), "to", b.toLabel(), "=", a.distanceTo(b));
b.x = b.x + 1;
console.log("after shift:", b.toLabel(), "distance", a.distanceTo(b));
console.log("spread ctor:", c.toLabel(), "distance", a.distanceTo(c));
