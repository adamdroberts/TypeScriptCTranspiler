#include "tsc_internal.h"
#include <stdlib.h>

/* One retained Module Record graph supplies DFS/SCC state, async dependency
 * edges and completion capabilities for synchronous and asynchronous bodies. */
typedef enum { MODULE_LINKED, MODULE_EVALUATING, MODULE_ASYNC, MODULE_EVALUATED } module_status_t;
typedef struct tsc_module_record {
    struct tsc_module_graph* graph;
    const tsc_module_definition_t* definition;
    module_status_t status;
    size_t dfs_index, ancestor_index, pending_dependencies;
    uint64_t async_order;
    bool async_active, has_error, in_execution_list;
    struct tsc_module_record* cycle_root;
    tsc_array_t* async_parents;
    tsc_promise_t* top_level;
    tsc_promise_t* execution;
    tsc_value_t error;
    void* error_root;
    struct tsc_module_record* error_source;
    tsc_object_t* import_meta;
} tsc_module_record_t;
struct tsc_module_graph {
    size_t count;
    tsc_module_record_t* records;
};
typedef struct { tsc_module_record_t* record; size_t next; bool entered, waiting; } module_frame_t;

static void module_execution_rejected(tsc_module_record_t* record, tsc_value_t error);
static void module_execution_fulfilled(tsc_module_record_t* record);

static tsc_value_t module_execute(tsc_module_record_t* record) {
    tsc_environment_t* previous = tsc_environment_current();
    TSC_TRY_FRAME(frame);
    tsc_try_push(&frame);
    if (setjmp(frame.jb) == 0) {
        tsc_value_t value = record->definition->execute();
        void* volatile root = tsc_value_gc_root(value);
        (void)root;
        tsc_try_pop();
        (void)tsc_environment_swap(previous);
        return value;
    }
    tsc_value_t error = tsc_current_error_value();
    void* volatile root = tsc_value_gc_root(error);
    (void)root;
    tsc_try_pop();
    (void)tsc_environment_swap(previous);
    record->error_source = record;
    tsc_throw_value(error);
    return tsc_value_undefined();
}

static void module_execution_callback(void* opaque) {
    tsc_module_record_t* record = opaque;
    if (tsc_promise_is_rejected(record->execution))
        module_execution_rejected(record, tsc_promise_reason(record->execution));
    else module_execution_fulfilled(record);
}

static void module_execute_async(tsc_module_record_t* record) {
    tsc_value_t value = module_execute(record);
    if (!tsc_value_is_promise(value))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("module continuation did not return a Promise"));
    record->execution = tsc_value_as_promise(value);
    if (tsc_promise_is_pending(record->execution))
        tsc_promise_add_callback(record->execution, module_execution_callback, record);
    else tsc_queue_microtask(module_execution_callback, record);
}

static void module_set_error(tsc_module_record_t* record, tsc_value_t error, tsc_module_record_t* source) {
    record->status = MODULE_EVALUATED;
    record->async_active = false;
    record->has_error = true;
    record->error = error;
    record->error_root = tsc_value_gc_root(error);
    record->error_source = source;
    if (record->top_level) tsc_promise_reject_in_place(record->top_level, error);
}

static void module_execution_rejected(tsc_module_record_t* record, tsc_value_t error) {
    void* volatile error_root = tsc_value_gc_root(error);
    (void)error_root;
    tsc_module_record_t* source = record->error_source ? record->error_source : record;
    tsc_array_t* pending = tsc_array_new(sizeof(tsc_module_record_t*), 1);
    tsc_array_push_raw(pending, &record);
    while (pending->len) {
        tsc_module_record_t* current = TSC_ARR(tsc_module_record_t*, pending, --pending->len);
        if (current->status == MODULE_EVALUATED) continue;
        module_set_error(current, error, source);
        for (size_t index = 0; index < current->async_parents->len; index++) {
            tsc_module_record_t* parent = TSC_ARR(tsc_module_record_t*, current->async_parents, index);
            tsc_array_push_raw(pending, &parent);
        }
    }
}

static int module_execution_order(const void* left, const void* right) {
    uint64_t a = (*(tsc_module_record_t* const*)left)->async_order;
    uint64_t b = (*(tsc_module_record_t* const*)right)->async_order;
    return a < b ? -1 : a > b;
}

