const regexp: RegExp = /a/g;
const exec = regexp.exec;
console.log("stored:", typeof exec, exec.call(regexp, "aba")?.index);
console.log("identity:", regexp instanceof RegExp, Object.getPrototypeOf(regexp) === RegExp.prototype);
const constructor = RegExp;
const created: RegExp = new constructor("b", "g");
console.log("constructor:", created.exec("aba")?.index);
async function use(): Promise<void> {
    const retained: RegExp = /(?<part>a)b/dg;
    await Promise.resolve();
    console.log("retained:", retained.exec("ab")?.groups?.part);
}
use();
