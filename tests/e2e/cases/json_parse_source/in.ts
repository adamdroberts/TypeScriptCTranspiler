console.log("plain:", eval(JSON.parse('"79;"')));
console.log("context:", eval(JSON.parse(" 83e0 ", function(key: string, value: any, context: any): string { return context.source; })));
