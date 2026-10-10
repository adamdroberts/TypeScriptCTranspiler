#include "tsc_internal.h"
#ifndef TSC_NO_GC
#include <gc/gc_mark.h>
#include <sys/mman.h>
#ifdef TSC_THREADS
#include <pthread.h>
#endif
#endif

typedef enum {
#define TSC_WEAK_COLLECTION(name, provider, kind) kind,
#define TSC_WEAK_METHOD(kind, name, operation, length)
#include "tsc_weak_collections.def"
#undef TSC_WEAK_COLLECTION
#undef TSC_WEAK_METHOD
    WEAK_KIND_COUNT
} weak_kind_t;
typedef enum { WEAK_DELETE, WEAK_GET, WEAK_GET_OR_INSERT, WEAK_GET_OR_INSERT_COMPUTED, WEAK_HAS, WEAK_SET_VALUE } weak_operation_t;
typedef struct weak_entry { struct weak_entry* next; tsc_value_t key, value; } weak_entry_t;
typedef struct { tsc_object_t* object; weak_entry_t* entries; weak_kind_t kind; } weak_collection_t;
typedef struct { const char* name; weak_kind_t kind; tsc_intrinsic_default_prototype_kind_t prototype; } weak_constructor_t;
typedef struct { weak_kind_t kind; const char* name; weak_operation_t operation; double length; } weak_member_t;
#define TSC_WEAK_COLLECTION(name, provider, kind) tsc_value_t tsc_##provider##_prototype_value(void);
#define TSC_WEAK_METHOD(kind, name, operation, length)
#include "tsc_weak_collections.def"
#undef TSC_WEAK_COLLECTION
#undef TSC_WEAK_METHOD
static const weak_constructor_t constructors[]={
#define TSC_WEAK_COLLECTION(name, provider, kind) {#name, kind, TSC_INTRINSIC_DEFAULT_##kind##_PROTOTYPE},
#define TSC_WEAK_METHOD(kind, name, operation, length)
#include "tsc_weak_collections.def"
#undef TSC_WEAK_COLLECTION
#undef TSC_WEAK_METHOD
};
static const weak_member_t members[]={
#define TSC_WEAK_COLLECTION(name, provider, kind)
#define TSC_WEAK_METHOD(kind, name, operation, length) {kind,#name,operation,length},
#include "tsc_weak_collections.def"
#undef TSC_WEAK_COLLECTION
#undef TSC_WEAK_METHOD
};

#ifndef TSC_NO_GC
/* The registry retains its own links, never the collection. Entries encode
 * keys and values as Tvals, so neither is an unconditional conservative root. */
