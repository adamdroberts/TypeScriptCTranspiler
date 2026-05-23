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
    if (shape.kind === "circle" || shape.kind === "square") {
        if (shape.kind === "circle") {
            const radius: number = shape.radius;
            return "round:" + radius;
        }
        const side: number = shape.side;
        return "box:" + side;
    }
    const area: number = shape.width * shape.height;
    return "rect:" + area;
}

function rejectRound(shape: Shape): string {
    if (shape.kind !== "circle" && shape.kind !== "square") {
        const area: number = shape.width * shape.height;
        return "rect-only:" + area;
    }
    if (shape.kind === "circle") {
        const radius: number = shape.radius;
        return "circle-only:" + radius;
    }
    const side: number = shape.side;
    return "square-only:" + side;
}

console.log(describe({ kind: "circle", radius: 3 }));
console.log(describe({ kind: "square", side: 4 }));
console.log(describe({ kind: "rect", width: 5, height: 6 }));
console.log(rejectRound({ kind: "circle", radius: 7 }));
console.log(rejectRound({ kind: "square", side: 8 }));
console.log(rejectRound({ kind: "rect", width: 2, height: 9 }));
