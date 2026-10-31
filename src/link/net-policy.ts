import { isIP } from "node:net";

// Network allowlist compiled into the binary from --allow-net. Entries are
// `host`, `host:port`, `[ipv6]`, `[ipv6]:port`, or a bare IPv6 address; a
// missing port permits every port. Hosts are LDH DNS names (no wildcards) or
// IP literals (names libc would read as numeric addresses are rejected). Every entry is validated here so the generated C table holds
// only characters from [a-z0-9.:-], which cannot break out of a C literal.
export interface NetRule {
    host: string;
    port: number | null;
}

export interface NetPolicy {
    rules: readonly NetRule[];
}

export class NetPolicyError extends Error {}

const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function parseHost(text: string, entry: string): string {
    if (isIP(text) === 4) {
        if (!text.split(".").every((part) => part === "0" || !part.startsWith("0")))
            throw new NetPolicyError(`--allow-net: IPv4 address with leading zeros in "${entry}"`);
        return text;
    }
    if (isIP(text) === 6) {
        if (text.includes("%")) throw new NetPolicyError(`--allow-net: scoped IPv6 address in "${entry}"`);
        return text.toLowerCase();
    }
    const host = (text.endsWith(".") ? text.slice(0, -1) : text).toLowerCase();
    const labels = host.split(".");
    if (host.length === 0 || host.length > 253 || !labels.every((label) => LABEL.test(label)) || /^[0-9]+$/.test(labels[labels.length - 1]!) ||
        labels.every((label) => /^(?:0x[0-9a-f]*|[0-9]+)$/.test(label)))
        throw new NetPolicyError(`--allow-net: invalid host "${text}" in "${entry}"`);
    return host;
}

function parsePort(text: string, entry: string): number {
    if (!/^[1-9][0-9]{0,4}$/.test(text) || Number(text) > 65535)
        throw new NetPolicyError(`--allow-net: invalid port "${text}" in "${entry}"`);
    return Number(text);
}

export function parseNetEntry(entry: string): NetRule {
    if (entry.startsWith("[")) {
        const close = entry.indexOf("]");
        const rest = close < 0 ? "" : entry.slice(close + 1);
        if (close < 0 || (rest !== "" && !rest.startsWith(":")) || isIP(entry.slice(1, close)) !== 6)
            throw new NetPolicyError(`--allow-net: invalid bracketed IPv6 entry "${entry}"`);
        return { host: parseHost(entry.slice(1, close), entry), port: rest === "" ? null : parsePort(rest.slice(1), entry) };
    }
    if (isIP(entry) === 6) return { host: parseHost(entry, entry), port: null };
    const colon = entry.lastIndexOf(":");
    if (colon < 0) return { host: parseHost(entry, entry), port: null };
    if (entry.indexOf(":") !== colon)
        throw new NetPolicyError(`--allow-net: IPv6 addresses with a port must be bracketed in "${entry}"`);
    return { host: parseHost(entry.slice(0, colon), entry), port: parsePort(entry.slice(colon + 1), entry) };
}

// Each option value is a comma-separated list; the flag may repeat. An empty
// value contributes no rules, so `--allow-net=` denies all networking.
export function parseNetPolicy(values: readonly string[] | undefined): NetPolicy | null {
    if (values === undefined || values.length === 0) return null;
    const rules: NetRule[] = [];
    const seen = new Set<string>();
    for (const value of values) {
        for (const raw of value.split(",")) {
            const entry = raw.trim();
            if (entry === "") continue;
            const rule = parseNetEntry(entry);
            const key = `${rule.host}\u0000${rule.port ?? -1}`;
            if (!seen.has(key)) { seen.add(key); rules.push(rule); }
        }
    }
    return { rules };
}

export function emitNetPolicyC(policy: NetPolicy | null): string {
    const lines = ['#include "tsc_runtime.h"', ""];
    if (!policy) {
        lines.push("const tsc_net_policy_t tsc_net_policy = { false, NULL, 0 };");
        return lines.join("\n") + "\n";
    }
    for (const rule of policy.rules) {
        if (!/^[a-z0-9.:-]+$/.test(rule.host)) throw new NetPolicyError(`--allow-net: unvalidated host "${rule.host}"`);
    }
    if (policy.rules.length > 0) {
        lines.push("static const tsc_net_rule_t tsc_net_rules[] = {");
        for (const rule of policy.rules) lines.push(`    { "${rule.host}", ${rule.port ?? -1} },`);
        lines.push("};");
        lines.push(`const tsc_net_policy_t tsc_net_policy = { true, tsc_net_rules, ${policy.rules.length} };`);
    } else {
        lines.push("const tsc_net_policy_t tsc_net_policy = { true, NULL, 0 };");
    }
    return lines.join("\n") + "\n";
}
