const text = "  Ada  ";
const dynamicText: any = text;

console.log("left:", "[" + text.trimLeft() + "]");
console.log("right:", "[" + text.trimRight() + "]");
console.log("dyn left:", "[" + dynamicText.trimLeft() + "]");
console.log("dyn right:", "[" + dynamicText.trimRight() + "]");
