interface Point {
    x: number;
    y: number;
}

interface Line {
    from: Point;
    to: Point;
    label: string;
}

function length(line: Line): number {
    const dx = line.to.x - line.from.x;
    const dy = line.to.y - line.from.y;
    return Math.sqrt(dx * dx + dy * dy);
}

const p1: Point = { x: 0, y: 0 };
const p2: Point = { x: 3, y: 4 };
const line: Line = { from: p1, to: p2, label: "hypotenuse" };

console.log(line.label, "length:", length(line));
console.log("from:", line.from.x, line.from.y);
console.log("to:", line.to.x, line.to.y);

// Shorthand property assignment
const x = 7;
const y = 24;
const p3: Point = { x, y };
console.log("p3:", p3.x, p3.y);
