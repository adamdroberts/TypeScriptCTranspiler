#ifndef _GNU_SOURCE
#define _GNU_SOURCE
#endif
#include "tsc_internal.h"
#include <sys/mman.h>

typedef enum {LENGTH, SLICE, MAXIMUM, RESIZABLE, RESIZE, TRANSFER, FIXED_TRANSFER, DETACHED, IS_VIEW, SPECIES} buffer_operation_t;
typedef struct {const char* name;buffer_operation_t operation;bool getter,is_static;size_t length;} buffer_member_t;
static const buffer_member_t members[]={
#define TSC_ARRAY_BUFFER_MEMBER(name, operation, getter, is_static, length) {#name,operation,getter,is_static,length},
#include "tsc_array_buffer.def"
#undef TSC_ARRAY_BUFFER_MEMBER
};
typedef struct {tsc_value_t constructor,prototype;void* constructor_root;void* prototype_root;} buffer_realm_t;
static const char buffer_realm_key;
static buffer_realm_t* buffer_realm(void);
static tsc_str_t* key(const char* text){return tsc_str_from_cstr(text);}
static tsc_value_t argument(tsc_array_t* args,size_t index){return args&&index<args->len?TSC_ARR(tsc_value_t,args,index):tsc_value_undefined();}
static tsc_array_buffer_t* require_buffer(tsc_value_t value){
    if(value_is_box(value)&&value_tag(value)==TSC_VALUE_TAG_OBJECT){
        tsc_object_t* object=value_ptr(value);
        if(object->is_array_buffer&&object->class_ptr)return object->class_ptr;
    }
    tsc_throw_error(TSC_ERROR_TYPE,key("ArrayBuffer receiver lacks its internal slots"));return NULL;
}
static void require_attached(tsc_array_buffer_t* buffer){
    if(buffer->detached)tsc_throw_error(TSC_ERROR_TYPE,key("ArrayBuffer is detached"));
}
static size_t array_buffer_to_native_index(tsc_value_t value){
    double number=tsc_value_to_index(value);
    if(number>(double)SIZE_MAX)tsc_throw_error(TSC_ERROR_RANGE,key("ArrayBuffer index exceeds native storage"));
    return (size_t)number;
}
/* A resizable maximum must be representable as a host address-space block.
 * Actual byte blocks remain collector-owned snapshots, so a resize does not
 * invalidate byte pointers already retained by native consumers. */
