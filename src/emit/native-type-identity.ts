import ts from "typescript";
import * as path from "node:path";
import { unsupported } from "../diagnostics";
import { mangleQualifiedIdent } from "./mangle";

export type NativeTypeDeclaration = ts.ClassLikeDeclaration | ts.InterfaceDeclaration;

/** A physical owner is a source declaration, independently of its public
 * binding spelling or namespace depth. The shared component encoder retains
 * the exact source-file identity and UTF-16 declaration offset. */
export function nativeTypeName(declaration: NativeTypeDeclaration): string {
    const original = ts.getOriginalNode(declaration);
    const source = original.getSourceFile();
    if (!source || original.pos < 0) unsupported(declaration, "native type owner requires a source declaration");
    return mangleQualifiedIdent(["native-type", path.resolve(source.fileName),
        ts.isInterfaceDeclaration(original) ? "interface" : "class", String(original.getStart(source))]);
}
