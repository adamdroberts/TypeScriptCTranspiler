/** C source buffer with indent tracking. */
export class CBuf {
    private parts: string[] = [];
    public indent = 0;

    write(s: string): void {
        this.parts.push(s);
    }

    /** Write a line at the current indent. Empty string = blank line. */
    line(s = ""): void {
        if (s.length === 0) {
            this.parts.push("\n");
        } else {
            this.parts.push("    ".repeat(this.indent) + s + "\n");
        }
    }

    /** Write a line without indentation, for preprocessor directives. */
    lineRaw(s = ""): void {
        this.parts.push(s + "\n");
    }

    /** Emit `header {` and increase indent. */
    open(header: string): void {
        this.line(header + " {");
        this.indent++;
    }

    /** Decrease indent and emit `}` + optional suffix. */
    close(suffix = ""): void {
        this.indent--;
        this.line("}" + suffix);
    }

    toString(): string {
        return this.parts.join("");
    }
}

/** Escape a JS string for a C string literal (inside double quotes). */
export function escapeCString(s: string): string {
    let out = "";
    for (const ch of s) {
        const c = ch.codePointAt(0)!;
        if (c === 0x5c /* \ */) out += "\\\\";
        else if (c === 0x22 /* " */) out += '\\"';
        else if (c === 0x0a) out += "\\n";
        else if (c === 0x0d) out += "\\r";
        else if (c === 0x09) out += "\\t";
        else if (c === 0x00) out += "\\000";
        else if (c >= 0x20 && c < 0x7f) out += ch;
        else if (c < 0x80) out += escapeCByte(c);
        else {
            // Encode UTF-8 bytes as fixed-width octal escapes. C hex escapes
            // are greedy, so \xHH followed by a hex digit would be ambiguous.
            const utf8 = new TextEncoder().encode(ch);
            for (const b of utf8) out += escapeCByte(b);
        }
    }
    return out;
}

function escapeCByte(b: number): string {
    return "\\" + b.toString(8).padStart(3, "0");
}

/** Byte length of the UTF-8 encoding of a JS string. */
export function utf8ByteLen(s: string): number {
    return new TextEncoder().encode(s).length;
}
