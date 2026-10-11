#include "tsc_internal.h"

typedef struct {const char* name;tsc_atomic_operation_t operation;size_t arity;} atomic_member_t;
static const atomic_member_t members[]={
#define TSC_ATOMICS_MEMBER(name, operation, arity) {#name,TSC_ATOMIC_##operation,arity},
#include "tsc_atomics.def"
#undef TSC_ATOMICS_MEMBER
};
typedef struct {tsc_value_t object;void* root;} atomic_realm_t;
static const char atomic_realm_key;
static tsc_str_t* key(const char* text){return tsc_str_from_cstr(text);}
static tsc_value_t argument(tsc_array_t* args,size_t index){return args&&index<args->len?TSC_ARR(tsc_value_t,args,index):tsc_value_undefined();}
static bool big_format(tsc_numeric_format_t format){return format==TSC_NUMERIC_BIG_SIGNED||format==TSC_NUMERIC_BIG_UNSIGNED;}
static tsc_value_t integer_value(tsc_value_t value,tsc_numeric_format_t format){
    return big_format(format)?tsc_value_to_bigint(value):tsc_value_num(tsc_value_to_integer_or_infinity(value));
}
static uint64_t raw_value(tsc_value_t value,const tsc_integer_typed_array_record_t* record){
    return big_format(record->format)?tsc_bigint_to_uint64(tsc_value_as_bigint(value)):tsc_numeric_number_to_bits(tsc_value_as_num(value),record->format,record->width);
}
static tsc_value_t member_apply(void* environment,tsc_value_t receiver,tsc_array_t* args){
    (void)receiver;const atomic_member_t* member=environment;tsc_array_t* volatile actuals=args;
    if(member->operation==TSC_ATOMIC_IS_LOCK_FREE){
        double size=tsc_value_to_integer_or_infinity(argument(actuals,0));
        return tsc_value_bool((size==1||size==2||size==4||size==8)&&tsc_atomic_word_lock_free((size_t)size));
    }
    tsc_value_t owner=argument(actuals,0);void* volatile owner_root=tsc_value_gc_root(owner);
    tsc_integer_typed_array_record_t record=tsc_typed_array_atomic_record(owner,false);
    double access=tsc_value_to_index(argument(actuals,1));
    if(access>=(double)record.length)tsc_throw_error(TSC_ERROR_RANGE,key("Atomic index is outside the captured TypedArray length"));
    size_t index=(size_t)access;tsc_value_t expected=tsc_value_undefined(),replacement=tsc_value_undefined();
    void* volatile expected_root=NULL;void* volatile replacement_root=NULL;
    if(member->operation==TSC_ATOMIC_COMPARE_EXCHANGE){expected=integer_value(argument(actuals,2),record.format);expected_root=tsc_value_gc_root(expected);}
    if(member->operation!=TSC_ATOMIC_LOAD){replacement=integer_value(argument(actuals,member->operation==TSC_ATOMIC_COMPARE_EXCHANGE?3:2),record.format);replacement_root=tsc_value_gc_root(replacement);}
    tsc_typed_array_atomic_revalidate(&record,index);
    uint8_t* bytes=record.buffer?record.buffer->data+record.offset:((tsc_buffer_t*)record.object->class_ptr)->data;
    uint64_t read=tsc_atomic_word_update(bytes+index*record.width,record.width,member->operation,member->operation==TSC_ATOMIC_COMPARE_EXCHANGE?raw_value(expected,&record):0,member->operation==TSC_ATOMIC_LOAD?0:raw_value(replacement,&record));
    tsc_value_t result=member->operation==TSC_ATOMIC_STORE?replacement:tsc_numeric_bits_to_value(read,record.format,record.width);
    (void)owner_root;(void)expected_root;(void)replacement_root;(void)actuals;return result;
}
tsc_value_t tsc_atomics_object_value(void){
    atomic_realm_t* realm=tsc_realm_state_get(&atomic_realm_key);if(realm)return realm->object;
    realm=TSC_GC_MALLOC(sizeof(*realm));memset(realm,0,sizeof(*realm));tsc_realm_state_set(&atomic_realm_key,realm);
    realm->object=tsc_value_object(tsc_object_new());realm->root=tsc_value_gc_root(realm->object);
    for(size_t index=0;index<sizeof(members)/sizeof(members[0]);++index){
        const atomic_member_t* member=&members[index];tsc_value_t function=tsc_value_function_named_kind(member_apply,NULL,(void*)member,member->arity,key(member->name),TSC_FUNCTION_IDENTITY_BUILTIN);
        void* volatile function_root=tsc_value_gc_root(function);
        (void)tsc_value_define_property_desc(realm->object,key(member->name),function,true,true,true,false,true,true,true);(void)function_root;
    }
    (void)tsc_value_define_property_desc(realm->object,tsc_symbol_property_key(tsc_symbol_to_string_tag()),tsc_value_string(key("Atomics")),true,true,false,false,true,true,true);
    return realm->object;
}
