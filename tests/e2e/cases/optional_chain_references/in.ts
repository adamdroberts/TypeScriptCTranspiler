console.log(eval('var count=0,root=null;var result=delete root?.[count++].value;result+":"+count;'));
console.log(eval('var count=0,root={get leaf(){count++;return {get value(){throw 31;}};}};var result=delete root?.leaf.value;result+":"+count;'));
console.log(eval('var root={tag:37,method(){return {value:this.tag};}};root.method?.().value;'));
console.log(eval('var count=0,root={method:null};var result=delete root.method?.(count++);result+":"+count;'));
console.log(eval('var root=null,result;try{delete (root?.leaf).value;}catch(error){result=error.name;}result;'));
class OptionalRoot { tag: number = 41; method() { return { value: this.tag }; } }
function readOptionalRoot(root: OptionalRoot | null) { return root?.method?.().value; }
console.log(readOptionalRoot(new OptionalRoot()));
console.log(readOptionalRoot(null));
