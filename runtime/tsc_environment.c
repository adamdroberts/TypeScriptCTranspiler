#include "tsc_internal.h"

/* One Environment Record tree and one binding collection serve eval locals
 * and retained source closures. Lookup never depends on nesting or arity. */
typedef struct tsc_environment_binding {
    tsc_str_t* name;
    tsc_value_t value;
    void* value_root;
    bool initialized;
    bool immutable;
    bool lexical;
    bool deletable;
    tsc_async_cell_ref_t cell;
    struct tsc_environment_binding* next;
} tsc_environment_binding_t;

typedef struct {
    tsc_str_t* name;
    tsc_value_t identity;
    void* identity_root;
} environment_private_name_t;

struct tsc_environment {
    tsc_environment_t* parent;
    tsc_environment_binding_t* bindings;
    tsc_array_t* private_names;
    bool variable_scope;
    tsc_environment_t* captured;
    enum { ENV_CONTEXT_NONE, ENV_CONTEXT_MODULE, ENV_CONTEXT_FUNCTION } context;
    bool this_initialized;
    tsc_value_t constructor;
    void* constructor_root;
    tsc_value_t this_value;
    void* this_root;
    tsc_value_t new_target;
    void* new_target_root;
};

#define current_environment (*tsc_agent_environment_slot())

tsc_environment_t* tsc_environment_current(void) { return current_environment; }
tsc_environment_t* tsc_environment_swap(tsc_environment_t* environment) {
    tsc_environment_t* previous = current_environment;
    current_environment = environment;
    return previous;
}

tsc_environment_t* tsc_environment_new(tsc_environment_t* parent, bool variable_scope) {
    tsc_environment_t* environment = TSC_GC_MALLOC(sizeof(*environment));
    environment->parent = parent;
    environment->bindings = NULL;
    environment->private_names = NULL;
    environment->variable_scope = variable_scope;
    environment->captured = NULL;
    environment->context = ENV_CONTEXT_NONE;
    environment->this_initialized = true;
    environment->constructor = tsc_value_undefined();
    environment->constructor_root = NULL;
    environment->this_value = tsc_value_undefined();
    environment->this_root = NULL;
    environment->new_target = tsc_value_undefined();
    environment->new_target_root = NULL;
    return environment;
}

tsc_environment_t* tsc_environment_module_new(void) {
    tsc_environment_t* record = tsc_environment_new(NULL, true);
    record->context = ENV_CONTEXT_MODULE;
    return record;
}

static tsc_environment_binding_t* environment_own_binding(tsc_environment_t* environment, tsc_str_t* name) {
    for (tsc_environment_binding_t* binding = environment ? environment->bindings : NULL; binding; binding = binding->next)
        if (tsc_str_eq(binding->name, name)) return binding;
    return NULL;
}

static tsc_environment_binding_t* environment_resolve(tsc_str_t* name) {
    for (tsc_environment_t* environment = current_environment; environment; environment = environment->parent) {
        tsc_environment_binding_t* binding = environment_own_binding(environment, name);
        if (binding) return binding;
    }
    return NULL;
}

static tsc_environment_binding_t* environment_create_binding(tsc_environment_t* environment, tsc_str_t* name,
    bool lexical, bool immutable, bool deletable) {
    tsc_environment_binding_t* binding = TSC_GC_MALLOC(sizeof(*binding));
    binding->name = name;
    binding->value = tsc_value_undefined();
    binding->value_root = NULL;
    binding->initialized = !lexical;
    binding->immutable = immutable;
    binding->lexical = lexical;
    binding->deletable = deletable;
    binding->cell = (tsc_async_cell_ref_t){ &binding->value, &binding->value_root, &binding->initialized };
    binding->next = environment->bindings;
    environment->bindings = binding;
    return binding;
}

static void binding_store(tsc_environment_binding_t* binding, tsc_value_t value) {
    *(volatile tsc_value_t*)binding->cell.value_cell = value;
    if (binding->cell.gc_root_cell) *binding->cell.gc_root_cell = tsc_value_gc_root(value);
}

static tsc_value_t binding_read(tsc_environment_binding_t* binding) {
    if (binding->cell.initialized_cell && !*binding->cell.initialized_cell)
        tsc_throw_error(TSC_ERROR_REFERENCE, tsc_str_from_cstr("Cannot access a binding before initialization"));
    return *(volatile tsc_value_t*)binding->cell.value_cell;
}

