function greet(name: string): string {
    return "hello, " + name + "!";
}

function square(x: number): number {
    return x * x;
}

const name: string = "typescriptc";
console.log(greet(name));
console.log(`square of 12 is ${square(12)}`);
