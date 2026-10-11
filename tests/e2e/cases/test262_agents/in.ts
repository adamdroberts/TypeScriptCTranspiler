const start=$262.agent.start;
const source="$262.agent.receiveBroadcast(function(buffer,id){const words=new Int32Array(buffer);buffer.grow(16);Atomics.store(words,0,23);$262.agent.report(String(id)+':'+words.length+':'+(Object.getPrototypeOf(buffer)===SharedArrayBuffer.prototype));$262.agent.leaving();});";
start(source);
const shared=new SharedArrayBuffer(8,{maxByteLength:16});
const words=new Int32Array(shared);
$262.agent.broadcast(shared,18446744073709551617n);
let report: string | null=null;
while(report===null){report=$262.agent.getReport();if(report===null)$262.agent.sleep(1);}
console.log(report,words.length,Atomics.load(words,0));
