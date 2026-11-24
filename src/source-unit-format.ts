import type ts from 'typescript';
import {readFileSync} from 'node:fs';
import * as path from 'node:path';

export type SourceUnitFormat = 'ecmascript' | 'commonjs';
/** The program owns format selection; link and emit consume that same fact. */
export const sourceUnitFormats = new WeakMap<ts.SourceFile,SourceUnitFormat>();
export function sourceUnitFormat(source:ts.SourceFile):SourceUnitFormat|undefined {
    return sourceUnitFormats.get(source);
}

const packageScopeTypes=new Map<string,string|undefined>();
/** The nearest package.json "type" of a file's directory (the package scope
 * that selects a .js/.ts file's format when its extension does not). */
export function packageScopeType(source:string):string|undefined {
    let directory=path.dirname(path.resolve(source)),type:string|undefined;
    const visited:string[]=[];
    for(;;){
        if(packageScopeTypes.has(directory)){type=packageScopeTypes.get(directory);break;}
        visited.push(directory);
        let metadata:string|undefined;
        try{metadata=readFileSync(path.join(directory,'package.json'),'utf8');}catch{metadata=undefined;}
        if(metadata!==undefined){try{type=JSON.parse(metadata).type;}catch{/* no declared format */}break;}
        const parent=path.dirname(directory);if(parent===directory)break;
        directory=parent;
    }
    for(const visitedDirectory of visited)packageScopeTypes.set(visitedDirectory,type);
    return type;
}
/** TypeScript's module format for a TypeScript file under its node16/nodenext
 * rules: .mts is an ECMAScript module, .cts CommonJS, and a .ts/.tsx file
 * follows its package scope ("type": "module" selects ECMAScript modules). An
 * ECMAScript-module TypeScript file has no CommonJS wrapper names. */
export function typeScriptModuleFormat(fileName:string):'module'|'commonjs' {
    if(/\.mts$/i.test(fileName))return 'module';
    if(/\.cts$/i.test(fileName))return 'commonjs';
    return packageScopeType(fileName)==='module'?'module':'commonjs';
}
