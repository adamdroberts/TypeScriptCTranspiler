#include "tsc_internal.h"

typedef enum { HELPER_MAP, HELPER_FILTER, HELPER_TAKE, HELPER_DROP, HELPER_FLAT_MAP, HELPER_CONCAT } helper_operation_t;
typedef struct { const char* name; helper_operation_t operation; size_t length; } helper_member_t;
static const helper_member_t helper_members[] = {
#define TSC_ITERATOR_HELPER(name, operation, length) {#name, operation, length},
#include "tsc_iterator_helpers.def"
#undef TSC_ITERATOR_HELPER
};
typedef enum { HELPER_START, HELPER_SUSPENDED, HELPER_EXECUTING, HELPER_COMPLETED } helper_state_t;
typedef struct { tsc_value_t source, method; void *source_root, *method_root; } helper_iterable_t;
typedef struct tsc_iterator_helper {
    helper_operation_t operation;
    helper_state_t state;
    tsc_iterator_record_t outer, inner;
    bool inner_active, infinite;
    tsc_value_t callback;
    void* callback_root;
    tsc_bigint_t *counter, *remaining;
    tsc_array_t* iterables;
    size_t iterable_index;
} iterator_helper_t;
static const char helper_prototype_realm_key;
static tsc_value_t helper_resume(void* env, tsc_value_t receiver, tsc_array_t* args);

static tsc_value_t helper_value(iterator_helper_t* state) {
    iterator_helper_t* volatile state_root = state;
    tsc_object_t* prototype = tsc_realm_state_get(&helper_prototype_realm_key);
    if (!prototype) {
        prototype = tsc_object_new_with_prototype(tsc_iterator_prototype_value());
        tsc_realm_state_set(&helper_prototype_realm_key, prototype);
        tsc_object_define(prototype, tsc_str_from_lit("next", 4),
            tsc_value_function_builtin_named(helper_resume, NULL, 0, tsc_str_from_lit("next", 4)), true, false, true);
        tsc_object_define(prototype, tsc_str_from_lit("return", 6),
            tsc_value_function_builtin_named(helper_resume, (void*)1, 0, tsc_str_from_lit("return", 6)), true, false, true);
        tsc_object_define(prototype, tsc_symbol_property_key(tsc_symbol_to_string_tag()),
            tsc_value_string(tsc_str_from_lit("Iterator Helper", 15)), false, false, true);
    }
    tsc_object_t* object = tsc_object_new_with_prototype(tsc_value_object(prototype));
    object->iterator_helper = state;
    (void)state_root;
    return tsc_value_object(object);
}
static tsc_value_t helper_create(void* env, tsc_value_t receiver, tsc_array_t* args) {
    const helper_member_t* member = env;
    if (!tsc_value_is_object(receiver))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Iterator helper receiver is not an object"));
    iterator_helper_t* volatile state = TSC_GC_MALLOC(sizeof(*state));
    *state = (iterator_helper_t){ .operation = member->operation, .outer = {
        .source = receiver, .iterator = receiver, .source_gc_root = tsc_value_gc_root(receiver),
        .iterator_gc_root = tsc_value_gc_root(receiver) } };
    state->callback = args && args->len ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    state->callback_root = tsc_value_gc_root(state->callback);
    TSC_TRY_FRAME(frame); tsc_try_push(&frame);
    if (setjmp(frame.jb) != 0) {
        tsc_value_t error = tsc_current_error_value(); tsc_try_pop();
        tsc_sync_iterator_close_abrupt(&state->outer, error);
    }
    if (member->operation == HELPER_TAKE || member->operation == HELPER_DROP) {
        double limit = tsc_value_to_number(state->callback);
        if (isnan(limit) || trunc(limit) < 0)
            tsc_throw_error(TSC_ERROR_RANGE, tsc_str_from_cstr("Iterator limit must be nonnegative"));
        state->infinite = isinf(limit);
        if (!state->infinite) {
            state->remaining = tsc_bigint_from_lit("0");
            mpz_set_d(state->remaining->value, trunc(limit));
        }
    } else if (!tsc_value_is_callable(state->callback))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Iterator helper callback is not callable"));
    tsc_try_pop();
    state->outer = tsc_sync_iterator_open_direct(receiver);
    state->counter = tsc_bigint_from_lit("0");
    return helper_value(state);
}
void tsc_iterator_install_helpers(tsc_object_t* prototype) {
    for (size_t index = 0; index < sizeof(helper_members) / sizeof(*helper_members); ++index) {
        const helper_member_t* member = &helper_members[index];
        tsc_str_t* name = tsc_str_from_cstr(member->name);
        tsc_object_define(prototype, name,
            tsc_value_function_builtin_named(helper_create, (void*)member, member->length, name), true, false, true);
    }
}
static tsc_value_t helper_concat(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env; (void)receiver;
    iterator_helper_t* volatile state = TSC_GC_MALLOC(sizeof(*state));
    *state = (iterator_helper_t){ .operation = HELPER_CONCAT, .outer = {.done = true} };
    state->iterables = tsc_array_new(sizeof(helper_iterable_t), 0);
    for (size_t index = 0; args && index < args->len; ++index) {
        tsc_value_t source = TSC_ARR(tsc_value_t, args, index);
        if (!tsc_value_is_object(source))
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Iterator.concat requires object iterables"));
        helper_iterable_t item = { .source = source, .source_root = tsc_value_gc_root(source) };
        void* volatile source_root = item.source_root;
        item.method = tsc_value_get_symbol_prop(source, tsc_symbol_iterator());
        if (!tsc_value_is_callable(item.method))
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Iterator.concat requires an iterator method"));
        item.method_root = tsc_value_gc_root(item.method);
        tsc_array_push_raw(state->iterables, &item);
        (void)source_root;
    }
    return helper_value(state);
}
tsc_value_t tsc_iterator_concat_value(void) {
    return tsc_value_function_builtin_named(helper_concat, NULL, 0, tsc_str_from_lit("concat", 6));
}

