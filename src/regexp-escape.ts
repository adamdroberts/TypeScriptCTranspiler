/** Pure evaluation of a proven String input for compiler constant analysis.
 * Runtime calls still use ordinary mutable lookup and the native operation. */
export function escapeRegExpString(input: string): string {
    const parts: string[] = [];
    const controls = new Map([["\t", "t"], ["\n", "n"], ["\v", "v"], ["\f", "f"], ["\r", "r"]]);
    for (const character of input) {
        const unit = character.charCodeAt(0);
        if (parts.length === 0 && /[0-9A-Za-z]/u.test(character)) {
            parts.push("\\x" + unit.toString(16).padStart(2, "0"));
        } else if (character.length === 1 && "^$\\.*+?()[]{}|/".includes(character)) {
            parts.push("\\" + character);
        } else if (controls.has(character)) {
            parts.push("\\" + controls.get(character));
        } else if ((character.length === 1 && ",-=<>#&!%:;@~'`\"".includes(character)) ||
            /\s/u.test(character) || (character.length === 1 && unit >= 0xd800 && unit <= 0xdfff)) {
            parts.push(unit <= 0xff ? "\\x" + unit.toString(16).padStart(2, "0") :
                "\\u" + unit.toString(16).padStart(4, "0"));
        } else parts.push(character);
    }
    return parts.join("");
}