static tsc_environment_t* environment_variable_record(void) {
    tsc_environment_t* variable = current_environment;
    while (variable && !variable->variable_scope) variable = variable->parent;
    return variable;
}

void tsc_environment_variable_enter(tsc_environment_scope_t* scope) {
    scope->previous = current_environment;
    tsc_environment_t* captured = tsc_environment_new(current_environment, false);
    scope->record = tsc_environment_new(captured, true);
    scope->record->captured = captured;
    current_environment = scope->record;
}

tsc_environment_t* tsc_environment_constructor_new(tsc_environment_t* parent,
    tsc_value_t constructor, tsc_value_t new_target, tsc_value_t receiver, bool derived) {
    tsc_environment_t* captured = tsc_environment_new(parent, false);
    tsc_environment_t* environment = tsc_environment_new(captured, true);
    environment->captured = captured;
    environment->context = ENV_CONTEXT_FUNCTION;
    environment->this_initialized = !derived;
    environment->constructor = constructor;
    environment->constructor_root = tsc_value_gc_root(constructor);
    environment->this_value = receiver;
    environment->this_root = tsc_value_gc_root(receiver);
    environment->new_target = new_target;
    environment->new_target_root = tsc_value_gc_root(new_target);
    return environment;
}

tsc_value_t tsc_environment_get_this(tsc_environment_t* environment) {
    if (!environment || !environment->this_initialized)
        tsc_throw_error(TSC_ERROR_REFERENCE, tsc_str_from_cstr("Must call super constructor before accessing this"));
    return environment->this_value;
}

tsc_value_t tsc_environment_super_constructor(tsc_environment_t* environment) {
    if (!environment || environment->context != ENV_CONTEXT_FUNCTION)
        tsc_throw_error(TSC_ERROR_REFERENCE, tsc_str_from_cstr("super call requires a constructor environment"));
    return tsc_value_get_prototype_of(environment->constructor);
}

tsc_value_t tsc_environment_super_construct(tsc_environment_t* environment, tsc_value_t superclass, tsc_value_t arguments) {
    tsc_environment_t* volatile owner = environment;
    tsc_value_t receiver = tsc_value_construct_with_new_target(superclass, arguments, environment->new_target);
    void* volatile root = tsc_value_gc_root(receiver);
    (void)owner; (void)root;
    if (environment->this_initialized)
        tsc_throw_error(TSC_ERROR_REFERENCE, tsc_str_from_cstr("Super constructor may only be called once"));
    environment->this_value = receiver;
    environment->this_root = tsc_value_gc_root(receiver);
    environment->this_initialized = true;
    tsc_value_class_initialize_elements(environment->constructor, receiver, false);
    return receiver;
}

void tsc_environment_function_enter(tsc_environment_scope_t* scope, bool arrow, bool strict) {
    tsc_environment_t* constructor = !arrow ? tsc_value_current_constructor_environment() : NULL;
    if (constructor) {
        scope->previous = current_environment;
        scope->record = constructor;
        current_environment = constructor;
    } else tsc_environment_variable_enter(scope);
    if (!arrow) {
        scope->record->context = ENV_CONTEXT_FUNCTION;
        if (!constructor) {
            tsc_value_t receiver = tsc_call_receiver();
            scope->record->this_value = strict ? receiver : tsc_value_sloppy_this(receiver);
            scope->record->this_root = tsc_value_gc_root(scope->record->this_value);
            scope->record->new_target = tsc_value_current_new_target();
            scope->record->new_target_root = tsc_value_gc_root(scope->record->new_target);
        }
        tsc_environment_binding_t* arguments = environment_create_binding(scope->record, tsc_str_from_cstr("arguments"), false, false, false);
        binding_store(arguments, tsc_call_arguments());
    }
}

static tsc_environment_t* environment_context(void) {
    for (tsc_environment_t* record = current_environment; record; record = record->parent)
        if (record->context != ENV_CONTEXT_NONE) return record;
    return NULL;
}

tsc_value_t tsc_environment_eval_this(void) {
    tsc_environment_t* record = environment_context();
    return record ? tsc_environment_get_this(record) : tsc_global_object();
}

void tsc_environment_require_function_context(void) {
    tsc_environment_t* record = environment_context();
    if (!record || record->context != ENV_CONTEXT_FUNCTION)
        tsc_throw_error(TSC_ERROR_SYNTAX, tsc_str_from_cstr("new.target requires a function evaluation context"));
}

tsc_value_t tsc_environment_eval_new_target(void) {
    tsc_environment_require_function_context();
    return environment_context()->new_target;
}

