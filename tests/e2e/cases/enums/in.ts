enum Color {
    Red,
    Green = 4,
    Blue,
}

enum Direction {
    Up = -1,
    Down,
}

function describe(c: Color): string {
    switch (c) {
        case Color.Red:
            return "red";
        case Color.Blue:
            return "blue";
        default:
            return "other";
    }
}

console.log("colors:", Color.Red, Color.Green, Color.Blue);
console.log("directions:", Direction.Up, Direction.Down);
console.log(describe(Color.Blue));