static void module_execution_fulfilled(tsc_module_record_t* record) {
    if (record->status == MODULE_EVALUATED) return;
    record->async_active = false;
    record->status = MODULE_EVALUATED;
    if (record->top_level) tsc_promise_fulfill_in_place(record->top_level, tsc_value_undefined());
    tsc_array_t* available = tsc_array_new(sizeof(tsc_module_record_t*), 1);
    tsc_array_t* pending = tsc_array_new(sizeof(tsc_module_record_t*), 1);
    tsc_array_push_raw(pending, &record);
    while (pending->len) {
        tsc_module_record_t* current = TSC_ARR(tsc_module_record_t*, pending, --pending->len);
        for (size_t index = 0; index < current->async_parents->len; index++) {
            tsc_module_record_t* parent = TSC_ARR(tsc_module_record_t*, current->async_parents, index);
            if (parent->in_execution_list || parent->cycle_root->has_error || parent->status == MODULE_EVALUATED) continue;
            if (--parent->pending_dependencies) continue;
            parent->in_execution_list = true;
            tsc_array_push_raw(available, &parent);
            if (!parent->definition->has_tla) tsc_array_push_raw(pending, &parent);
        }
    }
    if (available->len > 1) qsort(available->data, available->len, sizeof(tsc_module_record_t*), module_execution_order);
    for (size_t index = 0; index < available->len; index++) {
        tsc_module_record_t* current = TSC_ARR(tsc_module_record_t*, available, index);
        current->in_execution_list = false;
        if (current->status == MODULE_EVALUATED) continue;
        TSC_TRY_FRAME(frame);
        tsc_try_push(&frame);
        if (setjmp(frame.jb) == 0) {
            if (current->definition->has_tla) module_execute_async(current);
            else {
                (void)module_execute(current);
                current->async_active = false;
                current->status = MODULE_EVALUATED;
                if (current->top_level) tsc_promise_fulfill_in_place(current->top_level, tsc_value_undefined());
            }
            tsc_try_pop();
        } else {
            tsc_value_t error = tsc_current_error_value();
            tsc_try_pop();
            module_execution_rejected(current, error);
        }
    }
}

tsc_module_graph_t* tsc_module_graph_new(const tsc_module_definition_t* definitions, size_t count) {
    tsc_module_graph_t* graph = TSC_GC_MALLOC(sizeof(*graph));
    graph->count = count;
    graph->records = TSC_GC_MALLOC(count * sizeof(tsc_module_record_t));
    for (size_t index = 0; index < count; index++) {
        tsc_module_record_t* record = &graph->records[index];
        *record = (tsc_module_record_t){ .graph = graph, .definition = &definitions[index],
            .status = MODULE_LINKED, .error = tsc_value_undefined() };
        record->cycle_root = record;
        record->async_parents = tsc_array_new(sizeof(tsc_module_record_t*), 0);
        for (size_t edge = 0; edge < definitions[index].request_count; edge++)
            if (definitions[index].requests[edge] >= count)
                tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("module request is outside its retained graph"));
    }
    return graph;
}

tsc_value_t tsc_module_import_meta(tsc_module_graph_t* graph, size_t index) {
    if (index >= graph->count) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("module is outside its retained graph"));
    tsc_module_record_t* record = &graph->records[index];
    if (!record->import_meta) {
        tsc_object_t* object = tsc_object_new();
        (void)tsc_object_set_prototype_of(object, tsc_value_null());
        /* The native host uses the specified defaults: an empty property List
         * and no extraordinary finalization. The decoded owner is retained
         * by this Module Record, independently of later evaluation state. */
        record->import_meta = object;
    }
    return tsc_value_object(record->import_meta);
}