typedef struct weak_registry { struct weak_registry* next; uintptr_t hidden_collection; } weak_registry_t;
static weak_registry_t* registry;
static GC_on_collection_event_proc previous_collection_event;
static int normal_allocation_kind, atomic_allocation_kind;
#ifdef TSC_THREADS
static pthread_once_t collector_once=PTHREAD_ONCE_INIT;
#else
static bool collector_initialized;
#endif
static _Noreturn void weak_collector_failure(void) {
    static const char text[]="weak collection collector cannot represent native allocation\n";
    (void)write(STDERR_FILENO,text,sizeof(text)-1);_exit(70);
}
typedef struct weak_dependency { weak_collection_t* collection; weak_entry_t* entry; struct weak_dependency* next; } weak_dependency_t;
typedef struct { void* object; weak_dependency_t* dependencies; } weak_index_slot_t;
typedef struct { weak_index_slot_t* slots; size_t capacity,bytes; void* memory; weak_dependency_t* edges; size_t used; } weak_index_t;
typedef struct { void** pointers; size_t length,capacity; } weak_mark_worklist_t;
static void* weak_scratch(size_t bytes) {
    void* memory=mmap(NULL,bytes,PROT_READ|PROT_WRITE,MAP_PRIVATE|MAP_ANONYMOUS,-1,0);
    if(memory==MAP_FAILED)weak_collector_failure();return memory;
}
static weak_index_slot_t* weak_index_slot(weak_index_t* index,void* object) {
    size_t offset=(((uintptr_t)object>>3)*UINT64_C(11400714819323198485))&(index->capacity-1);
    while(index->slots[offset].object&&index->slots[offset].object!=object)offset=(offset+1)&(index->capacity-1);
    return &index->slots[offset];
}
static void weak_index_add(weak_index_t* index,void* object,weak_collection_t* collection,weak_entry_t* entry) {
    if(!object)return;weak_index_slot_t* slot=weak_index_slot(index,object);slot->object=object;
    weak_dependency_t* edge=&index->edges[index->used++];edge->collection=collection;edge->entry=entry;edge->next=slot->dependencies;slot->dependencies=edge;
}
static bool weak_key_live(tsc_value_t key) {
    void* pointer=tsc_value_gc_root(key);void* base=pointer?GC_base(pointer):NULL;
    return pointer&&(!base||GC_is_marked(base));
}
static void weak_mark_push(weak_mark_worklist_t* work,void* pointer) {
    if(!pointer)return;
    if(work->length==work->capacity) {
        size_t next=work->capacity?work->capacity*2:16;
        if(next<work->capacity||next>SIZE_MAX/sizeof(void*))weak_collector_failure();
        void** grown=weak_scratch(next*sizeof(void*));
        if(work->length)memcpy(grown,work->pointers,work->length*sizeof(void*));
        if(work->pointers)munmap(work->pointers,work->capacity*sizeof(void*));
        work->pointers=grown;work->capacity=next;
    }
    work->pointers[work->length++]=pointer;
}
static void weak_registry_cleanup(void) {
    weak_registry_t** link=&registry;
    while(*link) {
        weak_registry_t* node=*link;weak_collection_t* collection=(void*)~node->hidden_collection;
        if(!GC_is_marked(collection)){*link=node->next;continue;}
        for(weak_entry_t* entry=collection->entries;entry;entry=entry->next)
            if(!weak_key_live(entry->key))entry->key=entry->value=tsc_value_undefined();
        link=&node->next;
    }
}
/* A dependency index connects each entry to its collection and key. Marking
 * either endpoint rechecks that edge; newly eligible values enter the same
 * heap worklist as ordinary fields. Thus ephemeron chains close without
 * repeated whole-table scans or source/count-specific collection rules. */