void tsc_environment_scope_leave(tsc_environment_scope_t* scope) {
    current_environment = scope->previous;
}

void tsc_environment_alias(tsc_environment_t* record, const tsc_environment_binding_ref_t* reference) {
    if (!record || !reference->cell.value_cell || !reference->cell.gc_root_cell)
        tsc_panic("source binding requires a retained value/root cell");
    tsc_environment_binding_t* binding = environment_own_binding(record, reference->name);
    if (!binding) binding = environment_create_binding(record, reference->name,
        reference->lexical, reference->immutable, false);
    binding->cell = reference->cell;
    binding->lexical = reference->lexical;
    binding->immutable = reference->immutable;
    binding->deletable = false;
}

void tsc_environment_alias_variable(const tsc_environment_binding_ref_t* reference) {
    tsc_environment_alias(environment_variable_record(), reference);
}

void tsc_environment_alias_capture(const tsc_environment_binding_ref_t* reference) {
    tsc_environment_t* variable = environment_variable_record();
    if (!variable || !variable->captured) tsc_panic("source capture requires a function Environment Record");
    for (tsc_environment_t* parent = variable->captured->parent; parent; parent = parent->parent)
        if (environment_own_binding(parent, reference->name)) return;
    tsc_environment_alias(variable->captured, reference);
}

tsc_environment_t* tsc_environment_project(const tsc_environment_binding_ref_t* references, size_t length) {
    tsc_environment_t* volatile record = tsc_environment_new(current_environment, false);
    for (size_t index = 0; index < length; ++index) {
        const tsc_environment_binding_ref_t* reference = &references[index];
        tsc_environment_t* target = record;
        if (reference->outer) {
            tsc_environment_alias_capture(reference);
            continue;
        }
        tsc_environment_alias(target, reference);
    }
    return record;
}

static bool declaration_is_lexical(const tsc_global_declaration_t* declaration) {
    return declaration->kind == TSC_GLOBAL_DECL_LEXICAL_MUTABLE ||
        declaration->kind == TSC_GLOBAL_DECL_LEXICAL_IMMUTABLE;
}

void tsc_environment_declaration_instantiation(tsc_global_declaration_t* declarations, size_t length) {
    tsc_environment_t* environment = current_environment;
    if (!environment) tsc_panic("eval declarations require a lexical Environment Record");
    tsc_environment_t* variable = environment_variable_record();
    /* Preflight the complete declaration collection before publishing names. */
    for (size_t index = 0; index < length; ++index) {
        tsc_global_declaration_t* declaration = &declarations[index];
        bool lexical = declaration_is_lexical(declaration);
        for (size_t earlier = 0; earlier < index; ++earlier) {
            tsc_global_declaration_t* previous = &declarations[earlier];
            if ((lexical || declaration_is_lexical(previous)) && tsc_str_eq(previous->name, declaration->name))
                tsc_throw_error(TSC_ERROR_SYNTAX, tsc_str_from_cstr("conflicting eval declarations"));
        }
        if (lexical) {
            if (environment_own_binding(environment, declaration->name))
                tsc_throw_error(TSC_ERROR_SYNTAX, tsc_str_from_cstr("duplicate eval lexical declaration"));
            continue;
        }
        for (tsc_environment_t* scope = environment; scope && scope != variable; scope = scope->parent) {
            tsc_environment_binding_t* binding = environment_own_binding(scope, declaration->name);
            if (binding && binding->lexical)
                tsc_throw_error(TSC_ERROR_SYNTAX, tsc_str_from_cstr("eval var conflicts with a lexical binding"));
        }
        tsc_environment_binding_t* binding = environment_own_binding(variable, declaration->name);
        if (binding && binding->lexical)
            tsc_throw_error(TSC_ERROR_SYNTAX, tsc_str_from_cstr("eval var conflicts with a lexical binding"));
    }
    /* Global var/function insertion retains the global object's descriptor
     * and extensibility preflight; lexical declarations stay in this record. */
    if (!variable) {
        tsc_global_declaration_t* globals = length ? TSC_GC_MALLOC(length * sizeof(*globals)) : NULL;
        size_t count = 0;
        for (size_t index = 0; index < length; ++index) {
            tsc_global_declaration_t declaration = declarations[index];
            if (declaration_is_lexical(&declaration)) continue;
            declaration.kind = declaration.kind == TSC_GLOBAL_DECL_FUNCTION || declaration.kind == TSC_GLOBAL_DECL_EVAL_FUNCTION
                ? TSC_GLOBAL_DECL_EVAL_FUNCTION : TSC_GLOBAL_DECL_EVAL_VAR;
            globals[count++] = declaration;
        }
        tsc_global_declaration_instantiation(globals, count);
    }
    for (size_t index = 0; index < length; ++index) {
        tsc_global_declaration_t* declaration = &declarations[index];
        bool lexical = declaration_is_lexical(declaration);
        if (!lexical && !variable) continue;
        tsc_environment_t* target = lexical ? environment : variable;
        tsc_environment_binding_t* binding = environment_own_binding(target, declaration->name);
        if (!binding) binding = environment_create_binding(target, declaration->name, lexical,
            declaration->kind == TSC_GLOBAL_DECL_LEXICAL_IMMUTABLE, !lexical && !environment->variable_scope);
        if (declaration->kind == TSC_GLOBAL_DECL_FUNCTION || declaration->kind == TSC_GLOBAL_DECL_EVAL_FUNCTION)
            binding_store(binding, declaration->value);
    }
}