/* One linked activation worklist executes native helper links without C
 * recursion. Requests retain the captured method and receiver, so modified
 * methods and Proxy wrappers still pass through ordinary Call. */
typedef enum { ACT_START, ACT_STEP, ACT_WAIT_STEP, ACT_RESULT, ACT_CALLBACK, ACT_CLOSE, ACT_WAIT_CLOSE, ACT_FINISH } helper_phase_t;
typedef struct helper_activation {
    struct helper_activation* parent;
    iterator_helper_t* helper;
    tsc_realm_t* realm;
    helper_phase_t phase;
    bool close_request, inner_step, skip_value, entered;
    int close_index;
    tsc_iterator_record_t* record;
    tsc_value_t result, value, error;
    void *result_root, *value_root, *error_root;
    bool failed;
} helper_activation_t;
typedef struct { helper_activation_t* top; tsc_value_t result; void* result_root; bool failed; tsc_value_t error; void* error_root; } helper_work_t;
static iterator_helper_t* helper_native_link(tsc_value_t method, tsc_value_t receiver, bool close, tsc_realm_t** realm) {
    if (!value_is_box(method) || value_tag(method) != TSC_VALUE_TAG_FUNCTION ||
        !value_is_box(receiver) || value_tag(receiver) != TSC_VALUE_TAG_OBJECT) return NULL;
    tsc_function_identity_t* identity = value_ptr(method);
    tsc_object_t* object = value_ptr(receiver);
    if (identity->kind != TSC_FUNCTION_IDENTITY_BUILTIN || identity->code.generic != helper_resume ||
        (identity->env != NULL) != close || !object->iterator_helper) return NULL;
    *realm = identity->realm;
    return object->iterator_helper;
}
static void helper_push(helper_work_t* work, iterator_helper_t* helper, bool close, tsc_realm_t* realm) {
    helper_activation_t* activation = TSC_GC_MALLOC(sizeof(*activation));
    *activation = (helper_activation_t){ .parent = work->top, .helper = helper, .realm = realm, .close_request = close };
    work->top = activation;
}
static void helper_complete(helper_work_t* work, tsc_value_t value, bool done) {
    helper_activation_t* activation = work->top;
    if (activation->entered) {
        iterator_helper_t* helper = activation->helper;
        if (done) {
            helper_operation_t operation = helper->operation;
            *helper = (iterator_helper_t){ .operation = operation, .state = HELPER_COMPLETED };
        } else helper->state = HELPER_SUSPENDED;
    }
    work->result = tsc_iterator_result(value, done);
    work->result_root = tsc_value_gc_root(work->result);
    work->failed = activation->failed;
    work->error = activation->error; work->error_root = activation->error_root;
    work->top = activation->parent;
}
static void helper_set_error(helper_activation_t* activation, tsc_value_t error) {
    if (!activation->failed) {
        activation->failed = true; activation->error = error; activation->error_root = tsc_value_gc_root(error);
    }
}
static void helper_fail_current(helper_work_t* work, tsc_value_t error) {
    helper_activation_t* activation = work->top;
    helper_set_error(activation, error);
    if (!activation->entered) { activation->phase = ACT_FINISH; return; }
    if (activation->phase == ACT_CLOSE || activation->phase == ACT_WAIT_CLOSE) {
        activation->phase = ACT_CLOSE;
        return;
    }
    if (activation->phase == ACT_STEP || activation->phase == ACT_WAIT_STEP || activation->phase == ACT_RESULT) {
        if (activation->record) activation->record->done = true;
        activation->close_index = activation->inner_step ? 0 : -1;
    } else if (activation->phase == ACT_CALLBACK) activation->close_index = 0;
    else activation->close_index = -1;
    activation->phase = ACT_CLOSE;
}
static void helper_iteration(helper_work_t* work) {
    helper_activation_t* a = work->top;
    iterator_helper_t* state = a->helper;
    if (a->phase == ACT_START) {
        if (state->state == HELPER_EXECUTING)
            tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Iterator helper is already executing"));
        if (state->state == HELPER_COMPLETED) { helper_complete(work, tsc_value_undefined(), true); return; }
        state->state = HELPER_EXECUTING; a->entered = true;
        a->phase = a->close_request ? ACT_CLOSE : ACT_STEP;
        if (a->close_request) a->close_index = state->inner_active ? 1 : 0;
        return;
    }
    if (a->phase == ACT_STEP) {
        if (state->operation == HELPER_TAKE && !state->infinite && mpz_sgn(state->remaining->value) == 0) {
            a->close_index = 0; a->phase = ACT_CLOSE; return;
        }
        if (state->operation == HELPER_CONCAT && state->outer.done) {
            if (state->iterable_index == state->iterables->len) { a->phase = ACT_FINISH; return; }
            helper_iterable_t* item = &TSC_ARR(helper_iterable_t, state->iterables, state->iterable_index++);
            state->outer = tsc_sync_iterator_open_with_method(item->source, item->method);
        }
        a->inner_step = state->operation == HELPER_FLAT_MAP && state->inner_active;
        a->record = a->inner_step ? &state->inner : &state->outer;
        a->skip_value = state->operation == HELPER_DROP &&
            (state->infinite || mpz_sgn(state->remaining->value) > 0);
        if (state->operation == HELPER_TAKE && !state->infinite) mpz_sub_ui(state->remaining->value, state->remaining->value, 1);
        if (a->skip_value && !state->infinite) mpz_sub_ui(state->remaining->value, state->remaining->value, 1);
        if (a->record->done) { a->result = tsc_iterator_result(tsc_value_undefined(), true); a->result_root = tsc_value_gc_root(a->result); a->phase = ACT_RESULT; return; }
        tsc_realm_t* child_realm = NULL;
        iterator_helper_t* child = helper_native_link(a->record->next_method, a->record->iterator, false, &child_realm);
        if (child) { a->phase = ACT_WAIT_STEP; helper_push(work, child, false, child_realm); return; }
        a->result = tsc_value_apply_function(a->record->next_method, a->record->iterator,
            tsc_value_array(tsc_array_new(sizeof(tsc_value_t), 0)));
        a->result_root = tsc_value_gc_root(a->result); a->phase = ACT_RESULT;
        return;
    }
    if (a->phase == ACT_WAIT_STEP) {
        if (work->failed) { helper_fail_current(work, work->error); return; }
        a->result = work->result; a->result_root = work->result_root; a->phase = ACT_RESULT; return;
    }
    if (a->phase == ACT_RESULT) {
        if (!tsc_value_is_object(a->result)) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Iterator result is not an object"));
        bool done = tsc_value_is_truthy(tsc_value_get_prop(a->result, tsc_str_from_lit("done", 4)));
        if (done) {
            a->record->done = true;
            if (a->inner_step) { state->inner_active = false; mpz_add_ui(state->counter->value, state->counter->value, 1); a->phase = ACT_STEP; }
            else if (state->operation == HELPER_CONCAT) a->phase = ACT_STEP;
            else a->phase = ACT_FINISH;
            return;
        }
        if (a->skip_value) { a->phase = ACT_STEP; return; }
        a->value = tsc_value_get_prop(a->result, tsc_str_from_lit("value", 5)); a->value_root = tsc_value_gc_root(a->value);
        if (a->inner_step || state->operation == HELPER_TAKE || state->operation == HELPER_DROP || state->operation == HELPER_CONCAT) {
            helper_complete(work, a->value, false); return;
        }
        a->phase = ACT_CALLBACK; return;
    }
    if (a->phase == ACT_CALLBACK) {
        tsc_array_t* volatile actual = tsc_array_new(sizeof(tsc_value_t), 2);
        tsc_array_push_value(actual, a->value);
        tsc_array_push_value(actual, tsc_value_num(tsc_bigint_to_number(state->counter)));
        tsc_value_t result = tsc_value_apply_function(state->callback, tsc_value_undefined(), tsc_value_array(actual));
        void* volatile result_root = tsc_value_gc_root(result);
        if (state->operation == HELPER_FLAT_MAP) {
            if (!tsc_value_is_object(result)) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("flatMap requires an object iterator"));
            tsc_value_t method = tsc_value_get_symbol_prop(result, tsc_symbol_iterator());
            state->inner = tsc_value_is_nullish(method) ? tsc_sync_iterator_open_direct(result) : tsc_sync_iterator_open_with_method(result, method);
            state->inner_active = true; a->phase = ACT_STEP;
        } else {
            mpz_add_ui(state->counter->value, state->counter->value, 1);
            if (state->operation == HELPER_MAP) helper_complete(work, result, false);
            else if (tsc_value_is_truthy(result)) helper_complete(work, a->value, false);
            else a->phase = ACT_STEP;
        }
        (void)result_root;
        return;
    }
    if (a->phase == ACT_CLOSE) {
        if (a->close_index < 0) { a->phase = ACT_FINISH; return; }
        tsc_iterator_record_t* record = a->close_index-- == 1 ? &state->inner : &state->outer;
        if (record->done) return;
        record->done = true;
        tsc_value_t method = tsc_value_get_prop(record->iterator, tsc_str_from_lit("return", 6));
        if (tsc_value_is_nullish(method)) return;
        void* volatile method_root = tsc_value_gc_root(method);
        tsc_realm_t* child_realm = NULL;
        iterator_helper_t* child = helper_native_link(method, record->iterator, true, &child_realm);
        if (child) { a->phase = ACT_WAIT_CLOSE; helper_push(work, child, true, child_realm); return; }
        tsc_value_t result = tsc_value_apply_function(method, record->iterator,
            tsc_value_array(tsc_array_new(sizeof(tsc_value_t), 0)));
        if (!tsc_value_is_object(result)) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Iterator return returned a non-object"));
        (void)method_root;
        return;
    }
    if (a->phase == ACT_WAIT_CLOSE) {
        if (work->failed) helper_set_error(a, work->error);
        a->phase = ACT_CLOSE; return;
    }
    helper_complete(work, tsc_value_undefined(), true);
}
static tsc_value_t helper_resume(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)args;
    tsc_object_t* object = value_is_box(receiver) && value_tag(receiver) == TSC_VALUE_TAG_OBJECT ? value_ptr(receiver) : NULL;
    if (!object || !object->iterator_helper)
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Iterator helper receiver lacks its internal slot"));
    helper_work_t* volatile work = TSC_GC_MALLOC(sizeof(*work));
    tsc_realm_t* caller_realm = tsc_realm_current();
    memset(work, 0, sizeof(*work)); helper_push(work, object->iterator_helper, env != NULL, caller_realm);
    while (work->top) {
        TSC_TRY_FRAME(frame); tsc_try_push(&frame);
        if (setjmp(frame.jb) == 0) {
            (void)tsc_realm_swap(work->top->realm);
            helper_iteration(work);
        }
        else helper_fail_current(work, tsc_current_error_value());
        (void)tsc_realm_swap(caller_realm);
        tsc_try_pop();
    }
    if (work->failed) tsc_throw_value(work->error);
    return work->result;
}
