import type ts from 'typescript';

export type SourceUnitFormat = 'ecmascript' | 'commonjs';
/** The program owns format selection; link and emit consume that same fact. */
export const sourceUnitFormats = new WeakMap<ts.SourceFile,SourceUnitFormat>();
export function sourceUnitFormat(source:ts.SourceFile):SourceUnitFormat|undefined {
    return sourceUnitFormats.get(source);
}