tsc_promise_t* tsc_module_evaluate(tsc_module_graph_t* graph, size_t index) {
    if (index >= graph->count) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("module is outside its retained graph"));
    tsc_module_record_t* root = &graph->records[index];
    if (root->status == MODULE_ASYNC || root->status == MODULE_EVALUATED) root = root->cycle_root;
    /* Finish source loading for the complete static graph before any body.
     * Parse failures are host load completions, rather than cached evaluation failures. */
    if(root->status==MODULE_LINKED){
        bool* visited=TSC_GC_MALLOC(graph->count*sizeof(bool));memset(visited,0,graph->count*sizeof(bool));
        tsc_array_t* pending=tsc_array_new(sizeof(size_t),1);tsc_array_push_raw(pending,&index);
        while(pending->len){
            size_t next=TSC_ARR(size_t,pending,--pending->len);if(visited[next])continue;visited[next]=true;
            tsc_module_record_t* current=&graph->records[next];
            if(current->definition->load_error){
                tsc_value_t error=tsc_value_error(tsc_error_new_named(tsc_str_from_lit("SyntaxError",11),tsc_str_from_cstr(current->definition->load_error)));
                void* volatile error_root=tsc_value_gc_root(error);root->error_source=current;
                tsc_promise_t* rejected=tsc_promise_reject(error);(void)error_root;return rejected;
            }
            for(size_t edge=current->definition->request_count;edge;--edge){size_t dependency=current->definition->requests[edge-1];tsc_array_push_raw(pending,&dependency);}
        }
    }
    if (root->top_level) return root->top_level;
    root->top_level = tsc_promise_pending();
    if (root->status == MODULE_EVALUATED) {
        if (root->has_error) tsc_promise_reject_in_place(root->top_level, root->error);
        else tsc_promise_fulfill_in_place(root->top_level, tsc_value_undefined());
        return root->top_level;
    }
    if (root->status == MODULE_ASYNC || root->status == MODULE_EVALUATING) return root->top_level;
    tsc_array_t* frames = tsc_array_new(sizeof(module_frame_t), 1);
    tsc_array_t* stack = tsc_array_new(sizeof(tsc_module_record_t*), 1);
    module_frame_t first = { .record = root };
    tsc_array_push_raw(frames, &first);
    size_t dfs_index = 0;
    TSC_TRY_FRAME(frame);
    tsc_try_push(&frame);
    if (setjmp(frame.jb) == 0) {
        while (frames->len) {
            module_frame_t* current = &TSC_ARR(module_frame_t, frames, frames->len - 1);
            tsc_module_record_t* record = current->record;
            if (!current->entered) {
                record->status = MODULE_EVALUATING;
                record->dfs_index = record->ancestor_index = dfs_index++;
                record->pending_dependencies = 0;
                current->entered = true;
                tsc_array_push_raw(stack, &record);
            }
            if (current->waiting) {
                size_t required_index = record->definition->requests[current->next - 1];
                tsc_module_record_t* required = &graph->records[required_index];
                if (required->status == MODULE_EVALUATING) {
                    if (required->ancestor_index < record->ancestor_index) record->ancestor_index = required->ancestor_index;
                } else required = required->cycle_root;
                if (required->has_error) {
                    record->error_source = required->error_source;
                    tsc_throw_value(required->error);
                }
                if (required->async_active) {
                    record->pending_dependencies++;
                    tsc_array_push_raw(required->async_parents, &record);
                }
                current->waiting = false;
            }
            if (current->next < record->definition->request_count) {
                size_t required_index = record->definition->requests[current->next++];
                tsc_module_record_t* required = &graph->records[required_index];
                current->waiting = true;
                if (required->status == MODULE_LINKED) {
                    module_frame_t nested = { .record = required };
                    tsc_array_push_raw(frames, &nested);
                }
                continue;
            }
            if (record->pending_dependencies || record->definition->has_tla) {
                record->async_active = true;
                record->async_order = tsc_agent_next_module_async_evaluation_order();
                if (!record->pending_dependencies) module_execute_async(record);
            } else (void)module_execute(record);
            if (record->ancestor_index == record->dfs_index) {
                tsc_module_record_t* member;
                do {
                    member = TSC_ARR(tsc_module_record_t*, stack, --stack->len);
                    member->status = member->async_active ? MODULE_ASYNC : MODULE_EVALUATED;
                    member->cycle_root = record;
                } while (member != record);
            }
            frames->len--;
        }
        tsc_try_pop();
        if (!root->async_active) tsc_promise_fulfill_in_place(root->top_level, tsc_value_undefined());
    } else {
        tsc_value_t error = tsc_current_error_value();
        void* volatile error_root = tsc_value_gc_root(error);
        (void)error_root;
        tsc_try_pop();
        tsc_module_record_t* source = frames->len
            ? TSC_ARR(module_frame_t, frames, frames->len - 1).record : root;
        if (source->error_source) source = source->error_source;
        for (size_t item = 0; item < stack->len; item++) module_set_error(TSC_ARR(tsc_module_record_t*, stack, item), error, source);
        module_set_error(root, error, source);
    }
    return root->top_level;
}

size_t tsc_module_error_source_index(tsc_module_graph_t* graph, size_t index) {
    if (index >= graph->count) tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("module is outside its retained graph"));
    const tsc_module_record_t* record = &graph->records[index];
    if (record->status == MODULE_ASYNC || record->status == MODULE_EVALUATED) record = record->cycle_root;
    return record->error_source ? (size_t)(record->error_source - graph->records) : index;
}

void tsc_module_require_sync(tsc_module_graph_t* graph, size_t index) {
    tsc_promise_t* promise = tsc_module_evaluate(graph, index);
    if (tsc_promise_is_rejected(promise)) tsc_throw_value(tsc_promise_reason(promise));
    if (tsc_promise_is_pending(promise))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("Cannot require an asynchronous module"));
}
