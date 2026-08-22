import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
    projectRoot,
    resolveExecutableIdentity,
    runProcess,
    sha256File,
    type ExecutableIdentity,
} from "./model";

export const containmentContract = "linux-subreaper-seccomp-v1" as const;

export interface BuiltContainmentIdentity {
    contract: typeof containmentContract;
    compiler: ExecutableIdentity;
    processSupervisor: {
        source: "tests/test262/process-supervisor.c";
        sourceSha256: string;
        executableSha256: string;
        compileArguments: string[];
    };
    nativeExecutionGuard: {
        source: "tests/test262/native-execution-guard.c";
        sourceSha256: string;
        librarySha256: string;
        compileArguments: string[];
    };
}

export interface BuiltContainment {
    identity: BuiltContainmentIdentity;
    supervisorPath: string;
    nativeGuardPath: string;
}

const supervisorSource = "tests/test262/process-supervisor.c" as const;
const guardSource = "tests/test262/native-execution-guard.c" as const;

async function requireRegularBuildArtifact(filename: string, label: string): Promise<void> {
    const stat = await fs.lstat(filename);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size === 0) {
        throw new Error(`${label} is not a non-empty, singly-linked regular file`);
    }
}

export async function buildEvidenceContainment(
    outputDirectory: string,
    compilerCommand: string,
    environment: NodeJS.ProcessEnv,
): Promise<BuiltContainment> {
    if (process.platform !== "linux" || process.arch !== "x64") {
        throw new Error("claim evidence process containment is implemented only for the pinned linux/x64 profile");
    }
    await fs.mkdir(outputDirectory, { recursive: true, mode: 0o700 });
    const rootStat = await fs.lstat(outputDirectory);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
        throw new Error("evidence containment build root is not a regular directory");
    }
    const compiler = await resolveExecutableIdentity(compilerCommand, environment);
    const supervisorPath = path.join(outputDirectory, "process-supervisor");
    const nativeGuardPath = path.join(outputDirectory, "native-execution-guard.so");
    const supervisorArguments = [
        "-O2", "-std=c11", "-Wall", "-Wextra", "-Werror", "-fno-ident", "-Wl,--build-id=none",
        path.join(projectRoot, supervisorSource), "-o", supervisorPath,
    ];
    const guardArguments = [
        "-O2", "-std=c11", "-Wall", "-Wextra", "-Werror", "-fPIC", "-shared", "-fno-ident", "-Wl,--build-id=none",
        path.join(projectRoot, guardSource), "-o", nativeGuardPath,
    ];
    for (const [label, args] of [["process supervisor", supervisorArguments], ["native execution guard", guardArguments]] as const) {
        const result = await runProcess(compiler.realPath, args, {
            cwd: projectRoot,
            env: environment,
            timeoutMs: 120_000,
        });
        if (result.code !== 0) {
            throw new Error(`could not build ${label}: ${result.stderr.trim().slice(0, 2000)}`);
        }
    }
    await Promise.all([
        requireRegularBuildArtifact(supervisorPath, "process supervisor"),
        requireRegularBuildArtifact(nativeGuardPath, "native execution guard"),
    ]);
    await Promise.all([fs.chmod(supervisorPath, 0o500), fs.chmod(nativeGuardPath, 0o400)]);
    return {
        identity: {
            contract: containmentContract,
            compiler,
            processSupervisor: {
                source: supervisorSource,
                sourceSha256: await sha256File(path.join(projectRoot, supervisorSource)),
                executableSha256: await sha256File(supervisorPath),
                compileArguments: supervisorArguments.map((argument) => argument === supervisorPath ? "<OUTPUT>" : argument.replace(`${projectRoot}${path.sep}`, "")),
            },
            nativeExecutionGuard: {
                source: guardSource,
                sourceSha256: await sha256File(path.join(projectRoot, guardSource)),
                librarySha256: await sha256File(nativeGuardPath),
                compileArguments: guardArguments.map((argument) => argument === nativeGuardPath ? "<OUTPUT>" : argument.replace(`${projectRoot}${path.sep}`, "")),
            },
        },
        supervisorPath,
        nativeGuardPath,
    };
}

export function supervisedArguments(
    timeoutMs: number,
    command: string,
    args: readonly string[],
    nativeGuardPath: string | null = null,
): string[] {
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1) throw new Error("supervised timeout must be a positive integer");
    return [
        "--timeout-ms",
        String(timeoutMs),
        ...(nativeGuardPath === null ? [] : ["--native-guard", nativeGuardPath]),
        "--",
        command,
        ...args,
    ];
}
