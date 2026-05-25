let marks = "";

function mark(label: string): string {
    marks += label;
    return label;
}

const event = new Event("save", { cancelable: true }, mark("a"), mark("b"));
console.log("event:", event.type, event.cancelable, event.defaultPrevented);
event.preventDefault();
console.log("prevented:", event.defaultPrevented);
console.log("marks:", marks);
