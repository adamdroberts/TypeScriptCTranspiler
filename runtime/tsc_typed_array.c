#include "tsc_internal.h"

typedef struct {const char* name; size_t width; tsc_numeric_format_t format; tsc_intrinsic_default_prototype_kind_t prototype;} element_t;
static const element_t elements[]={
#define TSC_TYPED_ARRAY(name, width, format) {#name,width,TSC_NUMERIC_##format,TSC_INTRINSIC_DEFAULT_##name##_PROTOTYPE},
#include "tsc_typed_array.def"
#undef TSC_TYPED_ARRAY
};
typedef struct {tsc_value_t constructor,prototype; void* constructor_root; void* prototype_root;} intrinsic_t;
typedef struct {intrinsic_t abstract; intrinsic_t concrete[TSC_ELEMENT_COUNT];} typed_realm_t;
static const char typed_realm_key;
static typed_realm_t* typed_realm(void);
static tsc_str_t* key(const char* text){return tsc_str_from_cstr(text);}
static tsc_value_t argument(tsc_array_t* args,size_t index){return args&&index<args->len?TSC_ARR(tsc_value_t,args,index):tsc_value_undefined();}
static tsc_object_t* typed_object(tsc_value_t value){
    if(value_is_box(value)&&value_tag(value)==TSC_VALUE_TAG_OBJECT){
        tsc_object_t* object=value_ptr(value); if(object->is_typed_array)return object;
    }
    return NULL;
}
static tsc_object_t* require_typed(tsc_value_t value){
    tsc_object_t* object=typed_object(value);
    if(!object)tsc_throw_error(TSC_ERROR_TYPE,key("TypedArray receiver lacks its internal slots"));
    return object;
}
static bool is_big(const element_t* element){return element->format==TSC_NUMERIC_BIG_SIGNED||element->format==TSC_NUMERIC_BIG_UNSIGNED;}
tsc_typed_array_witness_t tsc_typed_array_witness(const tsc_typed_array_t* view){
    if(!view->buffer||view->buffer->detached)return (tsc_typed_array_witness_t){0};
    size_t bytes=view->buffer->byte_length,width=elements[view->kind].width;
    if(view->offset>bytes||(!view->tracking&&view->length>(bytes-view->offset)/width))return (tsc_typed_array_witness_t){0};
    return (tsc_typed_array_witness_t){view->buffer->data+view->offset,view->tracking?(bytes-view->offset)/width:view->length,true};
}
bool tsc_typed_array_fixed_length(const tsc_object_t* object){
    if(object->is_buffer)return true;
    const tsc_typed_array_t* view=object->class_ptr;
    return !view->tracking&&!view->buffer->resizable;
}
static uint64_t read_bits(const uint8_t* bytes,size_t width){
    uint16_t endian=1;bool little=*(uint8_t*)&endian;uint64_t raw=0;
    for(size_t byte=0;byte<width;++byte)raw|=(uint64_t)bytes[byte]<<((little?byte:width-byte-1)*8);
    return raw;
}
static void write_bits(uint8_t* bytes,size_t width,uint64_t raw){
    uint16_t endian=1;bool little=*(uint8_t*)&endian;
    for(size_t byte=0;byte<width;++byte)bytes[byte]=(uint8_t)(raw>>((little?byte:width-byte-1)*8));
}
tsc_value_t tsc_typed_array_element_get(const tsc_object_t* object,size_t index){
    const tsc_typed_array_t* view=object->class_ptr;const element_t* element=&elements[view->kind];
    tsc_typed_array_witness_t witness=tsc_typed_array_witness(view);
    if(!witness.valid||index>=witness.length)return tsc_value_undefined();
    return tsc_numeric_bits_to_value(read_bits(witness.data+index*element->width,element->width),element->format,element->width);
}
void tsc_typed_array_element_set(tsc_object_t* object,double index,tsc_value_t value){
    tsc_object_t* volatile owner=object;void* volatile value_root=tsc_value_gc_root(value);
    tsc_typed_array_t* volatile view=owner->class_ptr;const element_t* element=&elements[view->kind];
    uint64_t raw;
    if(is_big(element)){
        tsc_value_t converted=tsc_value_to_bigint(value);tsc_bigint_t* volatile integer=tsc_value_as_bigint(converted);
        raw=tsc_bigint_to_uint64(integer);
    }else raw=tsc_numeric_number_to_bits(tsc_value_to_number(value),element->format,element->width);
    tsc_typed_array_witness_t witness=tsc_typed_array_witness(view);
    if(witness.valid&&isfinite(index)&&index>=0&&!(index==0&&signbit(index))&&floor(index)==index&&index<(double)witness.length)
        write_bits(witness.data+(size_t)index*element->width,element->width,raw);
    (void)value_root;
}
static void allocate_storage(tsc_typed_array_t* view,size_t length){
    size_t width=elements[view->kind].width;
    if(length>SIZE_MAX/width)tsc_throw_error(TSC_ERROR_RANGE,key("TypedArray length exceeds native storage"));
    size_t bytes=length*width;tsc_array_buffer_check_capacity(bytes);
    view->buffer=tsc_array_buffer_allocate(bytes,bytes,false);view->length=length;
}
static void initialize_buffer(tsc_typed_array_t* view,tsc_array_buffer_t* buffer,tsc_array_t* args){
    size_t width=elements[view->kind].width;
    double offset=tsc_value_to_index(argument(args,1));
    if(fmod(offset,(double)width)!=0)tsc_throw_error(TSC_ERROR_RANGE,key("TypedArray offset is not aligned"));
    tsc_value_t length_value=argument(args,2);bool has_length=!tsc_value_is_undefined(length_value);
    double length=has_length?tsc_value_to_index(length_value):0;
    if(buffer->detached)tsc_throw_error(TSC_ERROR_TYPE,key("TypedArray buffer is detached"));
    if(offset>(double)buffer->byte_length)tsc_throw_error(TSC_ERROR_RANGE,key("TypedArray view is outside its buffer"));
    size_t remaining=buffer->byte_length-(size_t)offset;
    if(!has_length&&!buffer->resizable&&buffer->byte_length%width)
        tsc_throw_error(TSC_ERROR_RANGE,key("TypedArray buffer length is not aligned"));
    if(has_length&&length>(double)(remaining/width))tsc_throw_error(TSC_ERROR_RANGE,key("TypedArray view is outside its buffer"));
    view->buffer=buffer;view->offset=(size_t)offset;view->tracking=!has_length&&buffer->resizable;
    view->length=has_length?(size_t)length:remaining/width;
}
static tsc_value_t constructor_call(void* environment,tsc_value_t receiver,tsc_array_t* args){
    (void)environment;(void)receiver;(void)args;
    tsc_throw_error(TSC_ERROR_TYPE,key("TypedArray constructor requires new"));return tsc_value_undefined();
}
static tsc_value_t abstract_construct(void* environment,tsc_value_t receiver,tsc_array_t* args){
    (void)environment;(void)receiver;(void)args;
    tsc_throw_error(TSC_ERROR_TYPE,key("TypedArray abstract constructor cannot be constructed"));return tsc_value_undefined();
}
static tsc_value_t concrete_construct(void* environment,tsc_value_t receiver,tsc_array_t* args){
    (void)receiver;const element_t* element=environment;tsc_array_t* volatile actuals=args;
    tsc_value_t first=argument(actuals,0);void* volatile first_root=tsc_value_gc_root(first);
    bool source_object=tsc_value_is_object(first);
    double numeric_length=source_object?0:tsc_value_to_index(first);
    tsc_value_t prototype=tsc_value_get_prototype_from_constructor(tsc_value_current_new_target(),element->prototype);
    void* volatile prototype_root=tsc_value_gc_root(prototype);
    tsc_typed_array_t* volatile view=TSC_GC_MALLOC(sizeof(*view));memset(view,0,sizeof(*view));view->kind=(tsc_element_kind_t)(element-elements);
    tsc_object_t* volatile object=tsc_object_new_class(view);object->is_typed_array=true;
    tsc_value_t result=tsc_value_object(object);(void)tsc_value_object_set_prototype_of(result,prototype);
    if(!source_object)allocate_storage(view,(size_t)numeric_length);
    else{
        tsc_object_t* source=typed_object(first);
        if(source){
            size_t length=tsc_integer_indexed_length(source);
            if(!source->is_buffer&&!tsc_typed_array_witness(source->class_ptr).valid)
                tsc_throw_error(TSC_ERROR_TYPE,key("TypedArray source is outside its buffer"));
            tsc_element_kind_t source_kind=source->is_buffer?TSC_ELEMENT_Uint8Array:((tsc_typed_array_t*)source->class_ptr)->kind;
            allocate_storage(view,length);
            if(is_big(element)!=is_big(&elements[source_kind]))tsc_throw_error(TSC_ERROR_TYPE,key("TypedArray content types differ"));
            if(view->kind==source_kind){
                const uint8_t* data=source->is_buffer?((tsc_buffer_t*)source->class_ptr)->data:tsc_typed_array_witness(source->class_ptr).data;
                if(length)memcpy(view->buffer->data,data,length*element->width);
            }else for(size_t index=0;index<length;++index)tsc_integer_indexed_set(object,(double)index,tsc_integer_indexed_get(source,(double)index));
        }else if(value_is_box(first)&&value_tag(first)==TSC_VALUE_TAG_OBJECT&&((tsc_object_t*)value_ptr(first))->is_array_buffer)
            initialize_buffer(view,((tsc_object_t*)value_ptr(first))->class_ptr,actuals);
        else{
            tsc_value_t method=tsc_value_get_symbol_prop(first,tsc_symbol_iterator());void* volatile method_root=tsc_value_gc_root(method);
            if(!tsc_value_is_nullish(method)){
                tsc_sync_iterator_t iterator=tsc_sync_iterator_open_with_method(first,method);
                tsc_array_t* volatile values=tsc_array_new(sizeof(tsc_value_t),1);tsc_array_use_value_storage(values);tsc_value_t value;
                while(tsc_sync_iterator_step(&iterator,&value)){void* volatile root=tsc_value_gc_root(value);tsc_array_push_raw(values,&value);(void)root;}
                allocate_storage(view,values->len);
                for(size_t index=0;index<values->len;++index)tsc_integer_indexed_set(object,(double)index,TSC_ARR(tsc_value_t,values,index));
            }else{
                size_t length=tsc_value_length_of_array_like(first);allocate_storage(view,length);
                for(size_t index=0;index<length;++index)tsc_integer_indexed_set(object,(double)index,tsc_value_get_prop(first,tsc_str_from_num((double)index)));
            }
            (void)method_root;
        }
    }
    (void)first_root;(void)prototype_root;return result;
}
typedef enum {LENGTH,BYTE_LENGTH,OFFSET,BUFFER,TAG,SPECIES,KEYS,VALUES,ENTRIES} member_kind_t;
typedef struct {const char* name;member_kind_t kind;bool getter;size_t arity;} member_t;
static const member_t members[]={{"length",LENGTH,true,0},{"byteLength",BYTE_LENGTH,true,0},{"byteOffset",OFFSET,true,0},{"buffer",BUFFER,true,0},{"[Symbol.toStringTag]",TAG,true,0},{"keys",KEYS,false,0},{"values",VALUES,false,0},{"entries",ENTRIES,false,0}};
static const member_t species_member={"[Symbol.species]",SPECIES,true,0};
static tsc_value_t member_apply(void* environment,tsc_value_t receiver,tsc_array_t* args){
    (void)args;const member_t* member=environment;
    if(member->kind==SPECIES)return receiver;
    tsc_object_t* object=typed_object(receiver);
    if(member->kind==TAG)return object?tsc_value_string(key(object->is_buffer?"Uint8Array":elements[((tsc_typed_array_t*)object->class_ptr)->kind].name)):tsc_value_undefined();
    object=require_typed(receiver);
    if(member->kind==KEYS||member->kind==VALUES||member->kind==ENTRIES){
        if(!object->is_buffer&&!tsc_typed_array_witness(object->class_ptr).valid)
            tsc_throw_error(TSC_ERROR_TYPE,key("TypedArray iterator view is outside its buffer"));
        return member->kind==KEYS?tsc_value_method_keys(receiver):member->kind==VALUES?tsc_value_method_values(receiver):tsc_value_method_entries(receiver);
    }
    if(object->is_buffer){
        tsc_buffer_t* buffer=object->class_ptr;
        if(member->kind==OFFSET)return tsc_value_num(0);
        if(member->kind==BUFFER)tsc_throw_error(TSC_ERROR_TYPE,key("Buffer backing ArrayBuffer integration is not represented"));
        return tsc_value_num((double)buffer->len);
    }
    tsc_typed_array_t* view=object->class_ptr;
    if(member->kind==BUFFER)return tsc_value_array_buffer(view->buffer);
    tsc_typed_array_witness_t witness=tsc_typed_array_witness(view);
    size_t number=member->kind==OFFSET?(witness.valid?view->offset:0):witness.length;
    if(member->kind==BYTE_LENGTH)number*=elements[view->kind].width;
    return tsc_value_num((double)number);
}
static void define_value(tsc_value_t owner,tsc_str_t* name,tsc_value_t value,bool writable,bool configurable){
    (void)tsc_value_define_property_desc(owner,name,value,true,true,writable,false,true,configurable,true);
}
static tsc_value_t define_member(tsc_value_t owner,const member_t* member,tsc_str_t* name){
    tsc_value_t function=tsc_value_function_named_kind(member_apply,NULL,(void*)member,member->arity,member->getter?tsc_str_concat(key("get "),key(member->name)):key(member->name),TSC_FUNCTION_IDENTITY_BUILTIN);
    void* volatile function_root=tsc_value_gc_root(function);
    if(member->getter){
        tsc_value_t descriptor=tsc_value_object(tsc_object_new());void* volatile descriptor_root=tsc_value_gc_root(descriptor);
        define_value(descriptor,key("get"),function,true,true);define_value(descriptor,key("configurable"),tsc_value_bool(true),true,true);
        (void)tsc_value_define_property_descriptor(owner,name,descriptor);(void)descriptor_root;
    }else define_value(owner,name,function,true,true);
    (void)function_root;return function;
}
static void initialize_intrinsic(intrinsic_t* intrinsic,const char* name,size_t arity,tsc_generic_function_t construct,void* environment,tsc_value_t parent,tsc_value_t prototype_parent){
    intrinsic->prototype=tsc_value_object(tsc_object_new_with_prototype(prototype_parent));intrinsic->prototype_root=tsc_value_gc_root(intrinsic->prototype);
    intrinsic->constructor=tsc_value_function_named_kind(constructor_call,construct,environment,arity,key(name),TSC_FUNCTION_IDENTITY_BUILTIN);
    tsc_function_identity_t* identity=value_ptr(intrinsic->constructor);intrinsic->constructor_root=identity;
    identity->construct_allocates_receiver=false;tsc_function_identity_set_own_prototype(identity,intrinsic->prototype);identity->func_prototype_writable=false;
    (void)tsc_value_set_prototype_of(intrinsic->constructor,parent);
    define_value(intrinsic->prototype,key("constructor"),intrinsic->constructor,true,true);
}
static typed_realm_t* typed_realm(void){
    typed_realm_t* realm=tsc_realm_state_get(&typed_realm_key);if(realm)return realm;
    realm=TSC_GC_MALLOC(sizeof(*realm));memset(realm,0,sizeof(*realm));tsc_realm_state_set(&typed_realm_key,realm);
    initialize_intrinsic(&realm->abstract,"TypedArray",0,abstract_construct,NULL,tsc_function_default_prototype(),tsc_value_object_prototype());
    define_member(realm->abstract.constructor,&species_member,tsc_symbol_property_key(tsc_symbol_species()));
    for(size_t index=0;index<sizeof(members)/sizeof(members[0]);++index){
        const member_t* member=&members[index];tsc_str_t* name=member->kind==TAG?tsc_symbol_property_key(tsc_symbol_to_string_tag()):key(member->name);
        tsc_value_t function=define_member(realm->abstract.prototype,member,name);
        if(member->kind==VALUES)define_value(realm->abstract.prototype,tsc_symbol_property_key(tsc_symbol_iterator()),function,true,true);
    }
    for(size_t index=0;index<TSC_ELEMENT_COUNT;++index){
        intrinsic_t* intrinsic=&realm->concrete[index];const element_t* element=&elements[index];
        initialize_intrinsic(intrinsic,element->name,3,concrete_construct,(void*)element,realm->abstract.constructor,realm->abstract.prototype);
        ((tsc_function_identity_t*)value_ptr(intrinsic->constructor))->construct_default_prototype=element->prototype;
        define_value(intrinsic->constructor,key("BYTES_PER_ELEMENT"),tsc_value_num((double)element->width),false,false);
        define_value(intrinsic->prototype,key("BYTES_PER_ELEMENT"),tsc_value_num((double)element->width),false,false);
    }
    return realm;
}
tsc_value_t tsc_typed_array_constructor_value(tsc_element_kind_t kind){return typed_realm()->concrete[kind].constructor;}
tsc_value_t tsc_typed_array_prototype_value(tsc_element_kind_t kind){return typed_realm()->concrete[kind].prototype;}
