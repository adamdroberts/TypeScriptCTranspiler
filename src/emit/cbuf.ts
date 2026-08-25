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
    for (const byte of encodeWtf8(s)) {
        if (byte === 0x5c /* \ */) out += "\\\\";
        else if (byte === 0x22 /* " */) out += '\\"';
        else if (byte === 0x0a) out += "\\n";
        else if (byte === 0x0d) out += "\\r";
        else if (byte === 0x09) out += "\\t";
        else if (byte === 0x00) out += "\\000";
        else if (byte >= 0x20 && byte < 0x7f) out += String.fromCharCode(byte);
        else out += escapeCByte(byte);
    }
    return out;
}

function escapeCByte(b: number): string {
    return "\\" + b.toString(8).padStart(3, "0");
}

/** Byte length of the runtime's UTF-8/WTF-8 encoding of a JS string. */
export function utf8ByteLen(s: string): number {
    return encodeWtf8(s).length;
}

/**
 * Encode a JavaScript UTF-16 sequence without losing isolated surrogates.
 * Scalar values use canonical UTF-8; unpaired surrogates use their canonical
 * three-byte WTF-8 form so the native runtime can retain the ECMAScript code
 * unit and operations such as Encode can reject it at the specified boundary.
 */
function encodeWtf8(value: string): number[] {
    const bytes: number[] = [];
    for (let index = 0; index < value.length; index++) {
        const first = value.charCodeAt(index);
        let codePoint = first;
        if (first >= 0xd800 && first <= 0xdbff && index + 1 < value.length) {
            const second = value.charCodeAt(index + 1);
            if (second >= 0xdc00 && second <= 0xdfff) {
                codePoint = 0x10000 + ((first - 0xd800) << 10) + (second - 0xdc00);
                index++;
            }
        }
        if (codePoint <= 0x7f) {
            bytes.push(codePoint);
        } else if (codePoint <= 0x7ff) {
            bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
        } else if (codePoint <= 0xffff) {
            bytes.push(
                0xe0 | (codePoint >> 12),
                0x80 | ((codePoint >> 6) & 0x3f),
                0x80 | (codePoint & 0x3f),
            );
        } else {
            bytes.push(
                0xf0 | (codePoint >> 18),
                0x80 | ((codePoint >> 12) & 0x3f),
                0x80 | ((codePoint >> 6) & 0x3f),
                0x80 | (codePoint & 0x3f),
            );
        }
    }
    return bytes;
}
