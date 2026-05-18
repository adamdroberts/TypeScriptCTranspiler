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
    switch (shape.kind) {
        case "circle": {
            const radius: number = shape.radius;
            return "circle:" + (radius * 2);
        }
        case "square": {
            const side: number = shape.side;
            return "square:" + (side * side);
        }
        default: {
            const width: number = shape.width;
            const height: number = shape.height;
            return "rect:" + (width * height);
        }
    }
}

console.log(describe({ kind: "circle", radius: 3 }));
console.log(describe({ kind: "square", side: 4 }));
console.log(describe({ kind: "rect", width: 5, height: 6 }));
