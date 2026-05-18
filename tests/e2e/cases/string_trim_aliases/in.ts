const text = "  Ada  ";
const dynamicText: any = text;
let seen = "";

function mark(label: string): string {
    seen += label;
    return label;
}

console.log("left:", "[" + text.trimLeft() + "]");
console.log("right:", "[" + text.trimRight() + "]");
console.log("dyn left:", "[" + dynamicText.trimLeft() + "]");
console.log("dyn right:", "[" + dynamicText.trimRight() + "]");
console.log("ignored:", "[" + text.trimLeft(mark("l")) + "]", "[" + text.trimRight(mark("r")) + "]", seen);
