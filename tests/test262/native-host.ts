#!/usr/bin/env bun
import * as fs from "node:fs/promises";
import * as path from "node:path";
import ts from "typescript";
import { compile } from "../../src/compile";
import {
    complianceDir,
    hasArgument,
    readJson,
    recordedEnvironment,
    sha256Text,
} from "./model";
import {
    hostProtocolVersion,
    type HostDescription,
    type HostExecutionContract,
    type HostObservation,
    type HostPreparation,
    type HostRequest,
} from "./protocol";

interface HostProfile {
    id: string;
    semanticDelegation: boolean;
    capabilities: Record<string, boolean>;
    executionContract: HostExecutionContract;
}

interface ParseFailure {
    origin: "test-source" | "module-graph" | "setup-script";
    diagnostics: string;
}

function canonicalRelativePath(value: string, label: string): string {
    const segments = value.split("/");
    if (
        value === "" ||
        value.includes("\\") ||
        value.startsWith("/") ||
        segments.some((segment) => segment === "" || segment === "." || segment === "..")
    ) {
        throw new Error(`${label} must be a normalized relative path`);
    }
    return value;
}

function exactSha256(value: string, label: string): void {
    if (!/^[0-9a-f]{64}$/.test(value)) throw new Error(`${label} has an invalid SHA-256`);
}

function exactSourceHash(source: string | Uint8Array, expected: string, label: string): void {
    exactSha256(expected, label);
    if (sha256Text(source) !== expected) throw new Error(`${label} bytes differ from the request identity`);
}

function safeDestination(root: string, relative: string): string {
    const destination = path.resolve(root, ...relative.split("/"));
    if (!destination.startsWith(`${path.resolve(root)}${path.sep}`)) {
        throw new Error(`source path escapes the isolated host tree: ${relative}`);
    }
    return destination;
}

async function writeExclusive(root: string, relative: string, content: string | Uint8Array): Promise<string> {
    const destination = safeDestination(root, relative);
    await fs.mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
    await fs.writeFile(destination, content, { flag: "wx", mode: 0o600 });
    return destination;
}

function parseFailure(source: string, filename: string, origin: ParseFailure["origin"], goal: "script" | "module"): ParseFailure | null {
    const sourceFile = ts.createSourceFile(filename, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS);
    const diagnostics = (sourceFile as ts.SourceFile & { parseDiagnostics?: readonly ts.DiagnosticWithLocation[] })
        .parseDiagnostics ?? [];
    const goalMismatch = goal === "script" && sourceFile.statements.find((statement) =>
        ts.isImportDeclaration(statement) ||
        ts.isExportDeclaration(statement) ||
        ts.isExportAssignment(statement) ||
        ts.isNamespaceExportDeclaration(statement)
    );
    if (diagnostics.length === 0 && !goalMismatch) return null;
    const formatted = diagnostics.length > 0
        ? diagnostics.map((diagnostic) => {
            const start = diagnostic.start ?? 0;
            const location = sourceFile.getLineAndCharacterOfPosition(start);
            return `${filename}:${location.line + 1}:${location.character + 1}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`;
        }).join("\n")
        : `${filename}:1:1: import/export syntax is not valid under the Script parse goal`;
    return { origin, diagnostics: `${formatted}\n` };
}

