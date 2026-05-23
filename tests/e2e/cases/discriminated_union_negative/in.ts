interface Circle {
    kind: "circle";
    radius: number;
}

interface Square {
    kind: "square";
    side: number;
}

interface Rectangle {
    kind: "rect";
    width: number;
    height: number;
}

type Shape = Circle | Square | Rectangle;

function describe(shape: Shape): string {
    if (shape.kind !== "circle") {
        if (shape.kind !== "square") {
            const area: number = shape.width * shape.height;
            return "rect:" + area;
        }
        const side: number = shape.side;
        return "square:" + side;
    }
    const radius: number = shape.radius;
    return "circle:" + radius;
}

console.log(describe({ kind: "circle", radius: 3 }));
console.log(describe({ kind: "square", side: 4 }));
console.log(describe({ kind: "rect", width: 5, height: 6 }));
