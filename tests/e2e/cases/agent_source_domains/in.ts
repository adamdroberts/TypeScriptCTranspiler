const nested='globalThis.result=Function("return globalThis.role;")();';
(globalThis as any).role='parent';
const source="globalThis.role='worker';(0,eval)('globalThis.result=Function(\"return globalThis.role;\")();');$262.agent.report(globalThis.result);$262.agent.leaving();";
const start=$262.agent.start;
for(let i=0;i<2;i++){
    $262.agent.sleep(0);
    Reflect.apply(start,undefined,[...[source]]);
}
(0,eval)(nested);
const reports:string[]=[];
while(reports.length<2){const value=$262.agent.getReport();if(value===null)$262.agent.sleep(1);else reports.push(value);}
console.log((globalThis as any).result+':'+reports.sort().join('|'));