tsc_value_t tsc_environment_binding_initialize(tsc_str_t* key, tsc_value_t value) {
    tsc_environment_binding_t* binding = environment_own_binding(current_environment, key);
    if (!binding || !binding->cell.initialized_cell || *binding->cell.initialized_cell) tsc_panic("invalid eval lexical initialization");
    binding_store(binding, value);
    *binding->cell.initialized_cell = true;
    return value;
}

tsc_value_t tsc_environment_reference_get(tsc_str_t* key) {
    tsc_environment_binding_t* binding = environment_resolve(key);
    return binding ? binding_read(binding) : tsc_global_reference_get(key);
}

tsc_value_t tsc_environment_reference_set(tsc_str_t* key, tsc_value_t value, bool strict) {
    tsc_environment_binding_t* binding = environment_resolve(key);
    if (!binding) return tsc_global_reference_set(key, value, strict);
    (void)binding_read(binding);
    if (binding->immutable) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("assignment to immutable lexical binding"));
    binding_store(binding, value);
    return value;
}

bool tsc_environment_reference_delete(tsc_str_t* key) {
    for (tsc_environment_t* environment = current_environment; environment; environment = environment->parent) {
        tsc_environment_binding_t** cursor = &environment->bindings;
        while (*cursor) {
            tsc_environment_binding_t* binding = *cursor;
            if (!tsc_str_eq(binding->name, key)) { cursor = &binding->next; continue; }
            if (!binding->deletable) return false;
            *cursor = binding->next;
            return true;
        }
    }
    return tsc_global_reference_delete(key);
}

tsc_str_t* tsc_environment_reference_typeof(tsc_str_t* key) {
    tsc_environment_binding_t* binding = environment_resolve(key);
    return binding ? tsc_value_typeof(binding_read(binding)) : tsc_global_reference_typeof(key);
}

/* Private names occupy their own collection; ordinary binding lookup and
 * declaration instantiation cannot observe or replace these identities. */
void tsc_environment_private_names_project(tsc_environment_t* record,
    const tsc_environment_private_name_ref_t* references, size_t length) {
    if (!record) tsc_panic("private environment projection requires a record");
    if (!length) return;
    record->private_names = tsc_array_new(sizeof(environment_private_name_t), length);
    for (size_t index = 0; index < length; index++) {
        environment_private_name_t name = { references[index].name, references[index].identity,
            tsc_value_gc_root(references[index].identity) };
        tsc_array_push_raw(record->private_names, &name);
    }
}
static const environment_private_name_t* environment_private_name(tsc_str_t* name) {
    for (tsc_environment_t* record = current_environment; record; record = record->parent) {
        if (!record->private_names) continue;
        for (size_t index = 0; index < record->private_names->len; index++) {
            const environment_private_name_t* candidate = &TSC_ARR(environment_private_name_t, record->private_names, index);
            if (tsc_str_eq(candidate->name, name)) return candidate;
        }
    }
    return NULL;
}
bool tsc_environment_has_private_name(tsc_str_t* name) { return environment_private_name(name) != NULL; }
tsc_value_t tsc_environment_private_name(tsc_str_t* name) {
    const environment_private_name_t* binding = environment_private_name(name);
    if (!binding) tsc_throw_error(TSC_ERROR_SYNTAX, tsc_str_from_cstr("private name is absent from the eval environment"));
    return binding->identity;
}
