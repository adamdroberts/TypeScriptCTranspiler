console.log(eval('var value;try{value.x;}catch(e){e.constructor.name;}'));
console.log(eval('var log=[];var key={[Symbol.toPrimitive]:function(){log.push("coercion");return "x";}};function name(){log.push("expression");return key;}try{null[name()];}catch(e){log.push(e.constructor.name);}log.join(",");'));
console.log(eval('var log=[];var key={[Symbol.toPrimitive]:function(){log.push("coercion");return "x";}};function name(){log.push("expression");return key;}function rhs(){log.push("rhs");return 37;}try{null[name()]=rhs();}catch(e){log.push(e.constructor.name);}log.join(",");'));
console.log(eval('var object={member:{value:31}};with(object){delete member;}try{object.member.value;}catch(e){e.constructor.name;}'));
console.log(String(eval('Object.create(null).missing;')));
