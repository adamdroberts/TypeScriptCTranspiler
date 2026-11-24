import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {tierLargeFunctions} from '../../src/link/large-functions';

/* tierLargeFunctions marks a top-level C function definition whose own text
 * exceeds the limit with TSC_LARGE_FUNCTION (O1 under GCC; see
 * runtime/tsc_runtime.h) and leaves everything else byte-identical. The
 * partitions: a definition under the limit, one over it, a prototype (no
 * body), a struct and an initializer (column-0 `};` closes neither), nested
 * blocks whose closing braces are indented, `#line` directives inside a body,
 * and generated definitions of 1 to 4096 statements against the limit. The
 * stress compiles a marked 4096-statement definition with the runtime's
 * macro under gcc -O2. */

function definition(name:string,statements:number):string{
 const body=Array.from({length:statements},(_,k)=>`    if (x > ${k}) {\n        x -= ${k};\n    }`).join('\n');
 return `static int ${name}(int x) {\n#line 1 "source.ts"\n${body}\n    return x;\n}`;
}

test('only oversized function definitions are tiered',async()=>{
 const small=definition('small',2), large=definition('large',64);
 const others='static int prototype(int x);\nstruct pair { int a; int b; };\nstatic const int table[] = {\n    1, 2,\n};\n';
 const text=`${others}${small}\n${large}\n`;
 const limit=large.length-1;
 const tiered=tierLargeFunctions(text,limit);
 expect(tiered).toBe(text.replace('static int large(int x) {','TSC_LARGE_FUNCTION static int large(int x) {'));
 expect(tierLargeFunctions(text,large.length+64)).toBe(text);
 for(const statements of [1,2,7,64,512,4096]){
  const source=definition('generated',statements);
  expect({statements,marked:tierLargeFunctions(source,4096).startsWith('TSC_LARGE_FUNCTION ')}).toEqual({statements,marked:source.length>4096});
 }
 const directory=await mkdtemp(join(tmpdir(),'tsc2c-large-function-'));
 try{
  const file=join(directory,'large.c');
  const macro='#if defined(__GNUC__) && !defined(__clang__)\n#  define TSC_LARGE_FUNCTION __attribute__((optimize("O1")))\n#else\n#  define TSC_LARGE_FUNCTION\n#endif\n';
  let expected=1000; for(let k=0;k<4096;k++) if(expected>k) expected-=k;
  await writeFile(file,macro+tierLargeFunctions(`${definition('stress',4096)}\nint main(void) { return stress(1000) == ${expected} ? 0 : 1; }\n`,1<<16));
  const cc=Bun.spawnSync(['gcc','-O2','-Werror','-o',join(directory,'large'),file],{stdout:'pipe',stderr:'pipe',timeout:300_000});
  expect({code:cc.exitCode,stderr:cc.stderr.toString()}).toEqual({code:0,stderr:''});
  expect(Bun.spawnSync([join(directory,'large')]).exitCode).toBe(0);
 }finally{await rm(directory,{recursive:true,force:true});}
},600_000);
