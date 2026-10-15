import {sourceUnitFormat} from './source-unit-format';
import ts from 'typescript';
import {ecmaParseGoal} from './ecmascript-source';
import {earlyControlFlowStaticSemanticsFailure} from './control-static-semantics';
import {earlyFunctionStaticSemanticsFailure} from './function-static-semantics';
import {earlyPrivateStaticSemanticsFailure} from './emit/private-names';
import {earlyModuleStaticSemanticsFailure,moduleVarDeclaredNames} from './module-static-semantics';
import {validateJsonSyntax} from './json-syntax';
import {moduleNamespaceBinding,type ModuleExportRecord} from './module-export-resolution';
import {moduleRequestFromDeclaration,moduleRequestKey,type ModuleRequest} from './module-request';
import {isAmbientSourceDeclaration} from './source-bindings';

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

export interface ModuleBindingEntry {
    readonly moduleRequest:ModuleRequest;
    readonly importName:string|typeof moduleNamespaceBinding;
}
export interface ModuleLinkRecord extends ModuleExportRecord<ModuleRequest> {
    readonly requestedModules:ModuleRequest[];
    readonly imports:ModuleBindingEntry[];
    readonly localExports:Map<string,string>;
    readonly indirectExports:Map<string,ModuleBindingEntry>;
    readonly starExports:ModuleRequest[];
    readonly bindings:Map<string,ts.Node>;
    readonly namespaceDeclarations:Map<string,ts.NamespaceImport|ts.NamespaceExport>;
}
const linkRecords=new WeakMap<ts.SourceFile,Map<string,ModuleLinkRecord>>();
/** One source entry collection serves preflight, link validation and emission.
 * Imported local re-exports retain their original binding identity. */
export function moduleLinkRecord(source:ts.SourceFile,path:string):ModuleLinkRecord {
    source=moduleSourceOriginal(source);
    let paths=linkRecords.get(source);if(!paths){paths=new Map();linkRecords.set(source,paths);}
    const prior=paths.get(path);if(prior)return prior;
    const record:ModuleLinkRecord={path,hostPropertyExports:sourceUnitFormat(source)==='commonjs',requestedModules:[],imports:[],localExports:new Map(),indirectExports:new Map(),starExports:[],bindings:new Map(),namespaceDeclarations:new Map()};paths.set(path,record);
    if(/\.json$/i.test(source.fileName)){record.localExports.set('default','*default*');record.bindings.set('*default*',source);return record;}
    const requests=new Map<string,ModuleRequest>(),declarations=new Map<ts.ImportDeclaration|ts.ExportDeclaration,ModuleRequest>(),imports=new Map<string,ModuleBindingEntry>();
    const modifier=(node:ts.Node,kind:ts.SyntaxKind)=>!!(ts.canHaveModifiers(node)?ts.getModifiers(node):undefined)?.some(modifier=>modifier.kind===kind);
    for(const statement of source.statements){
        if(isAmbientSourceDeclaration(statement)||!ts.isImportDeclaration(statement)&&!ts.isExportDeclaration(statement))continue;
        if(ts.isImportDeclaration(statement)?statement.importClause?.isTypeOnly:statement.isTypeOnly)continue;
        const parsed=moduleRequestFromDeclaration(statement as ts.ImportDeclaration|ts.ExportDeclaration);
        if(!parsed?.request)continue;
        const key=moduleRequestKey(parsed.request),request=requests.get(key)??parsed.request;requests.set(key,request);declarations.set(statement as ts.ImportDeclaration|ts.ExportDeclaration,request);
        if(!ts.isImportDeclaration(statement)||!statement.importClause)continue;
        const clause=statement.importClause,add=(name:string,importName:ModuleBindingEntry['importName'])=>{const entry:ModuleBindingEntry={moduleRequest:request,importName};imports.set(name,entry);record.imports.push(entry);};
        if(clause.name)add(clause.name.text,'default');
        if(clause.namedBindings&&ts.isNamespaceImport(clause.namedBindings)){add(clause.namedBindings.name.text,moduleNamespaceBinding);record.namespaceDeclarations.set(key,clause.namedBindings);}
        else if(clause.namedBindings)for(const element of clause.namedBindings.elements)if(!element.isTypeOnly)add(element.name.text,(element.propertyName??element.name).text);
    }
    record.requestedModules.push(...requests.values());
    const exportLocal=(exportName:string,localName:string)=>{const imported=imports.get(localName);if(imported)record.indirectExports.set(exportName,imported);else record.localExports.set(exportName,localName);};
    for(const statement of source.statements){
        if(isAmbientSourceDeclaration(statement))continue;
        if(ts.isExportAssignment(statement)&&!statement.isExportEquals){record.localExports.set('default','*default*');record.bindings.set('*default*',statement);}
        else if(ts.isExportDeclaration(statement)&&!statement.isTypeOnly){
            const request=declarations.get(statement);
            if(!statement.exportClause){if(request)record.starExports.push(request);}
            else if(ts.isNamespaceExport(statement.exportClause)){if(request){record.indirectExports.set(statement.exportClause.name.text,{moduleRequest:request,importName:moduleNamespaceBinding});record.namespaceDeclarations.set(moduleRequestKey(request),statement.exportClause);}}
            else for(const element of statement.exportClause.elements)if(!element.isTypeOnly){const name=(element.propertyName??element.name).text;if(request)record.indirectExports.set(element.name.text,{moduleRequest:request,importName:name});else exportLocal(element.name.text,name);}
        }else if(ts.isVariableStatement(statement)){
            const pending:(ts.VariableDeclaration|ts.BindingElement)[]=[...statement.declarationList.declarations];
            while(pending.length){const declaration=pending.pop()!;if(ts.isIdentifier(declaration.name)){record.bindings.set(declaration.name.text,declaration);if(modifier(statement,ts.SyntaxKind.ExportKeyword))exportLocal(declaration.name.text,declaration.name.text);}else for(const element of declaration.name.elements)if(!ts.isOmittedExpression(element))pending.push(element);}
        }else if(ts.isFunctionDeclaration(statement)||ts.isClassDeclaration(statement)||ts.isEnumDeclaration(statement)){
            if(statement.name)record.bindings.set(statement.name.text,statement);
            if(modifier(statement,ts.SyntaxKind.ExportKeyword)){if(modifier(statement,ts.SyntaxKind.DefaultKeyword)){const name=statement.name?.text??'*default*';record.localExports.set('default',name);record.bindings.set(name,statement);}else if(statement.name)exportLocal(statement.name.text,statement.name.text);}
        }
    }
    for(const entry of moduleVarDeclaredNames(source)){
        let declaration:ts.Node|undefined=entry.node;
        while(declaration&&!ts.isVariableDeclaration(declaration)&&!ts.isBindingElement(declaration))declaration=declaration.parent;
        if(declaration)record.bindings.set(entry.name,declaration);
    }
    return record;
}
