import * as path from 'node:path';
import ts from 'typescript';
import {createEcmaSourceFile,ecmaParseGoal} from './ecmascript-source';
import {resolvePackageRoot} from './program';
import {sourceExpressionTexts} from './source-value-flow';

const proofs=new WeakMap<ts.SourceFile,ReadonlyMap<string,readonly string[]|null>>();
const active=new Set<ts.SourceFile>();
const key=(node:ts.Node)=>`${node.kind}:${node.pos}:${node.end}`;

/** Parsed source identity owns one cached value/location/call proof. A fresh
 * binder tree keeps this query independent of any consumer checker's symbols. */
export function sourceFileCallTexts(call:ts.CallExpression):readonly string[]|null {
    const source=call.getSourceFile();
    if(!source||call.pos<0)return null;
    if(active.has(source))return null;
    let result=proofs.get(source);
    if(!result){
        active.add(source);
        try{
            const parsed=createEcmaSourceFile(source.fileName,source.text,ts.ScriptTarget.ESNext,true,
                (source as ts.SourceFile&{scriptKind?:ts.ScriptKind}).scriptKind??ts.ScriptKind.TS,ecmaParseGoal(source));
            const calls:ts.CallExpression[]=[],pending:ts.Node[]=[parsed];
            while(pending.length){const node=pending.pop()!;if(ts.isCallExpression(node))calls.push(node);node.forEachChild(child=>{pending.push(child)});}
            const options:ts.CompilerOptions={target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext,
                moduleResolution:ts.ModuleResolutionKind.Bundler,noLib:true,allowJs:true,checkJs:false,skipLibCheck:true,types:[]};
            const host=ts.createCompilerHost(options),getSourceFile=host.getSourceFile.bind(host);
            host.getSourceFile=(filename,...args)=>path.resolve(filename)===path.resolve(source.fileName)?parsed:getSourceFile(filename,...args);
            const program=ts.createProgram({rootNames:[source.fileName,path.join(resolvePackageRoot(),'stdlib/lib.core.d.ts')],options,host});
            result=new Map([...sourceExpressionTexts(program,calls,{roots:[source.fileName]})].map(([node,texts])=>[key(node),texts]));
            proofs.set(source,result);
        }finally{active.delete(source)}
    }
    return result.get(key(call))??null;
}
