#ifndef _GNU_SOURCE
#define _GNU_SOURCE
#endif
#include "tsc_internal.h"
#include <sys/mman.h>

/* Shared blocks have one stable address for their entire maximum extent.
 * The retained block, not an individual view, owns the mapping. */
typedef struct {uint8_t* bytes;size_t capacity;} shared_block_t;
static void shared_block_release(void* object,void* unused){
    (void)unused;shared_block_t* block=object;
    if(block->bytes){(void)munmap(block->bytes,block->capacity);block->bytes=NULL;}
}
/* Raw native words alias the same byte block as DataView and TypedArray.
 * Every shared byte access is atomic; aligned scalar accesses additionally
 * preserve complete words. Atomics uses sequential consistency on this path. */
typedef uint8_t __attribute__((may_alias)) word8_t;
typedef uint16_t __attribute__((may_alias)) word16_t;
typedef uint32_t __attribute__((may_alias)) word32_t;
typedef uint64_t __attribute__((may_alias)) word64_t;
_Static_assert(__atomic_always_lock_free(4,0),"ECMAScript requires lock-free 4-byte Atomics on this host");
#define WORD_WIDTHS(M) M(1,word8_t) M(2,word16_t) M(4,word32_t) M(8,word64_t)
static uint64_t word_load(const uint8_t* bytes,size_t width,int order){
    switch(width){
#define LOAD_WORD(size, type) case size:return __atomic_load_n((const type*)bytes,order);
        WORD_WIDTHS(LOAD_WORD)
#undef LOAD_WORD
    }
    abort();
}
static void word_store(uint8_t* bytes,size_t width,uint64_t value,int order){
    switch(width){
#define STORE_WORD(size, type) case size:__atomic_store_n((type*)bytes,(type)value,order);return;
        WORD_WIDTHS(STORE_WORD)
#undef STORE_WORD
    }
    abort();
}
static bool word_compare_exchange(uint8_t* bytes,size_t width,uint64_t* expected,uint64_t replacement){
    switch(width){
#define COMPARE_WORD(size, type) case size:{type read=(type)*expected;bool exchanged=__atomic_compare_exchange_n((type*)bytes,&read,(type)replacement,false,__ATOMIC_SEQ_CST,__ATOMIC_SEQ_CST);*expected=read;return exchanged;}
        WORD_WIDTHS(COMPARE_WORD)
#undef COMPARE_WORD
    }
    abort();
}
bool tsc_atomic_word_lock_free(size_t width){
    switch(width){
#define LOCK_FREE_WORD(size, type) case size:return __atomic_always_lock_free(size,0);
        WORD_WIDTHS(LOCK_FREE_WORD)
#undef LOCK_FREE_WORD
    }
    return false;
}
#undef WORD_WIDTHS
uint64_t tsc_atomic_word_update(uint8_t* bytes,size_t width,tsc_atomic_operation_t operation,uint64_t expected,uint64_t replacement){
    uint64_t mask=width==8?UINT64_MAX:(UINT64_C(1)<<(width*8))-1;expected&=mask;replacement&=mask;
    if(operation==TSC_ATOMIC_STORE){word_store(bytes,width,replacement,__ATOMIC_SEQ_CST);return replacement;}
    uint64_t read=word_load(bytes,width,__ATOMIC_SEQ_CST);
    for(;;){
        uint64_t next;
        switch(operation){
            case TSC_ATOMIC_LOAD:return read;
            case TSC_ATOMIC_COMPARE_EXCHANGE:if(read!=expected)return read;next=replacement;break;
            case TSC_ATOMIC_EXCHANGE:next=replacement;break;
            case TSC_ATOMIC_ADD:next=read+replacement;break;
            case TSC_ATOMIC_SUB:next=read-replacement;break;
            case TSC_ATOMIC_AND:next=read&replacement;break;
            case TSC_ATOMIC_OR:next=read|replacement;break;
            case TSC_ATOMIC_XOR:next=read^replacement;break;
            default:abort();
        }
        uint64_t old=read;
        if(word_compare_exchange(bytes,width,&read,next&mask))return old;
    }
}
static uint64_t reorder_word(uint64_t raw,size_t width,bool little){
    if(little==(*(uint8_t*)&(uint16_t){1}!=0))return raw;
    uint64_t reordered=0;for(size_t byte=0;byte<width;++byte)reordered|=((raw>>(byte*8))&255)<<((width-byte-1)*8);
    return reordered;
}
size_t tsc_array_buffer_length(const tsc_array_buffer_t* buffer){
    return buffer->shared?__atomic_load_n(&buffer->byte_length,__ATOMIC_SEQ_CST):buffer->byte_length;
}
tsc_array_buffer_t* tsc_shared_array_buffer_allocate(size_t length,size_t maximum,bool growable){
    if(length>maximum)tsc_throw_error(TSC_ERROR_RANGE,tsc_str_from_cstr("SharedArrayBuffer length exceeds its maximum"));
    tsc_array_buffer_t* volatile buffer=TSC_GC_MALLOC(sizeof(*buffer));memset(buffer,0,sizeof(*buffer));
    shared_block_t* volatile block=TSC_GC_MALLOC(sizeof(*block));memset(block,0,sizeof(*block));
    block->capacity=maximum?maximum:1;
    void* bytes=mmap(NULL,block->capacity,PROT_READ|PROT_WRITE,MAP_PRIVATE|MAP_ANONYMOUS|MAP_NORESERVE,-1,0);
    if(bytes==MAP_FAILED)tsc_throw_error(TSC_ERROR_RANGE,tsc_str_from_cstr("SharedArrayBuffer maximum cannot be represented by native storage"));
    block->bytes=bytes;
#ifndef TSC_NO_GC
    GC_register_finalizer_no_order(block,shared_block_release,NULL,NULL,NULL);
#endif
    buffer->shared=true;buffer->resizable=growable;buffer->max_byte_length=maximum;
    buffer->shared_storage=block;buffer->data=bytes;buffer->byte_length=length;
    return buffer;
}
bool tsc_shared_array_buffer_grow_storage(tsc_array_buffer_t* buffer,size_t length){
    if(!buffer||!buffer->shared||!buffer->resizable)return false;
    size_t current=tsc_array_buffer_length(buffer);
    for(;;){
        if(length==current)return true;
        if(length<current||length>buffer->max_byte_length)return false;
        if(__atomic_compare_exchange_n(&buffer->byte_length,&current,length,false,__ATOMIC_SEQ_CST,__ATOMIC_SEQ_CST))return true;
    }
}
uint64_t tsc_array_buffer_read_bits(const tsc_array_buffer_t* buffer,size_t offset,size_t width,bool little){
    const uint8_t* bytes=buffer->data+offset;
    if(buffer->shared&&((uintptr_t)bytes%width)==0)return reorder_word(word_load(bytes,width,__ATOMIC_RELAXED),width,little);
    uint64_t raw=0;for(size_t byte=0;byte<width;++byte){uint8_t value=buffer->shared?(uint8_t)word_load(bytes+byte,1,__ATOMIC_RELAXED):bytes[byte];raw|=(uint64_t)value<<((little?byte:width-byte-1)*8);}
    return raw;
}
void tsc_array_buffer_write_bits(tsc_array_buffer_t* buffer,size_t offset,size_t width,bool little,uint64_t raw){
    uint8_t* bytes=buffer->data+offset;
    if(buffer->shared&&((uintptr_t)bytes%width)==0){word_store(bytes,width,reorder_word(raw,width,little),__ATOMIC_RELAXED);return;}
    for(size_t byte=0;byte<width;++byte){uint8_t value=(uint8_t)(raw>>((little?byte:width-byte-1)*8));if(buffer->shared)word_store(bytes+byte,1,value,__ATOMIC_RELAXED);else bytes[byte]=value;}
}
void tsc_array_buffer_copy_bytes(tsc_array_buffer_t* target,size_t target_offset,const tsc_array_buffer_t* source,size_t source_offset,size_t count,bool backwards){
    for(size_t iteration=0;iteration<count;++iteration){
        size_t index=backwards?count-iteration-1:iteration;
        uint64_t byte=tsc_array_buffer_read_bits(source,source_offset+index,1,true);
        tsc_array_buffer_write_bits(target,target_offset+index,1,true,byte);
    }
}

