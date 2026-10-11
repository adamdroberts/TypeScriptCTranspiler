const {parentPort,workerData}=require('node:worker_threads');
const vm=require('node:vm');
const control=new Int32Array(workerData.control),sleepArray=new Int32Array(new SharedArrayBuffer(4));
function failure(error){workerData.report.postMessage('oracle-error:'+String(error.stack||error));Atomics.store(control,2,1);parentPort.close();workerData.report.close();}
global.$262={agent:{
    receiveBroadcast(callback){parentPort.once('message',packet=>{parentPort.ref();Atomics.store(control,1,packet.sequence);Atomics.notify(control,1);try{Promise.resolve(callback(packet.buffer,packet.value)).catch(failure)}catch(error){failure(error)}});},
    report(message){workerData.report.postMessage(String(message));},
    sleep(ms){Atomics.wait(sleepArray,0,0,Number(ms));},
    monotonicNow(){return performance.now();},
    leaving(){Atomics.store(control,2,1);workerData.report.close();parentPort.close();}
}};
Atomics.store(control,0,1);Atomics.notify(control,0);try{vm.runInThisContext(workerData.source)}catch(error){failure(error)}
