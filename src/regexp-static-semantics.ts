import { spawnSync } from "node:child_process";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import ts from "typescript";
import type { FunctionStaticSemanticsFailure } from "./function-static-semantics";
import { resolvePackageRoot } from "./program";

/** A RegularExpressionLiteral is an early SyntaxError when its flags or its
 * pattern fail to parse (ECMA-262 RegularExpressionLiteral static semantics).
 * The runtime's own parser decides both: the compiler links
 * runtime/tsc_regexp.c with a small stdin/stdout entry point, so compile-time
 * acceptance and runtime RegExp construction share one grammar. */

const VALIDATOR_SOURCES = ["tsc_regexp.c", "tsc_regexp_validate.c"] as const;
const VALIDATOR_LIBS = ["icuuc", "icudata", "m"] as const;
const VALIDATOR_FLAGS = ["-std=c11", "-O2", "-DTSC_NO_GC", "-ffunction-sections", "-fdata-sections"] as const;

/** Raised when the validator cannot be built or run. This is an environment
 * failure, never a verdict about the program, so callers must not report it
 * as a SyntaxError. */
export class RegExpValidatorUnavailableError extends Error {
    override readonly name = "RegExpValidatorUnavailableError";
}

type Verdict = "k" | "f" | "p";
const verdicts = new Map<string, Verdict>();
let validatorPath: string | undefined;

function ccCommand(): string {
    return process.env.TSC2C_CC || "gcc";
}

function cacheRoot(): string {
    const configured = process.env.TSC2C_CACHE_DIR;
    if (configured) return configured;
    const xdg = process.env.XDG_CACHE_HOME;
    return path.join(xdg && path.isAbsolute(xdg) ? xdg : path.join(os.homedir(), ".cache"), "tsc2c");
}

/** The cache key covers every input that can change the binary: the two
 * sources, every runtime header they may include, the compiler identity and
 * the exact flags. A stale or foreign binary therefore never matches. */
function validatorKey(runtimeDir: string, cc: string): string {
    const hash = crypto.createHash("sha256");
    const headers = fs.readdirSync(runtimeDir).filter((name) => /\.(h|def)$/.test(name)).sort();
    for (const name of [...VALIDATOR_SOURCES, ...headers]) {
        hash.update(name).update("\0").update(fs.readFileSync(path.join(runtimeDir, name))).update("\0");
    }
    const version = spawnSync(cc, ["--version"], { encoding: "utf8" });
    if (version.status !== 0) throw new RegExpValidatorUnavailableError(`cannot run C compiler ${JSON.stringify(cc)} to validate RegExp literals`);
    hash.update(cc).update("\0").update(version.stdout).update("\0");
    hash.update([...VALIDATOR_FLAGS, ...VALIDATOR_LIBS].join("\0"));
    return hash.digest("hex").slice(0, 32);
}

/** Path of the cached validator binary, building it on first use. */
export function ensureValidator(): string {
    if (validatorPath && fs.existsSync(validatorPath)) return validatorPath;
    const runtimeDir = path.join(resolvePackageRoot(), "runtime");
    const cc = ccCommand();
    const directory = cacheRoot();
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const target = path.join(directory, `regexp-validator-${validatorKey(runtimeDir, cc)}`);
    if (!fs.existsSync(target)) {
        // Build beside the target and rename, so concurrent compiles never
        // execute a partially written binary.
        const temporary = `${target}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`;
        const build = spawnSync(cc, [
            ...VALIDATOR_FLAGS,
            "-I", runtimeDir,
            ...VALIDATOR_SOURCES.map((name) => path.join(runtimeDir, name)),
            "-Wl,--gc-sections",
            ...VALIDATOR_LIBS.map((lib) => `-l${lib}`),
            "-o", temporary,
        ], { encoding: "utf8" });
        if (build.status !== 0) {
            fs.rmSync(temporary, { force: true });
            throw new RegExpValidatorUnavailableError(`cannot build the RegExp literal validator:\n${build.stderr || build.error?.message || "unknown error"}`);
        }
        fs.renameSync(temporary, target);
    }
    validatorPath = target;
    return target;
}

function encodeUnits(text: string, chunks: Buffer[]): void {
    const header = Buffer.alloc(4);
    header.writeUInt32LE(text.length, 0);
    const body = Buffer.alloc(text.length * 2);
    for (let index = 0; index < text.length; index++) body.writeUInt16LE(text.charCodeAt(index), index * 2);
    chunks.push(header, body);
}

/** Validates every unknown (pattern, flags) pair in one validator run. */
function validate(pairs: readonly { pattern: string; flags: string }[]): void {
    const pending = [...new Map(pairs.map((pair) => [`${pair.flags}\0${pair.pattern}`, pair])).entries()]
        .filter(([key]) => !verdicts.has(key));
    if (!pending.length) return;
    const chunks: Buffer[] = [];
    for (const [, { pattern, flags }] of pending) { encodeUnits(pattern, chunks); encodeUnits(flags, chunks); }
    const run = spawnSync(ensureValidator(), [], { input: Buffer.concat(chunks), maxBuffer: pending.length + 1024 });
    const output = run.stdout ? run.stdout.toString("latin1") : "";
    if (run.status !== 0 || output.length !== pending.length || !/^[kfp]*$/.test(output)) {
        throw new RegExpValidatorUnavailableError(`RegExp literal validator failed (status ${run.status ?? run.signal})`);
    }
    pending.forEach(([key], index) => verdicts.set(key, output[index] as Verdict));
}

function regularExpressionLiterals(sourceFile: ts.SourceFile): ts.RegularExpressionLiteral[] {
    const literals: ts.RegularExpressionLiteral[] = [];
    const pending: ts.Node[] = [sourceFile];
    while (pending.length) {
        const node = pending.pop()!;
        if (ts.isRegularExpressionLiteral(node)) { literals.push(node); continue; }
        const children: ts.Node[] = [];
        ts.forEachChild(node, (child) => { children.push(child); });
        for (let index = children.length - 1; index >= 0; index--) pending.push(children[index]!);
    }
    return literals;
}

function splitLiteral(text: string): { pattern: string; flags: string } {
    const close = text.lastIndexOf("/");
    return { pattern: text.slice(1, close), flags: text.slice(close + 1) };
}

/** The first RegularExpressionLiteral in source order whose flags or pattern
 * the runtime grammar rejects, or null when every literal is valid. */
export function earlyRegExpLiteralFailure(sourceFile: ts.SourceFile): FunctionStaticSemanticsFailure | null {
    const literals = regularExpressionLiterals(sourceFile);
    if (!literals.length) return null;
    const parts = literals.map((literal) => splitLiteral(literal.text));
    validate(parts);
    for (const [index, literal] of literals.entries()) {
        const { pattern, flags } = parts[index]!;
        const verdict = verdicts.get(`${flags}\0${pattern}`);
        if (verdict === "k") continue;
        return {
            node: literal,
            message: `Invalid regular expression: ${literal.text}: ${verdict === "f" ? "invalid flags" : "invalid pattern"}`,
        };
    }
    return null;
}
