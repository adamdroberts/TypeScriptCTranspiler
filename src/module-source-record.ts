import {sourceUnitFormat} from './source-unit-format';
import ts from 'typescript';
import {ecmaParseGoal} from './ecmascript-source';
import {earlyControlFlowStaticSemanticsFailure} from './control-static-semantics';
import {earlyFunctionStaticSemanticsFailure} from './function-static-semantics';
import {earlyRegExpLiteralFailure} from './regexp-static-semantics';
import {earlyShortCircuitMixFailure} from './function-static-semantics';
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
            earlyPrivateStaticSemanticsFailure(source)??earlyModuleStaticSemanticsFailure(source)??earlyRegExpLiteralFailure(source)??earlyShortCircuitMixFailure(source):null;
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
    /** TypeScript type-only exports (interfaces, type aliases, namespaces
     * without values). They satisfy an elided import during linking but are
     * never bindings or module namespace keys. */
    readonly typeExports:Set<string>;
}

/** TypeScript's instantiated-namespace rule: a namespace is a value when its
 * body declares anything other than types and type-only namespaces. */
function namespaceHasValue(declaration:ts.ModuleDeclaration):boolean {
    const pending:ts.ModuleDeclaration[]=[declaration];
    while(pending.length){
        const body=pending.pop()!.body;
        if(!body)continue;
        if(ts.isModuleDeclaration(body)){pending.push(body);continue;}
        if(!ts.isModuleBlock(body))return true;
        for(const statement of body.statements){
            if(ts.isInterfaceDeclaration(statement)||ts.isTypeAliasDeclaration(statement)||isAmbientSourceDeclaration(statement))continue;
            if(ts.isModuleDeclaration(statement)){pending.push(statement);continue;}
            if(ts.isImportEqualsDeclaration(statement)&&!ts.getModifiers(statement)?.some(modifier=>modifier.kind===ts.SyntaxKind.ExportKeyword))continue;
            return true;
        }
    }
    return false;
}

/** Whether a link-time name resolves (directly, through indirect exports or
 * through star exports) to a TypeScript type-only export. */
export function resolvesToTypeExport(record:ModuleLinkRecord,name:string,getImportedModule:(record:ModuleLinkRecord,request:ModuleRequest)=>ModuleLinkRecord|null):boolean {
    const pending:Array<{record:ModuleLinkRecord;name:string}>=[{record,name}],visited=new Set<string>();
    while(pending.length){
        const current=pending.pop()!,key=current.record.path+"\0"+current.name;
        if(visited.has(key))continue;visited.add(key);
        if(current.record.typeExports.has(current.name))return true;
        if(current.record.localExports.has(current.name))continue;
        const indirect=current.record.indirectExports.get(current.name);
        if(indirect){
            const imported=getImportedModule(current.record,indirect.moduleRequest);
            if(imported&&typeof indirect.importName==='string')pending.push({record:imported,name:indirect.importName});
            continue;
        }
        if(current.name==='default')continue;
        for(const request of current.record.starExports){const imported=getImportedModule(current.record,request);if(imported)pending.push({record:imported,name:current.name});}
    }
    return false;
}
const linkRecords=new WeakMap<ts.SourceFile,Map<string,ModuleLinkRecord>>();
/** One source entry collection serves preflight, link validation and emission.
 * Imported local re-exports retain their original binding identity. */
export function moduleLinkRecord(source:ts.SourceFile,path:string):ModuleLinkRecord {
    source=moduleSourceOriginal(source);
    let paths=linkRecords.get(source);if(!paths){paths=new Map();linkRecords.set(source,paths);}
    const prior=paths.get(path);if(prior)return prior;
    const record:ModuleLinkRecord={path,hostPropertyExports:sourceUnitFormat(source)==='commonjs',requestedModules:[],imports:[],localExports:new Map(),indirectExports:new Map(),starExports:[],bindings:new Map(),namespaceDeclarations:new Map(),typeExports:new Set()};paths.set(path,record);
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
    // TypeScript type declarations of this module: exporting one exports a type.
    const typeNames=new Set<string>();
    for(const statement of source.statements){
        if(isAmbientSourceDeclaration(statement))continue;
        if(ts.isInterfaceDeclaration(statement)||ts.isTypeAliasDeclaration(statement))typeNames.add(statement.name.text);
        else if(ts.isModuleDeclaration(statement)&&ts.isIdentifier(statement.name)&&!namespaceHasValue(statement))typeNames.add(statement.name.text);
    }
    // A name that also has a value declaration (a class merged with an
    // interface, a namespace with values) is a binding, not a type.
    for(const statement of source.statements){
        if(isAmbientSourceDeclaration(statement))continue;
        if((ts.isFunctionDeclaration(statement)||ts.isClassDeclaration(statement)||ts.isEnumDeclaration(statement))&&statement.name)typeNames.delete(statement.name.text);
        else if(ts.isModuleDeclaration(statement)&&ts.isIdentifier(statement.name)&&namespaceHasValue(statement))typeNames.delete(statement.name.text);
        else if(ts.isVariableStatement(statement))for(const declaration of statement.declarationList.declarations)if(ts.isIdentifier(declaration.name))typeNames.delete(declaration.name.text);
    }
    const exportLocal=(exportName:string,localName:string)=>{const imported=imports.get(localName);if(imported)record.indirectExports.set(exportName,imported);else if(typeNames.has(localName))record.typeExports.add(exportName);else record.localExports.set(exportName,localName);};
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
        }else if(ts.isInterfaceDeclaration(statement)||ts.isTypeAliasDeclaration(statement)){
            if(modifier(statement,ts.SyntaxKind.ExportKeyword)&&!modifier(statement,ts.SyntaxKind.DefaultKeyword)&&typeNames.has(statement.name.text))record.typeExports.add(statement.name.text);
        }else if(ts.isModuleDeclaration(statement)&&ts.isIdentifier(statement.name)){
            // A namespace with values is a binding of the module; one with
            // only types is a type export.
            const name=statement.name.text;
            if(typeNames.has(name)){if(modifier(statement,ts.SyntaxKind.ExportKeyword))record.typeExports.add(name);}
            else{if(!record.bindings.has(name))record.bindings.set(name,statement);if(modifier(statement,ts.SyntaxKind.ExportKeyword))exportLocal(name,name);}
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