function validateRequest(request: HostRequest): void {
    if (
        request.protocolVersion !== hostProtocolVersion ||
        typeof request.scenarioId !== "string" || request.scenarioId === "" ||
        !(request.mode === "sloppy" || request.mode === "strict" || request.mode === "module" || request.mode === "raw") ||
        !(request.goal === "script" || request.goal === "module") ||
        request.goal !== (request.mode === "module" ? "module" : "script") ||
        typeof request.raw !== "boolean" ||
        typeof request.async !== "boolean" ||
        !(request.canBlock === null || typeof request.canBlock === "boolean") ||
        !Number.isSafeInteger(request.timeoutMs) || request.timeoutMs <= 0 ||
        !path.isAbsolute(request.artifactDirectory)
    ) {
        throw new Error("invalid Test262 native-host request identity");
    }
    canonicalRelativePath(request.testPath, "testPath");
    if (request.moduleBasePath !== path.posix.dirname(request.testPath)) {
        throw new Error("moduleBasePath differs from the canonical test directory");
    }
    exactSourceHash(request.testSource, request.testSourceSha256, "test source");
    if (request.raw && request.setupScripts.length !== 0) {
        throw new Error("raw requests must not contain setup scripts");
    }
    const occupied = new Set<string>([request.testPath]);
    for (const script of request.setupScripts) {
        canonicalRelativePath(script.path, "setup script path");
        if (occupied.has(script.path)) throw new Error(`duplicate request source path ${script.path}`);
        occupied.add(script.path);
        exactSourceHash(script.source, script.sha256, `setup script ${script.path}`);
    }
    let previousModulePath = "";
    for (const moduleFile of request.moduleFiles) {
        canonicalRelativePath(moduleFile.path, "module file path");
        if (moduleFile.encoding !== "base64" || occupied.has(moduleFile.path)) {
            throw new Error(`invalid or duplicate module resource ${moduleFile.path}`);
        }
        if (previousModulePath !== "" && previousModulePath.localeCompare(moduleFile.path) >= 0) {
            throw new Error("module resource paths must be unique and sorted");
        }
        previousModulePath = moduleFile.path;
        occupied.add(moduleFile.path);
        const bytes = Buffer.from(moduleFile.data, "base64");
        if (bytes.toString("base64") !== moduleFile.data) {
            throw new Error(`module resource ${moduleFile.path} has non-canonical base64`);
        }
        exactSourceHash(bytes, moduleFile.sha256, `module resource ${moduleFile.path}`);
    }
}

async function requireEmptyArtifactDirectory(directory: string): Promise<void> {
    const stat = await fs.lstat(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
        throw new Error("runner-owned artifact root is not a regular directory");
    }
    if ((await fs.readdir(directory)).length !== 0) {
        throw new Error("runner-owned artifact root is not empty");
    }
}

async function artifactPaths(root: string): Promise<string[]> {
    const result: string[] = [];
    const worklist = [root];
    while (worklist.length > 0) {
        const current = worklist.pop()!;
        const entries = await fs.readdir(current, { withFileTypes: true });
        entries.sort((left, right) => left.name.localeCompare(right.name));
        for (const entry of entries) {
            const absolute = path.join(current, entry.name);
            const stat = await fs.lstat(absolute);
            if (entry.isSymbolicLink() || stat.isSymbolicLink()) {
                throw new Error("native host produced a symbolic-link artifact");
            }
            if (entry.isDirectory() && stat.isDirectory()) {
                worklist.push(absolute);
            } else if (entry.isFile() && stat.isFile()) {
                result.push(path.relative(root, absolute).split(path.sep).join("/"));
            } else {
                throw new Error("native host produced a non-regular artifact");
            }
        }
    }
    return result.sort((left, right) => left.localeCompare(right));
}

async function compilerErrorPreparation(
    request: HostRequest,
    failure: ParseFailure,
): Promise<HostPreparation> {
    const diagnosticsPath = "diagnostics.txt";
    await fs.writeFile(path.join(request.artifactDirectory, diagnosticsPath), failure.diagnostics, { flag: "wx", mode: 0o400 });
    const observation: HostObservation = {
        protocolVersion: hostProtocolVersion,
        scenarioId: request.scenarioId,
        kind: "throw",
        phase: "parse",
        origin: failure.origin,
        errorConstructor: "SyntaxError",
    };
    return {
        protocolVersion: hostProtocolVersion,
        scenarioId: request.scenarioId,
        kind: "compiler-error",
        compileExitCode: 2,
        diagnosticsPath,
        artifactPaths: [diagnosticsPath],
        observation,
    };
}

