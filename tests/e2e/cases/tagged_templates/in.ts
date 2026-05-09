function format(strings: TemplateStringsArray, name: string, count: number): string {
    console.log(
        "segments:",
        strings.length,
        "[" + strings[0] + "]",
        "[" + strings[1] + "]",
        "[" + strings[2] + "]",
    );
    return strings[0] + name.toUpperCase() + strings[1] + count + strings[2];
}

function plain(strings: TemplateStringsArray): string {
    return strings.join("|");
}

const user = "ada";
const score = 7;

console.log(format`user ${user} score ${score}!`);
console.log(plain`solo`);
