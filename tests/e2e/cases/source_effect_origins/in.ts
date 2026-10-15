const settings={body:'return "saved";'};
function forward(){return Math.random();}
const body=settings.body;
forward();
console.log(Function(body)());
const create = Function;
const opaque: any = new Proxy(function() {}, {});
for (let index = 0; index < 3; index++) opaque();
const created = {body: 'return "created";'};
console.log(create(created.body)());
