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

function status(code: number): string {
    let result = "unset";
    switch (code) {
        case 200:
            result = "ok";
            break;
        case 404:
            result = "missing";
            break;
        default:
            result = "other";
            break;
    }
    return result;
}

for (const code of [200, 404, 500]) {
    console.log("status", code, "->", status(code));
}
