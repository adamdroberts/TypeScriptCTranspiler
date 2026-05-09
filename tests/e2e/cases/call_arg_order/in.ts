let n = 0;

function bump(label: string): number {
    n = n + 1;
    console.log(label + ":" + n);
    return n;
}

function code(label: string, value: number): number {
    console.log(label);
    return value;
}

function take(a: number, b: number, c: number): void {
    console.log("take:", a, b, c);
}

class Acc {
    sum(a: number, b: number): number {
        console.log("sum:", a, b);
        return a + b;
    }
}

take(bump("a"), bump("b"), bump("c"));

const acc = new Acc();
console.log("method:", acc.sum(bump("d"), bump("e")));
console.log("console:", bump("f"), bump("g"));
console.log("chars:", String.fromCharCode(code("h", 65), code("i", 66)));
