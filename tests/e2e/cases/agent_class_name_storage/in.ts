const source="class Token {static owner=0;static read(){return Token.owner;}};$262.agent.receiveBroadcast(function(buffer){const words=new Int32Array(buffer);const id=Atomics.add(words,0,1)+1;Token.owner=id;while(Atomics.load(words,0)!==2)$262.agent.sleep(1);$262.agent.report(String(id)+':'+(Token.read()===id));$262.agent.leaving();});";
$262.agent.start(source);$262.agent.start(source);$262.agent.broadcast(new SharedArrayBuffer(4));
const reports:string[]=[];while(reports.length<2){const value=$262.agent.getReport();if(value===null)$262.agent.sleep(1);else reports.push(value);}
reports.sort();console.log(reports.join("|"));
