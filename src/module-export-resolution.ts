/** Module namespace bindings have an internal identity disjoint from every
 * source String binding name. */
export const moduleNamespaceBinding = Symbol("Module namespace binding");
export interface ModuleExportRecord<Request> {
    readonly path:string;
    readonly localExports:ReadonlyMap<string,string>;
    readonly indirectExports:ReadonlyMap<string,{readonly moduleRequest:Request;readonly importName:string|typeof moduleNamespaceBinding}>;
    readonly starExports:readonly Request[];
}
export type ModuleExportResolution = {readonly modulePath:string;readonly bindingName:string|typeof moduleNamespaceBinding}|"ambiguous"|null;

/** One continuation-frame worklist implements local/indirect/star export
 * lookup and binding-identity ambiguity without native-stack depth limits. */
export function resolveModuleExport<Request, Module extends ModuleExportRecord<Request>>(
    record: Module,
    exportName: string,
    getImportedModule: (record:Module, request:Request)=>Module|null,
): ModuleExportResolution {
    type Frame = {record:Module;name:string;phase:"enter"|"indirect"|"star";next:number;candidate:Exclude<ModuleExportResolution,"ambiguous">};
    const frames:Frame[]=[{record,name:exportName,phase:"enter",next:0,candidate:null}],resolveSet=new Set<string>();
    let returned:ModuleExportResolution|undefined;
    const complete=(value:ModuleExportResolution)=>{frames.pop();returned=value;};
    while(frames.length){
        const frame=frames[frames.length-1]!;
        if(returned!==undefined){
            const value=returned;returned=undefined;
            if(frame.phase==="indirect"){complete(value);continue;}
            if(value==="ambiguous"){complete(value);continue;}
            if(value!==null){
                if(frame.candidate===null)frame.candidate=value;
                else if(!(frame.candidate.modulePath===value.modulePath&&frame.candidate.bindingName===value.bindingName)){complete("ambiguous");continue;}
            }
        }
        if(frame.phase==="enter"){
            const key=frame.record.path+"\0"+frame.name;
            if(resolveSet.has(key)){complete(null);continue;}resolveSet.add(key);
            const local=frame.record.localExports.get(frame.name);
            if(local!==undefined){complete({modulePath:frame.record.path,bindingName:local});continue;}
            const indirect=frame.record.indirectExports.get(frame.name);
            if(indirect){
                const imported=getImportedModule(frame.record,indirect.moduleRequest);
                if(!imported){complete(null);continue;}
                if(indirect.importName===moduleNamespaceBinding){complete({modulePath:imported.path,bindingName:moduleNamespaceBinding});continue;}
                frame.phase="indirect";frames.push({record:imported,name:indirect.importName,phase:"enter",next:0,candidate:null});continue;
            }
            if(frame.name==="default"){complete(null);continue;}
            frame.phase="star";
        }
        if(frame.next>=frame.record.starExports.length){complete(frame.candidate);continue;}
        const request=frame.record.starExports[frame.next++]!,imported=getImportedModule(frame.record,request);
        if(!imported){complete(null);continue;}
        frames.push({record:imported,name:frame.name,phase:"enter",next:0,candidate:null});
    }
    return returned??null;
}

