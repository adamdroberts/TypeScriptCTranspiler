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
    size_t bytes=tsc_array_buffer_length(view->buffer),width=elements[view->kind].width;
    if(view->offset>bytes||(!view->tracking&&view->length>(bytes-view->offset)/width))return (tsc_typed_array_witness_t){0};
    return (tsc_typed_array_witness_t){view->buffer->data+view->offset,view->tracking?(bytes-view->offset)/width:view->length,true};
}
bool tsc_typed_array_fixed_length(const tsc_object_t* object){
    if(object->is_buffer)return true;
    const tsc_typed_array_t* view=object->class_ptr;
    return !view->tracking&&(view->buffer->shared||!view->buffer->resizable);
}
tsc_byte_source_t tsc_value_byte_source(tsc_value_t value, bool allow_array_buffer) {
    if (!value_is_box(value) || value_tag(value) != TSC_VALUE_TAG_OBJECT) return (tsc_byte_source_t){0};
    const tsc_object_t* object = value_ptr(value);
    if (!object->class_ptr) return (tsc_byte_source_t){0};
    if (object->is_buffer) {
        const tsc_buffer_t* buffer = object->class_ptr;
        return (tsc_byte_source_t){NULL, buffer->data, buffer->len, 0, true};
    }
    if (object->is_typed_array) {
        const tsc_typed_array_t* view = object->class_ptr;
        tsc_typed_array_witness_t witness = tsc_typed_array_witness(view);
        return (tsc_byte_source_t){view->buffer, witness.data, witness.length * elements[view->kind].width, view->offset, witness.valid};
    }
    if (object->is_data_view) {
        const tsc_data_view_t* view = object->class_ptr;
        tsc_data_view_witness_t witness = tsc_data_view_witness(view);
        return (tsc_byte_source_t){view->buffer, witness.data, witness.length, witness.offset, true};
    }
    if (allow_array_buffer && object->is_array_buffer) {
        tsc_array_buffer_t* buffer = object->class_ptr;
        return (tsc_byte_source_t){buffer, buffer->data, tsc_array_buffer_length(buffer), 0, !buffer->detached};
    }
    return (tsc_byte_source_t){0};
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
    return tsc_numeric_bits_to_value(tsc_array_buffer_read_bits(view->buffer,view->offset+index*element->width,element->width,*(uint8_t*)&(uint16_t){1}),element->format,element->width);
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
        tsc_array_buffer_write_bits(view->buffer,view->offset+(size_t)index*element->width,element->width,*(uint8_t*)&(uint16_t){1},raw);
    (void)value_root;
}
/* Scalar accesses and byte-copy consumers use the same retained block API;
 * Buffer is the existing byte-owner adapter at this boundary. */
