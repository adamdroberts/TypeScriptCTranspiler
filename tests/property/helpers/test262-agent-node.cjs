const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {Worker,MessageChannel,receiveMessageOnPort}=require('node:worker_threads');
console.log=(...args)=>fs.writeSync(1,require('node:util').format(...args)+'\n');
const workers=[],sleeper=new Int32Array(new SharedArrayBuffer(4));
function trace(value){if(process.env.TSC2C_AGENT_ORACLE_TRACE)fs.appendFileSync(process.env.TSC2C_AGENT_ORACLE_TRACE,value+'\n');}
global.$262={agent:{
    start(source){trace('start '+workers.length);const channel=new MessageChannel(),control=new Int32Array(new SharedArrayBuffer(12));const worker=new Worker(path.join(__dirname,'test262-agent-worker.cjs'),{workerData:{source:String(source),report:channel.port2,control:control.buffer},transferList:[channel.port2]});workers.push({worker,port:channel.port1,control,sequence:0});while(!Atomics.load(control,0))Atomics.wait(control,0,0);trace('started');},
    broadcast(buffer,value){trace('broadcast');value=typeof value==='bigint'?value:Number(value)|0;for(const entry of workers){if(Atomics.load(entry.control,2))continue;const sequence=++entry.sequence;entry.worker.postMessage({buffer,value,sequence});while(!Atomics.load(entry.control,2)&&Atomics.load(entry.control,1)!==sequence)Atomics.wait(entry.control,1,Atomics.load(entry.control,1),1);}trace('acknowledged');},
    getReport(){for(const entry of workers){const found=receiveMessageOnPort(entry.port);if(found){if(!found.message.startsWith('retained:'))trace(found.message);if(found.message.startsWith('oracle-error:'))throw new Error(found.message);return found.message}}return null;},
    sleep(ms){Atomics.wait(sleeper,0,0,Number(ms));},
    monotonicNow(){return performance.now();}
}};
const source=fs.readFileSync(process.argv[2],'utf8');
vm.runInThisContext(process.argv[2].endsWith('.ts')?require('typescript').transpileModule(source,{compilerOptions:{target:require('typescript').ScriptTarget.ESNext}}).outputText:source);
Promise.all(workers.map(entry=>entry.worker.terminate())).then(()=>{for(const entry of workers)entry.port.close()});
