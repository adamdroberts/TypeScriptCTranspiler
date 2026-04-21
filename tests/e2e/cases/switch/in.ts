function describe(n: number): string {
    switch (n) {
        case 0:
            return "zero";
        case 1:
        case 2:
        case 3:
            return "small";
        case 10:
            return "ten";
        default:
            return "other";
    }
}

for (const n of [0, 1, 3, 10, 42]) {
    console.log(n, "->", describe(n));
}

function color(name: string): string {
    switch (name) {
        case "red":
            return "#ff0000";
        case "green":
            return "#00ff00";
        case "blue":
            return "#0000ff";
        default:
            return "#000000";
    }
}

for (const c of ["red", "green", "purple"]) {
    console.log(c, "->", color(c));
}
