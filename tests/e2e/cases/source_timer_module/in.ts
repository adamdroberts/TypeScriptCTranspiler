import timers, {setImmediate as enqueue} from "node:timers";
import * as namespace from "node:timers";
const replacement = () => { console.log("replacement"); return 0; };
timers.setImmediate = replacement;
globalThis.setImmediate = replacement;
{
  const owner = {body: "23;"};
  namespace.setImmediate(() => {
    console.log(eval(owner.body));
    console.log(enqueue === namespace.setImmediate);
    console.log("module-timer-complete");
  });
  owner.body = "29;";
}
