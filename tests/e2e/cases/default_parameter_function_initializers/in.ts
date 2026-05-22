function apply(fn: (x: number) => number = (x: number) => x + 1): number {
    return fn(4);
}

function label(make: () => string = function (): string {
    return "made";
}): string {
    return make();
}

const suffix = "!";

function greet(make: (name: string) => string = (name: string) => "hi " + name + suffix): string {
    return make("Ada");
}

console.log("arrow:", apply(), apply((x: number) => x * 3));
console.log("function:", label(), label(() => "custom"));
console.log("capture:", greet());