export async function prepareNativeRequest(request: HostRequest): Promise<HostPreparation> {
    validateRequest(request);
    await requireEmptyArtifactDirectory(request.artifactDirectory);

    for (const script of request.setupScripts) {
        const failure = parseFailure(script.source, script.path, "setup-script", "script");
        if (failure) return compilerErrorPreparation(request, failure);
    }
    const rootFailure = parseFailure(request.testSource, request.testPath, "test-source", request.goal);
    if (rootFailure) return compilerErrorPreparation(request, rootFailure);

    const sourceRoot = await fs.mkdtemp(path.join(path.dirname(request.artifactDirectory), "sources-"));
    try {
        const setupEntries: string[] = [];
        for (const script of request.setupScripts) {
            setupEntries.push(await writeExclusive(sourceRoot, script.path, script.source));
        }
        const testEntry = await writeExclusive(sourceRoot, request.testPath, request.testSource);
        const moduleRoots: string[] = request.goal === "module" ? [testEntry] : [];
        for (const moduleFile of request.moduleFiles) {
            const bytes = Buffer.from(moduleFile.data, "base64");
            const filename = await writeExclusive(sourceRoot, moduleFile.path, bytes);
            if (/\.[cm]?js$/i.test(moduleFile.path)) moduleRoots.push(filename);
        }

        const buildDirectory = path.join(request.artifactDirectory, "build");
        const executable = path.join(request.artifactDirectory, "program");
        let diagnostics = "";
        const result = await compile({
            entry: testEntry,
            output: executable,
            buildDir: buildDirectory,
            additionalRoots: setupEntries,
            initializationEntries: [...setupEntries, testEntry],
            moduleRoots,
            test262Observation: {
                kind: "test262-native-observation",
                scenarioId: request.scenarioId,
                setupEntries,
                testEntry,
                async: request.async,
            },
            diagnosticWriter: (message) => {
                diagnostics += message;
            },
        });
        if (result.exitCode !== 0) {
            const detail = diagnostics.trim() || `tsc2c compilation exited ${result.exitCode}`;
            return {
                protocolVersion: hostProtocolVersion,
                scenarioId: request.scenarioId,
                kind: "diagnostic-observation",
                observation: {
                    protocolVersion: hostProtocolVersion,
                    scenarioId: request.scenarioId,
                    kind: "unsupported",
                    detail: detail.slice(0, 16_384),
                },
            };
        }
        const artifacts = await artifactPaths(request.artifactDirectory);
        const generatedCPath = path.relative(request.artifactDirectory, path.join(buildDirectory, "main.c"))
            .split(path.sep).join("/");
        const executablePath = path.relative(request.artifactDirectory, executable).split(path.sep).join("/");
        return {
            protocolVersion: hostProtocolVersion,
            scenarioId: request.scenarioId,
            kind: "prepared-native",
            compileExitCode: 0,
            generatedCPath,
            executablePath,
            artifactPaths: artifacts,
        };
    } finally {
        await fs.rm(sourceRoot, { recursive: true, force: true });
    }
}

async function profileDescription(): Promise<HostDescription> {
    const profile = await readJson<HostProfile>(path.join(complianceDir, "host-profile.json"));
    return {
        protocolVersion: hostProtocolVersion,
        profileId: profile.id,
        semanticDelegation: profile.semanticDelegation,
        capabilities: profile.capabilities,
        executionContract: profile.executionContract,
        effectiveEnvironmentSha256: sha256Text(JSON.stringify(recordedEnvironment(process.env))),
    };
}

async function main(): Promise<void> {
    if (hasArgument("--describe")) {
        console.log(JSON.stringify(await profileDescription()));
        return;
    }
    const requestIndex = process.argv.indexOf("--request");
    const requestPath = requestIndex < 0 ? undefined : process.argv[requestIndex + 1];
    const input = requestPath ? await fs.readFile(requestPath, "utf8") : await Bun.stdin.text();
    const request = JSON.parse(input) as HostRequest;
    console.log(JSON.stringify(await prepareNativeRequest(request)));
}

if (import.meta.main) {
    main().catch((error) => {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
    });
}
