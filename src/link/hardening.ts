import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

// Exploit mitigations applied to every native build. Each entry is admitted
// only when the configured toolchain accepts it without diagnostics, so an
// unsupported mitigation is dropped individually instead of failing the build.
export interface HardeningFlags {
    compile: readonly string[];
    link: readonly string[];
}

interface Mitigation {
    compile: readonly string[];
    link: readonly string[];
}

// Opt-in sanitizer profile (TSC2C_SANITIZE=address,undefined) for test and
// CI builds. Every requested sanitizer is mandatory: the build fails closed
// rather than silently producing an uninstrumented binary.
const SANITIZERS = new Set(["address", "undefined"]);

export function requestedSanitizers(value = process.env.TSC2C_SANITIZE): string[] {
    if (value === undefined || value.trim() === "") return [];
    const requested = [...new Set(value.split(",").map((name) => name.trim()))].sort();
    const unknown = requested.filter((name) => !SANITIZERS.has(name));
    if (unknown.length > 0) {
        throw new Error(`TSC2C_SANITIZE: unsupported sanitizer(s) ${unknown.join(", ")}; expected ${[...SANITIZERS].join(", ")}`);
    }
    return requested;
}

// Opt-in collector stress profile (TSC2C_GC_STRESS=n) for tests: the runtime
// collects before every n-th allocation. A malformed request fails closed.
export function requestedGcStressFlags(value = process.env.TSC2C_GC_STRESS): string[] {
    if (value === undefined || value.trim() === "") return [];
    if (!/^[1-9][0-9]{0,5}$/.test(value.trim())) {
        throw new Error(`TSC2C_GC_STRESS: expected a positive allocation interval below 1000000, got ${JSON.stringify(value)}`);
    }
    return [`-DTSC_GC_STRESS=${value.trim()}`];
}

function sanitizerMitigation(sanitizers: readonly string[]): Mitigation {
    const flag = `-fsanitize=${sanitizers.join(",")}`;
    return {
        compile: [flag, "-fno-sanitize-recover=all", "-fno-omit-frame-pointer", "-g"],
        link: [flag],
    };
}

function candidateMitigations(sanitizers: readonly string[]): Mitigation[] {
    const linux = process.platform === "linux";
    const x86 = process.arch === "x64" || process.arch === "ia32";
    const arm64 = process.arch === "arm64";
    const list: Mitigation[] = [
        { compile: ["-fstack-protector-strong"], link: [] },
        { compile: ["-fstack-clash-protection"], link: [] },
        // Uninitialized automatic storage cannot leak prior stack contents.
        { compile: ["-ftrivial-auto-var-init=zero"], link: [] },
        // Signed overflow and pointer arithmetic remain defined; no
        // optimizer-deleted bounds checks.
        { compile: ["-fwrapv", "-fno-strict-overflow"], link: [] },
        { compile: ["-fno-delete-null-pointer-checks"], link: [] },
        { compile: ["-fPIE"], link: ["-pie"] },
        { compile: ["-Wformat", "-Werror=format-security"], link: [] },
        { compile: ["-Werror=implicit-function-declaration"], link: [] },
    ];
    // Bounds-checked libc string/memory calls where object sizes are known.
    // AddressSanitizer replaces these checks and does not support FORTIFY.
    if (!sanitizers.includes("address")) {
        list.unshift({ compile: ["-U_FORTIFY_SOURCE", "-D_FORTIFY_SOURCE=3"], link: [] });
    }
    if (x86) list.push({ compile: ["-fcf-protection=full"], link: [] });
    if (arm64) list.push({ compile: ["-mbranch-protection=standard"], link: [] });
    if (linux) {
        list.push({ compile: [], link: ["-Wl,-z,relro", "-Wl,-z,now"] });
        list.push({ compile: [], link: ["-Wl,-z,noexecstack"] });
    }
    return list;
}

const cache = new Map<string, Promise<HardeningFlags>>();

export async function hardeningFlags(compiler: string): Promise<HardeningFlags> {
    const sanitizers = requestedSanitizers();
    const stress = requestedGcStressFlags();
    const key = `${compiler}\0${sanitizers.join(",")}`;
    let flags = cache.get(key);
    if (!flags) {
        flags = probeHardening(compiler, sanitizers);
        cache.set(key, flags);
    }
    const probed = await flags;
    return stress.length === 0 ? probed : { compile: [...probed.compile, ...stress], link: probed.link };
}

async function probeHardening(compiler: string, sanitizers: readonly string[]): Promise<HardeningFlags> {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tsc2c-harden-"));
    try {
        const source = path.join(dir, "probe.c");
        fs.writeFileSync(source, "#include <string.h>\nint main(void){char b[8];memset(b,0,sizeof b);return b[0];}\n");
        const output = path.join(dir, "probe");
        const required: Mitigation[] = [];
        if (sanitizers.length > 0) {
            const sanitizer = sanitizerMitigation(sanitizers);
            if (!(await accepts(compiler, source, output, sanitizer))) {
                throw new Error(`TSC2C_SANITIZE: ${compiler} cannot build with ${sanitizer.link.join(" ")}`);
            }
            required.push(sanitizer);
        }
        const candidates = [...required, ...candidateMitigations(sanitizers)];
        const all = merge(candidates);
        if (await accepts(compiler, source, output, all)) return all;
        const admitted: Mitigation[] = [...required];
        for (const candidate of candidates.slice(required.length)) {
            if (await accepts(compiler, source, output, candidate)) admitted.push(candidate);
        }
        return merge(admitted);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

// Flags meaningful only to the C front end; the C++ driver rejects or warns.
const C_ONLY = new Set(["-Werror=implicit-function-declaration"]);

export function cxxCompileFlags(flags: HardeningFlags): string[] {
    return flags.compile.filter((flag) => !C_ONLY.has(flag));
}

function merge(list: readonly Mitigation[]): HardeningFlags {
    return { compile: list.flatMap((m) => m.compile), link: list.flatMap((m) => m.link) };
}

function accepts(compiler: string, source: string, output: string, flags: Mitigation): Promise<boolean> {
    // -Werror rejects flags the driver merely warns about (e.g. unused or
    // unknown-to-target options) so admitted mitigations are actually applied.
    const args = ["-O2", "-Werror", ...flags.compile, source, ...flags.link, "-o", output];
    return new Promise((resolve) => {
        const proc = spawn(compiler, args, { stdio: ["ignore", "ignore", "ignore"] });
        proc.on("error", () => resolve(false));
        proc.on("close", (code) => resolve(code === 0));
    });
}
