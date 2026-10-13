import owner, {label} from './common/value.js';
import './module/value.js';
import './common/empty.mjs';
import forced from './module/value.cjs';
const host:any=globalThis;
console.log(label,owner.receiver===owner,owner.read());
console.log(host.moduleGoal,host.extensionGoal,forced.label);
console.log(eval('owner.receiver === owner && owner.read();'));