static void weak_collection_event(GC_EventType stage) {
    if(previous_collection_event)previous_collection_event(stage);
    if(stage!=GC_EVENT_MARK_END)return;
    size_t entries=0;
    for(weak_registry_t* node=registry;node;node=node->next) {
        weak_collection_t* collection=(void*)~node->hidden_collection;
        for(weak_entry_t* entry=collection->entries;entry;entry=entry->next)
            if(tsc_value_gc_root(entry->key)){if(entries==SIZE_MAX)weak_collector_failure();++entries;}
    }
    if(!entries){weak_registry_cleanup();return;}
    size_t capacity=16;
    if(entries>SIZE_MAX/4)weak_collector_failure();
    while(capacity<entries*4){if(capacity>SIZE_MAX/2)weak_collector_failure();capacity*=2;}
    if(capacity>SIZE_MAX/sizeof(weak_index_slot_t)||entries>SIZE_MAX/(2*sizeof(weak_dependency_t)))weak_collector_failure();
    size_t slot_bytes=capacity*sizeof(weak_index_slot_t),edge_bytes=entries*2*sizeof(weak_dependency_t);
    if(slot_bytes>SIZE_MAX-edge_bytes)weak_collector_failure();
    weak_index_t index={0};index.capacity=capacity;index.bytes=slot_bytes+edge_bytes;index.memory=weak_scratch(index.bytes);
    index.slots=index.memory;index.edges=(void*)((char*)index.memory+slot_bytes);
    weak_mark_worklist_t work={0};
    for(weak_registry_t* node=registry;node;node=node->next) {
        weak_collection_t* collection=(void*)~node->hidden_collection;
        for(weak_entry_t* entry=collection->entries;entry;entry=entry->next) {
            void* key=tsc_value_gc_root(entry->key);if(!key)continue;
            weak_index_add(&index,collection,collection,entry);weak_index_add(&index,GC_base(key),collection,entry);
            if(GC_is_marked(collection)&&weak_key_live(entry->key))weak_mark_push(&work,tsc_value_gc_root(entry->value));
        }
    }
    while(work.length) {
        void* pointer=work.pointers[--work.length];void* base=GC_base(pointer);
        if(!base||GC_is_marked(base))continue;
        size_t bytes;int kind=GC_get_kind_and_size(base,&bytes);
        if(kind!=normal_allocation_kind&&kind!=atomic_allocation_kind)weak_collector_failure();
        GC_set_mark_bit(base);
        weak_index_slot_t* slot=weak_index_slot(&index,base);
        for(weak_dependency_t* edge=slot->dependencies;edge;edge=edge->next)
            if(GC_is_marked(edge->collection)&&weak_key_live(edge->entry->key))weak_mark_push(&work,tsc_value_gc_root(edge->entry->value));
        if(kind==normal_allocation_kind)for(size_t offset=0;offset<bytes/sizeof(void*);++offset)weak_mark_push(&work,((void**)base)[offset]);
    }
    if(work.pointers)munmap(work.pointers,work.capacity*sizeof(void*));munmap(index.memory,index.bytes);
    weak_registry_cleanup();
}
static void* weak_register_locked(void* data) {
    weak_registry_t* node=data;node->next=registry;registry=node;return NULL;
}
static void weak_collector_install(void) {
    void* normal=GC_MALLOC(sizeof(void*));normal_allocation_kind=GC_get_kind_and_size(normal,NULL);
    void* atomic=GC_MALLOC_ATOMIC(sizeof(void*));atomic_allocation_kind=GC_get_kind_and_size(atomic,NULL);
    previous_collection_event=GC_get_on_collection_event();GC_set_on_collection_event(weak_collection_event);
}
static void weak_register(weak_collection_t* collection) {
#ifdef TSC_THREADS
    (void)pthread_once(&collector_once,weak_collector_install);
#else
    if(!collector_initialized){weak_collector_install();collector_initialized=true;}
#endif
    weak_registry_t* node=TSC_GC_MALLOC(sizeof(*node));node->hidden_collection=~(uintptr_t)collection;
    (void)GC_call_with_alloc_lock(weak_register_locked,node);
}
#else
static void weak_register(weak_collection_t* collection){(void)collection;}
#endif

