const modules = {
    first: "./keyof_a",
    second: "./keyof_b",
} as const;

function load(name: keyof typeof modules): any {
    return require(modules[name]);
}

const selected = load("second");
console.log("keyof map:", selected.label);
