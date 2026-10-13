let count = 0;
function body(value: number): string {
    try {
        value / 2;
        return "17;";
    } catch (_error) {
        return String(Math.random()) + ";";
    }
}
console.log("source:", eval(body(count++)));
console.log("kind:", typeof count);