static tsc_str_t* weak_key(const char* text){return tsc_str_from_cstr(text);}
static tsc_value_t weak_argument(tsc_array_t* args,size_t index){return args&&index<args->len?TSC_ARR(tsc_value_t,args,index):tsc_value_undefined();}
static tsc_array_t* weak_actuals(tsc_value_t first,tsc_value_t second,size_t count) {
    void* volatile first_root=tsc_value_gc_root(first);
    void* volatile second_root=tsc_value_gc_root(second);
    tsc_array_t* args=tsc_array_new(sizeof(tsc_value_t),count);tsc_array_use_value_storage(args);
    if(count)tsc_array_push_raw(args,&first);if(count>1)tsc_array_push_raw(args,&second);
    (void)first_root;(void)second_root;return args;
}
static tsc_value_t weak_call(tsc_value_t function,tsc_value_t receiver,tsc_array_t* args){return tsc_value_apply_function(function,receiver,tsc_value_array(args));}
static weak_entry_t* weak_find(weak_collection_t* collection,tsc_value_t key) {
    for(weak_entry_t* entry=collection->entries;entry;entry=entry->next)
        if(!tsc_value_is_undefined(entry->key)&&entry->key==key)return entry;
    return NULL;
}
static void weak_store(weak_collection_t* collection,tsc_value_t key,tsc_value_t value) {
    weak_entry_t* entry=weak_find(collection,key);
    if(!entry) {
        for(entry=collection->entries;entry;entry=entry->next)if(tsc_value_is_undefined(entry->key))break;
        if(!entry){entry=TSC_GC_MALLOC(sizeof(*entry));entry->next=collection->entries;collection->entries=entry;}
    }
    entry->key=key;entry->value=value;
}
static tsc_value_t weak_member_apply(void* env,tsc_value_t receiver,tsc_array_t* args) {
    const weak_member_t* member=env;
    tsc_object_t* object=value_is_box(receiver)&&value_tag(receiver)==TSC_VALUE_TAG_OBJECT?value_ptr(receiver):NULL;
    weak_collection_t* collection=object&&object->is_weak_collection?object->class_ptr:NULL;
    if(!collection||collection->kind!=member->kind)tsc_throw_error(TSC_ERROR_TYPE,weak_key("Weak collection method called on incompatible receiver"));
    tsc_value_t key=weak_argument(args,0),value=weak_argument(args,1);
    bool admissible=tsc_value_is_weak_key(key);
    bool insertion=member->operation==WEAK_SET_VALUE||member->operation==WEAK_GET_OR_INSERT||member->operation==WEAK_GET_OR_INSERT_COMPUTED;
    if(insertion&&!admissible)tsc_throw_error(TSC_ERROR_TYPE,weak_key("Invalid weak collection key"));
    if(member->operation==WEAK_GET_OR_INSERT_COMPUTED&&!tsc_value_is_callable(value))
        tsc_throw_error(TSC_ERROR_TYPE,weak_key("WeakMap callback is not callable"));
    weak_entry_t* entry=admissible?weak_find(collection,key):NULL;
    switch(member->operation) {
        case WEAK_GET:return entry?entry->value:tsc_value_undefined();
        case WEAK_HAS:return tsc_value_bool(entry!=NULL);
        case WEAK_DELETE:if(entry){entry->key=entry->value=tsc_value_undefined();return tsc_value_bool(true);}return tsc_value_bool(false);
        case WEAK_SET_VALUE:weak_store(collection,key,member->kind==WEAK_SET?tsc_value_undefined():value);return receiver;
        case WEAK_GET_OR_INSERT:if(entry)return entry->value;weak_store(collection,key,value);return value;
        case WEAK_GET_OR_INSERT_COMPUTED: {
            if(entry)return entry->value;
            tsc_value_t computed=weak_call(value,tsc_value_undefined(),weak_actuals(key,tsc_value_undefined(),1));
            void* volatile computed_root=tsc_value_gc_root(computed);weak_store(collection,key,computed);(void)computed_root;return computed;
        }
    }
    return tsc_value_undefined();
}
static tsc_value_t weak_constructor_apply(void* env,tsc_value_t receiver,tsc_array_t* args) {
    (void)env;(void)receiver;(void)args;tsc_throw_error(TSC_ERROR_TYPE,weak_key("Weak collection constructor requires new"));return tsc_value_undefined();
}
static tsc_value_t weak_constructor_construct(void* env,tsc_value_t receiver,tsc_array_t* args) {
    (void)receiver;const weak_constructor_t* descriptor=env;
    weak_collection_t* collection=TSC_GC_MALLOC(sizeof(*collection));memset(collection,0,sizeof(*collection));collection->kind=descriptor->kind;
    void* volatile collection_root=collection;weak_register(collection);
    tsc_object_t* object=tsc_object_new_class(collection);collection->object=object;object->is_weak_collection=true;
    tsc_value_t result=tsc_value_object(object);void* volatile result_root=object;
    tsc_value_t prototype=tsc_value_get_prototype_from_constructor(tsc_value_current_new_target(),descriptor->prototype);
    (void)tsc_value_object_set_prototype_of(result,prototype);
    tsc_value_t iterable=weak_argument(args,0);
    if(tsc_value_is_undefined(iterable)||(value_is_box(iterable)&&value_tag(iterable)==TSC_VALUE_TAG_NULL))return result;
    tsc_value_t adder=tsc_value_get_prop(result,weak_key(descriptor->kind==WEAK_MAP?"set":"add"));
    void* volatile adder_root=tsc_value_gc_root(adder);
    if(!tsc_value_is_callable(adder))tsc_throw_error(TSC_ERROR_TYPE,weak_key("Weak collection adder is not callable"));
    tsc_sync_iterator_t* iterator=TSC_GC_MALLOC(sizeof(*iterator));*iterator=tsc_sync_iterator_open(iterable);
    tsc_try_frame_t frame;tsc_try_push(&frame);
    if(setjmp(frame.jb)==0) {
        tsc_value_t item;
        while(tsc_sync_iterator_step(iterator,&item)) {
            void* volatile item_root=tsc_value_gc_root(item);
            tsc_value_t key=item,value=tsc_value_undefined();
            if(descriptor->kind==WEAK_MAP) {
                if(!tsc_value_is_object(item))tsc_throw_error(TSC_ERROR_TYPE,weak_key("WeakMap iterator entry is not an object"));
                key=tsc_value_get_prop(item,weak_key("0"));void* volatile key_root=tsc_value_gc_root(key);
                value=tsc_value_get_prop(item,weak_key("1"));
                (void)weak_call(adder,result,weak_actuals(key,value,2));(void)key_root;
            } else (void)weak_call(adder,result,weak_actuals(key,value,1));
            (void)item_root;
        }
        tsc_try_pop();
    }else{tsc_value_t error=tsc_current_error_value();tsc_try_pop();tsc_sync_iterator_close_abrupt(iterator,error);}
    (void)collection_root;(void)result_root;(void)adder_root;return result;
}

