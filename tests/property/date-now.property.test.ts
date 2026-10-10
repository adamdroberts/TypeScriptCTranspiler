import {expect, test} from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {compile} from "../../src/compile";
import {parseHostObservation} from "../test262/protocol";

// Wall-clock values are compared with independently sampled host bounds at
// execution, rather than using an expected timestamp or a duplicate quantizer.
test("Date.now and fresh Date values denote integral current UTC milliseconds",async()=>{
    const temporary=await fs.mkdtemp(path.join(os.tmpdir(),"tsc2c-date-now-"));
    try{
        const source=`
            const clock=Date.now,raw={},ignored={[Symbol.toPrimitive](){throw raw;}};
            const callbacks=[()=>Date.now(ignored),()=>clock.call(raw,ignored),()=>clock.bind(raw,ignored)(),()=>Reflect.apply(clock,raw,[ignored]),()=>new Date().getTime()];
            for(const callback of callbacks)PRINT(callback());
        `;
        for(const profile of [false,true])for(const noGc of [false,true]){
            const directory=path.join(temporary,`${profile}-${noGc}`);await fs.mkdir(directory);
            const entry=path.join(directory,"main.mjs"),output=path.join(directory,"program");
            await fs.writeFile(entry,source.replaceAll("PRINT",profile?"print":"console.log"));
            const diagnostics:string[]=[];const result=await compile({entry,output,noGc,buildDir:path.join(directory,"build"),moduleRoots:[entry],initializationEntries:[entry],
                ...(profile?{test262Observation:{kind:"test262-native-observation" as const,scenarioId:"property/date-now.js#module",setupEntries:[],testEntry:entry,async:false,scriptEntries:[]}}:{}),diagnosticWriter:message=>diagnostics.push(message)});
            expect({exitCode:result.exitCode,diagnostics:diagnostics.join("")}).toEqual({exitCode:0,diagnostics:""});
            const before=Date.now();const native=Bun.spawnSync([output],{stdout:"pipe",stderr:"pipe"});const after=Date.now();
            expect({exitCode:native.exitCode,stderr:native.stderr.toString()}).toEqual({exitCode:0,stderr:""});
            const observation=profile?parseHostObservation(JSON.parse(native.stdout.toString())):null;if(observation)expect(observation).toMatchObject({kind:"normal"});
            const values=(observation?observation.stdout??"":native.stdout.toString()).trimEnd().split("\n").map(Number);
            expect(values.length).toBe(5);
            for(const value of values){expect(Number.isInteger(value)).toBe(true);expect(value).toBeGreaterThanOrEqual(Math.min(before,after));expect(value).toBeLessThanOrEqual(Math.max(before,after));}
        }
    }finally{await fs.rm(temporary,{recursive:true,force:true});}
},180_000);
