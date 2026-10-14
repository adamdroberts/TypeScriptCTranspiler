import * as path from 'node:path';
import ts from 'typescript';
import {createEcmaSourceFile,ecmaParseGoal} from './ecmascript-source';
import {buildProgram,resolvePackageRoot} from './program';
import {sourceExpressionTexts} from './source-value-flow';
import {dynamicImportCalls} from './module-request';

const proofs=new WeakMap<ts.SourceFile,ReadonlyMap<string,readonly string[]|null>>();
const proofSources=new WeakMap<ts.SourceFile,ts.SourceFile>();
const active=new Set<ts.SourceFile>();
let sourceTrees:Map<string,ts.SourceFile>|undefined;
const key=(node:ts.Node)=>`${node.kind}:${node.pos}:${node.end}`;

/** Original parsed source identity owns one cached value/location/expression proof.
 * Derived binder trees retain that identity for the recursion guard while
 * keeping the proof independent of any consumer checker's symbols. */
export function sourceFileExpressionTexts(expression:ts.Expression):readonly string[]|null {
    const parsedSource=expression.getSourceFile();
    const source=proofSources.get(parsedSource)??parsedSource;
    if(!source||expression.pos<0)return null;
    // An immutable String leaf has no owner/effect dependency. Its value is a
    // safe finite AOT target superset even when its activation never executes.
    if(ts.isStringLiteralLike(expression))return [expression.text];
    if(active.has(source))return null;
    let result=proofs.get(source);
    if(!result){
        active.add(source);
        const previousTrees=sourceTrees;
        sourceTrees??=new Map();
        const trees=sourceTrees;
        const adopt=(parsed:ts.SourceFile,physicalPath:string)=>{
            if(proofSources.has(parsed))return;
            const identity=JSON.stringify([path.resolve(physicalPath),ecmaParseGoal(parsed),parsed.text]);
            const canonical=trees.get(identity)??parsed;trees.set(identity,canonical);proofSources.set(parsed,canonical);
        };
        const identity=JSON.stringify([path.resolve(source.fileName),ecmaParseGoal(source),source.text]);
        if(!trees.has(identity))trees.set(identity,source);
        try{
            const roots=new Set<string>();
            for(;;){
                const parsed=createEcmaSourceFile(source.fileName,source.text,ts.ScriptTarget.ESNext,true,
                    (source as ts.SourceFile&{scriptKind?:ts.ScriptKind}).scriptKind??ts.ScriptKind.TS,ecmaParseGoal(source));
                proofSources.set(parsed,source);
                const expressions:ts.Expression[]=[],pending:ts.Node[]=[parsed];
                while(pending.length){const node=pending.pop()!;if(ts.isExpression(node))expressions.push(node);node.forEachChild(child=>{pending.push(child)});}
                const built=buildProgram({entry:source.fileName,packageRoot:resolvePackageRoot(),retainModuleFailures:true,deferDynamicImportDiscovery:true,
                    additionalRoots:[...roots],moduleRoots:[...(ecmaParseGoal(source)==="module"?[source.fileName]:[]),...roots],
                    ...(ecmaParseGoal(source)==="script"?{isolatedScriptRoots:[source.fileName]}:{}),
                    sourceOverrides:new Map([[path.resolve(source.fileName),parsed]]),sourceFileCreated:adopt});
                const program=built.program;
                const targetArguments=program.getSourceFiles().filter(file=>!file.isDeclarationFile).flatMap(file=>dynamicImportCalls(file).flatMap(call=>call.arguments[0]?[call.arguments[0]]:[]));
                const queries=sourceExpressionTexts(program,[...expressions,...targetArguments],{roots:[source.fileName]});
                result=new Map(expressions.map(node=>[key(node),queries.get(node)??null]));
                let added=false;
                for(const argument of targetArguments)for(const text of queries.get(argument)??[]){
                    const resolved=ts.resolveModuleName(text,argument.getSourceFile().fileName,program.getCompilerOptions(),ts.sys).resolvedModule;
                    if(resolved&&!roots.has(resolved.resolvedFileName)){roots.add(resolved.resolvedFileName);added=true;}
                }
                if(!added)break;
            }
            proofs.set(source,result);
        }finally{active.delete(source);sourceTrees=previousTrees;}
    }
    return result.get(key(expression))??null;
}
