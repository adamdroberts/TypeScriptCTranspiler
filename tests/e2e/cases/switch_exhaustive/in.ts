type Mode = "fast" | "slow" | "idle";

function speed(mode: Mode): number {
    switch (mode) {
        case "fast":
            return 3;
        case "slow":
            return 1;
        case "idle":
            return 0;
    }
}

function label(flag: boolean): string {
    switch (flag) {
        case true:
            return "yes";
        case false:
            return "no";
    }
}

console.log("speed:", speed("fast"), speed("idle"));
console.log("bool:", label(true), label(false));