typedef enum {LENGTH, SLICE, MAXIMUM, RESIZABLE, RESIZE, TRANSFER, FIXED_TRANSFER, DETACHED, IS_VIEW, SPECIES, GROW} buffer_operation_t;
typedef struct {const char* name;buffer_operation_t operation;bool getter,is_static;size_t length;unsigned owners;} buffer_member_t;
static const buffer_member_t members[]={
#define TSC_ARRAY_BUFFER_MEMBER(name, operation, getter, is_static, length, owners) {#name,operation,getter,is_static,length,owners},
#include "tsc_array_buffer.def"
#undef TSC_ARRAY_BUFFER_MEMBER
};
typedef struct {tsc_value_t constructor,prototype;void* constructor_root;void* prototype_root;} buffer_realm_t;
typedef struct {const buffer_member_t* member;bool shared;} member_binding_t;
static const bool buffer_kinds[]={false,true};
static const char buffer_realm_key[2];
static buffer_realm_t* buffer_realm(bool shared);
static tsc_str_t* key(const char* text){return tsc_str_from_cstr(text);}
static tsc_value_t argument(tsc_array_t* args,size_t index){return args&&index<args->len?TSC_ARR(tsc_value_t,args,index):tsc_value_undefined();}
static tsc_array_buffer_t* require_buffer(tsc_value_t value,bool shared){
    if(value_is_box(value)&&value_tag(value)==TSC_VALUE_TAG_OBJECT){
        tsc_object_t* object=value_ptr(value);
        if(object->is_array_buffer&&object->class_ptr){tsc_array_buffer_t* buffer=object->class_ptr;if(buffer->shared==shared)return buffer;}
    }
    tsc_throw_error(TSC_ERROR_TYPE,key("Buffer receiver lacks the required internal slots"));return NULL;
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
    require_attached(buffer);size_t length=tsc_array_buffer_length(buffer);
    size_t first=relative_index(argument(args,0),length);
    tsc_value_t end=argument(args,1);size_t final=tsc_value_is_undefined(end)?length:relative_index(end,length);
    size_t requested=final>first?final-first:0;
    tsc_value_t constructor=tsc_value_species_constructor(receiver,buffer->shared?tsc_shared_array_buffer_constructor_value():tsc_array_buffer_constructor_value());
    void* volatile constructor_root=tsc_value_gc_root(constructor);
    tsc_array_t* volatile parameters=tsc_array_new(sizeof(tsc_value_t),1);tsc_array_use_value_storage(parameters);
    tsc_value_t size=tsc_value_num((double)requested);tsc_array_push_raw(parameters,&size);
    tsc_value_t result=tsc_value_construct_with_new_target(constructor,tsc_value_array(parameters),constructor);
    void* volatile result_root=tsc_value_gc_root(result);
    tsc_array_buffer_t* destination=require_buffer(result,buffer->shared);require_attached(destination);
    if((buffer->shared?destination->shared_storage==buffer->shared_storage:tsc_value_same_value_zero(receiver,result))||tsc_array_buffer_length(destination)<requested)
        tsc_throw_error(TSC_ERROR_TYPE,key("ArrayBuffer species result cannot hold the slice"));
    require_attached(buffer);
    size_t current=tsc_array_buffer_length(buffer);
    if(first<current){
        size_t count=current-first;if(count>requested)count=requested;
        tsc_array_buffer_copy_bytes(destination,0,buffer,first,count,false);
    }
    (void)constructor_root;(void)result_root;return result;
}
static tsc_value_t member_apply(void* environment,tsc_value_t receiver,tsc_array_t* args){
    const member_binding_t* binding=environment;const buffer_member_t* member=binding->member;
    void* volatile receiver_root=tsc_value_gc_root(receiver);tsc_array_t* volatile actuals=args;
    if(member->operation==SPECIES)return receiver;
    if(member->operation==IS_VIEW)return tsc_value_bool(tsc_util_types_is_array_buffer_view(argument(actuals,0)));
    tsc_array_buffer_t* volatile buffer=require_buffer(receiver,binding->shared);
    switch(member->operation){
        case LENGTH:return tsc_value_num((double)tsc_array_buffer_length(buffer));
        case MAXIMUM:return tsc_value_num((double)(buffer->detached?0:buffer->max_byte_length));
        case RESIZABLE:return tsc_value_bool(buffer->resizable);
        case DETACHED:return tsc_value_bool(buffer->detached);
        case SLICE:return slice(receiver,buffer,actuals);
        case TRANSFER:return transfer(buffer,argument(actuals,0),true);
        case FIXED_TRANSFER:return transfer(buffer,argument(actuals,0),false);
        case GROW:{
            if(!buffer->resizable)tsc_throw_error(TSC_ERROR_TYPE,key("SharedArrayBuffer has no growable storage"));
            size_t length=array_buffer_to_native_index(argument(actuals,0));
            if(!tsc_shared_array_buffer_grow_storage(buffer,length))tsc_throw_error(TSC_ERROR_RANGE,key("SharedArrayBuffer growth is outside its bounds"));
            break;
        }
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
    bool shared=*(const bool*)environment;(void)receiver;tsc_array_t* volatile actuals=args;
    size_t length=array_buffer_to_native_index(argument(actuals,0));tsc_value_t options=argument(actuals,1),maximum_value=tsc_value_undefined();
    if(tsc_value_is_object(options))maximum_value=tsc_value_get_prop(options,key("maxByteLength"));
    bool resizable=!tsc_value_is_undefined(maximum_value);size_t maximum=resizable?array_buffer_to_native_index(maximum_value):length;
    if(length>maximum)tsc_throw_error(TSC_ERROR_RANGE,key("ArrayBuffer length exceeds its maximum"));
    tsc_value_t prototype=tsc_value_get_prototype_from_constructor(tsc_value_current_new_target(),shared?TSC_INTRINSIC_DEFAULT_SHARED_ARRAY_BUFFER_PROTOTYPE:TSC_INTRINSIC_DEFAULT_ARRAY_BUFFER_PROTOTYPE);
    void* volatile prototype_root=tsc_value_gc_root(prototype);
    tsc_array_buffer_t* volatile buffer=shared?tsc_shared_array_buffer_allocate(length,maximum,resizable):tsc_array_buffer_allocate(length,maximum,resizable);
    tsc_value_t result=tsc_value_array_buffer(buffer);void* volatile result_root=tsc_value_gc_root(result);
    (void)tsc_value_object_set_prototype_of(result,prototype);
    (void)prototype_root;(void)result_root;(void)actuals;return result;
}
static void define_value(tsc_value_t object,tsc_str_t* name,tsc_value_t value){
    (void)tsc_value_define_property_desc(object,name,value,true,true,true,false,true,true,true);
}
static buffer_realm_t* buffer_realm(bool shared){
    buffer_realm_t* realm=tsc_realm_state_get(&buffer_realm_key[shared]);if(realm)return realm;
    realm=TSC_GC_MALLOC(sizeof(*realm));memset(realm,0,sizeof(*realm));tsc_realm_state_set(&buffer_realm_key[shared],realm);
    realm->prototype=tsc_value_object(tsc_object_new());realm->prototype_root=tsc_value_gc_root(realm->prototype);
    realm->constructor=tsc_value_function_named_kind(apply,construct,(void*)&buffer_kinds[shared],1,key(shared?"SharedArrayBuffer":"ArrayBuffer"),TSC_FUNCTION_IDENTITY_BUILTIN);
    tsc_function_identity_t* identity=value_ptr(realm->constructor);realm->constructor_root=identity;
    identity->construct_allocates_receiver=false;identity->construct_default_prototype=shared?TSC_INTRINSIC_DEFAULT_SHARED_ARRAY_BUFFER_PROTOTYPE:TSC_INTRINSIC_DEFAULT_ARRAY_BUFFER_PROTOTYPE;
    tsc_function_identity_set_own_prototype(identity,realm->prototype);identity->func_prototype_writable=false;
    define_value(realm->prototype,key("constructor"),realm->constructor);
    for(size_t offset=0;offset<sizeof(members)/sizeof(members[0]);++offset){
        const buffer_member_t* member=&members[offset];if(!(member->owners&(shared?2:1)))continue;
        member_binding_t* binding=TSC_GC_MALLOC(sizeof(*binding));*binding=(member_binding_t){member,shared};tsc_value_t owner=member->is_static?realm->constructor:realm->prototype;
        tsc_str_t* name=member->operation==SPECIES?tsc_symbol_property_key(tsc_symbol_species()):key(member->name);
        tsc_str_t* function_name=member->operation==SPECIES?key("get [Symbol.species]"):member->getter?tsc_str_concat(key("get "),name):name;
        tsc_value_t function=tsc_value_function_named_kind(member_apply,NULL,binding,member->length,function_name,TSC_FUNCTION_IDENTITY_BUILTIN);
        void* volatile function_root=tsc_value_gc_root(function);
        if(member->getter){
            tsc_value_t descriptor=tsc_value_object(tsc_object_new());void* volatile descriptor_root=tsc_value_gc_root(descriptor);
            define_value(descriptor,key("get"),function);define_value(descriptor,key("enumerable"),tsc_value_bool(false));define_value(descriptor,key("configurable"),tsc_value_bool(true));
            (void)tsc_value_define_property_descriptor(owner,name,descriptor);(void)descriptor_root;
        }else define_value(owner,name,function);
        (void)function_root;
    }
    (void)tsc_value_define_property_desc(realm->prototype,tsc_symbol_property_key(tsc_symbol_to_string_tag()),tsc_value_string(key(shared?"SharedArrayBuffer":"ArrayBuffer")),true,true,false,false,true,true,true);
    return realm;
}
tsc_value_t tsc_array_buffer_constructor_value(void){return buffer_realm(false)->constructor;}
tsc_value_t tsc_array_buffer_prototype_value(void){return buffer_realm(false)->prototype;}

tsc_value_t tsc_shared_array_buffer_constructor_value(void){return buffer_realm(true)->constructor;}
tsc_value_t tsc_shared_array_buffer_prototype_value(void){return buffer_realm(true)->prototype;}
