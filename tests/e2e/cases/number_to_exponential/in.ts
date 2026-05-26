console.log("explicit:", (1234).toExponential(2));
console.log("zero:", (0).toExponential(3));
console.log("omitted:", (1234).toExponential());
console.log("rounded:", (12.5).toExponential(1));

const dynamicNumber: any = 12.5;
let ignored = "";
function mark(label: string): string {
    ignored += label;
    return label;
}
console.log("typed undefined:", (1234).toExponential(undefined, mark("u")));
console.log("dynamic:", dynamicNumber.toExponential(1, mark("e")));
console.log("dynamic omitted:", dynamicNumber.toExponential());
console.log("ignored:", ignored);
