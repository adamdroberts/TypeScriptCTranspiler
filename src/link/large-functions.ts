/** GCC's -O2 is superlinear in the size of one function: a generated
 * function of several megabytes (an async function's state machine over
 * thousands of locals, a module body with thousands of declarations) takes
 * minutes to optimize, while the rest of the program compiles in seconds.
 * Such code is one-time setup that gains little from the heavier passes, so
 * a top-level function definition whose C text exceeds `limit` bytes is
 * marked TSC_LARGE_FUNCTION (runtime/tsc_runtime.h: GCC's optimize("O1"),
 * nothing elsewhere). The size is the definition's own text, so the policy
 * is the same for any statement count or nesting. A definition is a column-0
 * line ending in `) {` through the next column-0 `}`. */
export function tierLargeFunctions(c: string, limit = 1 << 20): string {
    const lines = c.split("\n");
    let start = -1, size = 0;
    for (let index = 0; index < lines.length; index++) {
        const line = lines[index]!;
        if (start < 0) {
            if (/^[A-Za-z_][^;#]*\) \{$/.test(line)) { start = index; size = 0; }
            else continue;
        }
        size += line.length + 1;
        if (line === "}") {
            if (size > limit) lines[start] = "TSC_LARGE_FUNCTION " + lines[start];
            start = -1;
        }
    }
    return lines.join("\n");
}
