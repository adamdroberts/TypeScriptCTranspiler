function greet(name?: string): string {
    return typeof name === "undefined" ? "hello missing" : "hello " + name;
}

function join(items?: string[]): string {
    return items === undefined ? "none" : items.join("|");
}

function maybeMap(value: string, fn?: (text: string) => string): string {
    if (fn === undefined) {
        return "plain:" + value;
    }
    return fn(value);
}

class Label {
    value: string;

    constructor(value?: string) {
        this.value = value ?? "default";
    }

    render(suffix?: string): string {
        return this.value + (suffix ?? "!");
    }

    static wrap(text?: string): string {
        return "[" + (text ?? "empty") + "]";
    }
}

function upper(text: string): string {
    return text.toUpperCase();
}

console.log("greet:", greet(), greet("Ada"));
console.log("join:", join(), join(["a", "b"]));
console.log("maybe:", maybeMap("x"), maybeMap("x", upper));

const first = new Label();
const second = new Label("custom");
console.log("labels:", first.render(), first.render("?"), second.render(), Label.wrap(), Label.wrap("ok"));
