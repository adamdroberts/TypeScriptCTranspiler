console.log("none:", Number());
console.log("number:", Number(4.5));
console.log("bools:", Number(true), Number(false));
console.log("strings:", Number("42.5"), Number(""), Number("12x"));
console.log("nullish:", Number(null), Number(undefined));

const dynamicString: any = JSON.parse("\"5.25\"");
console.log("dynamic:", Number(dynamicString));

let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}
console.log("ignored:", Number(8, mark("n")), Number(dynamicString, mark("d")), seen);
