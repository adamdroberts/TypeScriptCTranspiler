{
const run=(body:string,message?:string)=>{
 if(message===undefined)message="";else message+=" ";
 let value=body;
 const saved=value;
 body=String(Math.random())+";";
 ["b","a"].sort();
 console.log(eval(saved));
 console.log("local-snapshot-complete");
};
run("31;");
}
