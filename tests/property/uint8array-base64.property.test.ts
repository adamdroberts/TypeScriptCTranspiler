import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {compile} from '../../src/compile';

// ES2026 Uint8Array base64/hex. Decoder partitions (both alphabets, every
// lastChunkHandling mode, bounded setFrom* targets with maxLength stops and
// partial writes before SyntaxError, hex parity and non-ASCII input) are
// checked against an independent transcription of FromBase64/FromHex. V8
// validates input beyond a filled target and throws where the specification
// returns, so Node may disagree only in exactly that shape. Encoders, option
// order, receivers and Uint8Array-only publication are compared with
// independent Node (TSC2C_NODE_REFERENCE, which must implement the feature).
// One retained 1 MiB round trip is the stress input.
const oracle=process.env.TSC2C_NODE_REFERENCE??'node';
function strings(seed:number,count:number,alphabet:readonly string[],maxLength:number):string[]{
 let state=seed>>>0;const next=()=>(state=(Math.imul(state,1664525)+1013904223)>>>0);
 return Array.from({length:count},()=>{let s='';for(let n=next()%maxLength;n>0;--n)s+=alphabet[next()%alphabet.length];return s;});
}
const base64Units=[...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'].concat(['-','_','=','=','=',' ','\n','\t','\f','\r','\v','*','é',' ']);
const hexUnits=[...'0123456789abcdefABCDEF'].concat(['g','Z',' ','é',' ']);
const decoderInputs=[...strings(0xb64,240,base64Units,14),'','=','==','AA==','AQ==','AR==','AAA=','AAB=','AA','AAA','A','AA=','AA=A','AA= =','aGVsbG8gd29ybGQ=','-_-_','+/+/',' aG Vs bG8 '];
const hexInputs=[...strings(0x4e7,120,hexUnits,10),'','0','00','0g','é0','cafe','CAFE','0102030405'];

const standardAlphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
type Decoded={read:number;bytes:number[];error:boolean};
const fullChunk=(chunk:string):number[]=>[...Buffer.from(chunk,'base64')];
function finalChunk(chunk:string,strict:boolean):number[]|null{
 const bytes=fullChunk(chunk+(chunk.length===2?'AA':'A'));
 if(chunk.length===2)return strict&&bytes[1]!==0?null:[bytes[0]!];
 return strict&&bytes[2]!==0?null:[bytes[0]!,bytes[1]!];
}
function specFromBase64(string:string,alphabet:string,last:string,maxLength=2**53-1):Decoded{
 if(maxLength===0)return {read:0,bytes:[],error:false};
 let read=0,bytes:number[]=[],chunk='',index=0;const length=string.length;
 const skip=(i:number)=>{while(i<length&&'\t\n\f\r '.includes(string[i]!))++i;return i;};
 for(;;){
  index=skip(index);
  if(index===length){
   if(chunk.length>0){
    if(last==='stop-before-partial')return {read,bytes,error:false};
    if(last==='strict'||chunk.length===1)return {read,bytes,error:true};
    bytes=bytes.concat(finalChunk(chunk,false)!);
   }
   return {read:length,bytes,error:false};
  }
  let char=string[index]!;++index;
  if(char==='='){
   if(chunk.length<2)return {read,bytes,error:true};
   index=skip(index);
   if(chunk.length===2){
    if(index===length)return {read,bytes,error:last!=='stop-before-partial'};
    if(string[index]==='=')index=skip(index+1);
   }
   if(index<length)return {read,bytes,error:true};
   const tail=finalChunk(chunk,last==='strict');
   return tail===null?{read,bytes,error:true}:{read:length,bytes:bytes.concat(tail),error:false};
  }
  if(alphabet==='base64url'){
   if(char==='+'||char==='/')return {read,bytes,error:true};
   if(char==='-')char='+';else if(char==='_')char='/';
  }
  if(!standardAlphabet.includes(char))return {read,bytes,error:true};
  const remaining=maxLength-bytes.length;
  if((remaining===1&&chunk.length===2)||(remaining===2&&chunk.length===3))return {read,bytes,error:false};
  chunk+=char;
  if(chunk.length===4){
   bytes=bytes.concat(fullChunk(chunk));chunk='';read=index;
   if(bytes.length===maxLength)return {read,bytes,error:false};
  }
 }
}
function specFromHex(string:string,maxLength=2**53-1):Decoded{
 const bytes:number[]=[];let read=0;
 if(string.length%2!==0)return {read,bytes,error:true};
 while(read<string.length&&bytes.length<maxLength){
  const hexits=string.slice(read,read+2);
  if(!/^[0-9a-fA-F]{2}$/.test(hexits))return {read,bytes,error:true};
  read+=2;bytes.push(parseInt(hexits,16));
 }
 return {read,bytes,error:false};
}
const toHex=(bytes:readonly number[])=>bytes.map(byte=>byte.toString(16).padStart(2,'0')).join('');
function expectedDecoderLines():string[]{
 const lines:string[]=[];
 for(const [index,input] of decoderInputs.entries())for(const alphabet of ['base64','base64url'])for(const mode of ['loose','strict','stop-before-partial']){
  const whole=specFromBase64(input,alphabet,mode);
  lines.push(`from ${index} ${alphabet} ${mode} ${whole.error?'SyntaxError':toHex(whole.bytes)}`);
  for(let size=0;size<8;size+=3){
   const target=new Array<number>(size).fill(170),result=specFromBase64(input,alphabet,mode,size);
   result.bytes.forEach((byte,i)=>{target[i]=byte;});
   lines.push(`set ${index} ${alphabet} ${mode} ${size} ${result.error?'SyntaxError':`${result.read} ${result.bytes.length} ${toHex(target)}`}`);
   lines.push(`after ${index} ${size} ${toHex(target)}`);
  }
 }
 for(const [index,input] of hexInputs.entries()){
  const whole=specFromHex(input);
  lines.push(`fromHex ${index} ${whole.error?'SyntaxError':toHex(whole.bytes)}`);
  const target=new Array<number>(3).fill(170),result=specFromHex(input,3);
  result.bytes.forEach((byte,i)=>{target[i]=byte;});
  lines.push(`setFromHex ${index} ${result.error?'SyntaxError':`${result.read} ${result.bytes.length}`}`);
  lines.push(`afterHex ${index} ${toHex(target)}`);
 }
 return lines;
}
const isDecoderLine=(line:string)=>/^(from|set|after|fromHex|setFromHex|afterHex) /.test(line);

test('Uint8Array base64/hex match independent Node across decoder, encoder and publication partitions',async()=>{
 const probe=Bun.spawnSync([oracle,'-e','process.exit(typeof Uint8Array.fromBase64==="function"&&typeof Uint8Array.prototype.toHex==="function"?0:3)']);
 expect({oracle,supportsUint8ArrayBase64:probe.exitCode===0}).toEqual({oracle,supportsUint8ArrayBase64:true});
 const root=await mkdtemp(join(tmpdir(),'tsc2c-uint8array-base64-'));
 try{
  const source=[
   `const decoderInputs: string[] = ${JSON.stringify(decoderInputs)};`,
   `const hexInputs: string[] = ${JSON.stringify(hexInputs)};`,
   'const hex = (bytes: Uint8Array): string => bytes.toHex();',
   'const outcome = (label: string, run: () => string): void => { try { console.log(label, run()); } catch (e) { console.log(label, (e as Error).name); } };',
   'const alphabets: Array<"base64" | "base64url"> = ["base64", "base64url"];',
   'const modes: Array<"loose" | "strict" | "stop-before-partial"> = ["loose", "strict", "stop-before-partial"];',
   'for (const [index, input] of decoderInputs.entries()) for (const alphabet of alphabets) for (const lastChunkHandling of modes) {',
   '  outcome(`from ${index} ${alphabet} ${lastChunkHandling}`, () => hex(Uint8Array.fromBase64(input, { alphabet, lastChunkHandling })));',
   '  for (let size = 0; size < 8; size += 3) {',
   '    const target = new Uint8Array(size).fill(170);',
   '    outcome(`set ${index} ${alphabet} ${lastChunkHandling} ${size}`, () => { const r = target.setFromBase64(input, { alphabet, lastChunkHandling }); return `${r.read} ${r.written} ${hex(target)}`; });',
   '    console.log(`after ${index} ${size}`, hex(target));',
   '  }',
   '}',
   'for (const [index, input] of hexInputs.entries()) {',
   '  outcome(`fromHex ${index}`, () => hex(Uint8Array.fromHex(input)));',
   '  const target = new Uint8Array(3).fill(170);',
   '  outcome(`setFromHex ${index}`, () => { const r = target.setFromHex(input); return `${r.read} ${r.written}`; });',
   '  console.log(`afterHex ${index}`, hex(target));',
   '}',
   'let state = 7;',
   'for (let length = 0; length < 40; ++length) {',
   '  const bytes = new Uint8Array(length);',
   '  for (let i = 0; i < length; ++i) { state = (state * 1103515245 + 12345) % 2147483648; bytes[i] = state % 256; }',
   '  for (const alphabet of alphabets) for (const omitPadding of [false, true]) console.log(`enc ${length}`, bytes.toBase64({ alphabet, omitPadding }), bytes.toHex());',
   '  if (length > 2) console.log(`view ${length}`, bytes.subarray(1, length - 1).toBase64());',
   '}',
   'outcome("options-null", () => Uint8Array.fromBase64("AA", null as any).toHex());',
   'outcome("options-primitive", () => new Uint8Array(1).toBase64(1 as any));',
   'outcome("alphabet-object", () => Uint8Array.fromBase64("AA", { alphabet: { toString: () => "base64" } as any }).toHex());',
   'outcome("input-object", () => Uint8Array.fromHex({ toString: () => "00" } as any).toHex());',
   'outcome("receiver", () => (Uint8Array.prototype.toHex as any).call(new Int8Array(1)));',
   'outcome("receiver-plain", () => (Uint8Array.prototype.setFromHex as any).call({}, "00"));',
   'const getters: string[] = [];',
   'const observed = { get alphabet() { getters.push("alphabet"); return undefined; }, get lastChunkHandling() { getters.push("lastChunkHandling"); return undefined; }, get omitPadding() { getters.push("omitPadding"); return 1; } };',
   'Uint8Array.fromBase64("AA", observed as any); new Uint8Array(1).setFromBase64("AA", observed as any); console.log("toBase64 omit", new Uint8Array(1).toBase64(observed as any));',
   'console.log("getters", getters.join(","));',
   'for (const name of ["fromBase64", "fromHex"]) { const d = Object.getOwnPropertyDescriptor(Uint8Array, name)!; console.log("static", name, d.writable, d.enumerable, d.configurable, (d.value as Function).length, (d.value as Function).name, Object.hasOwn(Int8Array, name), name in Uint16Array); }',
   'for (const name of ["setFromBase64", "setFromHex", "toBase64", "toHex"]) { const d = Object.getOwnPropertyDescriptor(Uint8Array.prototype, name)!; console.log("proto", name, d.writable, d.enumerable, d.configurable, (d.value as Function).length, (d.value as Function).name, name in Int8Array.prototype); }',
   'const large = new Uint8Array(1 << 20); for (let i = 0; i < large.length; ++i) large[i] = (i * 31 + 7) & 255;',
   'const encoded = large.toBase64(); const decoded = Uint8Array.fromBase64(encoded); let same = decoded.length === large.length; for (let i = 0; same && i < large.length; ++i) same = decoded[i] === large[i];',
   'console.log("stress", encoded.length, same, Uint8Array.fromHex(large.toHex()).length);',
  ].join('\n')+'\n';
  for(const noGc of [false,true]){
   const directory=join(root,`gc-${!noGc}`);await Bun.write(join(directory,'.keep'),'');
   const entry=join(directory,'main.ts');await writeFile(entry,source);
   const node=Bun.spawnSync([oracle,entry],{stdout:'pipe',stderr:'pipe'});
   expect({code:node.exitCode,stderr:node.stderr.toString()}).toEqual({code:0,stderr:''});
   expect(node.stdout.toString()).toContain('stress 1398104 true 1048576');
   const output=join(directory,'native'),diagnostics:string[]=[];
   const result=await compile({entry,output,noGc,buildDir:output+'-build',diagnosticWriter:message=>diagnostics.push(message)});
   expect({noGc,code:result.exitCode,diagnostics}).toEqual({noGc,code:0,diagnostics:[]});
   const native=Bun.spawnSync([output],{stdout:'pipe',stderr:'pipe'});
   expect({noGc,code:native.exitCode,stderr:native.stderr.toString()}).toEqual({noGc,code:0,stderr:''});
   const nativeLines=native.stdout.toString().split('\n'),nodeLines=node.stdout.toString().split('\n');
   const decoder=expectedDecoderLines();
   expect({noGc,decoder:nativeLines.filter(isDecoderLine)}).toEqual({noGc,decoder});
   expect({noGc,rest:nativeLines.filter(line=>!isDecoderLine(line))}).toEqual({noGc,rest:nodeLines.filter(line=>!isDecoderLine(line))});
   // V8 keeps scanning after the specification has filled the target: it may
   // throw, or report a larger [[Read]] with identical written bytes. Any
   // other disagreement with the transcription is a failure.
   const nodeDecoder=nodeLines.filter(isDecoderLine);expect(nodeDecoder.length).toBe(decoder.length);
   const divergent=decoder.flatMap((line,i)=>line===nodeDecoder[i]?[]:[[line,nodeDecoder[i]!] as const]);
   const filledTargetScan=(spec:string,v8:string)=>{
    const s=spec.split(' '),v=v8.split(' ');
    if(s[0]!=='set'||s[6]!==s[4]||s[4]==='0')return false;
    return v[5]==='SyntaxError'||(v.length===s.length&&Number(v[5])>Number(s[5])&&v.slice(6).join(' ')===s.slice(6).join(' ')&&v.slice(0,5).join(' ')===s.slice(0,5).join(' '));
   };
   expect(divergent.filter(([spec,v8])=>!filledTargetScan(spec,v8))).toEqual([]);
  }
 }finally{await rm(root,{recursive:true,force:true})}
},900000);
