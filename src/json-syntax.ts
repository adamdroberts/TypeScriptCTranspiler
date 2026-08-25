export interface JsonSyntaxFailure {
    readonly offset: number;
    readonly message: string;
}

type RootFrame = { kind: "root"; state: "value" | "done" };
type ArrayFrame = { kind: "array"; state: "value-or-end" | "value" | "comma-or-end" };
type ObjectFrame = { kind: "object"; state: "key-or-end" | "key" | "colon" | "value" | "comma-or-end" };
type JsonFrame = RootFrame | ArrayFrame | ObjectFrame;

function isJsonWhitespace(code: number): boolean {
    return code === 0x09 || code === 0x0a || code === 0x0d || code === 0x20;
}

function isDecimalDigit(code: number): boolean {
    return code >= 0x30 && code <= 0x39;
}

function isNonZeroDecimalDigit(code: number): boolean {
    return code >= 0x31 && code <= 0x39;
}

function isHexDigit(code: number): boolean {
    return isDecimalDigit(code) ||
        (code >= 0x41 && code <= 0x46) ||
        (code >= 0x61 && code <= 0x66);
}

/** Validate the JSON lexical grammar and recursive productions with one
 * explicit frame worklist. Container nesting never consumes the host call
 * stack, and every value reaches the same primitive/container transition. */
