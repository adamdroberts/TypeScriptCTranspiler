const modules = {
    first: "./unknown_a",
    second: "./unknown_b",
} as const;

const key: string = Date.now() >= 0 ? "first" : "missing";
require((modules as Record<string, string>)[key]);
