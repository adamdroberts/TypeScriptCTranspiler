var host=globalThis;
function check(value,label){if(!value)throw label;host.print(label+":true");}
function collect(){if(NATIVE_GC)host.$262.gc();}
function identity(value){return value;}
function listIdentity(value){return value;}
function callableIdentity(value){return value;}
var store={text:"local += 2; local;"};
store.text="local += 3; local;";
function directSources(eval,first,...tail){let local=11;return [eval(first),eval(...tail),local];}
const direct=directSources(eval,identity(store.text),"local += 5; local;");
check(direct.join("|")==="14|19|19","formal-return-property-and-spread-source");
function strictSources(source){"use strict";let local=23;return eval(source);}
check(strictSources(identity("local += 6; local;"))===29,"source-call-strict-context");
function parentheses(){let local=101;return (eval)(identity("local += 2; local;"));}
check(parentheses()===103,"parentheses-retain-direct-eval-reference");
const bridge={target:eval,get read(){return this.target;}};
const bound=bridge.read.bind(null,"var sourceFlowGlobal=31; sourceFlowGlobal;");
check(bound()===31 && sourceFlowGlobal===31,"getter-bound-eval-source");
check(Reflect.apply(callableIdentity(eval),null,listIdentity(["37;"]))===37 &&
    bridge.target.call(null,"39;")===39,"reflective-and-call-source-list");
const hostEval=$262.evalScript;
check(hostEval(identity("41;"))===41,"aliased-eval-script-source");
const completionSource=eval("'47;';");
check(eval(completionSource)===47,"retained-eval-completion-source");
const hostCompletion=$262.evalScript("'49;';");
check(eval(hostCompletion)===49,"host-eval-completion-source");
const object={value:59},callable=function(){return 61;},boxed=new String("throw 'must not execute';");
const empty=[];
check(eval(object)===object && eval(callable)===callable && eval(boxed)===boxed && eval(...empty)===undefined,
    "non-string-eval-identity-and-empty-list");
check(eval(null)===null && eval(undefined)===undefined && eval(true)===true && eval(67)===67 && eval(71n)===71n,
    "primitive-eval-identity");
const numericCompletion=eval(13+17);
check(eval(numericCompletion)===30,"non-string-computed-eval-completion");
let effects="";
function extra(){effects+="argument";return 73;}
check(eval(...listIdentity(["79;"]),extra())===79 && effects==="argument","source-list-retains-extra-argument-effects");
const nested=identity(eval("\"eval('83;');\";"));
check(eval(nested)===83,"transitive-returned-source-closure");
collect();
GENERATED_PARTITIONS
DEEP_SOURCE_GRAPH