typedef struct {tsc_value_t constructors[WEAK_KIND_COUNT],prototypes[WEAK_KIND_COUNT];void* constructor_roots[WEAK_KIND_COUNT];void* prototype_roots[WEAK_KIND_COUNT];} weak_realm_t;
static const char weak_realm_key;
static weak_realm_t* weak_realm(void) {
    weak_realm_t* state=tsc_realm_state_get(&weak_realm_key);if(state)return state;
    state=TSC_GC_MALLOC(sizeof(*state));memset(state,0,sizeof(*state));tsc_realm_state_set(&weak_realm_key,state);
    for(size_t index=0;index<sizeof(constructors)/sizeof(constructors[0]);++index) {
        const weak_constructor_t* descriptor=&constructors[index];
        state->prototypes[index]=tsc_value_object(tsc_object_new());state->prototype_roots[index]=tsc_value_gc_root(state->prototypes[index]);
        state->constructors[index]=tsc_value_function_named_kind(weak_constructor_apply,weak_constructor_construct,(void*)descriptor,0,weak_key(descriptor->name),TSC_FUNCTION_IDENTITY_BUILTIN);
        tsc_function_identity_t* identity=tsc_value_gc_root(state->constructors[index]);state->constructor_roots[index]=identity;
        identity->construct_allocates_receiver=false;identity->construct_default_prototype=descriptor->prototype;
        tsc_function_identity_set_own_prototype(identity,state->prototypes[index]);identity->func_prototype_writable=false;
        (void)tsc_value_define_property_desc(state->prototypes[index],weak_key("constructor"),state->constructors[index],true,true,true,false,true,true,true);
        (void)tsc_value_define_property_desc(state->prototypes[index],tsc_symbol_property_key(tsc_symbol_to_string_tag()),tsc_value_string(weak_key(descriptor->name)),true,false,true,false,true,true,true);
    }
    for(size_t index=0;index<sizeof(members)/sizeof(members[0]);++index) {
        const weak_member_t* member=&members[index];tsc_str_t* name=weak_key(member->name);
        tsc_value_t function=tsc_value_function_named_kind(weak_member_apply,NULL,(void*)member,member->length,name,TSC_FUNCTION_IDENTITY_BUILTIN);
        (void)tsc_value_define_property_desc(state->prototypes[member->kind],name,function,true,true,true,false,true,true,true);
    }
    return state;
}
#define TSC_WEAK_COLLECTION(name, provider, kind) \
    tsc_value_t tsc_##provider##_prototype_value(void){return weak_realm()->prototypes[kind];} \
    tsc_value_t tsc_##provider##_constructor_value(void){return weak_realm()->constructors[kind];}
#define TSC_WEAK_METHOD(kind, name, operation, length)
#include "tsc_weak_collections.def"
#undef TSC_WEAK_COLLECTION
#undef TSC_WEAK_METHOD
