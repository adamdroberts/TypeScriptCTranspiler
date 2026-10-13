const settings={body:'return "saved";'};
function forward(){return Math.random();}
const body=settings.body;
forward();
console.log(Function(body)());
