const executeSource: any = eval;
function read(body: string) { console.log(executeSource(body)); }
read("17;");
["19;"].forEach(read);
