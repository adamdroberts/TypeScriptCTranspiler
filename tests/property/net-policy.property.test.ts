import {expect,test} from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {emitNetPolicyC,NetPolicyError,parseNetEntry,parseNetPolicy} from '../../src/link/net-policy';

test('--allow-net entries normalize hosts and ports',()=>{
 expect([
  'Example.COM','example.com.:443','127.0.0.1:8080','[::1]','[::1]:443','::1','a-b.c0.d',
 ].map(parseNetEntry)).toEqual([
  {host:'example.com',port:null},{host:'example.com',port:443},{host:'127.0.0.1',port:8080},
  {host:'::1',port:null},{host:'::1',port:443},{host:'::1',port:null},{host:'a-b.c0.d',port:null},
 ]);
});

test('--allow-net rejects wildcards, numeric aliases, and malformed entries',()=>{
 for(const entry of ['*.example.com','a..b','-a.com','a-.com','127.1','0x7f000001','0x7f.1','010.0.0.1','1.2.3.4.5',
  '[::1','[::1]x','[127.0.0.1]','host:0','host:65536','host:080','host:','ex ample','a"b','a\\b','a\nb','fe80::1%eth0','a:1:2',
  'x'.repeat(64)+'.com',`${'a.'.repeat(127)}com`])
  expect(()=>parseNetEntry(entry)).toThrow(NetPolicyError);
});

test('--allow-net lists split, dedupe, and an empty list denies everything',()=>{
 expect(parseNetPolicy(undefined)).toBeNull();
 expect(parseNetPolicy([])).toBeNull();
 expect(parseNetPolicy([''])).toEqual({rules:[]});
 expect(parseNetPolicy(['a.com, b.com:1','A.com'])).toEqual({rules:[{host:'a.com',port:null},{host:'b.com',port:1}]});
 expect(emitNetPolicyC(null)).toContain('{ false, NULL, 0 }');
 expect(emitNetPolicyC({rules:[]})).toContain('{ true, NULL, 0 }');
 expect(emitNetPolicyC({rules:[{host:'a.com',port:null},{host:'::1',port:443}]})).toContain('{ "a.com", -1 },\n    { "::1", 443 },');
 expect(()=>emitNetPolicyC({rules:[{host:'a"b',port:null}]})).toThrow(NetPolicyError);
});

// Arbitrary input either fails closed or yields hosts that cannot leave the
// generated C string literal.
test('--allow-net parsing of arbitrary text cannot inject into the generated C',()=>{
 const alphabet='aZ09.-:[]%*"\\\n\t ,x\u0000é?/';
 let seed=0x9e3779b9;
 const next=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/0x100000000;};
 for(let i=0;i<5000;i++){
  let text='';const length=Math.floor(next()*24);
  for(let j=0;j<length;j++)text+=alphabet[Math.floor(next()*alphabet.length)];
  let policy;
  try{policy=parseNetPolicy([text]);}catch(error){expect(error).toBeInstanceOf(NetPolicyError);continue;}
  for(const rule of policy!.rules)expect(rule.host).toMatch(/^[a-z0-9.:-]+$/);
  const lines=emitNetPolicyC(policy).split('\n').filter(line=>line.includes('"')&&!line.startsWith('#include'));
  for(const line of lines)expect(line).toMatch(/^ {4}\{ "[a-z0-9.:-]+", -?[0-9]+ \},$/);
 }
});

// Every resolver and socket-address operation in the runtime goes through the
// guarded wrappers, and the raw libc entry points are poisoned after them.
test('runtime network entry points are confined to the guarded chokepoint',()=>{
 const runtime=path.join(import.meta.dir,'../../runtime');
 const raw=/(?<![\w.>])(getaddrinfo|getnameinfo|res_n?query|res_n?search|res_send|gethostbyname2?|gethostbyaddr|connect|bind|sendto|sendmsg)\s*\(/;
 const offenders:string[]=[];
 for(const name of fs.readdirSync(runtime).filter(name=>/\.(c|cc|h)$/.test(name))){
  let text=fs.readFileSync(path.join(runtime,name),'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*|"(?:\\.|[^"\\\n])*"/g,'');
  if(name==='tsc_node.c'){
   const poison=text.indexOf('#pragma GCC poison getaddrinfo');
   expect(poison).toBeGreaterThan(0);
   const guard=text.indexOf('static int tsc_net_guarded_getaddrinfo');
   expect(guard).toBeGreaterThan(0);expect(guard).toBeLessThan(poison);
   text=text.slice(0,guard)+text.slice(poison);
  }
  text.split('\n').forEach((line,index)=>{if(raw.test(line))offenders.push(`${name}:${index+1}: ${line.trim()}`);});
 }
 expect(offenders).toEqual([]);
});
