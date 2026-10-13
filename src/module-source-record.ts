import ts from 'typescript';
import {ecmaParseGoal} from './ecmascript-source';
import {earlyControlFlowStaticSemanticsFailure} from './control-static-semantics';
import {earlyFunctionStaticSemanticsFailure} from './function-static-semantics';
import {earlyPrivateStaticSemanticsFailure} from './emit/private-names';
import {earlyModuleStaticSemanticsFailure} from './module-static-semantics';
import {validateJsonSyntax} from './json-syntax';

export interface ModuleSourceFailure {
    readonly node:ts.Node;
    readonly message:string;
    readonly source:ts.SourceFile;
}
const originals=new WeakMap<ts.SourceFile,ts.SourceFile>();
export function moduleSourceOriginal(source:ts.SourceFile):ts.SourceFile{return originals.get(source)??source;}
export function inertModuleSource(source:ts.SourceFile):ts.SourceFile {
    if(originals.has(source))return source;
    const inert=ts.createSourceFile(source.fileName,'',source.languageVersion,true,ts.ScriptKind.JS);
    (inert as ts.SourceFile&{ecmaParseGoal?:'module';externalModuleIndicator?:ts.Node}).ecmaParseGoal='module';
    (inert as ts.SourceFile&{externalModuleIndicator?:ts.Node}).externalModuleIndicator=inert;
    originals.set(inert,source);return inert;
}
const failures=new WeakMap<ts.SourceFile,ModuleSourceFailure>();
export function sourceModuleFailure(source:ts.SourceFile):ModuleSourceFailure|undefined{return failures.get(source);}

/** Preserve a failed parse record without binding or lowering its invalid tree.
 * The archived source and diagnostic retain their exact original identity. */
export function retainModuleParseFailure(source:ts.SourceFile):ts.SourceFile {
    const json=!!(source.flags&ts.NodeFlags.JsonFile);
    if(!json&&ecmaParseGoal(source)!=='module')return source;
    const syntax=json?validateJsonSyntax(source.text):null;
    const diagnostics=(source as ts.SourceFile&{parseDiagnostics?:readonly ts.DiagnosticWithLocation[]}).parseDiagnostics??[];
    const semantic=!json&&!diagnostics.length
        ? earlyControlFlowStaticSemanticsFailure(source)??earlyFunctionStaticSemanticsFailure(source)??
            earlyPrivateStaticSemanticsFailure(source)??earlyModuleStaticSemanticsFailure(source):null;
    const message=syntax?.message??(diagnostics[0]?ts.flattenDiagnosticMessageText(diagnostics[0].messageText,'\n'):semantic?.message);
    if(!message)return source;
    const inert=inertModuleSource(source);
    failures.set(inert,{node:semantic?.node??source,message,source});
    return inert;
}