static uint64_t owner_read_bits(tsc_object_t* object,size_t offset,size_t width){
    if(object->is_buffer)return read_bits(((tsc_buffer_t*)object->class_ptr)->data+offset,width);
    tsc_typed_array_t* view=object->class_ptr;
    return tsc_array_buffer_read_bits(view->buffer,view->offset+offset,width,*(uint8_t*)&(uint16_t){1});
}
static void owner_write_bits(tsc_object_t* object,size_t offset,size_t width,uint64_t raw){
    if(object->is_buffer){write_bits(((tsc_buffer_t*)object->class_ptr)->data+offset,width,raw);return;}
    tsc_typed_array_t* view=object->class_ptr;
    tsc_array_buffer_write_bits(view->buffer,view->offset+offset,width,*(uint8_t*)&(uint16_t){1},raw);
}
static const void* owner_block(tsc_object_t* object){
    if(object->is_buffer){tsc_buffer_t* buffer=object->class_ptr;return buffer->data_owner?buffer->data_owner:buffer->data;}
    tsc_array_buffer_t* buffer=((tsc_typed_array_t*)object->class_ptr)->buffer;
    return buffer->shared?buffer->shared_storage:buffer;
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
    size_t current=tsc_array_buffer_length(buffer);
    if(offset>(double)current)tsc_throw_error(TSC_ERROR_RANGE,key("TypedArray view is outside its buffer"));
    size_t remaining=current-(size_t)offset;
    if(!has_length&&!buffer->resizable&&current%width)
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
                for(size_t byte=0;byte<length*element->width;++byte)view->buffer->data[byte]=(uint8_t)owner_read_bits(source,byte,1);
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
tsc_value_t tsc_typed_array_create_from_constructor(tsc_value_t constructor,tsc_array_t* args){
    void* volatile constructor_root=tsc_value_gc_root(constructor);tsc_array_t* volatile actuals=args;
    tsc_value_t result=tsc_value_construct_with_new_target(constructor,tsc_value_array(actuals),constructor);
    void* volatile result_root=tsc_value_gc_root(result);tsc_object_t* object=require_typed(result);
    if((!object->is_buffer&&!tsc_typed_array_witness(object->class_ptr).valid)||
        (actuals->len==1&&!value_is_box(TSC_ARR(tsc_value_t,actuals,0))&&
        (double)tsc_integer_indexed_length(object)<tsc_value_to_number(TSC_ARR(tsc_value_t,actuals,0))))
        tsc_throw_error(TSC_ERROR_TYPE,key("TypedArray constructor result cannot hold the requested elements"));
    (void)constructor_root;(void)result_root;return result;
}
typedef enum {LENGTH,BYTE_LENGTH,OFFSET,BUFFER,TAG,SPECIES,KEYS,VALUES,ENTRIES,FROM,OF} member_kind_t;
typedef struct {const char* name;member_kind_t kind;bool getter;size_t arity;} member_t;
static const member_t members[]={{"length",LENGTH,true,0},{"byteLength",BYTE_LENGTH,true,0},{"byteOffset",OFFSET,true,0},{"buffer",BUFFER,true,0},{"[Symbol.toStringTag]",TAG,true,0},{"keys",KEYS,false,0},{"values",VALUES,false,0},{"entries",ENTRIES,false,0}};
static const member_t species_member={"[Symbol.species]",SPECIES,true,0};
static const member_t factory_members[]={{"from",FROM,false,1},{"of",OF,false,0}};
static tsc_value_t factory_apply(const member_t* member,tsc_value_t constructor,tsc_array_t* args){
    void* volatile constructor_root=tsc_value_gc_root(constructor);tsc_array_t* volatile actuals=args;
    if(!tsc_value_is_constructable(constructor))tsc_throw_error(TSC_ERROR_TYPE,key("TypedArray factory requires a constructor"));
    tsc_value_t source=argument(actuals,0),mapper=member->kind==FROM?argument(actuals,1):tsc_value_undefined();
    void* volatile source_root=tsc_value_gc_root(source);void* volatile mapper_root=tsc_value_gc_root(mapper);
    bool mapping=!tsc_value_is_undefined(mapper);
    if(mapping&&!tsc_value_is_callable(mapper))tsc_throw_error(TSC_ERROR_TYPE,key("TypedArray mapper is not callable"));
    tsc_array_t* volatile values=member->kind==OF?actuals:NULL;
    tsc_value_t array_like=tsc_value_undefined();void* volatile array_like_root=NULL;
    size_t length;
    if(member->kind==OF)length=actuals?actuals->len:0;
    else{
        tsc_value_t method=tsc_value_get_symbol_prop(source,tsc_symbol_iterator());void* volatile method_root=tsc_value_gc_root(method);
        if(!tsc_value_is_nullish(method)){
            tsc_sync_iterator_t iterator=tsc_sync_iterator_open_with_method(source,method);
            values=tsc_array_new(sizeof(tsc_value_t),1);tsc_array_use_value_storage(values);tsc_value_t value;
            while(tsc_sync_iterator_step(&iterator,&value)){void* volatile value_root=tsc_value_gc_root(value);tsc_array_push_raw(values,&value);(void)value_root;}
            length=values->len;
        }else{
            array_like=tsc_value_to_object(source);array_like_root=tsc_value_gc_root(array_like);length=tsc_value_length_of_array_like(array_like);
        }
        (void)method_root;
    }
    tsc_array_t* volatile parameters=tsc_array_new(sizeof(tsc_value_t),1);tsc_array_use_value_storage(parameters);
    tsc_value_t count=tsc_value_num((double)length);tsc_array_push_raw(parameters,&count);
    tsc_value_t result=tsc_typed_array_create_from_constructor(constructor,parameters);void* volatile result_root=tsc_value_gc_root(result);
    for(size_t index=0;index<length;++index){
        tsc_str_t* property=tsc_str_from_num((double)index);
        tsc_value_t value=values?TSC_ARR(tsc_value_t,values,index):tsc_value_get_prop(array_like,property);void* volatile value_root=tsc_value_gc_root(value);
        if(mapping){
            tsc_array_t* volatile arguments=tsc_array_new(sizeof(tsc_value_t),2);tsc_array_use_value_storage(arguments);
            tsc_array_push_raw(arguments,&value);tsc_value_t position=tsc_value_num((double)index);tsc_array_push_raw(arguments,&position);
            value=tsc_value_apply_function(mapper,argument(actuals,2),tsc_value_array(arguments));value_root=tsc_value_gc_root(value);
        }
        if(!tsc_value_set_prop(result,property,value))tsc_throw_error(TSC_ERROR_TYPE,key("TypedArray factory element assignment failed"));
        (void)value_root;
    }
    (void)constructor_root;(void)source_root;(void)mapper_root;(void)array_like_root;(void)result_root;return result;
}
static tsc_value_t member_apply(void* environment,tsc_value_t receiver,tsc_array_t* args){
    (void)args;const member_t* member=environment;
    if(member->kind==SPECIES)return receiver;
    if(member->kind==FROM||member->kind==OF)return factory_apply(member,receiver,args);
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
typedef enum {AT,INCLUDES,INDEX_OF,FOR_EACH,MAP,FILTER,SOME,EVERY,FIND,FIND_INDEX,REDUCE,COPY_WITHIN,FILL,REVERSE,SLICE,SUBARRAY,SET,TO_REVERSED,WITH,SORT,TO_SORTED,JOIN,LOCALE_STRING} traversal_kind_t;
typedef struct {const char* name;traversal_kind_t kind;bool reverse;size_t arity;} traversal_t;
static const traversal_t traversals[]={
#define TSC_TYPED_METHOD(name, kind, reverse, arity) {#name,kind,reverse,arity},
#include "tsc_typed_array_methods.def"
#undef TSC_TYPED_METHOD
};
static tsc_element_kind_t owner_kind(const tsc_object_t* object){return object->is_buffer?TSC_ELEMENT_Uint8Array:((tsc_typed_array_t*)object->class_ptr)->kind;}
static tsc_array_t* length_arguments(size_t length){
    tsc_array_t* args=tsc_array_new(sizeof(tsc_value_t),1);tsc_array_use_value_storage(args);tsc_value_t count=tsc_value_num((double)length);tsc_array_push_raw(args,&count);return args;
}
static tsc_value_t species_create(tsc_value_t exemplar,tsc_array_t* args){
    void* volatile exemplar_root=tsc_value_gc_root(exemplar);tsc_element_kind_t kind=owner_kind(require_typed(exemplar));
    tsc_array_t* volatile actuals=args;
    tsc_value_t constructor=tsc_value_species_constructor(exemplar,tsc_typed_array_constructor_value(kind));void* volatile constructor_root=tsc_value_gc_root(constructor);
    tsc_value_t result=tsc_typed_array_create_from_constructor(constructor,actuals);void* volatile result_root=tsc_value_gc_root(result);
    if(is_big(&elements[kind])!=is_big(&elements[owner_kind(require_typed(result))]))tsc_throw_error(TSC_ERROR_TYPE,key("TypedArray species content types differ"));
    (void)exemplar_root;(void)constructor_root;(void)result_root;return result;
}
static tsc_typed_array_witness_t owner_witness(const tsc_object_t* object){
    if(object->is_buffer){const tsc_buffer_t* buffer=object->class_ptr;return (tsc_typed_array_witness_t){buffer->data,buffer->len,true};}
    return tsc_typed_array_witness(object->class_ptr);
}
static tsc_typed_array_witness_t require_witness(const tsc_object_t* object){
    tsc_typed_array_witness_t witness=owner_witness(object);
    if(!witness.valid)tsc_throw_error(TSC_ERROR_TYPE,key("TypedArray view is outside its buffer"));return witness;
}
tsc_integer_typed_array_record_t tsc_typed_array_atomic_record(tsc_value_t value,bool waitable){
    tsc_object_t* object=require_typed(value);tsc_typed_array_witness_t witness=require_witness(object);
    tsc_element_kind_t kind=owner_kind(object);const element_t* element=&elements[kind];
    if(waitable?(kind!=TSC_ELEMENT_Int32Array&&kind!=TSC_ELEMENT_BigInt64Array):(element->format==TSC_NUMERIC_FLOAT||element->format==TSC_NUMERIC_CLAMPED))
        tsc_throw_error(TSC_ERROR_TYPE,key("Atomics requires an appropriate integer TypedArray"));
    tsc_typed_array_t* view=object->is_buffer?NULL:object->class_ptr;
    return (tsc_integer_typed_array_record_t){object,view?view->buffer:NULL,view?view->offset:0,witness.length,element->width,element->format,kind};
}
void tsc_typed_array_atomic_revalidate(const tsc_integer_typed_array_record_t* record,size_t index){
    tsc_typed_array_witness_t witness=require_witness(record->object);
    if(index>=witness.length)tsc_throw_error(TSC_ERROR_RANGE,key("Atomic element extent is outside its current buffer"));
}
static size_t relative_index(tsc_value_t value,size_t length){
    double relative=tsc_value_to_integer_or_infinity(value);
    return (size_t)(relative<0?fmax((double)length+relative,0):fmin(relative,(double)length));
}
static tsc_value_t numeric_value(tsc_value_t value,const element_t* element){return is_big(element)?tsc_value_to_bigint(value):tsc_value_num(tsc_value_to_number(value));}
static tsc_value_t mutation_apply(const traversal_t* operation,tsc_value_t receiver,tsc_array_t* args){
    void* volatile receiver_root=tsc_value_gc_root(receiver);tsc_array_t* volatile actuals=args;tsc_object_t* volatile object=require_typed(receiver);
    tsc_element_kind_t kind=owner_kind(object);const element_t* element=&elements[kind];
    if(operation->kind==SET){
        double offset=tsc_value_to_integer_or_infinity(argument(actuals,1));
        if(offset<0)tsc_throw_error(TSC_ERROR_RANGE,key("TypedArray set offset is negative"));
        tsc_typed_array_witness_t target=require_witness(object);size_t length=target.length;
        tsc_value_t source_value=argument(actuals,0);void* volatile source_root=tsc_value_gc_root(source_value);tsc_object_t* source=typed_object(source_value);
        if(source){
            tsc_typed_array_witness_t input=require_witness(source);tsc_element_kind_t source_kind=owner_kind(source);const element_t* source_element=&elements[source_kind];
            if(!isfinite(offset)||offset>(double)length||input.length>length-(size_t)offset)tsc_throw_error(TSC_ERROR_RANGE,key("TypedArray set source exceeds target length"));
            if(is_big(element)!=is_big(source_element))tsc_throw_error(TSC_ERROR_TYPE,key("TypedArray set content types differ"));
            /* Clone only an aliased backing block. Distinct shared sources keep
             * each read sequenced immediately before its corresponding write. */
            uint8_t* volatile snapshot=NULL;size_t bytes=input.length*source_element->width;
            if(owner_block(source)==owner_block(object)){
                snapshot=TSC_GC_MALLOC_ATOMIC(bytes?bytes:1);
                for(size_t byte=0;byte<bytes;++byte)snapshot[byte]=(uint8_t)owner_read_bits(source,byte,1);
            }
            if(kind==source_kind){
                for(size_t byte=0;byte<bytes;++byte){uint64_t raw=snapshot?snapshot[byte]:owner_read_bits(source,byte,1);owner_write_bits(object,(size_t)offset*element->width+byte,1,raw);}
            }
            else for(size_t index=0;index<input.length;++index){
                uint64_t raw=snapshot?read_bits(snapshot+index*source_element->width,source_element->width):owner_read_bits(source,index*source_element->width,source_element->width);
                tsc_value_t value=tsc_numeric_bits_to_value(raw,source_element->format,source_element->width);
                tsc_integer_indexed_set(object,offset+(double)index,value);
            }
        }else{
            tsc_value_t source_object=tsc_value_to_object(source_value);void* volatile source_object_root=tsc_value_gc_root(source_object);
            size_t input_length=tsc_value_length_of_array_like(source_object);
            if(!isfinite(offset)||offset>(double)length||input_length>length-(size_t)offset)tsc_throw_error(TSC_ERROR_RANGE,key("TypedArray set source exceeds target length"));
            for(size_t index=0;index<input_length;++index)tsc_integer_indexed_set(object,offset+(double)index,tsc_value_get_prop(source_object,tsc_str_from_num((double)index)));
            (void)source_object_root;
        }
        (void)source_root;return tsc_value_undefined();
    }
    tsc_typed_array_witness_t initial=operation->kind==SUBARRAY?owner_witness(object):require_witness(object);size_t length=initial.length;
    if(operation->kind==REVERSE){
        for(size_t index=0;index<length/2;++index){
            size_t upper=length-1-index;tsc_value_t lower_value=tsc_integer_indexed_get(object,(double)index);void* volatile lower_root=tsc_value_gc_root(lower_value);
            tsc_value_t upper_value=tsc_integer_indexed_get(object,(double)upper);void* volatile upper_root=tsc_value_gc_root(upper_value);
            tsc_integer_indexed_set(object,(double)index,upper_value);tsc_integer_indexed_set(object,(double)upper,lower_value);(void)lower_root;(void)upper_root;
        }
        return receiver;
    }
    if(operation->kind==TO_REVERSED||operation->kind==WITH){
        double replacement_index=-1;tsc_value_t replacement=tsc_value_undefined();void* volatile replacement_root=NULL;
        if(operation->kind==WITH){
            double relative=tsc_value_to_integer_or_infinity(argument(actuals,0));replacement_index=relative<0?(double)length+relative:relative;
            replacement=numeric_value(argument(actuals,1),element);replacement_root=tsc_value_gc_root(replacement);
            if(!tsc_integer_indexed_valid(object,replacement_index))tsc_throw_error(TSC_ERROR_RANGE,key("TypedArray replacement index is invalid"));
        }
        tsc_value_t result=tsc_typed_array_create_from_constructor(tsc_typed_array_constructor_value(kind),length_arguments(length));void* volatile result_root=tsc_value_gc_root(result);
        for(size_t index=0;index<length;++index){
            size_t source_index=operation->kind==TO_REVERSED?length-1-index:index;
            tsc_value_t value=(double)index==replacement_index?replacement:tsc_integer_indexed_get(object,(double)source_index);
            (void)tsc_value_set_prop(result,tsc_str_from_num((double)index),value);
        }
        (void)replacement_root;(void)result_root;return result;
    }
    if(operation->kind==FILL){
        tsc_value_t value=numeric_value(argument(actuals,0),element);void* volatile value_root=tsc_value_gc_root(value);
        size_t start=relative_index(argument(actuals,1),length);tsc_value_t end_value=argument(actuals,2);
        size_t end=tsc_value_is_undefined(end_value)?length:relative_index(end_value,length);tsc_typed_array_witness_t current=require_witness(object);
        if(end>current.length)end=current.length;
        for(size_t index=start;index<end;++index)tsc_integer_indexed_set(object,(double)index,value);
        (void)value_root;return receiver;
    }
    if(operation->kind==COPY_WITHIN){
        size_t target=relative_index(argument(actuals,0),length),start=relative_index(argument(actuals,1),length);
        tsc_value_t end_value=argument(actuals,2);size_t end=tsc_value_is_undefined(end_value)?length:relative_index(end_value,length);
        size_t count=end>start?end-start:0;if(count>length-target)count=length-target;
        if(count){
            tsc_typed_array_witness_t current=require_witness(object);
            if(start>=current.length||target>=current.length)count=0;
            else{if(count>current.length-start)count=current.length-start;if(count>current.length-target)count=current.length-target;}
            size_t bytes=count*element->width;bool backwards=start<target&&target<start+count;
            for(size_t step=0;step<bytes;++step){size_t byte=backwards?bytes-step-1:step;uint64_t raw=owner_read_bits(object,start*element->width+byte,1);owner_write_bits(object,target*element->width+byte,1,raw);}
        }
        return receiver;
    }
    size_t start=relative_index(argument(actuals,0),length);
    tsc_value_t end_value=argument(actuals,1);
    if(operation->kind==SUBARRAY){
        if(object->is_buffer)tsc_throw_error(TSC_ERROR_TYPE,key("Buffer backing ArrayBuffer integration is not represented"));
        tsc_typed_array_t* view=object->class_ptr;tsc_array_t* volatile parameters=tsc_array_new(sizeof(tsc_value_t),3);tsc_array_use_value_storage(parameters);
        tsc_value_t buffer=tsc_value_array_buffer(view->buffer);tsc_array_push_raw(parameters,&buffer);tsc_value_t offset=tsc_value_num((double)(view->offset+start*element->width));tsc_array_push_raw(parameters,&offset);
        if(!view->tracking||!tsc_value_is_undefined(end_value)){size_t end=tsc_value_is_undefined(end_value)?length:relative_index(end_value,length);tsc_value_t count=tsc_value_num((double)(end>start?end-start:0));tsc_array_push_raw(parameters,&count);}
        return species_create(receiver,parameters);
    }
    size_t end=tsc_value_is_undefined(end_value)?length:relative_index(end_value,length),count=end>start?end-start:0;
    tsc_value_t result=species_create(receiver,length_arguments(count));void* volatile result_root=tsc_value_gc_root(result);
    if(count){
        tsc_typed_array_witness_t current=require_witness(object);if(end>current.length)end=current.length;count=end>start?end-start:0;
        tsc_object_t* destination=require_typed(result);
        if(kind==owner_kind(destination)){
            (void)require_witness(destination);
            /* Slice's normative byte loop runs forward even for aliased custom
             * species results; an overlap-safe bulk copy would change it. */
            for(size_t byte=0;byte<count*element->width;++byte){uint64_t raw=owner_read_bits(object,start*element->width+byte,1);owner_write_bits(destination,byte,1,raw);}
        }else for(size_t index=0;index<count;++index)(void)tsc_value_set_prop(result,tsc_str_from_num((double)index),tsc_integer_indexed_get(object,(double)(start+index)));
    }
    (void)receiver_root;(void)result_root;return result;
}
static tsc_value_t traversal_apply(void* environment,tsc_value_t receiver,tsc_array_t* args){
    const traversal_t* operation=environment;void* volatile receiver_root=tsc_value_gc_root(receiver);tsc_array_t* volatile actuals=args;
    if(operation->kind==JOIN||operation->kind==LOCALE_STRING){
        size_t length=require_witness(require_typed(receiver)).length;
        return tsc_value_stringify_indexed_range(receiver,length,operation->kind==JOIN?argument(actuals,0):tsc_value_undefined(),operation->kind==LOCALE_STRING);
    }
    if(operation->kind==SORT||operation->kind==TO_SORTED){
        tsc_value_t comparator=argument(actuals,0);void* volatile comparator_root=tsc_value_gc_root(comparator);
        if(!tsc_value_is_undefined(comparator)&&!tsc_value_is_callable(comparator))tsc_throw_error(TSC_ERROR_TYPE,key("TypedArray sort comparator is not callable"));
        tsc_object_t* object=require_typed(receiver);size_t length=require_witness(object).length;
        tsc_value_t result=operation->kind==SORT?receiver:tsc_typed_array_create_from_constructor(tsc_typed_array_constructor_value(owner_kind(object)),length_arguments(length));void* volatile result_root=tsc_value_gc_root(result);
        tsc_array_t* volatile values=tsc_array_new(sizeof(tsc_value_t),length);tsc_array_use_value_storage(values);
        for(size_t index=0;index<length;++index){tsc_value_t value=tsc_integer_indexed_get(object,(double)index);void* volatile value_root=tsc_value_gc_root(value);tsc_array_push_raw(values,&value);(void)value_root;}
        tsc_value_sort_values(values,comparator,true);
        for(size_t index=0;index<length;++index)(void)tsc_value_set_prop(result,tsc_str_from_num((double)index),TSC_ARR(tsc_value_t,values,index));
        (void)comparator_root;(void)result_root;return result;
    }
    if(operation->kind>=COPY_WITHIN)return mutation_apply(operation,receiver,actuals);
    tsc_object_t* object=require_typed(receiver);
    if(!object->is_buffer&&!tsc_typed_array_witness(object->class_ptr).valid)tsc_throw_error(TSC_ERROR_TYPE,key("TypedArray traversal view is outside its buffer"));
    size_t length=tsc_integer_indexed_length(object);tsc_value_t first=argument(actuals,0);void* volatile first_root=tsc_value_gc_root(first);
    if(operation->kind==AT){
        double relative=tsc_value_to_integer_or_infinity(first),index=relative<0?(double)length+relative:relative;
        return index<0||index>=(double)length?tsc_value_undefined():tsc_value_get_prop(receiver,tsc_str_from_num(index));
    }
    if(operation->kind==INCLUDES||operation->kind==INDEX_OF){
        tsc_value_t absent=operation->kind==INCLUDES?tsc_value_bool(false):tsc_value_num(-1);
        if(!length)return absent;
        double relative=operation->reverse&&(!actuals||actuals->len<2)?(double)length-1:tsc_value_to_integer_or_infinity(argument(actuals,1));
        double start=relative<0?(double)length+relative:relative;
        if(operation->reverse)start=fmin(start,(double)length-1);else start=fmax(start,0);
        if(start<0||start>=(double)length)return absent;
        size_t index=(size_t)start;
        for(;;){
            tsc_str_t* property=tsc_str_from_num((double)index);
            if(operation->kind==INCLUDES||tsc_value_has_prop(receiver,property)){
                tsc_value_t value=tsc_value_get_prop(receiver,property);void* volatile value_root=tsc_value_gc_root(value);
                bool equal=operation->kind==INCLUDES?tsc_value_same_value_zero(first,value):tsc_value_eq(first,value);
                if(equal)return operation->kind==INCLUDES?tsc_value_bool(true):tsc_value_num((double)index);
                (void)value_root;
            }
            if(operation->reverse){if(!index)break;--index;}else if(++index==length)break;
        }
        return absent;
    }
    if(!tsc_value_is_callable(first))tsc_throw_error(TSC_ERROR_TYPE,key("TypedArray callback is not callable"));
    bool reduce=operation->kind==REDUCE,has_initial=actuals&&actuals->len>1;
    if(reduce&&!length&&!has_initial)tsc_throw_error(TSC_ERROR_TYPE,key("TypedArray reduce requires an initial value for an empty view"));
    tsc_value_t accumulator=reduce&&has_initial?argument(actuals,1):tsc_value_undefined();void* volatile accumulator_root=tsc_value_gc_root(accumulator);
    tsc_value_t result=operation->kind==MAP?species_create(receiver,length_arguments(length)):tsc_value_undefined();void* volatile result_root=tsc_value_gc_root(result);
    tsc_array_t* volatile kept=NULL;if(operation->kind==FILTER){kept=tsc_array_new(sizeof(tsc_value_t),1);tsc_array_use_value_storage(kept);}
    size_t consumed=0;
    if(reduce&&!has_initial){size_t index=operation->reverse?length-1:0;accumulator=tsc_value_get_prop(receiver,tsc_str_from_num((double)index));accumulator_root=tsc_value_gc_root(accumulator);consumed=1;}
    for(;consumed<length;++consumed){
        size_t index=operation->reverse?length-1-consumed:consumed;tsc_str_t* property=tsc_str_from_num((double)index);
        tsc_value_t value=tsc_value_get_prop(receiver,property);void* volatile value_root=tsc_value_gc_root(value);
        tsc_array_t* volatile parameters=tsc_array_new(sizeof(tsc_value_t),reduce?4:3);tsc_array_use_value_storage(parameters);
        if(reduce)tsc_array_push_raw(parameters,&accumulator);tsc_array_push_raw(parameters,&value);
        tsc_value_t position=tsc_value_num((double)index);tsc_array_push_raw(parameters,&position);tsc_array_push_raw(parameters,&receiver);
        tsc_value_t selected=tsc_value_apply_function(first,reduce?tsc_value_undefined():argument(actuals,1),tsc_value_array(parameters));void* volatile selected_root=tsc_value_gc_root(selected);
        bool truth=tsc_value_is_truthy(selected);
        switch(operation->kind){
            case REDUCE:accumulator=selected;accumulator_root=tsc_value_gc_root(accumulator);break;
            case MAP:if(!tsc_value_set_prop(result,property,selected))tsc_throw_error(TSC_ERROR_TYPE,key("TypedArray mapped element assignment failed"));break;
            case FILTER:if(truth)tsc_array_push_raw(kept,&value);break;
            case SOME:if(truth)return tsc_value_bool(true);break;
            case EVERY:if(!truth)return tsc_value_bool(false);break;
            case FIND:if(truth)return value;break;
            case FIND_INDEX:if(truth)return tsc_value_num((double)index);break;
            default:break;
        }
        (void)value_root;(void)selected_root;
    }
    if(operation->kind==FILTER){
        result=species_create(receiver,length_arguments(kept->len));result_root=tsc_value_gc_root(result);
        for(size_t index=0;index<kept->len;++index)if(!tsc_value_set_prop(result,tsc_str_from_num((double)index),TSC_ARR(tsc_value_t,kept,index)))
            tsc_throw_error(TSC_ERROR_TYPE,key("TypedArray filtered element assignment failed"));
    }
    (void)receiver_root;(void)first_root;(void)accumulator_root;(void)result_root;
    return reduce?accumulator:operation->kind==MAP||operation->kind==FILTER?result:operation->kind==SOME?tsc_value_bool(false):operation->kind==EVERY?tsc_value_bool(true):operation->kind==FIND_INDEX?tsc_value_num(-1):tsc_value_undefined();
}
/* ES2026 Uint8Array base64/hex (sec-uint8array-objects). Strings are WTF-8;
 * every accepted character is ASCII and decoding stops at the first non-ASCII
 * byte, so byte positions equal UTF-16 positions wherever [[Read]] is
 * reported. Decoding never invokes user code. */
typedef enum {CODEC_FROM_BASE64,CODEC_FROM_HEX,CODEC_SET_FROM_BASE64,CODEC_SET_FROM_HEX,CODEC_TO_BASE64,CODEC_TO_HEX} codec_kind_t;
typedef struct {const char* name;codec_kind_t kind;size_t arity;bool on_constructor;} codec_member_t;
static const codec_member_t codec_members[]={
    {"fromBase64",CODEC_FROM_BASE64,1,true},{"fromHex",CODEC_FROM_HEX,1,true},
    {"setFromBase64",CODEC_SET_FROM_BASE64,1,false},{"setFromHex",CODEC_SET_FROM_HEX,1,false},
    {"toBase64",CODEC_TO_BASE64,0,false},{"toHex",CODEC_TO_HEX,0,false}};
typedef enum {CHUNK_LOOSE,CHUNK_STRICT,CHUNK_STOP_BEFORE_PARTIAL} last_chunk_t;
typedef struct {size_t read,written;bool error;} codec_result_t;
static size_t codec_skip_space(const tsc_str_t* s,size_t index){
    while(index<s->len){
        unsigned char c=(unsigned char)s->data[index];
        if(c!=0x09&&c!=0x0a&&c!=0x0c&&c!=0x0d&&c!=0x20)break;
        ++index;
    }
    return index;
}
/* DecodeFinalBase64Chunk: false reports nonzero padding bits in strict mode. */
static bool codec_final_chunk(const int* chunk,size_t chunk_length,bool strict,uint8_t* out,codec_result_t* result){
    int third=chunk_length>2?chunk[2]:0;
    uint8_t first=(uint8_t)(chunk[0]<<2|chunk[1]>>4),second=(uint8_t)((chunk[1]&15)<<4|third>>2),last=(uint8_t)((third&3)<<6);
    if(chunk_length==2){
        if(strict&&second)return false;
        out[result->written++]=first;return true;
    }
    if(strict&&last)return false;
    out[result->written++]=first;out[result->written++]=second;return true;
}
/* FromBase64; out holds at least min(max, s->len) bytes. */
static codec_result_t codec_from_base64(const tsc_str_t* s,bool url,last_chunk_t last,size_t max,uint8_t* out){
    codec_result_t result={0,0,false};
    if(max==0)return result;
    int chunk[4];size_t chunk_length=0,index=0,length=s->len;
    for(;;){
        index=codec_skip_space(s,index);
        if(index==length){
            if(chunk_length>0){
                if(last==CHUNK_STOP_BEFORE_PARTIAL)return result;
                if(last==CHUNK_STRICT||chunk_length==1){result.error=true;return result;}
                (void)codec_final_chunk(chunk,chunk_length,false,out,&result);
            }
            result.read=length;return result;
        }
        unsigned char c=(unsigned char)s->data[index++];
        if(c=='='){
            if(chunk_length<2){result.error=true;return result;}
            index=codec_skip_space(s,index);
            if(chunk_length==2){
                if(index==length){
                    if(last!=CHUNK_STOP_BEFORE_PARTIAL)result.error=true;
                    return result;
                }
                if(s->data[index]=='=')index=codec_skip_space(s,index+1);
            }
            if(index<length||!codec_final_chunk(chunk,chunk_length,last==CHUNK_STRICT,out,&result)){result.error=true;return result;}
            result.read=length;return result;
        }
        if(url){
            if(c=='+'||c=='/'){result.error=true;return result;}
            if(c=='-')c='+';else if(c=='_')c='/';
        }
        int value=base64_value(c);
        if(value<0){result.error=true;return result;}
        size_t remaining=max-result.written;
        if((remaining==1&&chunk_length==2)||(remaining==2&&chunk_length==3))return result;
        chunk[chunk_length++]=value;
        if(chunk_length==4){
            out[result.written++]=(uint8_t)(chunk[0]<<2|chunk[1]>>4);
            out[result.written++]=(uint8_t)((chunk[1]&15)<<4|chunk[2]>>2);
            out[result.written++]=(uint8_t)((chunk[2]&3)<<6|chunk[3]);
            chunk_length=0;result.read=index;
            if(result.written==max)return result;
        }
    }
}
/* FromHex; parity uses the UTF-16 length, hexits are read bytewise. */
static codec_result_t codec_from_hex(const tsc_str_t* s,size_t max,uint8_t* out){
    codec_result_t result={0,0,false};
    if(tsc_str_utf16_length(s)%2){result.error=true;return result;}
    while(result.read<s->len&&result.written<max){
        int high=hex_value((unsigned char)s->data[result.read]);
        int low=result.read+1<s->len?hex_value((unsigned char)s->data[result.read+1]):-1;
        if(high<0||low<0){result.error=true;return result;}
        result.read+=2;out[result.written++]=(uint8_t)(high<<4|low);
    }
    return result;
}
static void codec_require_string(tsc_value_t value){
    if(!value_is_box(value)||value_tag(value)!=TSC_VALUE_TAG_STRING)
        tsc_throw_error(TSC_ERROR_TYPE,key("Uint8Array encoding input must be a String"));
}
/* GetOptionsObject: undefined behaves as an empty null-prototype object. */
static tsc_value_t codec_option(tsc_value_t options,const char* name){
    return tsc_value_is_undefined(options)?tsc_value_undefined():tsc_value_get_prop(options,key(name));
}
static void codec_require_options(tsc_value_t options){
    if(!tsc_value_is_undefined(options)&&!tsc_value_is_object(options))
        tsc_throw_error(TSC_ERROR_TYPE,key("Uint8Array encoding options must be an object"));
}
static bool codec_text_is(tsc_value_t value,const char* text){
    return value_is_box(value)&&value_tag(value)==TSC_VALUE_TAG_STRING&&tsc_str_eq(value_ptr(value),key(text));
}
static bool codec_alphabet_url(tsc_value_t options){
    tsc_value_t alphabet=codec_option(options,"alphabet");
    if(tsc_value_is_undefined(alphabet)||codec_text_is(alphabet,"base64"))return false;
    if(codec_text_is(alphabet,"base64url"))return true;
    tsc_throw_error(TSC_ERROR_TYPE,key("Uint8Array alphabet must be \"base64\" or \"base64url\""));
}
static last_chunk_t codec_last_chunk(tsc_value_t options){
    tsc_value_t handling=codec_option(options,"lastChunkHandling");
    if(tsc_value_is_undefined(handling)||codec_text_is(handling,"loose"))return CHUNK_LOOSE;
    if(codec_text_is(handling,"strict"))return CHUNK_STRICT;
    if(codec_text_is(handling,"stop-before-partial"))return CHUNK_STOP_BEFORE_PARTIAL;
    tsc_throw_error(TSC_ERROR_TYPE,key("Uint8Array lastChunkHandling must be \"loose\", \"strict\" or \"stop-before-partial\""));
}
static tsc_object_t* codec_validate(tsc_value_t receiver){
    tsc_object_t* object=typed_object(receiver);
    if(!object||owner_kind(object)!=TSC_ELEMENT_Uint8Array)tsc_throw_error(TSC_ERROR_TYPE,key("Uint8Array method receiver is not a Uint8Array"));
    return object;
}
static tsc_typed_array_witness_t codec_bytes(const tsc_object_t* object){
    tsc_typed_array_witness_t witness=owner_witness(object);
    if(!witness.valid)tsc_throw_error(TSC_ERROR_TYPE,key("Uint8Array is detached or out of bounds"));
    return witness;
}
static _Noreturn void codec_syntax_error(void){tsc_throw_error(TSC_ERROR_SYNTAX,key("Uint8Array encoding input is invalid"));}
static tsc_value_t codec_new_uint8(const uint8_t* bytes,size_t length){
    tsc_value_t result=tsc_typed_array_create_from_constructor(tsc_typed_array_constructor_value(TSC_ELEMENT_Uint8Array),length_arguments(length));
    void* volatile result_root=tsc_value_gc_root(result);
    if(length)memcpy(require_witness(require_typed(result)).data,bytes,length);
    (void)result_root;return result;
}
static tsc_value_t codec_set_result(tsc_object_t* into,const uint8_t* bytes,codec_result_t result){
    if(result.written)memcpy(owner_witness(into).data,bytes,result.written);
    if(result.error)codec_syntax_error();
    tsc_value_t object=tsc_value_object(tsc_object_new());void* volatile object_root=tsc_value_gc_root(object);
    tsc_value_set_prop(object,key("read"),tsc_value_num((double)result.read));
    tsc_value_set_prop(object,key("written"),tsc_value_num((double)result.written));
    (void)object_root;return object;
}
static tsc_str_t* codec_encode_base64(const uint8_t* bytes,size_t length,bool url,bool omit_padding){
    static const char standard[]="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    static const char url_safe[]="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    const char* digits=url?url_safe:standard;
    size_t capacity=tsc_alloc_size(length/3+(length%3?1:0),4);
    char* out=TSC_GC_MALLOC_ATOMIC(capacity?capacity:1);size_t size=0,index=0;
    for(;index+3<=length;index+=3){
        uint32_t group=(uint32_t)bytes[index]<<16|(uint32_t)bytes[index+1]<<8|bytes[index+2];
        out[size++]=digits[group>>18];out[size++]=digits[group>>12&63];out[size++]=digits[group>>6&63];out[size++]=digits[group&63];
    }
    if(length-index==1){
        uint32_t group=(uint32_t)bytes[index]<<16;
        out[size++]=digits[group>>18];out[size++]=digits[group>>12&63];
        if(!omit_padding){out[size++]='=';out[size++]='=';}
    }else if(length-index==2){
        uint32_t group=(uint32_t)bytes[index]<<16|(uint32_t)bytes[index+1]<<8;
        out[size++]=digits[group>>18];out[size++]=digits[group>>12&63];out[size++]=digits[group>>6&63];
        if(!omit_padding)out[size++]='=';
    }
    return tsc_str_from_lit(out,size);
}
static tsc_str_t* codec_encode_hex(const uint8_t* bytes,size_t length){
    static const char digits[]="0123456789abcdef";
    char* out=TSC_GC_MALLOC_ATOMIC(length?tsc_alloc_size(length,2):1);
    for(size_t index=0;index<length;++index){out[2*index]=digits[bytes[index]>>4];out[2*index+1]=digits[bytes[index]&15];}
    return tsc_str_from_lit(out,length*2);
}
static tsc_value_t codec_apply(void* environment,tsc_value_t receiver,tsc_array_t* args){
    const codec_member_t* member=environment;
    void* volatile receiver_root=tsc_value_gc_root(receiver);tsc_array_t* volatile actuals=args;
    tsc_value_t input=argument(actuals,0),options=argument(actuals,1);
    void* volatile input_root=tsc_value_gc_root(input);void* volatile options_root=tsc_value_gc_root(options);
    tsc_value_t result=tsc_value_undefined();
    switch(member->kind){
        case CODEC_FROM_BASE64:case CODEC_FROM_HEX:{
            codec_require_string(input);
            const tsc_str_t* text=value_ptr(input);
            bool url=false;last_chunk_t last=CHUNK_LOOSE;
            if(member->kind==CODEC_FROM_BASE64){codec_require_options(options);url=codec_alphabet_url(options);last=codec_last_chunk(options);}
            uint8_t* bytes=TSC_GC_MALLOC_ATOMIC(text->len?text->len:1);
            codec_result_t decoded=member->kind==CODEC_FROM_BASE64?codec_from_base64(text,url,last,SIZE_MAX,bytes):codec_from_hex(text,SIZE_MAX,bytes);
            if(decoded.error)codec_syntax_error();
            result=codec_new_uint8(bytes,decoded.written);break;
        }
        case CODEC_SET_FROM_BASE64:case CODEC_SET_FROM_HEX:{
            tsc_object_t* into=codec_validate(receiver);
            codec_require_string(input);
            const tsc_str_t* text=value_ptr(input);
            bool url=false;last_chunk_t last=CHUNK_LOOSE;
            if(member->kind==CODEC_SET_FROM_BASE64){codec_require_options(options);url=codec_alphabet_url(options);last=codec_last_chunk(options);}
            size_t capacity=codec_bytes(into).length;
            uint8_t* bytes=TSC_GC_MALLOC_ATOMIC(text->len?text->len:1);
            codec_result_t decoded=member->kind==CODEC_SET_FROM_BASE64?codec_from_base64(text,url,last,capacity,bytes):codec_from_hex(text,capacity,bytes);
            result=codec_set_result(into,bytes,decoded);break;
        }
        case CODEC_TO_BASE64:{
            tsc_object_t* object=codec_validate(receiver);
            tsc_value_t encode_options=argument(actuals,0);
            codec_require_options(encode_options);
            bool url=codec_alphabet_url(encode_options);
            bool omit=tsc_value_is_truthy(codec_option(encode_options,"omitPadding"));
            tsc_typed_array_witness_t witness=codec_bytes(object);
            result=tsc_value_string(codec_encode_base64(witness.data,witness.length,url,omit));break;
        }
        case CODEC_TO_HEX:{
            tsc_typed_array_witness_t witness=codec_bytes(codec_validate(receiver));
            result=tsc_value_string(codec_encode_hex(witness.data,witness.length));break;
        }
    }
    (void)receiver_root;(void)input_root;(void)options_root;return result;
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
    for(size_t index=0;index<sizeof(factory_members)/sizeof(factory_members[0]);++index)
        define_member(realm->abstract.constructor,&factory_members[index],key(factory_members[index].name));
    for(size_t index=0;index<sizeof(members)/sizeof(members[0]);++index){
        const member_t* member=&members[index];tsc_str_t* name=member->kind==TAG?tsc_symbol_property_key(tsc_symbol_to_string_tag()):key(member->name);
        tsc_value_t function=define_member(realm->abstract.prototype,member,name);
        if(member->kind==VALUES)define_value(realm->abstract.prototype,tsc_symbol_property_key(tsc_symbol_iterator()),function,true,true);
    }
    for(size_t index=0;index<sizeof(traversals)/sizeof(traversals[0]);++index){
        const traversal_t* operation=&traversals[index];tsc_value_t function=tsc_value_function_named_kind(traversal_apply,NULL,(void*)operation,operation->arity,key(operation->name),TSC_FUNCTION_IDENTITY_BUILTIN);
        void* volatile function_root=tsc_value_gc_root(function);define_value(realm->abstract.prototype,key(operation->name),function,true,true);(void)function_root;
    }
    define_value(realm->abstract.prototype,key("toString"),tsc_value_get_prop(tsc_value_array(tsc_array_prototype()),key("toString")),true,true);
    for(size_t index=0;index<TSC_ELEMENT_COUNT;++index){
        intrinsic_t* intrinsic=&realm->concrete[index];const element_t* element=&elements[index];
        initialize_intrinsic(intrinsic,element->name,3,concrete_construct,(void*)element,realm->abstract.constructor,realm->abstract.prototype);
        ((tsc_function_identity_t*)value_ptr(intrinsic->constructor))->construct_default_prototype=element->prototype;
        define_value(intrinsic->constructor,key("BYTES_PER_ELEMENT"),tsc_value_num((double)element->width),false,false);
        define_value(intrinsic->prototype,key("BYTES_PER_ELEMENT"),tsc_value_num((double)element->width),false,false);
    }
    intrinsic_t* uint8=&realm->concrete[TSC_ELEMENT_Uint8Array];
    for(size_t index=0;index<sizeof(codec_members)/sizeof(codec_members[0]);++index){
        const codec_member_t* member=&codec_members[index];
        tsc_value_t function=tsc_value_function_named_kind(codec_apply,NULL,(void*)member,member->arity,key(member->name),TSC_FUNCTION_IDENTITY_BUILTIN);
        void* volatile function_root=tsc_value_gc_root(function);
        define_value(member->on_constructor?uint8->constructor:uint8->prototype,key(member->name),function,true,true);(void)function_root;
    }
    return realm;
}
tsc_value_t tsc_typed_array_constructor_value(tsc_element_kind_t kind){return typed_realm()->concrete[kind].constructor;}
tsc_value_t tsc_typed_array_prototype_value(tsc_element_kind_t kind){return typed_realm()->concrete[kind].prototype;}