void tsc_array_buffer_check_capacity(size_t maximum){
    size_t size=maximum?maximum:1;
    void* reservation=mmap(NULL,size,PROT_NONE,MAP_PRIVATE|MAP_ANONYMOUS|MAP_NORESERVE,-1,0);
    if(reservation==MAP_FAILED)tsc_throw_error(TSC_ERROR_RANGE,key("ArrayBuffer maximum cannot be represented by native storage"));
    (void)munmap(reservation,size);
}
static size_t relative_index(tsc_value_t value,size_t length){
    double relative=tsc_value_to_integer_or_infinity(value);
    return (size_t)(relative<0?fmax((double)length+relative,0):fmin(relative,(double)length));
}
static tsc_value_t transfer(tsc_array_buffer_t* buffer,tsc_value_t length_value,bool preserve){
    size_t length=tsc_value_is_undefined(length_value)?buffer->byte_length:array_buffer_to_native_index(length_value);
    require_attached(buffer);
    bool resizable=preserve&&buffer->resizable;
    size_t maximum=resizable?buffer->max_byte_length:length;
    if(length>maximum)tsc_throw_error(TSC_ERROR_RANGE,key("ArrayBuffer transfer length exceeds its maximum"));
    tsc_array_buffer_t* volatile result=tsc_array_buffer_allocate(length,maximum,resizable);
    size_t copy=length<buffer->byte_length?length:buffer->byte_length;
    if(copy)memcpy(result->data,buffer->data,copy);
    tsc_array_buffer_detach(buffer);
    return tsc_value_array_buffer(result);
}
static tsc_value_t slice(tsc_value_t receiver,tsc_array_buffer_t* buffer,tsc_array_t* args){
    require_attached(buffer);size_t length=buffer->byte_length;
    size_t first=relative_index(argument(args,0),length);
    tsc_value_t end=argument(args,1);size_t final=tsc_value_is_undefined(end)?length:relative_index(end,length);
    size_t requested=final>first?final-first:0;
    tsc_value_t constructor=tsc_value_species_constructor(receiver,tsc_array_buffer_constructor_value());
    void* volatile constructor_root=tsc_value_gc_root(constructor);
    tsc_array_t* volatile parameters=tsc_array_new(sizeof(tsc_value_t),1);tsc_array_use_value_storage(parameters);
    tsc_value_t size=tsc_value_num((double)requested);tsc_array_push_raw(parameters,&size);
    tsc_value_t result=tsc_value_construct_with_new_target(constructor,tsc_value_array(parameters),constructor);
    void* volatile result_root=tsc_value_gc_root(result);
    tsc_array_buffer_t* destination=require_buffer(result);require_attached(destination);
    if(tsc_value_same_value_zero(receiver,result)||destination->byte_length<requested)
        tsc_throw_error(TSC_ERROR_TYPE,key("ArrayBuffer species result cannot hold the slice"));
    require_attached(buffer);
    if(first<buffer->byte_length){
        size_t count=buffer->byte_length-first;if(count>requested)count=requested;
        if(count)memcpy(destination->data,buffer->data+first,count);
    }
    (void)constructor_root;(void)result_root;return result;
}
static tsc_value_t member_apply(void* environment,tsc_value_t receiver,tsc_array_t* args){
    const buffer_member_t* member=environment;
    void* volatile receiver_root=tsc_value_gc_root(receiver);tsc_array_t* volatile actuals=args;
    if(member->operation==SPECIES)return receiver;
    if(member->operation==IS_VIEW)return tsc_value_bool(tsc_util_types_is_array_buffer_view(argument(actuals,0)));
    tsc_array_buffer_t* volatile buffer=require_buffer(receiver);
    switch(member->operation){
        case LENGTH:return tsc_value_num((double)buffer->byte_length);
        case MAXIMUM:return tsc_value_num((double)(buffer->detached?0:buffer->max_byte_length));
        case RESIZABLE:return tsc_value_bool(buffer->resizable);
        case DETACHED:return tsc_value_bool(buffer->detached);
        case SLICE:return slice(receiver,buffer,actuals);
        case TRANSFER:return transfer(buffer,argument(actuals,0),true);
        case FIXED_TRANSFER:return transfer(buffer,argument(actuals,0),false);
        case RESIZE:{
            if(!buffer->resizable)tsc_throw_error(TSC_ERROR_TYPE,key("ArrayBuffer has no resizable storage"));
            size_t length=array_buffer_to_native_index(argument(actuals,0));require_attached(buffer);
            if(length>buffer->max_byte_length)tsc_throw_error(TSC_ERROR_RANGE,key("ArrayBuffer resize exceeds its maximum"));
            tsc_array_buffer_resize_storage(buffer,length);break;
        }
        default:tsc_throw_error(TSC_ERROR_TYPE,key("ArrayBuffer operation cannot be represented"));
    }
    (void)receiver_root;(void)actuals;return tsc_value_undefined();
}
static tsc_value_t apply(void* environment,tsc_value_t receiver,tsc_array_t* args){
    (void)environment;(void)receiver;(void)args;tsc_throw_error(TSC_ERROR_TYPE,key("ArrayBuffer constructor requires new"));return tsc_value_undefined();
}
static tsc_value_t construct(void* environment,tsc_value_t receiver,tsc_array_t* args){
    (void)environment;(void)receiver;tsc_array_t* volatile actuals=args;
    size_t length=array_buffer_to_native_index(argument(actuals,0));tsc_value_t options=argument(actuals,1),maximum_value=tsc_value_undefined();
    if(tsc_value_is_object(options))maximum_value=tsc_value_get_prop(options,key("maxByteLength"));
    bool resizable=!tsc_value_is_undefined(maximum_value);size_t maximum=resizable?array_buffer_to_native_index(maximum_value):length;
    if(length>maximum)tsc_throw_error(TSC_ERROR_RANGE,key("ArrayBuffer length exceeds its maximum"));
    tsc_value_t prototype=tsc_value_get_prototype_from_constructor(tsc_value_current_new_target(),TSC_INTRINSIC_DEFAULT_ARRAY_BUFFER_PROTOTYPE);
    void* volatile prototype_root=tsc_value_gc_root(prototype);
    tsc_array_buffer_t* volatile buffer=tsc_array_buffer_allocate(length,maximum,resizable);
    tsc_value_t result=tsc_value_array_buffer(buffer);void* volatile result_root=tsc_value_gc_root(result);
    (void)tsc_value_object_set_prototype_of(result,prototype);
    (void)prototype_root;(void)result_root;(void)actuals;return result;
}
static void define_value(tsc_value_t object,tsc_str_t* name,tsc_value_t value){
    (void)tsc_value_define_property_desc(object,name,value,true,true,true,false,true,true,true);
}
static buffer_realm_t* buffer_realm(void){
    buffer_realm_t* realm=tsc_realm_state_get(&buffer_realm_key);if(realm)return realm;
    realm=TSC_GC_MALLOC(sizeof(*realm));memset(realm,0,sizeof(*realm));tsc_realm_state_set(&buffer_realm_key,realm);
    realm->prototype=tsc_value_object(tsc_object_new());realm->prototype_root=tsc_value_gc_root(realm->prototype);
    realm->constructor=tsc_value_function_named_kind(apply,construct,NULL,1,key("ArrayBuffer"),TSC_FUNCTION_IDENTITY_BUILTIN);
    tsc_function_identity_t* identity=value_ptr(realm->constructor);realm->constructor_root=identity;
    identity->construct_allocates_receiver=false;identity->construct_default_prototype=TSC_INTRINSIC_DEFAULT_ARRAY_BUFFER_PROTOTYPE;
    tsc_function_identity_set_own_prototype(identity,realm->prototype);identity->func_prototype_writable=false;
    define_value(realm->prototype,key("constructor"),realm->constructor);
    for(size_t offset=0;offset<sizeof(members)/sizeof(members[0]);++offset){
        const buffer_member_t* member=&members[offset];tsc_value_t owner=member->is_static?realm->constructor:realm->prototype;
        tsc_str_t* name=member->operation==SPECIES?tsc_symbol_property_key(tsc_symbol_species()):key(member->name);
        tsc_str_t* function_name=member->operation==SPECIES?key("get [Symbol.species]"):member->getter?tsc_str_concat(key("get "),name):name;
        tsc_value_t function=tsc_value_function_named_kind(member_apply,NULL,(void*)member,member->length,function_name,TSC_FUNCTION_IDENTITY_BUILTIN);
        void* volatile function_root=tsc_value_gc_root(function);
        if(member->getter){
            tsc_value_t descriptor=tsc_value_object(tsc_object_new());void* volatile descriptor_root=tsc_value_gc_root(descriptor);
            define_value(descriptor,key("get"),function);define_value(descriptor,key("enumerable"),tsc_value_bool(false));define_value(descriptor,key("configurable"),tsc_value_bool(true));
            (void)tsc_value_define_property_descriptor(owner,name,descriptor);(void)descriptor_root;
        }else define_value(owner,name,function);
        (void)function_root;
    }
    (void)tsc_value_define_property_desc(realm->prototype,tsc_symbol_property_key(tsc_symbol_to_string_tag()),tsc_value_string(key("ArrayBuffer")),true,true,false,false,true,true,true);
    return realm;
}
tsc_value_t tsc_array_buffer_constructor_value(void){return buffer_realm()->constructor;}
tsc_value_t tsc_array_buffer_prototype_value(void){return buffer_realm()->prototype;}
