import {setImmediate as enqueue} from "node:timers";
{
  const owner = {body: "17;"};
  enqueue(() => console.log(eval(owner.body)));
  owner.body = String(Math.random()) + ";";
}
