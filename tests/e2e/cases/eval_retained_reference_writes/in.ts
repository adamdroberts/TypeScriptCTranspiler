const record: any = eval(`
const fixed = 11; let changing = 17;
({ read:function(){return fixed;}, reject:function(){fixed = 23;},
   update:function(){return changing++;}, compound:function(){return changing += 3;},
   pattern:function(){[changing] = [29];return changing;},
   unchanged:function(){return fixed ||= 31;} });
`);
let error = "none";
try { record.reject(); } catch (reason: any) { error = reason.name; }
console.log(error, record.read(), record.unchanged());
console.log(record.update(), record.compound(), record.pattern());
