/** Injective UTF-16 component encoding into the generated identifier
 * namespace. An underscore always begins a fixed-width code-unit escape,
 * so a source spelling cannot imitate an encoded spelling. The namespace
 * prefix separates user names from C keywords, headers and runtime APIs. */
function identifierComponent(name: string): string {
    let encoded = "";
    for (let index = 0; index < name.length; ++index) {
        const unit = name.charCodeAt(index);
        if ((unit >= 0x41 && unit <= 0x5a) || (unit >= 0x61 && unit <= 0x7a) || (unit >= 0x30 && unit <= 0x39))
            encoded += name[index];
        else encoded += "_" + unit.toString(16).padStart(4, "0") + "_";
    }
    return encoded;
}

/** One component List supplies both ordinary and qualified declarations.
 * Length framing preserves namespace boundaries independently of depth. */
export function mangleQualifiedIdent(parts: readonly string[]): string {
    return "tsc_js" + parts.map(part => "_" + part.length + "_" + identifierComponent(part)).join("");
}

export function mangleIdent(name: string): string {
    return mangleQualifiedIdent([name]);
}
