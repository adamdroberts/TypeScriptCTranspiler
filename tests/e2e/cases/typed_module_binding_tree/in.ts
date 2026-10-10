import {first,nested,tail,leaf,rest,shared,fallback,fallbackTail,mutate} from "./source";
import * as namespace from "./source";
console.log("array",first,nested,tail.join("|"));
console.log("object",leaf,rest.extra);
console.log("default",fallback,fallbackTail.join("|"));
mutate();console.log("live",first,shared,namespace.first,namespace.shared);
