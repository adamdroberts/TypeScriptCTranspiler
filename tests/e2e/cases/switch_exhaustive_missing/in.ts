type Mode = "fast" | "slow" | "idle";

function speed(mode: Mode): number {
    switch (mode) {
        case "fast":
            return 3;
        case "slow":
            return 1;
    }
    return 0;
}

console.log(speed("idle"));
