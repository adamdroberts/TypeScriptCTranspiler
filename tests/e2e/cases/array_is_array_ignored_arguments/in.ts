const events: string[] = [];

function mark(label: string): string {
    events.push(label);
    return label;
}

const typed = [1, 2];
const text = "not-array";
const dynamicArray: any = JSON.parse("[1,2]");
const dynamicObject: any = JSON.parse("{\"length\":2}");

console.log("typed:", Array.isArray(typed, mark("typed")));
console.log("string:", Array.isArray(text, mark("string")));
console.log("dynamic:", Array.isArray(dynamicArray, mark("dynamic-array")), Array.isArray(dynamicObject, mark("dynamic-object")));
console.log("events:", events.join("|"));
