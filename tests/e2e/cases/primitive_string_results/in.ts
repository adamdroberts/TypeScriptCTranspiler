console.log(eval('eval(String(41));'));
console.log(eval('function value(){return "43;";}eval(String(value()));'));
console.log(eval('eval(String.call(null,"47;"));'));
console.log(eval('eval(String());'));
