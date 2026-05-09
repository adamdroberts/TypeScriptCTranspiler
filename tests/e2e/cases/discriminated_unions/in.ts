interface Circle {
    kind: "circle";
    radius: number;
}

interface Square {
    kind: "square";
    side: number;
}

type Shape = Circle | Square;

function describe(shape: Shape): string {
    if (shape.kind === "circle") {
        const radius: number = shape.radius;
        return "circle:" + (radius * 2);
    }
    const side: number = shape.side;
    return "square:" + (side * side);
}

const c: Shape = { kind: "circle", radius: 3 };
const s: Shape = { kind: "square", side: 4 };

console.log(describe(c));
console.log(describe(s));