export function validateJsonSyntax(source: string): JsonSyntaxFailure | null {
    let offset = 0;
    const frames: JsonFrame[] = [{ kind: "root", state: "value" }];
    const failure = (message: string, at = offset): JsonSyntaxFailure => ({
        offset: Math.max(0, Math.min(at, source.length)),
        message,
    });
    const skipWhitespace = (): void => {
        while (offset < source.length && isJsonWhitespace(source.charCodeAt(offset))) offset++;
    };
    const completeValue = (frame: JsonFrame): void => {
        if (frame.kind === "root") frame.state = "done";
        else frame.state = "comma-or-end";
    };
    const scanString = (): JsonSyntaxFailure | null => {
        const start = offset++;
        while (offset < source.length) {
            const code = source.charCodeAt(offset++);
            if (code === 0x22) return null;
            if (code < 0x20) return failure("unescaped control character in JSON string", offset - 1);
            if (code !== 0x5c) continue;
            if (offset >= source.length) return failure("unterminated JSON string escape", offset);
            const escape = source.charCodeAt(offset++);
            if (
                escape === 0x22 || escape === 0x2f || escape === 0x5c ||
                escape === 0x62 || escape === 0x66 || escape === 0x6e ||
                escape === 0x72 || escape === 0x74
            ) {
                continue;
            }
            if (escape !== 0x75) return failure("invalid JSON string escape", offset - 1);
            for (let digit = 0; digit < 4; digit++) {
                if (offset >= source.length || !isHexDigit(source.charCodeAt(offset))) {
                    return failure("invalid JSON Unicode escape", offset);
                }
                offset++;
            }
        }
        return failure("unterminated JSON string", start);
    };
    const scanNumber = (): JsonSyntaxFailure | null => {
        const start = offset;
        if (source.charCodeAt(offset) === 0x2d) offset++;
        if (offset >= source.length) return failure("incomplete JSON number", start);
        const integerStart = source.charCodeAt(offset);
        if (integerStart === 0x30) {
            offset++;
            if (offset < source.length && isDecimalDigit(source.charCodeAt(offset))) {
                return failure("leading zero in JSON number", offset);
            }
        } else if (isNonZeroDecimalDigit(integerStart)) {
            do offset++; while (offset < source.length && isDecimalDigit(source.charCodeAt(offset)));
        } else {
            return failure("invalid JSON number integer part", offset);
        }
        if (source.charCodeAt(offset) === 0x2e) {
            offset++;
            const fractionStart = offset;
            while (offset < source.length && isDecimalDigit(source.charCodeAt(offset))) offset++;
            if (offset === fractionStart) return failure("JSON number fraction requires a digit", offset);
        }
        const exponent = source.charCodeAt(offset);
        if (exponent === 0x45 || exponent === 0x65) {
            offset++;
            const sign = source.charCodeAt(offset);
            if (sign === 0x2b || sign === 0x2d) offset++;
            const exponentStart = offset;
            while (offset < source.length && isDecimalDigit(source.charCodeAt(offset))) offset++;
            if (offset === exponentStart) return failure("JSON number exponent requires a digit", offset);
        }
        return null;
    };
    const consumeValue = (frame: JsonFrame): JsonSyntaxFailure | null => {
        if (offset >= source.length) return failure("expected JSON value");
        const code = source.charCodeAt(offset);
        if (code === 0x7b || code === 0x5b) {
            completeValue(frame);
            offset++;
            frames.push(code === 0x7b
                ? { kind: "object", state: "key-or-end" }
                : { kind: "array", state: "value-or-end" });
            return null;
        }
        if (code === 0x22) {
            const stringFailure = scanString();
            if (stringFailure) return stringFailure;
        } else if (code === 0x2d || isDecimalDigit(code)) {
            const numberFailure = scanNumber();
            if (numberFailure) return numberFailure;
        } else if (source.startsWith("true", offset)) {
            offset += 4;
        } else if (source.startsWith("false", offset)) {
            offset += 5;
        } else if (source.startsWith("null", offset)) {
            offset += 4;
        } else {
            return failure("expected JSON value");
        }
        completeValue(frame);
        return null;
    };

    while (frames.length > 0) {
        skipWhitespace();
        const frame = frames[frames.length - 1]!;
        if (frame.kind === "root") {
            if (frame.state === "done") {
                return offset === source.length ? null : failure("trailing input after JSON value");
            }
            const valueFailure = consumeValue(frame);
            if (valueFailure) return valueFailure;
            continue;
        }
        if (frame.kind === "array") {
            if (frame.state === "value-or-end" && source.charCodeAt(offset) === 0x5d) {
                offset++;
                frames.pop();
                continue;
            }
            if (frame.state === "value-or-end" || frame.state === "value") {
                const valueFailure = consumeValue(frame);
                if (valueFailure) return valueFailure;
                continue;
            }
            if (source.charCodeAt(offset) === 0x2c) {
                offset++;
                frame.state = "value";
                continue;
            }
            if (source.charCodeAt(offset) === 0x5d) {
                offset++;
                frames.pop();
                continue;
            }
            return failure(offset >= source.length ? "unterminated JSON array" : "expected ',' or ']' in JSON array");
        }

        if (frame.state === "key-or-end" && source.charCodeAt(offset) === 0x7d) {
            offset++;
            frames.pop();
            continue;
        }
        if (frame.state === "key-or-end" || frame.state === "key") {
            if (source.charCodeAt(offset) !== 0x22) {
                return failure(offset >= source.length ? "unterminated JSON object" : "expected JSON object property string");
            }
            const stringFailure = scanString();
            if (stringFailure) return stringFailure;
            frame.state = "colon";
            continue;
        }
        if (frame.state === "colon") {
            if (source.charCodeAt(offset) !== 0x3a) return failure("expected ':' after JSON object property");
            offset++;
            frame.state = "value";
            continue;
        }
        if (frame.state === "value") {
            const valueFailure = consumeValue(frame);
            if (valueFailure) return valueFailure;
            continue;
        }
        if (source.charCodeAt(offset) === 0x2c) {
            offset++;
            frame.state = "key";
            continue;
        }
        if (source.charCodeAt(offset) === 0x7d) {
            offset++;
            frames.pop();
            continue;
        }
        return failure(offset >= source.length ? "unterminated JSON object" : "expected ',' or '}' in JSON object");
    }
    return failure("incomplete JSON source");
}

export function jsonSyntaxLineAndColumn(
    source: string,
    failure: JsonSyntaxFailure,
): { line: number; column: number } {
    let line = 0;
    let lineStart = 0;
    for (let offset = 0; offset < failure.offset; offset++) {
        const code = source.charCodeAt(offset);
        if (code === 0x0d) {
            if (source.charCodeAt(offset + 1) === 0x0a && offset + 1 < failure.offset) offset++;
            line++;
            lineStart = offset + 1;
        } else if (code === 0x0a || code === 0x2028 || code === 0x2029) {
            line++;
            lineStart = offset + 1;
        }
    }
    return { line, column: failure.offset - lineStart };
}
