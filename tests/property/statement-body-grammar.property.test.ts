import {expect,test} from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import ts from "typescript";
import {createEcmaSourceFile} from "../../src/ecmascript-source";
import {evalSourceIsValid,evalSourceRequest} from "../../src/eval-source";
import {compile} from "../../src/compile";
import {parseHostObservation} from "../test262/protocol";

test("Statement slots preserve contextual let identifiers and lexical-declaration restrictions",()=>{
    const containers=[(body:string)=>`with({})${body}`,(body:string)=>`if(false)${body}`,
        (body:string)=>`if(true){}else ${body}`,(body:string)=>`while(false)${body}`,
        (body:string)=>`for(;false;)${body}`,(body:string)=>`label:${body}`];
    const sources=containers.flatMap(wrap=>['let','l\\u0065t','\\u006cet'].flatMap(identifier=>['','\n','\r\n','/*\n*/','\u2028'].flatMap(separator=>
        ['{}','identifier;','[identifier];'].flatMap(tail=>[false,true].map(strict=>
            `${strict?'"use strict";':''}{${wrap(identifier+separator+tail)}}`)))));
    sources.push('l\\u0065t\n[identifier];','l\\u0065t identifier;','"use strict";l\\u0065t;');
    const oracle=Bun.spawnSync(['node','-e','const vm=require("node:vm"),fs=require("node:fs");fs.writeSync(1,JSON.stringify(JSON.parse(process.argv[1]).map(source=>{try{new vm.Script(source);return true}catch(e){if(e.name!=="SyntaxError")throw e;return false}})));',JSON.stringify(sources)],{stdout:'pipe',stderr:'pipe'});
    expect({exitCode:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({exitCode:0,stderr:''});
    expect(sources.map(source=>evalSourceIsValid(evalSourceRequest('direct',source,false)))).toEqual(JSON.parse(oracle.stdout.toString()));
    for(const source of ['with({})let\n{}','with({})let\nidentifier;','with({})l\\u0065t\n{}'])for(const parents of [false,true]){
        const file=createEcmaSourceFile('source.js',source,ts.ScriptTarget.ESNext,parents,ts.ScriptKind.JS,'script');
        expect(file.text).toBe(source);
        const statement=file.statements[0];expect(ts.isWithStatement(statement!)).toBe(true);
        expect(ts.isExpressionStatement((statement as ts.WithStatement).statement)).toBe(true);
        const expression=((statement as ts.WithStatement).statement as ts.ExpressionStatement).expression;
        expect(ts.isIdentifier(expression)&&expression.text).toBe('let');
        expect(expression.getText(file)).toBe(source.slice('with({})'.length,source.indexOf('\n')));
        expect(file.statements[1]!.getStart(file)).toBe(source.indexOf('\n')+1);
    }
    expect(evalSourceIsValid(evalSourceRequest('direct','"use strict";if(false)let;',false))).toBe(false);
    expect(evalSourceIsValid(evalSourceRequest('direct','"use strict";({let:31}).let;',false))).toBe(true);
    for(const name of ['implements','interface','package','private','protected','public','static','yield','let']){
        expect(evalSourceIsValid(evalSourceRequest('direct',`"use strict";${name};`,false))).toBe(false);
        expect(evalSourceIsValid(evalSourceRequest('direct',`"use strict";({${name}:31}).${name};`,false))).toBe(true);
    }
    // One deep label tree uses the same token map and Statement-role walk.
    const depth=256,source='{with({})'+Array.from({length:depth},(_,i)=>`label${i}:`).join('')+'let\n{}}';
    expect(evalSourceIsValid(evalSourceRequest('direct',source,false))).toBe(true);
});

test("normalized contextual statements retain scope and ASI execution in both memory modes",async()=>{
    const directory=await fs.mkdtemp(path.join(os.tmpdir(),'tsc2c-statement-body-'));
    const source='var trace=[];Object.defineProperty(this,"let",{get:function(){trace.push("global");return 31;},configurable:true});var object={get let(){trace.push("object");return 37;}};with(object)let\n{trace.push("block");print(let);}print(trace.join(","));trace=[];for(var i=0;i<2;i++)let\n{trace.push("block");}print(trace.join(","));trace=[];with({get let(){trace.push("escaped");return [43];}})l\\u0065t\n[0];print(trace.join(","));';
    const expected=['31','object,block,global','global,global,block','escaped'];
    try{
        const entry=path.join(directory,'source.js');await fs.writeFile(entry,source);
        const oracle=Bun.spawnSync(['node','-e','const vm=require("node:vm"),fs=require("node:fs");new vm.Script(fs.readFileSync(process.argv[1],"utf8")).runInNewContext({print:x=>fs.writeSync(1,String(x)+"\\n")});',entry],{stdout:'pipe',stderr:'pipe'});
        expect({exitCode:oracle.exitCode,stderr:oracle.stderr.toString()}).toEqual({exitCode:0,stderr:''});
        expect(oracle.stdout.toString().trimEnd().split('\n')).toEqual(expected);
        for(const noGc of [false,true]){
            const output=path.join(directory,'program-'+noGc),diagnostics:string[]=[];
            const result=await compile({entry,output,noGc,buildDir:path.join(directory,'build-'+noGc),isolatedScriptRoots:[entry],initializationEntries:[entry],
                test262Observation:{kind:'test262-native-observation',scenarioId:'property/statement-body-grammar.js#sloppy',setupEntries:[],testEntry:entry,async:false,scriptEntries:[entry]},diagnosticWriter:message=>diagnostics.push(message)});
            expect({exitCode:result.exitCode,diagnostics:diagnostics.join('')}).toEqual({exitCode:0,diagnostics:''});
            const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe',timeout:120_000});
            expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:''});
            const observation=parseHostObservation(JSON.parse(native.stdout.toString()));expect(observation.kind).toBe('normal');
            expect((observation.stdout??'').trimEnd().split('\n')).toEqual(expected);
        }
    }finally{await fs.rm(directory,{recursive:true,force:true});}
},300_000);
