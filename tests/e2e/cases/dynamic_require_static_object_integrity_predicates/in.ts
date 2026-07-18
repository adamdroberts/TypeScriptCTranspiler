const fromExtensibleObject = require("./" + Object.isExtensible({ value: 1 }).toString().replace("true", "extensible_object"));
const fromSealedObject = require("./" + Object.isSealed({ value: 1 }).toString().replace("false", "sealed_object"));
const fromFrozenArray = require("./" + Object.isFrozen([1]).toString().replace("false", "frozen_array"));
const fromExtensibleString = require("./" + Object.isExtensible("x").toString().replace("false", "extensible_string"));
const fromSealedNull = require("./" + Object.isSealed(null).toString().replace("true", "sealed_null"));
const fromFrozenUndefined = require("./" + Object.isFrozen(undefined).toString().replace("true", "frozen_undefined"));

console.log(
    fromExtensibleObject.label,
    fromSealedObject.label,
    fromFrozenArray.label,
    fromExtensibleString.label,
    fromSealedNull.label,
    fromFrozenUndefined.label,
);
