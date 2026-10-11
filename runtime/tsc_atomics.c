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
static size_t access_index(const tsc_integer_typed_array_record_t* record,tsc_value_t value){
    double access=tsc_value_to_index(value);
    if(access>=(double)record->length)tsc_throw_error(TSC_ERROR_RANGE,key("Atomic index is outside the captured TypedArray length"));
    return (size_t)access;
}
static tsc_value_t wait_result(tsc_value_t object,bool async,tsc_value_t value){
    (void)tsc_value_define_property_desc(object,key("async"),tsc_value_bool(async),true,true,true,true,true,true,true);
    (void)tsc_value_define_property_desc(object,key("value"),value,true,true,true,true,true,true,true);return object;
}
static tsc_value_t waiter_apply(tsc_atomic_operation_t operation,tsc_array_t* args){
    tsc_array_t* volatile actuals=args;tsc_value_t owner=argument(actuals,0);void* volatile owner_root=tsc_value_gc_root(owner);
    tsc_integer_typed_array_record_t record=tsc_typed_array_atomic_record(owner,true);
    if(operation!=TSC_ATOMIC_NOTIFY&&(!record.buffer||!record.buffer->shared))tsc_throw_error(TSC_ERROR_TYPE,key("Atomics wait requires shared storage"));
    size_t index=access_index(&record,argument(actuals,1)),offset=record.offset+index*record.width;
    if(operation==TSC_ATOMIC_NOTIFY){
        tsc_value_t count_value=argument(actuals,2);double count=tsc_value_is_undefined(count_value)?INFINITY:fmax(tsc_value_to_integer_or_infinity(count_value),0);
        if(!record.buffer||!record.buffer->shared)return tsc_value_num(0);
        size_t notified=tsc_atomic_waiter_notify(record.buffer->shared_storage,offset,count);tsc_atomics_schedule_completions();(void)owner_root;return tsc_value_num((double)notified);
    }
    uint64_t expected;
    if(big_format(record.format)){tsc_value_t converted=tsc_value_to_bigint(argument(actuals,2));tsc_bigint_t* volatile integer=tsc_value_as_bigint(converted);expected=tsc_bigint_to_uint64(integer);}
    else expected=tsc_numeric_number_to_bits(tsc_value_to_number(argument(actuals,2)),record.format,record.width);
    double timeout=tsc_value_to_number(argument(actuals,3));timeout=isnan(timeout)?INFINITY:fmax(timeout,0);
    bool async=operation==TSC_ATOMIC_WAIT_ASYNC;
    if(!async&&!tsc_atomics_can_block())tsc_throw_error(TSC_ERROR_TYPE,key("Atomics.wait cannot block this agent"));
    tsc_promise_t* volatile promise=async?tsc_promise_pending():NULL;
    tsc_value_t result=async?tsc_value_object(tsc_object_new()):tsc_value_undefined();void* volatile result_root=tsc_value_gc_root(result);
    tsc_atomic_waiter_t* volatile waiter=tsc_atomic_waiter_new(record.buffer->shared_storage,record.buffer->data,offset,record.width,expected,timeout,promise);
    tsc_atomic_wait_status_t status=tsc_atomic_waiter_begin(waiter);
    if(status==TSC_WAIT_PENDING){
        if(async){tsc_atomic_waiter_schedule(waiter);result=wait_result(result,true,tsc_value_promise(promise));}
        else status=tsc_atomic_waiter_suspend(waiter);
    }
    if(!async||status!=TSC_WAIT_PENDING){
        tsc_value_t value=tsc_value_string(key(status==TSC_WAIT_OK?"ok":status==TSC_WAIT_NOT_EQUAL?"not-equal":"timed-out"));
        result=async?wait_result(result,false,value):value;
    }
    (void)owner_root;(void)result_root;(void)actuals;return result;
}
static tsc_value_t member_apply(void* environment,tsc_value_t receiver,tsc_array_t* args){
    (void)receiver;const atomic_member_t* member=environment;tsc_array_t* volatile actuals=args;
    if(member->operation==TSC_ATOMIC_IS_LOCK_FREE){
        double size=tsc_value_to_integer_or_infinity(argument(actuals,0));
        return tsc_value_bool((size==1||size==2||size==4||size==8)&&tsc_atomic_word_lock_free((size_t)size));
    }
    if(member->operation==TSC_ATOMIC_WAIT||member->operation==TSC_ATOMIC_WAIT_ASYNC||member->operation==TSC_ATOMIC_NOTIFY)return waiter_apply(member->operation,actuals);
    tsc_value_t owner=argument(actuals,0);void* volatile owner_root=tsc_value_gc_root(owner);
    tsc_integer_typed_array_record_t record=tsc_typed_array_atomic_record(owner,false);
    size_t index=access_index(&record,argument(actuals,1));tsc_value_t expected=tsc_value_undefined(),replacement=tsc_value_undefined();
    void* volatile expected_root=NULL;void* volatile replacement_root=NULL;
    if(member->operation==TSC_ATOMIC_COMPARE_EXCHANGE){expected=integer_value(argument(actuals,2),record.format);expected_root=tsc_value_gc_root(expected);}
    if(member->operation!=TSC_ATOMIC_LOAD){replacement=integer_value(argument(actuals,member->operation==TSC_ATOMIC_COMPARE_EXCHANGE?3:2),record.format);replacement_root=tsc_value_gc_root(replacement);}
    if(record.buffer&&record.buffer->shared)tsc_agent_checkpoint();
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
