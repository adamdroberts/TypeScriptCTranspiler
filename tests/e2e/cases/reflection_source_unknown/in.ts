const owner: any = { body: String(Math.random()) };
eval(Reflect.get(owner, "body"));
