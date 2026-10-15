/* Canonical ECMAScript RegExp representation over UTF-16 code units.
 *
 * One parsed AST is shared by every consumer (exec/test/match/search/
 * replace/split). The parser implements the ECMAScript Pattern grammar with
 * Annex B extensions in non-Unicode mode; the matcher is an iterative
 * backtracker reporting code-unit offsets. Unicode property escapes consult
 * ICU; all AST storage is GC-managed. */
#include "tsc_internal.h"

#include <unicode/uchar.h>
#include <unicode/uscript.h>
#include <unicode/utf16.h>
#include <unicode/uset.h>

#define RE_UNSET SIZE_MAX
#define RE_INF SIZE_MAX

typedef enum {
    RE_N_EMPTY,
    RE_N_UNIT,
    RE_N_PAIR,
    RE_N_DOT,
    RE_N_ANCHOR_START,
    RE_N_ANCHOR_END,
    RE_N_WORD_BOUNDARY,
    RE_N_CLASS,
    RE_N_CLASS_ESCAPE,
    RE_N_PROP,
    RE_N_SEQ,
    RE_N_ALT,
    RE_N_QUANT,
    RE_N_GROUP,
    RE_N_BACKREF,
    RE_N_LOOKAHEAD,
    RE_N_LOOKBEHIND
} tsc_re_kind_t;

typedef enum {
    RE_CE_DIGIT,
    RE_CE_DIGIT_NEG,
    RE_CE_SPACE,
    RE_CE_SPACE_NEG,
    RE_CE_WORD,
    RE_CE_WORD_NEG
} tsc_re_class_escape_t;

typedef struct {
    uint32_t lo;
    uint32_t hi;
} tsc_re_range_t;

/* One \q{...} string alternative (owned UTF-16 units). */
typedef struct {
    uint16_t* units;
    size_t len;
} tsc_re_qstr_t;

#define RE_CLS_UNION 0
#define RE_CLS_INTERSECT 1
#define RE_CLS_DIFFERENCE 2

typedef struct tsc_re_named_entry tsc_re_named_entry_t;

typedef struct tsc_re_node {
    tsc_re_kind_t kind;
    tsc_re_flags_t flags; /* immutable lexical RegExp Record at this node */
    USet* compile_set; /* temporary, closed before compiled representation escapes */
    bool may_strings;
    union {
        struct {
            uint16_t unit;
        } unit;
        struct {
            uint16_t hi;
            uint16_t lo;
        } pair;
        struct {
            bool negated;
        } boundary;
        struct {
            tsc_re_range_t* ranges;
            size_t nranges;
            size_t cap;
            struct tsc_re_node** items;
            size_t nitems;
            size_t items_cap;
            tsc_re_qstr_t* strs;
            size_t nstrs;
            size_t strs_cap;
            int op;
            bool negated;
            bool unicode;
        } cls;
        struct {
            tsc_re_class_escape_t escape;
        } class_escape;
        struct {
            int32_t property;
            int32_t value;
            bool negated;
            bool has_value;
        } prop;
        struct {
            struct tsc_re_node** items;
            size_t len;
            size_t cap;
        } list;
        struct {
            struct tsc_re_node* child;
            size_t min;
            size_t max;
            bool greedy;
        } quant;
        struct {
            struct tsc_re_node* child;
            size_t index;
        } group;
        struct {
            /* 1-based group number, or RE_UNSET while a fixup is pending. */
            size_t index;
            /* A named reference shares its name record's complete fanout. */
            const tsc_re_named_entry_t* named;
            /* Decimal escape source for provisional nodes (name NULL). */
            size_t digits_at;
            size_t ndigits;
            /* UTF-8 group name for provisional \k references, else NULL. */
            char* name;
            size_t name_len;
            /* Escape offset for end-of-compile diagnostics. */
            size_t offset;
        } backref;
        struct {
            struct tsc_re_node* child;
            bool positive;
        } lookaround;
    } u;
} tsc_re_node_t;

/* Persistent paths through the canonical disjunctions. Sibling alternatives
 * share an enclosing path; group depth never consumes the native stack. */
typedef struct tsc_re_branch {
    struct tsc_re_branch* parent;
    const tsc_re_node_t* disjunction;
    size_t alternative, depth;
} tsc_re_branch_t;

struct tsc_re_named_entry {
    char* name;
    size_t name_len;
    size_t* indices;
    tsc_re_branch_t** branches;
    size_t len, capacity;
};

/* Backreference fixups resolve once group/name collections are complete.
 * Decimal fallback also records holder/index for rewriting its AST slot. */
typedef struct {
    tsc_re_node_t* node;
    tsc_re_node_t* holder;
    size_t index;
    size_t digits_at;
    size_t ndigits;
} re_dec_fixup_t;

typedef struct {
    tsc_re_node_t* node;
    char* name;
    size_t name_len;
} re_named_fixup_t;

#define RE_CHILD_SLOT SIZE_MAX

typedef struct {
    const uint16_t* units;
    size_t len;
    size_t pos;
    tsc_re_flags_t flags;
    tsc_re_error_t* error;
    bool failed;
    tsc_re_node_t** classes;
    size_t* class_ends;
    size_t ngroups;
    tsc_re_node_t** nodes;
    size_t nnodes, nodes_capacity;
    tsc_re_named_entry_t* named;
    size_t nnamed;
    size_t named_cap;
    tsc_re_branch_t* branch;
    bool named_mode;
    re_dec_fixup_t* dec;
    size_t ndec;
    size_t dec_cap;
    re_named_fixup_t* named_ref;
    size_t nnamed_ref;
    size_t named_ref_cap;
} tsc_re_parser_t;

/* Escape-result carrier shared by the atom parsers below. */
typedef enum {
    RE_CH_UNIT,
    RE_CH_CPOINT,
    RE_CH_CLASS_ESCAPE,
    RE_CH_NODE,
    RE_CH_BACKREF,
    RE_CH_NAMED_BACKREF,
    RE_CH_FAIL
} tsc_re_char_kind_t;

typedef struct {
    tsc_re_char_kind_t kind;
    uint32_t value;
    tsc_re_class_escape_t escape;
    tsc_re_node_t* node;
    size_t backref_index;
    size_t backref_digits_at;
    size_t backref_ndigits;
    size_t backref_offset;
    char* backref_name;
    size_t backref_name_len;
    size_t backref_name_cap;
} tsc_re_char_t;

/* Forward declarations for helpers defined after the class/grammar block. */
static tsc_re_node_t* re_new_node(tsc_re_parser_t* p, tsc_re_kind_t kind);
static void re_fail(tsc_re_parser_t* p, size_t offset);
static bool re_at_end(const tsc_re_parser_t* p);
static bool re_is_unicode(const tsc_re_parser_t* p);
static bool re_is_high_surrogate(uint16_t u);
static bool re_is_low_surrogate(uint16_t u);
static bool re_is_word_unit(uint16_t u);
static uint32_t re_canon(uint32_t cp, bool ignore_case, bool unicode);
static void re_node_list_push(tsc_re_parser_t* p, tsc_re_node_t* list_node, tsc_re_node_t* item);
static void re_class_item_push(tsc_re_parser_t* p, tsc_re_node_t* cls, tsc_re_node_t* item);
static void re_range_push(tsc_re_parser_t* p, tsc_re_node_t* cls, uint32_t lo, uint32_t hi);
static bool re_try_quantifier(tsc_re_parser_t* p, size_t* min_out, size_t* max_out, bool* lazy_out);
static bool re_register_named(
    tsc_re_parser_t* p,
    const char* name,
    size_t name_len,
    size_t index,
    size_t offset
);
static bool re_compile_sets(tsc_re_parser_t* p);
static bool re_parse_char_escape(tsc_re_parser_t* p, bool in_class, tsc_re_char_t* out);
static bool re_parse_group_name(tsc_re_parser_t* p, tsc_re_char_t* out);
static tsc_re_node_t* re_parse_disjunction(tsc_re_parser_t* p);
static uint32_t re_decimal_fallback(const uint16_t* digits, size_t ndigits, size_t* consumed);


struct tsc_re_compiled {
    tsc_re_node_t* root;
    tsc_re_flags_t flags;
    size_t ngroups;
    tsc_re_named_entry_t* named;
    size_t nnamed;
};

/* Class-atom parse result: either one code point or a set node. */
typedef struct {
    bool is_set;
    uint32_t cp;
    tsc_re_node_t* set;
} re_catom_t;

static void re_record_named_fixup(
    tsc_re_parser_t* p,
    tsc_re_node_t* node
) {
    if (p->nnamed_ref == p->named_ref_cap) {
        size_t next = p->named_ref_cap ? p->named_ref_cap * 2 : 4;
        re_named_fixup_t* items = (re_named_fixup_t*)TSC_GC_MALLOC(sizeof(re_named_fixup_t) * next);
        for (size_t i = 0; i < p->nnamed_ref; i++) items[i] = p->named_ref[i];
        p->named_ref = items;
        p->named_ref_cap = next;
    }
    re_named_fixup_t* fix = &p->named_ref[p->nnamed_ref++];
    fix->node = node;
    fix->name = node->u.backref.name;
    fix->name_len = node->u.backref.name_len;
}

static void re_qstr_push(tsc_re_parser_t* p, tsc_re_node_t* cls, const uint16_t* units, size_t len) {
    (void)p;
    if (cls->u.cls.nstrs == cls->u.cls.strs_cap) {
        size_t next = cls->u.cls.strs_cap ? cls->u.cls.strs_cap * 2 : 4;
        tsc_re_qstr_t* strs = (tsc_re_qstr_t*)TSC_GC_MALLOC(sizeof(tsc_re_qstr_t) * next);
        for (size_t i = 0; i < cls->u.cls.nstrs; i++) strs[i] = cls->u.cls.strs[i];
        cls->u.cls.strs = strs;
        cls->u.cls.strs_cap = next;
    }
    uint16_t* copy = (uint16_t*)TSC_GC_MALLOC(sizeof(uint16_t) * (len ? len : 1));
    for (size_t i = 0; i < len; i++) copy[i] = units[i];
    cls->u.cls.strs[cls->u.cls.nstrs].units = copy;
    cls->u.cls.strs[cls->u.cls.nstrs].len = len;
    cls->u.cls.nstrs++;
}

/* Reads one astral pair in Unicode mode; otherwise one raw unit. */
static uint32_t re_parse_single_cp(tsc_re_parser_t* p) {
    uint16_t u = p->units[p->pos++];
    if (re_is_unicode(p) && re_is_high_surrogate(u) && p->pos < p->len &&
        re_is_low_surrogate(p->units[p->pos])) {
        uint16_t lo = p->units[p->pos++];
        uint32_t cp = 0x10000u + (((uint32_t)u - 0xd800u) << 10) + ((uint32_t)lo - 0xdc00u);
        return cp;
    }
    return u;
}

/* Legacy (non-v) class atom. Returns false only at ']' or end of input;
 * failures record an error and return false with out untouched. */
static bool re_parse_legacy_atom(tsc_re_parser_t* p, re_catom_t* out) {
    if (re_at_end(p) || p->units[p->pos] == ']') return false;
    if (p->units[p->pos] == '\\') {
        p->pos++;
        tsc_re_char_t esc;
        if (!re_parse_char_escape(p, true, &esc)) return false;
        if (esc.kind == RE_CH_UNIT || esc.kind == RE_CH_CPOINT) {
            out->is_set = false;
            out->cp = esc.value;
            return true;
        }
        tsc_re_node_t* node = NULL;
        if (esc.kind == RE_CH_CLASS_ESCAPE) {
            node = re_new_node(p, RE_N_CLASS_ESCAPE);
            node->u.class_escape.escape = esc.escape;
        } else if (esc.kind == RE_CH_NODE) {
            node = esc.node;
        } else {
            re_fail(p, p->pos);
            return false;
        }
        out->is_set = true;
        out->set = node;
        return true;
    }
    out->is_set = false;
    out->cp = re_parse_single_cp(p);
    return true;
}

/* Pushes one legacy atom into a union class: singles become unit ranges,
 * sets become items. */
static bool re_class_push_atom(tsc_re_parser_t* p, tsc_re_node_t* cls, const re_catom_t* atom) {
    if (!atom->is_set) {
        re_range_push(p, cls, atom->cp, atom->cp);
        return true;
    }
    re_class_item_push(p, cls, atom->set);
    return true;
}

/* Legacy [...] with Annex B ranges. The caller consumed '['; this consumes
 * through ']'. A set endpoint unions in Annex B mode and fails in Unicode
 * mode; inverted single ranges always fail. */
static tsc_re_node_t* re_parse_legacy_class(tsc_re_parser_t* p, bool negated) {
    tsc_re_node_t* cls = re_new_node(p, RE_N_CLASS);
    cls->u.cls.op = RE_CLS_UNION;
    cls->u.cls.negated = negated;
    cls->u.cls.unicode = re_is_unicode(p);
    if (!re_at_end(p) && p->units[p->pos] == ']') {
        p->pos++;
        return cls;
    }
    for (;;) {
        if (re_at_end(p)) {
            re_fail(p, p->pos);
            return NULL;
        }
        if (p->units[p->pos] == ']') {
            p->pos++;
            return cls;
        }
        re_catom_t first;
        if (!re_parse_legacy_atom(p, &first)) {
            re_fail(p, p->pos);
            return NULL;
        }
        if (!first.is_set && !re_at_end(p) && p->units[p->pos] == '-' &&
            p->pos + 1 < p->len && p->units[p->pos + 1] != ']') {
            p->pos++;
            re_catom_t second;
            if (!re_parse_legacy_atom(p, &second)) {
                re_fail(p, p->pos);
                return NULL;
            }
            if (!second.is_set) {
                if (first.cp > second.cp) {
                    re_fail(p, p->pos);
                    return NULL;
                }
                re_range_push(p, cls, first.cp, second.cp);
                continue;
            }
            if (re_is_unicode(p)) {
                re_fail(p, p->pos);
                return NULL;
            }
            re_range_push(p, cls, first.cp, first.cp);
            if (!re_class_push_atom(p, cls, &second)) return NULL;
            continue;
        }
        if (first.is_set && !re_at_end(p) &&
            p->units[p->pos] == '-' && p->pos + 1 < p->len && p->units[p->pos + 1] != ']') {
            /* A set on the left still permits Annex B union ranges such
             * as [\d-z]: the dash side re-parses as the range tail. */
            p->pos++;
            re_catom_t second;
            if (!re_parse_legacy_atom(p, &second)) {
                re_fail(p, p->pos);
                return NULL;
            }
            if (!second.is_set) {
                if (!re_class_push_atom(p, cls, &first)) return NULL;
                uint32_t cp = second.cp;
                re_range_push(p, cls, cp, cp);
                continue;
            }
            if (!re_class_push_atom(p, cls, &first)) return NULL;
            if (!re_class_push_atom(p, cls, &second)) return NULL;
            continue;
        }
        if (!re_class_push_atom(p, cls, &first)) return NULL;
    }
}

/* ClassSetSyntaxCharacter: must be escaped inside v-mode classes. */
static bool re_is_v_syntax(uint16_t u) {
    return u == '(' || u == ')' || u == '[' || u == ']' || u == '{' ||
        u == '}' || u == '/' || u == '-' || u == '\\' || u == '|';
}

/* Appends one folded code point to a growable unit buffer. */
static void re_qbuf_push_cp(uint16_t** buf, size_t* len, size_t* cap, uint32_t cp) {
    size_t need = *len + (cp > 0xffff ? 2 : 1);
    if (need > *cap) {
        size_t next = *cap ? *cap * 2 : 8;
        while (next < need) next *= 2;
        uint16_t* grown = (uint16_t*)TSC_GC_MALLOC(sizeof(uint16_t) * next);
        for (size_t i = 0; i < *len; i++) grown[i] = (*buf)[i];
        *buf = grown;
        *cap = next;
    }
    if (cp > 0xffff) {
        uint32_t shifted = cp - 0x10000u;
        (*buf)[(*len)++] = (uint16_t)(0xd800u + (shifted >> 10));
        (*buf)[(*len)++] = (uint16_t)(0xdc00u + (shifted & 0x3ffu));
    } else {
        (*buf)[(*len)++] = (uint16_t)cp;
    }
}

/* Parses \q{alt|alt} string alternatives, pushing each (possibly empty)
 * alternative into target's string list. The caller consumed '\q{'. */
static bool re_parse_qstrings(tsc_re_parser_t* p, tsc_re_node_t* target) {
    uint16_t* buf = NULL;
    size_t len = 0;
    size_t cap = 0;
    for (;;) {
        if (re_at_end(p)) {
            re_fail(p, p->pos);
            return false;
        }
        uint16_t u = p->units[p->pos];
        if (u == '}' || u == '|') {
            re_qstr_push(p, target, buf, len);
            len = 0;
            p->pos++;
            if (u == '}') return true;
            continue;
        }
        uint32_t cp;
        if (u == '\\') {
            p->pos++;
            tsc_re_char_t esc;
            if (!re_parse_char_escape(p, true, &esc)) return false;
            if (esc.kind != RE_CH_UNIT && esc.kind != RE_CH_CPOINT) {
                re_fail(p, p->pos);
                return false;
            }
            cp = esc.value;
        } else {
            if (re_is_v_syntax(u)) {
                re_fail(p, p->pos);
                return false;
            }
            if (re_is_high_surrogate(u) && p->pos + 1 < p->len &&
                re_is_low_surrogate(p->units[p->pos + 1])) {
                cp = 0x10000u + (((uint32_t)u - 0xd800u) << 10) +
                    ((uint32_t)p->units[p->pos + 1] - 0xdc00u);
                p->pos += 2;
            } else {
                cp = u;
                p->pos++;
            }
        }
        re_qbuf_push_cp(&buf, &len, &cap, cp);
    }
}

static tsc_re_node_t* re_parse_v_class(tsc_re_parser_t* p, bool negated);

/* One v-mode ClassSetOperand: single character, class escape, nested
 * class, or \q{...} strings (wrapped as a degenerate union operand). */
static bool re_parse_v_operand(tsc_re_parser_t* p, re_catom_t* out) {
    if (re_at_end(p)) return false;
    uint16_t u = p->units[p->pos];
    if (u == ']' || u == '-' || u == '(' || u == ')' || u == '{' || u == '}' ||
        u == '/' || u == '|') {
        return false;
    }
    if (u == '&' && p->pos + 1 < p->len && p->units[p->pos + 1] == '&') {
        /* A double ampersand opens an intersection; the operand is
         * missing here. */
        return false;
    }
    if (u == '[') {
        size_t start = p->pos;
        tsc_re_node_t* nested = p->classes[start];
        if (!nested) { re_fail(p, start); return false; }
        p->pos = p->class_ends[start];
        out->is_set = true;
        out->set = nested;
        return true;
    }
    if (u == '\\') {
        if (p->pos + 2 < p->len && p->units[p->pos + 1] == 'q' && p->units[p->pos + 2] == '{') {
            tsc_re_node_t* wrap = re_new_node(p, RE_N_CLASS);
            wrap->u.cls.op = RE_CLS_UNION;
            wrap->u.cls.unicode = true;
            p->pos += 3;
            if (!re_parse_qstrings(p, wrap)) return false;
            out->is_set = true;
            out->set = wrap;
            return true;
        }
        p->pos++;
        tsc_re_char_t esc;
        if (!re_parse_char_escape(p, true, &esc)) return false;
        if (esc.kind == RE_CH_UNIT || esc.kind == RE_CH_CPOINT) {
            out->is_set = false;
            out->cp = esc.value;
            return true;
        }
        if (esc.kind != RE_CH_CLASS_ESCAPE && esc.kind != RE_CH_NODE) {
            re_fail(p, p->pos);
            return false;
        }
        out->is_set = true;
        if (esc.kind == RE_CH_CLASS_ESCAPE) {
            out->set = re_new_node(p, RE_N_CLASS_ESCAPE);
            out->set->u.class_escape.escape = esc.escape;
        } else {
            out->set = esc.node;
        }
        return true;
    }
    out->is_set = false;
    out->cp = re_parse_single_cp(p);
    return true;
}

/* Wraps one parsed operand as a set node for intersection/difference
 * items: singles become unit-range unions. */
static tsc_re_node_t* re_wrap_operand(tsc_re_parser_t* p, const re_catom_t* atom) {
    if (atom->is_set) return atom->set;
    tsc_re_node_t* wrap = re_new_node(p, RE_N_CLASS);
    wrap->u.cls.op = RE_CLS_UNION;
    wrap->u.cls.unicode = true;
    re_range_push(p, wrap, atom->cp, atom->cp);
    return wrap;
}

/* Pushes one intersection/difference operand. */
static void re_operand_push(tsc_re_parser_t* p, tsc_re_node_t* cls, const re_catom_t* atom) {
    tsc_re_node_t* node = re_wrap_operand(p, atom);
    re_class_item_push(p, cls, node);
}

static bool re_match_double(tsc_re_parser_t* p, uint16_t c) {
    if (p->pos + 1 < p->len && p->units[p->pos] == c && p->units[p->pos + 1] == c) {
        p->pos += 2;
        return true;
    }
    return false;
}

/* Records one decimal backreference fixup for a provisional node. */
static void re_record_dec_fixup(
    tsc_re_parser_t* p,
    tsc_re_node_t* node,
    tsc_re_node_t* holder,
    size_t index
) {
    if (p->ndec == p->dec_cap) {
        size_t next = p->dec_cap ? p->dec_cap * 2 : 4;
        re_dec_fixup_t* items = (re_dec_fixup_t*)TSC_GC_MALLOC(sizeof(re_dec_fixup_t) * next);
        for (size_t i = 0; i < p->ndec; i++) items[i] = p->dec[i];
        p->dec = items;
        p->dec_cap = next;
    }
    re_dec_fixup_t* fix = &p->dec[p->ndec++];
    fix->node = node;
    fix->holder = holder;
    fix->index = index;
    fix->digits_at = node->u.backref.digits_at;
    fix->ndigits = node->u.backref.ndigits;
}

static tsc_re_node_t* re_parse_class_dispatch(tsc_re_parser_t* p) {
    /* The caller consumed '['. */
    bool negated = false;
    if (!re_at_end(p) && p->units[p->pos] == '^') {
        negated = true;
        p->pos++;
    }
    if (p->flags.unicode_sets) {
        size_t start = p->pos - (negated ? 2 : 1);
        tsc_re_node_t* result = p->classes[start];
        if (!result) { re_fail(p, start); return NULL; }
        /* v classes are parsed bottom-up before group headers. Assign their
         * lexical record through the same set tree when its atom is reached. */
        size_t length = 1, capacity = 16;
        tsc_re_node_t** work = malloc(capacity * sizeof(*work));
        if (!work) abort();
        work[0] = result;
        while (length) {
            tsc_re_node_t* node = work[--length];
            node->flags = p->flags;
            if (node->kind != RE_N_CLASS) continue;
            for (size_t i = 0; i < node->u.cls.nitems; i++) {
                if (length == capacity) {
                    capacity *= 2;
                    void* grown = realloc(work, capacity * sizeof(*work));
                    if (!grown) abort();
                    work = grown;
                }
                work[length++] = node->u.cls.items[i];
            }
        }
        free(work);
        p->pos = p->class_ends[start];
        return result;
    }
    return re_parse_legacy_class(p, negated);
}

static bool re_is_assertion_node(const tsc_re_node_t* node) {
    return node->kind == RE_N_ANCHOR_START || node->kind == RE_N_ANCHOR_END ||
        node->kind == RE_N_WORD_BOUNDARY || node->kind == RE_N_LOOKAHEAD ||
        node->kind == RE_N_LOOKBEHIND;
}

/* One atom. Returns NULL without recording a failure at '|', ')', or the
 * end of input so the caller can close the enclosing construct. */
static tsc_re_node_t* re_parse_atom(tsc_re_parser_t* p) {
    if (re_at_end(p)) return NULL;
    bool strict = re_is_unicode(p);
    uint16_t u = p->units[p->pos];
    switch (u) {
    case '(':
        return NULL; /* The group-frame worklist owns delimiters. */
    case '[': {
        p->pos++;
        return re_parse_class_dispatch(p);
    }
    case '.':
        p->pos++;
        return re_new_node(p, RE_N_DOT);
    case '^':
        p->pos++;
        return re_new_node(p, RE_N_ANCHOR_START);
    case '$':
        p->pos++;
        return re_new_node(p, RE_N_ANCHOR_END);
    case '*':
    case '+':
    case '?':
    case ')':
    case '|':
        return NULL;
    case '{':
    case '}':
    case ']': {
        if (strict) {
            re_fail(p, p->pos);
            return NULL;
        }
        p->pos++;
        tsc_re_node_t* lit = re_new_node(p, RE_N_UNIT);
        lit->u.unit.unit = u;
        return lit;
    }
    case '\\': {
        p->pos++;
        tsc_re_char_t esc;
        if (!re_parse_char_escape(p, false, &esc)) return NULL;
        if (esc.kind == RE_CH_UNIT) {
            tsc_re_node_t* lit = re_new_node(p, RE_N_UNIT);
            lit->u.unit.unit = (uint16_t)re_canon(esc.value, p->flags.ignore_case, strict);
            return lit;
        }
        if (esc.kind == RE_CH_CPOINT) {
            if (strict) {
                uint32_t folded = re_canon(esc.value, p->flags.ignore_case, true);
                if (folded > 0xffff) {
                    uint32_t fshift = folded - 0x10000u;
                    tsc_re_node_t* pair = re_new_node(p, RE_N_PAIR);
                    pair->u.pair.hi = (uint16_t)(0xd800u + (fshift >> 10));
                    pair->u.pair.lo = (uint16_t)(0xdc00u + (fshift & 0x3ffu));
                    return pair;
                }
                tsc_re_node_t* lit = re_new_node(p, RE_N_UNIT);
                lit->u.unit.unit = (uint16_t)folded;
                return lit;
            }
            tsc_re_node_t* seq = re_new_node(p, RE_N_SEQ);
            uint32_t shifted = esc.value - 0x10000u;
            tsc_re_node_t* hi = re_new_node(p, RE_N_UNIT);
            hi->u.unit.unit = (uint16_t)(0xd800u + (shifted >> 10));
            tsc_re_node_t* lo = re_new_node(p, RE_N_UNIT);
            lo->u.unit.unit = (uint16_t)(0xdc00u + (shifted & 0x3ffu));
            re_node_list_push(p, seq, hi);
            re_node_list_push(p, seq, lo);
            return seq;
        }
        if (esc.kind == RE_CH_CLASS_ESCAPE) {
            tsc_re_node_t* node = re_new_node(p, RE_N_CLASS_ESCAPE);
            node->u.class_escape.escape = esc.escape;
            return node;
        }
        if (esc.kind == RE_CH_NODE) {
            return esc.node;
        }
        tsc_re_node_t* ref = re_new_node(p, RE_N_BACKREF);
        ref->u.backref.index = RE_UNSET;
        ref->u.backref.offset = esc.backref_offset;
        if (esc.kind == RE_CH_BACKREF) {
            ref->u.backref.digits_at = esc.backref_digits_at;
            ref->u.backref.ndigits = esc.backref_ndigits;
        } else {
            ref->u.backref.name = (char*)TSC_GC_MALLOC(
                esc.backref_name_len ? esc.backref_name_len : 1);
            for (size_t i = 0; i < esc.backref_name_len; i++) {
                ref->u.backref.name[i] = esc.backref_name[i];
            }
            ref->u.backref.name_len = esc.backref_name_len;
        }
        return ref;
    }
    default: {
        /* re_parse_single_cp combines astral pairs in Unicode mode. */
        uint32_t cp = re_parse_single_cp(p);
        if (strict && cp > 0xffff) {
            uint32_t shifted = cp - 0x10000u;
            tsc_re_node_t* pair = re_new_node(p, RE_N_PAIR);
            pair->u.pair.hi = (uint16_t)(0xd800u + (shifted >> 10));
            pair->u.pair.lo = (uint16_t)(0xdc00u + (shifted & 0x3ffu));
            return pair;
        }
        if (!strict && cp > 0xffff) {
            tsc_re_node_t* seq = re_new_node(p, RE_N_SEQ);
            uint32_t shifted = cp - 0x10000u;
            tsc_re_node_t* hi = re_new_node(p, RE_N_UNIT);
            hi->u.unit.unit = (uint16_t)(0xd800u + (shifted >> 10));
            tsc_re_node_t* lo = re_new_node(p, RE_N_UNIT);
            lo->u.unit.unit = (uint16_t)(0xdc00u + (shifted & 0x3ffu));
            re_node_list_push(p, seq, hi);
            re_node_list_push(p, seq, lo);
            return seq;
        }
        tsc_re_node_t* lit = re_new_node(p, RE_N_UNIT);
        lit->u.unit.unit = (uint16_t)cp;
        return lit;
    }
    }
}

/* One term: an atom with an optional quantifier. Quantified assertions
 * fail in Unicode mode and repeat (zero-width) per Annex B otherwise. */
static tsc_re_node_t* re_quantify(tsc_re_parser_t* p, tsc_re_node_t* atom) {
    if (!atom) return NULL;
    bool strict = re_is_unicode(p);
    size_t min = 0;
    size_t max = 0;
    bool greedy = true;
    bool has_quant = false;
    if (!re_at_end(p)) {
        uint16_t u = p->units[p->pos];
        if (u == '*' || u == '+' || u == '?') {
            p->pos++;
            min = (u == '+') ? 1 : 0;
            max = (u == '?') ? 1 : RE_INF;
            greedy = true;
            if (!re_at_end(p) && p->units[p->pos] == '?') {
                greedy = false;
                p->pos++;
            }
            has_quant = true;
        } else if (u == '{') {
            size_t qmin = 0;
            size_t qmax = 0;
            bool lazy = false;
            if (re_try_quantifier(p, &qmin, &qmax, &lazy)) {
                min = qmin;
                max = qmax;
                greedy = !lazy;
                has_quant = true;
            } else if (strict) {
                re_fail(p, p->pos);
                return NULL;
            }
        }
    }
    if (!has_quant) return atom;
    if (min > max) {
        re_fail(p, p->pos);
        return NULL;
    }
    if (re_is_assertion_node(atom)) {
        if (strict || atom->kind != RE_N_LOOKAHEAD) {
            re_fail(p, p->pos);
            return NULL;
        }
    }
    tsc_re_node_t* quant = re_new_node(p, RE_N_QUANT);
    quant->u.quant.child = atom;
    quant->u.quant.min = min;
    quant->u.quant.max = max;
    quant->u.quant.greedy = greedy;
    return quant;
}

/* Records pending backreference fixups for a term just pushed into seq
 * at index: descends through quantifier wrappers to the atom slot. */
static void re_record_term_fixups(tsc_re_parser_t* p, tsc_re_node_t* term, tsc_re_node_t* seq, size_t index) {
    tsc_re_node_t* holder = seq;
    size_t slot = index;
    tsc_re_node_t* node = term;
    while (node->kind == RE_N_QUANT) {
        holder = node;
        slot = RE_CHILD_SLOT;
        node = node->u.quant.child;
    }
    if (node->kind != RE_N_BACKREF || node->u.backref.index != RE_UNSET) return;
    if (node->u.backref.name) {
        re_record_named_fixup(p, node);
        return;
    }
    re_record_dec_fixup(p, node, holder, slot);
}

/* Group delimiters are consumed by an explicit frame collection. Atom
 * parsing never descends through a group, so pattern nesting does not consume
 * the native stack. Every branch is a sequence in the same AST. */
typedef struct {
    tsc_re_node_t* alternatives;
    tsc_re_node_t* sequence;
    tsc_re_node_t* wrapper;
    tsc_re_flags_t outer_flags;
    tsc_re_branch_t* outer_branch;
} re_parse_frame_t;

static void re_enter_alternative(tsc_re_parser_t* p, const re_parse_frame_t* frame) {
    tsc_re_branch_t* branch = TSC_GC_MALLOC(sizeof(*branch));
    *branch = (tsc_re_branch_t) { frame->outer_branch, frame->alternatives,
        frame->alternatives->u.list.len - 1,
        frame->outer_branch ? frame->outer_branch->depth + 1 : 1 };
    p->branch = branch;
}

static unsigned re_modifier_bit(uint16_t unit) {
    switch (unit) {
    case 'i': return 1;
    case 'm': return 2;
    case 's': return 4;
    default: return 0;
    }
}
static bool re_group_modifiers(tsc_re_parser_t* p) {
    unsigned added = 0, removed = 0;
    bool removing = false;
    while (!re_at_end(p)) {
        uint16_t unit = p->units[p->pos++];
        if (unit == ':') {
            if (removing && !(added | removed)) break;
            if (added & 1) p->flags.ignore_case = true;
            if (added & 2) p->flags.multiline = true;
            if (added & 4) p->flags.dot_all = true;
            if (removed & 1) p->flags.ignore_case = false;
            if (removed & 2) p->flags.multiline = false;
            if (removed & 4) p->flags.dot_all = false;
            return true;
        }
        if (unit == '-' && !removing) { removing = true; continue; }
        unsigned bit = re_modifier_bit(unit);
        if (!bit || ((added | removed) & bit)) break;
        if (removing) removed |= bit; else added |= bit;
    }
    re_fail(p, p->pos);
    return false;
}

static tsc_re_node_t* re_group_header(tsc_re_parser_t* p) {
    tsc_re_node_t* wrapper = NULL;
    if (re_at_end(p) || p->units[p->pos] != '?') {
        wrapper = re_new_node(p, RE_N_GROUP);
        wrapper->u.group.index = ++p->ngroups;
        return wrapper;
    }
    p->pos++;
    if (re_at_end(p)) { re_fail(p, p->pos); return NULL; }
    uint16_t prefix = p->units[p->pos++];
    if (prefix == ':') return NULL;
    if (prefix == '-' || re_modifier_bit(prefix)) {
        p->pos--;
        re_group_modifiers(p);
        return NULL;
    }
    bool backward = false;
    if (prefix == '<' && !re_at_end(p) &&
        (p->units[p->pos] == '=' || p->units[p->pos] == '!')) {
        backward = true;
        prefix = p->units[p->pos++];
    }
    if (prefix == '=' || prefix == '!') {
        wrapper = re_new_node(p, backward ? RE_N_LOOKBEHIND : RE_N_LOOKAHEAD);
        wrapper->u.lookaround.positive = prefix == '=';
        return wrapper;
    }
    if (prefix != '<') { re_fail(p, p->pos); return NULL; }
    p->pos--; /* Group-name parser owns its opening '<'. */
    tsc_re_char_t name = {0};
    if (!re_parse_group_name(p, &name)) return NULL;
    wrapper = re_new_node(p, RE_N_GROUP);
    wrapper->u.group.index = ++p->ngroups;
    if (!re_register_named(p, name.backref_name, name.backref_name_len,
                           wrapper->u.group.index, p->pos)) return NULL;
    return wrapper;
}

static tsc_re_node_t* re_parse_disjunction(tsc_re_parser_t* p) {
    size_t len = 0, capacity = 16;
    re_parse_frame_t* frames = TSC_GC_MALLOC(capacity * sizeof(*frames));
    tsc_re_node_t* wrapper = NULL;
    tsc_re_flags_t outer_flags = p->flags;
    tsc_re_branch_t* outer_branch = p->branch;
    bool push = true;
    for (;;) {
        if (push) {
            if (len == capacity) {
                capacity *= 2;
                frames = TSC_GC_REALLOC(frames, capacity * sizeof(*frames));
            }
            re_parse_frame_t frame = {
                re_new_node(p, RE_N_ALT), re_new_node(p, RE_N_SEQ), wrapper, outer_flags, outer_branch
            };
            re_node_list_push(p, frame.alternatives, frame.sequence);
            re_enter_alternative(p, &frame);
            frames[len++] = frame;
            push = false;
        }
        re_parse_frame_t* frame = &frames[len - 1];
        if (!re_at_end(p) && p->units[p->pos] == '(') {
            p->pos++;
            outer_flags = p->flags;
            outer_branch = p->branch;
            wrapper = re_group_header(p);
            if (p->failed) return NULL;
            push = true;
            continue;
        }
        if (!re_at_end(p) && p->units[p->pos] == '|') {
            p->pos++;
            frame->sequence = re_new_node(p, RE_N_SEQ);
            re_node_list_push(p, frame->alternatives, frame->sequence);
            re_enter_alternative(p, frame);
            continue;
        }
        if (re_at_end(p) || p->units[p->pos] == ')') {
            if (len == 1) {
                if (!re_at_end(p)) { re_fail(p, p->pos); return NULL; }
                return frame->alternatives;
            }
            if (re_at_end(p)) { re_fail(p, p->pos); return NULL; }
            p->pos++;
            tsc_re_node_t* term = frame->alternatives;
            if (frame->wrapper) {
                if (frame->wrapper->kind == RE_N_GROUP) frame->wrapper->u.group.child = term;
                else frame->wrapper->u.lookaround.child = term;
                term = frame->wrapper;
            }
            p->flags = frame->outer_flags;
            p->branch = frame->outer_branch;
            len--;
            term = re_quantify(p, term);
            if (!term || p->failed) return NULL;
            frame = &frames[len - 1];
            re_node_list_push(p, frame->sequence, term);
            continue;
        }
        tsc_re_node_t* term = re_quantify(p, re_parse_atom(p));
        if (!term || p->failed) { re_fail(p, p->pos); return NULL; }
        re_node_list_push(p, frame->sequence, term);
        re_record_term_fixups(p, term, frame->sequence, frame->sequence->u.list.len - 1);
    }
}

static tsc_re_node_t** re_fixup_slot(tsc_re_node_t* holder, size_t index) {
    if (index == RE_CHILD_SLOT) return &holder->u.quant.child;
    return &holder->u.list.items[index];
}

static tsc_re_named_entry_t* re_lookup_named(tsc_re_parser_t* p, const char* name, size_t name_len) {
    for (size_t i = 0; i < p->nnamed; i++) {
        if (p->named[i].name_len == name_len && memcmp(p->named[i].name, name, name_len) == 0) {
            return &p->named[i];
        }
    }
    return NULL;
}

/* Decimal escapes: live backreferences when the count allows, Annex B
 * octal rewrites otherwise (Unicode mode fails instead). */
static bool re_resolve_decimal(tsc_re_parser_t* p) {
    bool strict = re_is_unicode(p);
    tsc_re_flags_t outer_flags = p->flags;
    for (size_t i = 0; i < p->ndec; i++) {
        re_dec_fixup_t* fix = &p->dec[i];
        p->flags = fix->node->flags;
        size_t n = 0;
        for (size_t k = 0; k < fix->ndigits; k++) {
            uint16_t d = p->units[fix->digits_at + k];
            if (n < p->ngroups + 1) n = n * 10 + (size_t)(d - '0');
        }
        if (n >= 1 && n <= p->ngroups) {
            fix->node->u.backref.index = n;
            continue;
        }
        if (strict) {
            re_fail(p, fix->node->u.backref.offset);
            return false;
        }
        size_t consumed = 0;
        uint32_t value = re_decimal_fallback(
            &p->units[fix->digits_at], fix->ndigits, &consumed);
        fix->node->kind = RE_N_UNIT;
        fix->node->u.unit.unit = (uint16_t)value;
        if (consumed < fix->ndigits) {
            tsc_re_node_t* seq = re_new_node(p, RE_N_SEQ);
            re_node_list_push(p, seq, fix->node);
            for (size_t k = consumed; k < fix->ndigits; k++) {
                tsc_re_node_t* lit = re_new_node(p, RE_N_UNIT);
                lit->u.unit.unit = p->units[fix->digits_at + k];
                re_node_list_push(p, seq, lit);
            }
            *re_fixup_slot(fix->holder, fix->index) = seq;
        }
    }
    p->flags = outer_flags;
    return true;
}

/* Every named reference binds the immutable ordered fanout of its name. */
static bool re_resolve_named(tsc_re_parser_t* p) {
    for (size_t i = 0; i < p->nnamed_ref; i++) {
        re_named_fixup_t* fix = &p->named_ref[i];
        tsc_re_named_entry_t* entry = re_lookup_named(p, fix->name, fix->name_len);
        if (!entry) {
            re_fail(p, fix->node->u.backref.offset);
            return false;
        }
        fix->node->u.backref.named = entry;
    }
    return true;
}

int tsc_re_parse_flags(const uint16_t* units, size_t len, tsc_re_flags_t* out) {
    memset(out, 0, sizeof(*out));
    for (size_t i = 0; i < len; i++) {
        bool* slot = NULL;
        switch (units[i]) {
        case 'd': slot = &out->has_indices; break;
        case 'g': slot = &out->global; break;
        case 'i': slot = &out->ignore_case; break;
        case 'm': slot = &out->multiline; break;
        case 's': slot = &out->dot_all; break;
        case 'u': slot = &out->unicode; break;
        case 'v': slot = &out->unicode_sets; break;
        case 'y': slot = &out->sticky; break;
        default: return TSC_RE_ERR_FLAGS;
        }
        if (*slot) return TSC_RE_ERR_FLAGS;
        *slot = true;
    }
    if (out->unicode && out->unicode_sets) return TSC_RE_ERR_FLAGS;
    return TSC_RE_OK;
}

static bool re_prepare_v_classes(tsc_re_parser_t* p) {
    if (!p->flags.unicode_sets) return true;
    p->classes = TSC_GC_MALLOC((p->len ? p->len : 1) * sizeof(*p->classes));
    p->class_ends = TSC_GC_MALLOC((p->len ? p->len : 1) * sizeof(*p->class_ends));
    size_t* opens = TSC_GC_MALLOC((p->len ? p->len : 1) * sizeof(*opens));
    size_t depth = 0;
    for (size_t i = 0; i < p->len; i++) {
        if (p->units[i] == '\\') { if (i + 1 < p->len) i++; continue; }
        if (p->units[i] == '[') opens[depth++] = i;
        else if (p->units[i] == ']' && depth) {
            size_t start = opens[--depth];
            p->pos = start + 1;
            bool negated = p->pos < p->len && p->units[p->pos] == '^';
            if (negated) p->pos++;
            tsc_re_node_t* cls = re_parse_v_class(p, negated);
            if (!cls || p->failed || p->pos != i + 1) return false;
            p->classes[start] = cls;
            p->class_ends[start] = i + 1;
        }
    }
    if (depth) { re_fail(p, opens[depth - 1]); return false; }
    p->pos = 0;
    return true;
}

tsc_re_compiled_t* tsc_re_compile(
    const uint16_t* pattern,
    size_t pattern_len,
    tsc_re_flags_t flags,
    tsc_re_error_t* error
) {
    if (error) {
        error->code = TSC_RE_OK;
        error->offset = 0;
    }
    tsc_re_parser_t parser;
    memset(&parser, 0, sizeof(parser));
    parser.units = pattern;
    parser.len = pattern_len;
    parser.flags = flags;
    parser.error = error;
    parser.named_mode = flags.unicode || flags.unicode_sets;
    if (!re_prepare_v_classes(&parser)) return NULL;
    tsc_re_node_t* root = re_parse_disjunction(&parser);
    /* Legacy IdentityEscape permits k only while the grammar parameter N is
     * absent. Discover named groups with the same parser, then select +N for
     * the complete pattern, including references before their definitions. */
    if (!parser.failed && parser.nnamed && !parser.named_mode) {
        memset(&parser, 0, sizeof(parser));
        parser.units = pattern;
        parser.len = pattern_len;
        parser.flags = flags;
        parser.error = error;
        parser.named_mode = true;
        root = re_parse_disjunction(&parser);
    }
    if (!parser.failed && root && parser.pos != parser.len) {
        re_fail(&parser, parser.pos);
        root = NULL;
    }
    if (parser.failed || !root) return NULL;
    if (!re_resolve_decimal(&parser)) return NULL;
    if (parser.failed || !re_resolve_named(&parser)) return NULL;
    if (!re_compile_sets(&parser)) return NULL;
    tsc_re_compiled_t* re = (tsc_re_compiled_t*)TSC_GC_MALLOC(sizeof(tsc_re_compiled_t));
    re->root = root;
    re->flags = flags;
    re->ngroups = parser.ngroups;
    re->nnamed = parser.nnamed;
    re->named = parser.named;
    return re;
}

size_t tsc_re_group_count(const tsc_re_compiled_t* re) {
    return re ? re->ngroups : 0;
}

size_t tsc_re_named_count(const tsc_re_compiled_t* re) {
    return re ? re->nnamed : 0;
}

static size_t re_named_participant(const tsc_re_named_entry_t* entry, const size_t* captures) {
    for (size_t i = 0; captures && i < entry->len; i++) {
        size_t index = entry->indices[i];
        if (captures[2 * index] != RE_UNSET && captures[2 * index + 1] != RE_UNSET) return index;
    }
    return entry->indices[0];
}

size_t tsc_re_named_group(const tsc_re_compiled_t* re, const char* name, size_t name_len,
                         const size_t* captures) {
    if (!re) return SIZE_MAX;
    for (size_t i = 0; i < re->nnamed; i++) {
        if (re->named[i].name_len == name_len && memcmp(re->named[i].name, name, name_len) == 0) {
            return re_named_participant(&re->named[i], captures);
        }
    }
    return SIZE_MAX;
}

/* Immutable continuation arena and LIFO choices. Every choice stores the
 * complete remaining task chain, input position, direction, and capture-trail
 * height. Completed frames are never mutated or reused by another branch.
 * Lookaround installs a failure sentinel and commits its internal choices;
 * lookbehind uses the same machine with reversed sequence/character direction.
 */
typedef struct { size_t slot, old; } re_trail_t;
enum { RE_T_NODE, RE_T_GROUP_END, RE_T_REPEAT, RE_T_REPEAT_END,
       RE_T_ASSERT_END, RE_T_CLEAR };
typedef struct {
    int kind;
    const tsc_re_node_t* node;
    size_t next, count, pos, barrier;
    bool backward;
} re_task_t;
typedef struct {
    size_t head, pos, trail;
    bool backward, assertion, negative;
} re_choice_t;
typedef struct {
    const tsc_re_compiled_t* re;
    const uint16_t* units;
    size_t len, *caps, pos;
    bool ignore_case, unicode, multiline, dot_all, backward, oom;
    re_task_t* tasks;
    size_t ntasks, captasks, head;
    re_choice_t* choices;
    size_t nchoices, capchoices;
    re_trail_t* trail;
    size_t ntrail, captrail;
} re_ctx_t;

/* Resource exhaustion cannot be reported as an ordinary non-match. */
static void* re_grow(void* ptr, size_t n, size_t elt) {
    if (n > SIZE_MAX / elt) abort();
    void* result = realloc(ptr, n * elt);
    if (!result) abort();
    return result;
}
static void re_reserve(void** data, size_t* capacity, size_t used, size_t elt) {
    if (used < *capacity) return;
    if (*capacity > SIZE_MAX / 2) abort();
    *capacity = *capacity ? *capacity * 2 : 64;
    *data = re_grow(*data, *capacity, elt);
}
static size_t re_task(re_ctx_t* ctx, int kind, const tsc_re_node_t* node,
                      size_t next, size_t count, size_t pos, size_t barrier) {
    re_reserve((void**)&ctx->tasks, &ctx->captasks, ctx->ntasks, sizeof(*ctx->tasks));
    size_t index = ctx->ntasks++;
    ctx->tasks[index] = (re_task_t){kind, node, next, count, pos, barrier, ctx->backward};
    return index;
}
static void re_push_node(re_ctx_t* ctx, const tsc_re_node_t* node) {
    ctx->head = re_task(ctx, RE_T_NODE, node, ctx->head, 0, 0, 0);
}
static void re_choice(re_ctx_t* ctx, size_t head, bool assertion, bool negative) {
    re_reserve((void**)&ctx->choices, &ctx->capchoices, ctx->nchoices, sizeof(*ctx->choices));
    ctx->choices[ctx->nchoices++] = (re_choice_t){
        head, ctx->pos, ctx->ntrail, ctx->backward, assertion, negative
    };
}
static void re_trail_write(re_ctx_t* ctx, size_t slot, size_t value) {
    re_reserve((void**)&ctx->trail, &ctx->captrail, ctx->ntrail, sizeof(*ctx->trail));
    ctx->trail[ctx->ntrail++] = (re_trail_t){slot, ctx->caps[slot]};
    ctx->caps[slot] = value;
}
static void re_trail_truncate(re_ctx_t* ctx, size_t height) {
    while (ctx->ntrail > height) {
        re_trail_t entry = ctx->trail[--ctx->ntrail];
        ctx->caps[entry.slot] = entry.old;
    }
}
static bool re_backtrack(re_ctx_t* ctx) {
    while (ctx->nchoices) {
        re_choice_t choice = ctx->choices[--ctx->nchoices];
        re_trail_truncate(ctx, choice.trail);
        ctx->head = choice.head;
        ctx->pos = choice.pos;
        ctx->backward = choice.backward;
        if (!choice.assertion || choice.negative) return true;
    }
    return false;
}

/* Reads one code point pair-aware in Unicode mode; lone surrogates read
 * as themselves. */
static uint32_t re_read_cp(const uint16_t* units, size_t len, size_t pos, bool unicode, size_t* w_out) {
    uint16_t u = units[pos];
    if (unicode && u >= 0xd800 && u <= 0xdbff && pos + 1 < len &&
        units[pos + 1] >= 0xdc00 && units[pos + 1] <= 0xdfff) {
        *w_out = 2;
        return 0x10000u + (((uint32_t)u - 0xd800u) << 10) + ((uint32_t)units[pos + 1] - 0xdc00u);
    }
    *w_out = 1;
    return u;
}

static bool re_is_lt_cp(uint32_t cp) {
    return cp == '\n' || cp == '\r' || cp == 0x2028 || cp == 0x2029;
}

/* Reads the next character in either matching direction. */
static bool re_read_direction(re_ctx_t* ctx, size_t pos, uint32_t* cp, size_t* next) {
    if (ctx->backward) {
        if (pos == 0) return false;
        size_t start = pos - 1;
        if (ctx->unicode && start > 0 && re_is_low_surrogate(ctx->units[start]) &&
            re_is_high_surrogate(ctx->units[start - 1])) start--;
        size_t width;
        *cp = re_read_cp(ctx->units, pos, start, ctx->unicode, &width);
        *next = start;
    } else {
        if (pos >= ctx->len) return false;
        size_t width;
        *cp = re_read_cp(ctx->units, ctx->len, pos, ctx->unicode, &width);
        *next = pos + width;
    }
    return true;
}
static bool re_word(re_ctx_t* ctx, uint16_t unit) {
    return re_is_word_unit((uint16_t)re_canon(unit, ctx->ignore_case, ctx->unicode));
}
static bool re_match_leaf(re_ctx_t* ctx, const tsc_re_node_t* node) {
    size_t pos = ctx->pos, next = pos;
    uint32_t cp = 0;
    switch (node->kind) {
    case RE_N_EMPTY: return true;
    case RE_N_ANCHOR_START:
        return pos == 0 || (ctx->multiline && re_is_lt_cp(ctx->units[pos - 1]));
    case RE_N_ANCHOR_END:
        return pos == ctx->len || (ctx->multiline && re_is_lt_cp(ctx->units[pos]));
    case RE_N_WORD_BOUNDARY: {
        bool left = pos > 0 && re_word(ctx, ctx->units[pos - 1]);
        bool right = pos < ctx->len && re_word(ctx, ctx->units[pos]);
        return (left != right) != node->u.boundary.negated;
    }
    case RE_N_BACKREF: {
        size_t index = node->u.backref.named ?
            re_named_participant(node->u.backref.named, ctx->caps) : node->u.backref.index;
        if (index == RE_UNSET || index > ctx->re->ngroups) return false;
        size_t start = ctx->caps[index * 2], end = ctx->caps[index * 2 + 1];
        if (start == RE_UNSET || end == RE_UNSET) return true;
        size_t cursor = ctx->backward ? end : start;
        while (ctx->backward ? cursor > start : cursor < end) {
            uint32_t expected;
            size_t width;
            if (ctx->backward) {
                size_t at = cursor - 1;
                if (ctx->unicode && at > start && re_is_low_surrogate(ctx->units[at]) &&
                    re_is_high_surrogate(ctx->units[at - 1])) at--;
                expected = re_read_cp(ctx->units, cursor, at, ctx->unicode, &width);
                cursor = at;
            } else {
                expected = re_read_cp(ctx->units, end, cursor, ctx->unicode, &width);
                cursor += width;
            }
            if (!re_read_direction(ctx, pos, &cp, &next) ||
                re_canon(cp, ctx->ignore_case, ctx->unicode) !=
                re_canon(expected, ctx->ignore_case, ctx->unicode)) return false;
            pos = next;
        }
        ctx->pos = pos;
        return true;
    }
    case RE_N_CLASS: {
        size_t* ends = malloc((node->u.cls.nstrs + 1) * sizeof(*ends));
        if (!ends) abort();
        size_t nends = 0;
        for (size_t i = 0; i < node->u.cls.nstrs; i++) {
            tsc_re_qstr_t string = node->u.cls.strs[i];
            size_t cursor = ctx->backward ? string.len : 0, input = pos;
            bool hit = true;
            while (ctx->backward ? cursor > 0 : cursor < string.len) {
                size_t at = cursor, width;
                if (ctx->backward) {
                    at--;
                    if (at && re_is_low_surrogate(string.units[at]) &&
                        re_is_high_surrogate(string.units[at - 1])) at--;
                }
                uint32_t expected = re_read_cp(string.units, string.len, at, true, &width);
                cursor = ctx->backward ? at : cursor + width;
                if (!re_read_direction(ctx, input, &cp, &next) ||
                    re_canon(cp, ctx->ignore_case, ctx->unicode) != expected) { hit = false; break; }
                input = next;
            }
            if (hit) ends[nends++] = input;
        }
        bool scalar_hit = re_read_direction(ctx, pos, &cp, &next);
        if (scalar_hit) {
            cp = re_canon(cp, ctx->ignore_case, ctx->unicode);
            scalar_hit = false;
            for (size_t i = 0; i < node->u.cls.nranges; i++) {
                tsc_re_range_t range = node->u.cls.ranges[i];
                if (cp >= range.lo && cp <= range.hi) { scalar_hit = true; break; }
            }
        }
        if (scalar_hit) ends[nends++] = next;
        for (size_t i = nends; i > 1; i--) {
            ctx->pos = ends[i - 1]; re_choice(ctx, ctx->head, false, false);
        }
        if (nends) ctx->pos = ends[0];
        free(ends);
        return nends != 0;
    }
    default: break;
    }
    if (!re_read_direction(ctx, pos, &cp, &next)) return false;
    uint32_t folded = re_canon(cp, ctx->ignore_case, ctx->unicode);
    bool hit = false;
    switch (node->kind) {
    case RE_N_UNIT: hit = folded == re_canon(node->u.unit.unit, ctx->ignore_case, ctx->unicode); break;
    case RE_N_PAIR: {
        uint32_t expected = 0x10000u +
            (((uint32_t)node->u.pair.hi - 0xd800u) << 10) +
            ((uint32_t)node->u.pair.lo - 0xdc00u);
        hit = folded == re_canon(expected, ctx->ignore_case, ctx->unicode);
        break;
    }
    case RE_N_DOT: hit = ctx->dot_all || !re_is_lt_cp(cp); break;
    default: break;
    }
    if (hit) ctx->pos = next;
    return hit;
}

/* Clear every capture owned by a quantified subtree on each repetition. */
static void re_push_children(re_ctx_t* ctx, const tsc_re_node_t* node, int kind) {
    if (node->kind == RE_N_SEQ || node->kind == RE_N_ALT) {
        for (size_t i = 0; i < node->u.list.len; i++)
            ctx->head = re_task(ctx, kind, node->u.list.items[i], ctx->head, 0, 0, 0);
    } else {
        const tsc_re_node_t* child = NULL;
        if (node->kind == RE_N_GROUP) child = node->u.group.child;
        else if (node->kind == RE_N_QUANT) child = node->u.quant.child;
        else if (node->kind == RE_N_LOOKAHEAD || node->kind == RE_N_LOOKBEHIND)
            child = node->u.lookaround.child;
        if (child) ctx->head = re_task(ctx, kind, child, ctx->head, 0, 0, 0);
    }
}
static bool re_step(re_ctx_t* ctx, re_task_t task) {
    const tsc_re_node_t* node = task.node;
    ctx->ignore_case = node->flags.ignore_case;
    ctx->multiline = node->flags.multiline;
    ctx->dot_all = node->flags.dot_all;
    ctx->head = task.next;
    if (task.kind == RE_T_CLEAR) {
        if (node->kind == RE_N_GROUP) {
            re_trail_write(ctx, node->u.group.index * 2, RE_UNSET);
            re_trail_write(ctx, node->u.group.index * 2 + 1, RE_UNSET);
        }
        re_push_children(ctx, node, RE_T_CLEAR);
        return true;
    }
    if (task.kind == RE_T_GROUP_END) {
        size_t index = node->u.group.index * 2;
        re_trail_write(ctx, index + (ctx->backward ? 0 : 1), ctx->pos);
        return true;
    }
    if (task.kind == RE_T_ASSERT_END) {
        re_choice_t sentinel = ctx->choices[task.barrier];
        ctx->nchoices = task.barrier;
        ctx->pos = sentinel.pos;
        ctx->backward = sentinel.backward;
        if (!node->u.lookaround.positive) {
            re_trail_truncate(ctx, sentinel.trail);
            return false;
        }
        return true;
    }
    if (task.kind == RE_T_REPEAT_END) {
        if (ctx->pos == task.pos && task.count >= node->u.quant.min) return false;
        ctx->head = re_task(ctx, RE_T_REPEAT, node, ctx->head, task.count + 1, 0, 0);
        return true;
    }
    if (task.kind == RE_T_REPEAT) {
        if (task.count >= node->u.quant.max) return true;
        size_t continuation = ctx->head;
        size_t repeat = re_task(ctx, RE_T_REPEAT_END, node, continuation, task.count, ctx->pos, 0);
        repeat = re_task(ctx, RE_T_NODE, node->u.quant.child, repeat, 0, 0, 0);
        repeat = re_task(ctx, RE_T_CLEAR, node->u.quant.child, repeat, 0, 0, 0);
        if (task.count >= node->u.quant.min) {
            if (node->u.quant.greedy) {
                re_choice(ctx, continuation, false, false);
                ctx->head = repeat;
            } else re_choice(ctx, repeat, false, false);
        } else ctx->head = repeat;
        return true;
    }
    switch (node->kind) {
    case RE_N_SEQ:
        for (size_t i = node->u.list.len; i > 0; i--) {
            size_t index = ctx->backward ? node->u.list.len - i : i - 1;
            re_push_node(ctx, node->u.list.items[index]);
        }
        return true;
    case RE_N_ALT:
        for (size_t i = node->u.list.len; i > 1; i--) {
            size_t branch = re_task(ctx, RE_T_NODE, node->u.list.items[i - 1], ctx->head, 0, 0, 0);
            re_choice(ctx, branch, false, false);
        }
        if (node->u.list.len) re_push_node(ctx, node->u.list.items[0]);
        return node->u.list.len != 0;
    case RE_N_GROUP:
        re_trail_write(ctx, node->u.group.index * 2 + (ctx->backward ? 1 : 0), ctx->pos);
        ctx->head = re_task(ctx, RE_T_GROUP_END, node, ctx->head, 0, 0, 0);
        re_push_node(ctx, node->u.group.child);
        return true;
    case RE_N_QUANT:
        ctx->head = re_task(ctx, RE_T_REPEAT, node, ctx->head, 0, 0, 0);
        return true;
    case RE_N_LOOKAHEAD:
    case RE_N_LOOKBEHIND: {
        size_t barrier = ctx->nchoices;
        re_choice(ctx, ctx->head, true, !node->u.lookaround.positive);
        ctx->head = re_task(ctx, RE_T_ASSERT_END, node, ctx->head, 0, 0, barrier);
        ctx->backward = node->kind == RE_N_LOOKBEHIND;
        re_push_node(ctx, node->u.lookaround.child);
        return true;
    }
    default: return re_match_leaf(ctx, node);
    }
}

bool tsc_re_match_at(
    const tsc_re_compiled_t* re, const uint16_t* units, size_t units_len,
    size_t start, size_t* cap_out, size_t* match_start, size_t* match_end
) {
    if (!re || !re->root || start > units_len) return false;
    size_t nslots = 2 * (re->ngroups + 1);
    for (size_t i = 0; i < nslots; i++) cap_out[i] = RE_UNSET;
    re_ctx_t ctx = {0};
    ctx.re = re;
    ctx.units = units;
    ctx.len = units_len;
    ctx.caps = cap_out;
    ctx.ignore_case = re->flags.ignore_case;
    ctx.unicode = re->flags.unicode || re->flags.unicode_sets;
    ctx.multiline = re->flags.multiline;
    ctx.dot_all = re->flags.dot_all;
    ctx.pos = start;
    ctx.head = RE_UNSET;
    re_push_node(&ctx, re->root);
    bool ok = true;
    while (ctx.head != RE_UNSET) {
        re_task_t task = ctx.tasks[ctx.head];
        ctx.backward = task.backward;
        if (!re_step(&ctx, task) && !re_backtrack(&ctx)) { ok = false; break; }
    }
    free(ctx.tasks);
    free(ctx.choices);
    free(ctx.trail);
    if (!ok) return false;
    cap_out[0] = start;
    cap_out[1] = ctx.pos;
    *match_start = start;
    *match_end = ctx.pos;
    return true;
}

/* v-mode [...] content: exactly one union, intersection, or difference
 * spanning to ']'. Ranges need single-character endpoints; bare ranges
 * are not operands, so set operators never mix with concatenation. */
static tsc_re_node_t* re_parse_v_class(tsc_re_parser_t* p, bool negated) {
    tsc_re_node_t* cls = re_new_node(p, RE_N_CLASS);
    cls->u.cls.op = RE_CLS_UNION;
    cls->u.cls.negated = negated;
    cls->u.cls.unicode = true;
    if (!re_at_end(p) && p->units[p->pos] == ']') {
        p->pos++;
        return cls;
    }
    re_catom_t first;
    if (!re_parse_v_operand(p, &first)) {
        re_fail(p, p->pos);
        return NULL;
    }
    if (re_match_double(p, '&')) {
        cls->u.cls.op = RE_CLS_INTERSECT;
        re_operand_push(p, cls, &first);
        for (;;) {
            re_catom_t next;
            if (!re_parse_v_operand(p, &next)) {
                re_fail(p, p->pos);
                return NULL;
            }
            re_operand_push(p, cls, &next);
            if (re_match_double(p, '&')) continue;
            if (!re_at_end(p) && p->units[p->pos] == ']') {
                p->pos++;
                return cls;
            }
            re_fail(p, p->pos);
            return NULL;
        }
    }
    if (re_match_double(p, '-')) {
        cls->u.cls.op = RE_CLS_DIFFERENCE;
        re_operand_push(p, cls, &first);
        for (;;) {
            re_catom_t next;
            if (!re_parse_v_operand(p, &next)) {
                re_fail(p, p->pos);
                return NULL;
            }
            re_operand_push(p, cls, &next);
            if (re_match_double(p, '-')) continue;
            if (!re_at_end(p) && p->units[p->pos] == ']') {
                p->pos++;
                return cls;
            }
            re_fail(p, p->pos);
            return NULL;
        }
    }
    /* Union with inline ranges. pending holds an unflushed operand that
     * a '-' may still extend into a range when it is a single char. */
    re_catom_t pending = first;
    for (;;) {
        if (!pending.is_set && !re_at_end(p) && p->units[p->pos] == '-') {
            if (p->pos + 1 < p->len && p->units[p->pos + 1] == '-') {
                /* "--" never continues a union. */
                re_fail(p, p->pos);
                return NULL;
            }
            p->pos++;
            re_catom_t tail;
            if (!re_parse_v_operand(p, &tail) || tail.is_set) {
                re_fail(p, p->pos);
                return NULL;
            }
            if (pending.cp > tail.cp) {
                re_fail(p, p->pos);
                return NULL;
            }
            re_range_push(p, cls, pending.cp, tail.cp);
            if (re_at_end(p)) {
                re_fail(p, p->pos);
                return NULL;
            }
            if (p->units[p->pos] == ']') {
                p->pos++;
                return cls;
            }
            if (p->units[p->pos] == '-' ||
                (p->units[p->pos] == '&' && p->pos + 1 < p->len && p->units[p->pos + 1] == '&')) {
                re_fail(p, p->pos);
                return NULL;
            }
            if (!re_parse_v_operand(p, &pending)) {
                re_fail(p, p->pos);
                return NULL;
            }
            continue;
        }
        if (!re_class_push_atom(p, cls, &pending)) return NULL;
        if (re_at_end(p)) {
            re_fail(p, p->pos);
            return NULL;
        }
        if (p->units[p->pos] == ']') {
            p->pos++;
            return cls;
        }
        if (p->units[p->pos] == '-' ||
            (p->units[p->pos] == '&' && p->pos + 1 < p->len && p->units[p->pos + 1] == '&')) {
            /* Operators never mix with concatenation. */
            re_fail(p, p->pos);
            return NULL;
        }
        if (!re_parse_v_operand(p, &pending)) {
            re_fail(p, p->pos);
            return NULL;
        }
    }
}

static tsc_re_node_t* re_new_node(tsc_re_parser_t* p, tsc_re_kind_t kind) {
    tsc_re_node_t* node = (tsc_re_node_t*)TSC_GC_MALLOC(sizeof(tsc_re_node_t));
    if (p->nnodes == p->nodes_capacity) {
        p->nodes_capacity = p->nodes_capacity ? p->nodes_capacity * 2 : 64;
        p->nodes = TSC_GC_REALLOC(p->nodes, p->nodes_capacity * sizeof(*p->nodes));
    }
    p->nodes[p->nnodes++] = node;
    node->kind = kind;
    node->flags = p->flags;
    memset(&node->u, 0, sizeof(node->u));
    return node;
}

static void re_fail(tsc_re_parser_t* p, size_t offset) {
    if (!p->failed) {
        p->failed = true;
        if (p->error) {
            p->error->code = TSC_RE_ERR_SYNTAX;
            p->error->offset = offset;
        }
    }
}

static bool re_at_end(const tsc_re_parser_t* p) {
    return p->pos >= p->len;
}

static void re_node_list_push(tsc_re_parser_t* p, tsc_re_node_t* list_node, tsc_re_node_t* item) {
    (void)p;
    if (list_node->u.list.len == list_node->u.list.cap) {
        size_t next = list_node->u.list.cap ? list_node->u.list.cap * 2 : 4;
        tsc_re_node_t** items = (tsc_re_node_t**)TSC_GC_MALLOC(sizeof(tsc_re_node_t*) * next);
        for (size_t i = 0; i < list_node->u.list.len; i++) items[i] = list_node->u.list.items[i];
        list_node->u.list.items = items;
        list_node->u.list.cap = next;
    }
    list_node->u.list.items[list_node->u.list.len++] = item;
}

static void re_class_item_push(tsc_re_parser_t* p, tsc_re_node_t* cls, tsc_re_node_t* item) {
    (void)p;
    if (cls->u.cls.nitems == cls->u.cls.items_cap) {
        size_t next = cls->u.cls.items_cap ? cls->u.cls.items_cap * 2 : 4;
        tsc_re_node_t** items = (tsc_re_node_t**)TSC_GC_MALLOC(sizeof(tsc_re_node_t*) * next);
        for (size_t i = 0; i < cls->u.cls.nitems; i++) items[i] = cls->u.cls.items[i];
        cls->u.cls.items = items;
        cls->u.cls.items_cap = next;
    }
    cls->u.cls.items[cls->u.cls.nitems++] = item;
}

static void re_range_push(tsc_re_parser_t* p, tsc_re_node_t* cls, uint32_t lo, uint32_t hi) {
    (void)p;
    if (cls->u.cls.nranges == cls->u.cls.cap) {
        size_t next = cls->u.cls.cap ? cls->u.cls.cap * 2 : 4;
        tsc_re_range_t* ranges = (tsc_re_range_t*)TSC_GC_MALLOC(sizeof(tsc_re_range_t) * next);
        for (size_t i = 0; i < cls->u.cls.nranges; i++) ranges[i] = cls->u.cls.ranges[i];
        cls->u.cls.ranges = ranges;
        cls->u.cls.cap = next;
    }
    cls->u.cls.ranges[cls->u.cls.nranges].lo = lo;
    cls->u.cls.ranges[cls->u.cls.nranges].hi = hi;
    cls->u.cls.nranges++;
}

static bool re_is_unicode(const tsc_re_parser_t* p) {
    return p->flags.unicode || p->flags.unicode_sets;
}

/* re_parse_group_name is prototyped after tsc_re_char_t is defined. */

static bool re_is_high_surrogate(uint16_t u) {
    return u >= 0xd800 && u <= 0xdbff;
}

static bool re_is_low_surrogate(uint16_t u) {
    return u >= 0xdc00 && u <= 0xdfff;
}

static int re_hex_val(uint16_t u) {
    if (u >= '0' && u <= '9') return (int)(u - '0');
    if (u >= 'a' && u <= 'f') return (int)(u - 'a') + 10;
    if (u >= 'A' && u <= 'F') return (int)(u - 'A') + 10;
    return -1;
}

static bool re_is_decimal_digit(uint16_t u) {
    return u >= '0' && u <= '9';
}

static bool re_is_octal_digit(uint16_t u) {
    return u >= '0' && u <= '7';
}

static bool re_is_word_unit(uint16_t u) {
    return (u >= 'a' && u <= 'z') || (u >= 'A' && u <= 'Z') ||
        (u >= '0' && u <= '9') || u == '_';
}

/* Identity escapes allowed in Unicode mode after a backslash: the
 * SyntaxCharacters plus '/' so literals can escape the delimiter. */
static bool re_is_unicode_identity(uint16_t u) {
    return u == '^' || u == '$' || u == '\\' || u == '.' || u == '*' ||
        u == '+' || u == '?' || u == '(' || u == ')' || u == '[' ||
        u == ']' || u == '{' || u == '}' || u == '|' || u == '/';
}

/* Parse exactly `digits` hex units; returns -1 on failure without consuming. */
static int32_t re_parse_hex(const tsc_re_parser_t* p, size_t at, size_t digits) {
    uint32_t value = 0;
    for (size_t i = 0; i < digits; i++) {
        if (at + i >= p->len) return -1;
        int h = re_hex_val(p->units[at + i]);
        if (h < 0) return -1;
        value = value * 16 + (uint32_t)h;
    }
    return (int32_t)value;
}

/* \c ControlLetter: A-Z / a-z map to 1-26. */
static bool re_control_value(uint16_t u, uint32_t* out) {
    uint16_t upper = (u >= 'a' && u <= 'z') ? (uint16_t)(u - ('a' - 'A')) : u;
    if (upper < 'A' || upper > 'Z') return false;
    *out = (uint32_t)(upper - 'A') + 1;
    return true;
}

/* Annex B fallback for a decimal escape that is not a valid backreference.
 * digits[0..ndigits) is the maximal digit run. Returns the unit value and
 * how many digits it consumes; the rest stay literal. */
static uint32_t re_decimal_fallback(const uint16_t* digits, size_t ndigits, size_t* consumed) {
    if (ndigits == 0) {
        *consumed = 0;
        return 0;
    }
    uint16_t first = digits[0];
    if (first == '8' || first == '9') {
        *consumed = 1;
        return (uint32_t)first;
    }
    if (first == '0') {
        if (ndigits >= 3 && re_is_octal_digit(digits[1]) && re_is_octal_digit(digits[2])) {
            *consumed = 3;
            return (uint32_t)((digits[0] - '0') * 64 + (digits[1] - '0') * 8 + (digits[2] - '0'));
        }
        if (ndigits >= 2 && re_is_octal_digit(digits[1])) {
            *consumed = 2;
            return (uint32_t)((digits[0] - '0') * 8 + (digits[1] - '0'));
        }
        *consumed = 1;
        return 0;
    }
    if (first >= '1' && first <= '3') {
        size_t take = 1;
        while (take < ndigits && take < 3 && re_is_octal_digit(digits[take])) take++;
        uint32_t value = 0;
        for (size_t i = 0; i < take; i++) value = value * 8 + (uint32_t)(digits[i] - '0');
        *consumed = take;
        return value;
    }
    if (first >= '4' && first <= '7' && ndigits >= 2 && re_is_octal_digit(digits[1])) {
        *consumed = 2;
        return (uint32_t)((first - '0') * 8 + (digits[1] - '0'));
    }
    *consumed = 1;
    return (uint32_t)(first - '0');
}

/* tsc_re_char_kind_t/tsc_re_char_t are declared near the parser struct;
 * re_parse_group_name is forward-declared there as well. */

static void re_name_push(tsc_re_parser_t* p, tsc_re_char_t* out, char byte) {
    (void)p;
    if (out->backref_name_len == out->backref_name_cap) {
        size_t next = out->backref_name_cap ? out->backref_name_cap * 2 : 8;
        char* name = (char*)TSC_GC_MALLOC(next);
        for (size_t i = 0; i < out->backref_name_len; i++) name[i] = out->backref_name[i];
        out->backref_name = name;
        out->backref_name_cap = next;
    }
    out->backref_name[out->backref_name_len++] = byte;
}

static void re_name_push_utf8(tsc_re_parser_t* p, tsc_re_char_t* out, uint32_t cp) {
    if (cp < 0x80) {
        re_name_push(p, out, (char)cp);
    } else if (cp < 0x800) {
        re_name_push(p, out, (char)(0xc0 | (cp >> 6)));
        re_name_push(p, out, (char)(0x80 | (cp & 0x3f)));
    } else if (cp < 0x10000) {
        re_name_push(p, out, (char)(0xe0 | (cp >> 12)));
        re_name_push(p, out, (char)(0x80 | ((cp >> 6) & 0x3f)));
        re_name_push(p, out, (char)(0x80 | (cp & 0x3f)));
    } else {
        re_name_push(p, out, (char)(0xf0 | (cp >> 18)));
        re_name_push(p, out, (char)(0x80 | ((cp >> 12) & 0x3f)));
        re_name_push(p, out, (char)(0x80 | ((cp >> 6) & 0x3f)));
        re_name_push(p, out, (char)(0x80 | (cp & 0x3f)));
    }
}

/* Parses a braced \u{H+} value at p->pos (pos points after "\u{").
 * Returns the code point, or UINT32_MAX on failure without consuming. */
static uint32_t re_peek_unicode_brace(const tsc_re_parser_t* p) {
    size_t i = p->pos;
    uint32_t value = 0;
    size_t digits = 0;
    while (i < p->len && re_hex_val(p->units[i]) >= 0) {
        value = value * 16 + (uint32_t)re_hex_val(p->units[i]);
        if (value > 0x10ffff) return UINT32_MAX;
        i++;
        digits++;
    }
    if (digits == 0 || i >= p->len || p->units[i] != '}') return UINT32_MAX;
    return value;
}

static bool re_is_name_start_cp(uint32_t cp) {
    if (cp == '$' || cp == '_') return true;
    if (cp < 0x80) return (cp >= 'a' && cp <= 'z') || (cp >= 'A' && cp <= 'Z');
    return u_hasBinaryProperty((UChar32)cp, UCHAR_ID_START);
}

static bool re_is_name_part_cp(uint32_t cp) {
    if (cp == '$' || cp == '_') return true;
    if (cp < 0x80) return (cp >= 'a' && cp <= 'z') || (cp >= 'A' && cp <= 'Z') || (cp >= '0' && cp <= '9');
    return u_hasBinaryProperty((UChar32)cp, UCHAR_ID_CONTINUE) || cp == 0x200c || cp == 0x200d;
}

/* Parses GroupName at p->pos into out (UTF-8). Expects '<' or caller context;
 * consumes through the closing '>'. Returns false with an error recorded. */
/* Parses PropertyName after "\p{". pos is after the '{'. Builds a PROP node
 * (or records a failure). Handles LoneProperty and Name=Value forms. */
/* Exact property spellings from the pinned ECMA-262 property tables. ICU
 * performs value lookup only after ECMAScript's case-sensitive admission. */
static const char* const re_binary_names[] = {
    "AHex",
    "ASCII",
    "ASCII_Hex_Digit",
    "Alpha",
    "Alphabetic",
    "Any",
    "Assigned",
    "Bidi_C",
    "Bidi_Control",
    "Bidi_M",
    "Bidi_Mirrored",
    "CI",
    "CWCF",
    "CWCM",
    "CWKCF",
    "CWL",
    "CWT",
    "CWU",
    "Case_Ignorable",
    "Cased",
    "Changes_When_Casefolded",
    "Changes_When_Casemapped",
    "Changes_When_Lowercased",
    "Changes_When_NFKC_Casefolded",
    "Changes_When_Titlecased",
    "Changes_When_Uppercased",
    "DI",
    "Dash",
    "Default_Ignorable_Code_Point",
    "Dep",
    "Deprecated",
    "Dia",
    "Diacritic",
    "EBase",
    "EComp",
    "EMod",
    "EPres",
    "Emoji",
    "Emoji_Component",
    "Emoji_Modifier",
    "Emoji_Modifier_Base",
    "Emoji_Presentation",
    "Ext",
    "ExtPict",
    "Extended_Pictographic",
    "Extender",
    "Gr_Base",
    "Gr_Ext",
    "Grapheme_Base",
    "Grapheme_Extend",
    "Hex",
    "Hex_Digit",
    "IDC",
    "IDS",
    "IDSB",
    "IDST",
    "IDS_Binary_Operator",
    "IDS_Trinary_Operator",
    "ID_Continue",
    "ID_Start",
    "Ideo",
    "Ideographic",
    "Join_C",
    "Join_Control",
    "LOE",
    "Logical_Order_Exception",
    "Lower",
    "Lowercase",
    "Math",
    "NChar",
    "Noncharacter_Code_Point",
    "Pat_Syn",
    "Pat_WS",
    "Pattern_Syntax",
    "Pattern_White_Space",
    "QMark",
    "Quotation_Mark",
    "RI",
    "Radical",
    "Regional_Indicator",
    "SD",
    "STerm",
    "Sentence_Terminal",
    "Soft_Dotted",
    "Term",
    "Terminal_Punctuation",
    "UIdeo",
    "Unified_Ideograph",
    "Upper",
    "Uppercase",
    "VS",
    "Variation_Selector",
    "White_Space",
    "XIDC",
    "XIDS",
    "XID_Continue",
    "XID_Start",
    "space",
};
static const char* const re_string_property_names[] = {
    "Basic_Emoji",
    "Emoji_Keycap_Sequence",
    "RGI_Emoji",
    "RGI_Emoji_Flag_Sequence",
    "RGI_Emoji_Modifier_Sequence",
    "RGI_Emoji_Tag_Sequence",
    "RGI_Emoji_ZWJ_Sequence",
};
static bool re_name_in(const char* name, const char* const* names, size_t len) {
    for (size_t i = 0; i < len; i++) if (strcmp(name, names[i]) == 0) return true;
    return false;
}
static bool re_exact_value(UProperty property, int32_t value, const char* text) {
    if (value == UCHAR_INVALID_CODE) return false;
    for (int choice = U_SHORT_PROPERTY_NAME; choice <= U_LONG_PROPERTY_NAME; choice++) {
        const char* name = u_getPropertyValueName(property, value, (UPropertyNameChoice)choice);
        if (name && strcmp(text, name) == 0) return true;
    }
    /* Stable UCD value aliases beyond the short/long canonical forms. */
    return (property == UCHAR_SCRIPT && value == USCRIPT_INHERITED && strcmp(text, "Qaai") == 0) ||
        (property == UCHAR_GENERAL_CATEGORY_MASK && value == U_GC_CC_MASK && strcmp(text, "cntrl") == 0) ||
        (property == UCHAR_GENERAL_CATEGORY_MASK && value == U_GC_ND_MASK && strcmp(text, "digit") == 0) ||
        (property == UCHAR_GENERAL_CATEGORY_MASK && value == U_GC_P_MASK && strcmp(text, "punct") == 0);
}
static tsc_re_node_t* re_parse_property(tsc_re_parser_t* p, bool negated) {
    size_t start = p->pos;
    while (!re_at_end(p) && p->units[p->pos] != '}') {
        uint16_t u = p->units[p->pos];
        if (!((u >= 'a' && u <= 'z') || (u >= 'A' && u <= 'Z') ||
              (u >= '0' && u <= '9') || u == '_' || u == '=')) {
            re_fail(p, p->pos); return NULL;
        }
        p->pos++;
    }
    if (re_at_end(p) || p->pos == start) { re_fail(p, start); return NULL; }
    size_t len = p->pos++ - start;
    char* text = TSC_GC_MALLOC(len + 1);
    for (size_t i = 0; i < len; i++) text[i] = (char)p->units[start + i];
    text[len] = 0;
    tsc_re_node_t* node = re_new_node(p, RE_N_PROP);
    node->u.prop.negated = negated;
    char* eq = strchr(text, '=');
    UProperty property = UCHAR_INVALID_CODE;
    int32_t value = UCHAR_INVALID_CODE;
    if (eq) {
        *eq = 0;
        if (!strcmp(text, "General_Category") || !strcmp(text, "gc")) property = UCHAR_GENERAL_CATEGORY_MASK;
        else if (!strcmp(text, "Script") || !strcmp(text, "sc")) property = UCHAR_SCRIPT;
        else if (!strcmp(text, "Script_Extensions") || !strcmp(text, "scx")) property = UCHAR_SCRIPT_EXTENSIONS;
        if (property != UCHAR_INVALID_CODE) {
            UProperty lookup = property == UCHAR_SCRIPT_EXTENSIONS ? UCHAR_SCRIPT : property;
            value = u_getPropertyValueEnum(lookup, eq + 1);
            if (!re_exact_value(lookup, value, eq + 1)) property = UCHAR_INVALID_CODE;
        }
        node->u.prop.has_value = true;
    } else {
        value = u_getPropertyValueEnum(UCHAR_GENERAL_CATEGORY_MASK, text);
        if (re_exact_value(UCHAR_GENERAL_CATEGORY_MASK, value, text)) {
            property = UCHAR_GENERAL_CATEGORY_MASK;
            node->u.prop.has_value = true;
        } else if (!strcmp(text, "ASCII")) property = (UProperty)-2;
        else if (!strcmp(text, "Any")) property = (UProperty)-3;
        else if (!strcmp(text, "Assigned")) property = (UProperty)-4;
        else if (re_name_in(text, re_binary_names, sizeof(re_binary_names) / sizeof(*re_binary_names))) {
            property = u_getPropertyEnum(text);
        } else if (p->flags.unicode_sets && !negated && re_name_in(text, re_string_property_names,
                   sizeof(re_string_property_names) / sizeof(*re_string_property_names))) {
            property = u_getPropertyEnum(text);
        }
    }
    if (property == UCHAR_INVALID_CODE) { re_fail(p, start); return NULL; }
    node->u.prop.property = property;
    node->u.prop.value = value;
    return node;
}

static bool re_parse_decimal_digits(tsc_re_parser_t* p, size_t* value, size_t* ndigits) {
    size_t start = p->pos;
    size_t n = 0;
    while (p->pos < p->len && re_is_decimal_digit(p->units[p->pos])) {
        /* Unsigned wraparound is well-defined; absurd counts still fail
         * fast because iterations are bounded by the input length. */
        size_t digit = (size_t)(p->units[p->pos] - '0');
        n = n > (SIZE_MAX - digit) / 10 ? SIZE_MAX : n * 10 + digit;
        p->pos++;
    }
    *value = n;
    *ndigits = p->pos - start;
    return *ndigits > 0;
}

/* Tries to parse a Quantifier at p->pos. On success consumes it (including a
 * lazy '?') and returns true with min/max. Never records failures. */
static bool re_try_quantifier(tsc_re_parser_t* p, size_t* min_out, size_t* max_out, bool* lazy_out) {
    size_t save = p->pos;
    if (re_at_end(p) || p->units[p->pos] != '{') return false;
    p->pos++;
    size_t n = 0;
    size_t ndigits = 0;
    if (!re_parse_decimal_digits(p, &n, &ndigits)) {
        p->pos = save;
        return false;
    }
    size_t min = n;
    size_t max = n;
    if (!re_at_end(p) && p->units[p->pos] == ',') {
        p->pos++;
        max = RE_INF;
        if (!re_at_end(p) && re_is_decimal_digit(p->units[p->pos])) {
            if (!re_parse_decimal_digits(p, &n, &ndigits)) {
                p->pos = save;
                return false;
            }
            max = n;
        }
    }
    if (re_at_end(p) || p->units[p->pos] != '}') {
        p->pos = save;
        return false;
    }
    p->pos++;
    bool lazy = false;
    if (!re_at_end(p) && p->units[p->pos] == '?') {
        lazy = true;
        p->pos++;
    }
    *min_out = min;
    *max_out = max;
    *lazy_out = lazy;
    return true;
}

/* Forward declarations for the shared atom/group grammar. */
static tsc_re_node_t* re_parse_disjunction(tsc_re_parser_t* p);
static tsc_re_node_t* re_parse_atom(tsc_re_parser_t* p);

/* MightBothParticipate is false precisely when some shared enclosing
 * disjunction selects different alternatives. Align persistent path depths
 * and walk to their common ancestry without native recursion. */
static bool re_branches_disjoint(const tsc_re_branch_t* left, const tsc_re_branch_t* right) {
    while (left && right && left->depth > right->depth) left = left->parent;
    while (left && right && right->depth > left->depth) right = right->parent;
    while (left && right) {
        if (left->disjunction == right->disjunction && left->alternative != right->alternative) return true;
        left = left->parent;
        right = right->parent;
    }
    return false;
}

/* One ordered name record owns all of its disjoint capture indices. */
static bool re_register_named(tsc_re_parser_t* p, const char* name, size_t name_len, size_t index, size_t offset) {
    tsc_re_named_entry_t* entry = re_lookup_named(p, name, name_len);
    for (size_t i = 0; entry && i < entry->len; i++) {
        if (!re_branches_disjoint(entry->branches[i], p->branch)) {
            re_fail(p, offset);
            return false;
        }
    }
    if (!entry && p->nnamed == p->named_cap) {
        size_t next = p->named_cap ? p->named_cap * 2 : 4;
        tsc_re_named_entry_t* entries =
            (tsc_re_named_entry_t*)TSC_GC_MALLOC(sizeof(tsc_re_named_entry_t) * next);
        for (size_t i = 0; i < p->nnamed; i++) entries[i] = p->named[i];
        p->named = entries;
        p->named_cap = next;
    }
    if (!entry) {
        entry = &p->named[p->nnamed++];
        memset(entry, 0, sizeof(*entry));
        entry->name = TSC_GC_MALLOC(name_len ? name_len : 1);
        memcpy(entry->name, name, name_len);
        entry->name_len = name_len;
    }
    if (entry->len == entry->capacity) {
        entry->capacity = entry->capacity ? entry->capacity * 2 : 4;
        entry->indices = TSC_GC_REALLOC(entry->indices, entry->capacity * sizeof(*entry->indices));
        entry->branches = TSC_GC_REALLOC(entry->branches, entry->capacity * sizeof(*entry->branches));
    }
    entry->indices[entry->len] = index;
    entry->branches[entry->len++] = p->branch;
    return true;
}

/* Parses one escape; p->pos is just after the backslash. On success consumes
 * the escape and fills out; on failure records an error and returns false.
 * in_class selects class-context meanings (\b backspace, no assertions). */
static bool re_parse_char_escape(tsc_re_parser_t* p, bool in_class, tsc_re_char_t* out) {
    memset(out, 0, sizeof(*out));
    size_t esc_at = p->pos - 1;
    bool unicode = re_is_unicode(p);
    if (re_at_end(p)) {
        re_fail(p, p->pos);
        return false;
    }
    uint16_t c = p->units[p->pos++];
    switch (c) {
    case 'b':
        if (in_class) {
            out->kind = RE_CH_UNIT;
            out->value = 0x08;
            return true;
        }
        out->kind = RE_CH_NODE;
        out->node = re_new_node(p, RE_N_WORD_BOUNDARY);
        out->node->u.boundary.negated = false;
        return true;
    case 'B':
        if (in_class) {
            if (unicode) {
                re_fail(p, esc_at);
                return false;
            }
            out->kind = RE_CH_UNIT;
            out->value = 'B';
            return true;
        }
        out->kind = RE_CH_NODE;
        out->node = re_new_node(p, RE_N_WORD_BOUNDARY);
        out->node->u.boundary.negated = true;
        return true;
    case 'f':
        out->kind = RE_CH_UNIT;
        out->value = 0x0c;
        return true;
    case 'n':
        out->kind = RE_CH_UNIT;
        out->value = 0x0a;
        return true;
    case 'r':
        out->kind = RE_CH_UNIT;
        out->value = 0x0d;
        return true;
    case 't':
        out->kind = RE_CH_UNIT;
        out->value = 0x09;
        return true;
    case 'v':
        out->kind = RE_CH_UNIT;
        out->value = 0x0b;
        return true;
    case 'c': {
        if (re_at_end(p)) {
            if (unicode) {
                re_fail(p, esc_at);
                return false;
            }
            out->kind = RE_CH_UNIT;
            out->value = 'c';
            return true;
        }
        uint32_t control = 0;
        if (re_control_value(p->units[p->pos], &control)) {
            p->pos++;
            out->kind = RE_CH_UNIT;
            out->value = control;
            return true;
        }
        if (unicode) {
            re_fail(p, esc_at);
            return false;
        }
        out->kind = RE_CH_UNIT;
        out->value = 'c';
        return true;
    }
    case 'x': {
        int32_t hex = re_parse_hex(p, p->pos, 2);
        if (hex < 0) {
            if (unicode) {
                re_fail(p, esc_at);
                return false;
            }
            out->kind = RE_CH_UNIT;
            out->value = 'x';
            return true;
        }
        p->pos += 2;
        out->kind = RE_CH_UNIT;
        out->value = (uint32_t)hex;
        return true;
    }
    case 'u': {
        size_t save = p->pos;
        /* Braced escapes exist only in Unicode mode; otherwise 'u' is a
         * plain identity escape and the braces stay literal. */
        if (unicode && p->pos < p->len && p->units[p->pos] == '{') {
            p->pos++;
            uint32_t cp = re_peek_unicode_brace(p);
            if (cp == UINT32_MAX) {
                re_fail(p, esc_at);
                return false;
            }
            while (p->units[p->pos] != '}') p->pos++;
            p->pos++;
            if (cp > 0xffff) {
                out->kind = RE_CH_CPOINT;
                out->value = cp;
            } else {
                out->kind = RE_CH_UNIT;
                out->value = cp;
            }
            return true;
        }
        {
            int32_t hex = re_parse_hex(p, p->pos, 4);
            if (hex >= 0) {
                p->pos += 4;
                out->kind = RE_CH_UNIT;
                out->value = (uint32_t)hex;
                if (unicode && re_is_high_surrogate((uint16_t)hex) &&
                    p->pos + 6 <= p->len && p->units[p->pos] == '\\' &&
                    p->units[p->pos + 1] == 'u') {
                    int32_t low = re_parse_hex(p, p->pos + 2, 4);
                    if (low >= 0 && re_is_low_surrogate((uint16_t)low)) {
                        p->pos += 6;
                        out->kind = RE_CH_CPOINT;
                        out->value = 0x10000u + (((uint32_t)hex - 0xd800u) << 10) +
                            ((uint32_t)low - 0xdc00u);
                    }
                }
                return true;
            }
        }
        if (unicode) {
            re_fail(p, esc_at);
            return false;
        }
        (void)save;
        out->kind = RE_CH_UNIT;
        out->value = 'u';
        return true;
    }
    case '0':
    case '1':
    case '2':
    case '3':
    case '4':
    case '5':
    case '6':
    case '7':
    case '8':
    case '9': {
        size_t first = p->pos - 1;
        size_t n = 0;
        while (p->pos < p->len && re_is_decimal_digit(p->units[p->pos])) {
            size_t digit = (size_t)(p->units[p->pos] - '0');
            n = n > (SIZE_MAX - digit) / 10 ? SIZE_MAX : n * 10 + digit;
            p->pos++;
        }
        size_t total_digits = p->pos - first;
        if (c == '0' && total_digits == 1) {
            out->kind = RE_CH_UNIT;
            out->value = 0;
            return true;
        }
        if (c == '0' || in_class) {
            /* \0 already handled above, so a leading zero starts an octal
             * (Annex B); decimal escapes never start with zero. */
            if (unicode) {
                re_fail(p, esc_at);
                return false;
            }
            size_t consumed = 0;
            out->kind = RE_CH_UNIT;
            out->value = re_decimal_fallback(&p->units[first], total_digits, &consumed);
            p->pos = first + consumed;
            return true;
        }
        out->kind = RE_CH_BACKREF;
        out->backref_index = n;
        out->backref_digits_at = first;
        out->backref_ndigits = total_digits;
        out->backref_offset = esc_at;
        return true;
    }
    case 'k': {
        if (!p->named_mode) {
            out->kind = RE_CH_UNIT;
            out->value = 'k';
            return true;
        }
        if (in_class || re_at_end(p) || p->units[p->pos] != '<') {
            re_fail(p, esc_at);
            return false;
        }
        if (!re_parse_group_name(p, out)) return false;
        out->kind = RE_CH_NAMED_BACKREF;
        out->backref_offset = esc_at;
        return true;
    }
    case 'p':
    case 'P': {
        bool negated = (c == 'P');
        if (!unicode) {
            out->kind = RE_CH_UNIT;
            out->value = (uint32_t)c;
            return true;
        }
        if (re_at_end(p) || p->units[p->pos] != '{') {
            re_fail(p, esc_at);
            return false;
        }
        p->pos++;
        tsc_re_node_t* prop = re_parse_property(p, negated);
        if (!prop) return false;
        out->kind = RE_CH_NODE;
        out->node = prop;
        return true;
    }
    case 'd':
        out->kind = RE_CH_CLASS_ESCAPE;
        out->escape = RE_CE_DIGIT;
        return true;
    case 'D':
        out->kind = RE_CH_CLASS_ESCAPE;
        out->escape = RE_CE_DIGIT_NEG;
        return true;
    case 's':
        out->kind = RE_CH_CLASS_ESCAPE;
        out->escape = RE_CE_SPACE;
        return true;
    case 'S':
        out->kind = RE_CH_CLASS_ESCAPE;
        out->escape = RE_CE_SPACE_NEG;
        return true;
    case 'w':
        out->kind = RE_CH_CLASS_ESCAPE;
        out->escape = RE_CE_WORD;
        return true;
    case 'W':
        out->kind = RE_CH_CLASS_ESCAPE;
        out->escape = RE_CE_WORD_NEG;
        return true;
    default:
        if (unicode && !re_is_unicode_identity(c)) {
            re_fail(p, esc_at);
            return false;
        }
        out->kind = RE_CH_UNIT;
        out->value = c;
        return true;
    }
}

/* Group identifiers always decode Unicode escape sequences with +U, even
 * when the pattern itself is in legacy mode. Validate one scalar stream so
 * raw, escaped and surrogate-pair spellings share the same name identity. */
static bool re_parse_group_name(tsc_re_parser_t* p, tsc_re_char_t* out) {
    size_t start = p->pos;
    if (re_at_end(p) || p->units[p->pos++] != '<') {
        re_fail(p, start);
        return false;
    }
    bool first = true;
    while (!re_at_end(p) && p->units[p->pos] != '>') {
        size_t offset = p->pos;
        uint32_t cp = p->units[p->pos++];
        if (cp == '\\') {
            if (re_at_end(p) || p->units[p->pos++] != 'u') {
                re_fail(p, offset);
                return false;
            }
            if (!re_at_end(p) && p->units[p->pos] == '{') {
                p->pos++;
                cp = re_peek_unicode_brace(p);
                if (cp == UINT32_MAX) { re_fail(p, offset); return false; }
                while (p->units[p->pos++] != '}') {}
            } else {
                int32_t hex = re_parse_hex(p, p->pos, 4);
                if (hex < 0) { re_fail(p, offset); return false; }
                cp = (uint32_t)hex;
                p->pos += 4;
                if (re_is_high_surrogate((uint16_t)cp) && p->pos + 6 <= p->len &&
                    p->units[p->pos] == '\\' && p->units[p->pos + 1] == 'u') {
                    int32_t low = re_parse_hex(p, p->pos + 2, 4);
                    if (low >= 0 && re_is_low_surrogate((uint16_t)low)) {
                        cp = 0x10000u + ((cp - 0xd800u) << 10) + (uint32_t)low - 0xdc00u;
                        p->pos += 6;
                    }
                }
            }
        } else if (re_is_high_surrogate((uint16_t)cp) && !re_at_end(p) &&
                   re_is_low_surrogate(p->units[p->pos])) {
            cp = 0x10000u + ((cp - 0xd800u) << 10) + p->units[p->pos++] - 0xdc00u;
        }
        if (!(first ? re_is_name_start_cp(cp) : re_is_name_part_cp(cp))) {
            re_fail(p, offset);
            return false;
        }
        re_name_push_utf8(p, out, cp);
        first = false;
    }
    if (first || re_at_end(p)) { re_fail(p, start); return false; }
    p->pos++;
    return true;
}

/* ECMAScript Canonicalize: pattern atoms fold at compile time and input
 * units fold at match time with the same function. Unicode mode uses
 * simple case folding; Annex B mode uppercases ASCII directly and folds
 * non-ASCII only when the result stays non-ASCII (never into ASCII). */
static uint32_t re_canon_non_u(uint32_t cp) {
    if (cp < 0x80) {
        if (cp >= 'a' && cp <= 'z') return cp - ((uint32_t)'a' - (uint32_t)'A');
        return cp;
    }
    if (cp >= 0xd800 && cp <= 0xdfff) return cp;
    UChar32 up = u_toupper((UChar32)cp);
    if (up < 0x80) return cp;
    return (uint32_t)up;
}

static uint32_t re_canon(uint32_t cp, bool ignore_case, bool unicode) {
    if (!ignore_case) return cp;
    if (cp >= 0xd800 && cp <= 0xdfff) return cp;
    if (unicode) return (uint32_t)u_foldCase((UChar32)cp, U_FOLD_CASE_DEFAULT);
    return re_canon_non_u(cp);
}


/* Compile character-set expression trees with one postorder worklist. ICU
 * handles set algebra and Unicode data; only GC-owned ranges and ordered UTF-16
 * strings survive compilation. No runtime matcher recurses into nested sets. */
static USet* re_fold_set(const USet* source, bool ignore_case, bool unicode) {
    if (!ignore_case) return uset_clone(source);
    USet* folded = uset_openEmpty();
    int32_t ranges = uset_getRangeCount(source);
    for (int32_t i = 0; i < ranges; i++) {
        UErrorCode error = U_ZERO_ERROR; UChar32 lo, hi;
        uset_getItem(source, i, &lo, &hi, NULL, 0, &error);
        for (UChar32 cp = lo; cp <= hi; cp++) uset_add(folded, re_canon(cp, true, unicode));
    }
    for (int32_t i = ranges; i < uset_getItemCount(source); i++) {
        UErrorCode error = U_ZERO_ERROR; UChar32 lo, hi;
        int32_t len = uset_getItem(source, i, &lo, &hi, NULL, 0, &error);
        uint16_t* text = TSC_GC_MALLOC((len ? len : 1) * sizeof(*text));
        error = U_ZERO_ERROR; uset_getItem(source, i, &lo, &hi, text, len, &error);
        uint16_t* output = NULL; size_t n = 0, cap = 0;
        for (size_t pos = 0; pos < (size_t)len;) {
            size_t width; uint32_t cp = re_read_cp(text, len, pos, true, &width);
            re_qbuf_push_cp(&output, &n, &cap, re_canon(cp, true, unicode)); pos += width;
        }
        uset_addString(folded, output, (int32_t)n);
    }
    return folded;
}
static void re_complement_set(USet* set, bool unicode_sets, const USet* universe) {
    if (unicode_sets) {
        USet* complement = uset_clone(universe); uset_removeAll(complement, set);
        uset_clear(set); uset_addAll(set, complement); uset_close(complement);
    } else uset_complement(set);
}
static USet* re_property_set(const tsc_re_node_t* node, bool unicode_sets) {
    UProperty property = (UProperty)node->u.prop.property;
    USet* result = uset_openEmpty();
    UErrorCode error = U_ZERO_ERROR;
    if ((int32_t)property == -2) uset_addRange(result, 0, 0x7f);
    else if ((int32_t)property == -3) uset_addRange(result, 0, 0x10ffff);
    else if ((int32_t)property == -4) {
        uset_applyIntPropertyValue(result, UCHAR_GENERAL_CATEGORY_MASK, U_GC_CN_MASK, &error);
        uset_complement(result);
    } else if (node->u.prop.has_value) {
        uset_applyIntPropertyValue(result, property, node->u.prop.value, &error);
    } else {
        const USet* data = u_getBinaryPropertySet(property, &error);
        if (data) uset_addAll(result, data);
    }
    if (U_FAILURE(error)) abort();
    if (node->u.prop.negated && !unicode_sets) uset_complement(result);
    return result;
}
static USet* re_escape_set(tsc_re_class_escape_t escape) {
    USet* set = uset_openEmpty();
    switch (escape) {
    case RE_CE_DIGIT: case RE_CE_DIGIT_NEG: uset_addRange(set, '0', '9'); break;
    case RE_CE_WORD: case RE_CE_WORD_NEG:
        uset_addRange(set, 'A', 'Z'); uset_addRange(set, 'a', 'z');
        uset_addRange(set, '0', '9'); uset_add(set, '_'); break;
    case RE_CE_SPACE: case RE_CE_SPACE_NEG:
        for (uint32_t cp = 0; cp <= 0xffff; cp++) if (tsc_is_whitespace_unit(cp)) uset_add(set, cp);
        break;
    }
    return set;
}
static bool re_normalize_set(tsc_re_parser_t* p, tsc_re_node_t* node, const USet* universe) {
    bool v = node->flags.unicode_sets, unicode = re_is_unicode(p);
    USet* raw = uset_openEmpty();
    USet* result;
    bool negate_after = false;
    if (node->kind == RE_N_PROP) {
        uset_close(raw); raw = re_property_set(node, v);
        node->may_strings = node->u.prop.property >= UCHAR_BASIC_EMOJI &&
            node->u.prop.property <= UCHAR_RGI_EMOJI;
        negate_after = v && node->u.prop.negated;
        result = re_fold_set(raw, node->flags.ignore_case, unicode);
    } else if (node->kind == RE_N_CLASS_ESCAPE) {
        uset_close(raw); raw = re_escape_set(node->u.class_escape.escape);
        negate_after = node->u.class_escape.escape == RE_CE_DIGIT_NEG ||
            node->u.class_escape.escape == RE_CE_SPACE_NEG || node->u.class_escape.escape == RE_CE_WORD_NEG;
        result = re_fold_set(raw, node->flags.ignore_case, unicode);
    } else {
        for (size_t i = 0; i < node->u.cls.nranges; i++)
            uset_addRange(raw, node->u.cls.ranges[i].lo, node->u.cls.ranges[i].hi);
        for (size_t i = 0; i < node->u.cls.nstrs; i++) {
            tsc_re_qstr_t text = node->u.cls.strs[i]; uset_addString(raw, text.units, (int32_t)text.len);
            size_t cps = 0;
            for (size_t at = 0; at < text.len;) { size_t w; re_read_cp(text.units, text.len, at, true, &w); at += w; cps++; }
            if (cps != 1) node->may_strings = true;
        }
        result = re_fold_set(raw, node->flags.ignore_case, unicode);
        for (size_t i = 0; i < node->u.cls.nitems; i++) {
            tsc_re_node_t* child = node->u.cls.items[i];
            if (node->u.cls.op == RE_CLS_UNION) {
                uset_addAll(result, child->compile_set); node->may_strings |= child->may_strings;
            } else if (i == 0) {
                uset_addAll(result, child->compile_set); node->may_strings = child->may_strings;
            } else if (node->u.cls.op == RE_CLS_INTERSECT) {
                uset_retainAll(result, child->compile_set); node->may_strings &= child->may_strings;
            } else uset_removeAll(result, child->compile_set);
        }
        negate_after = node->u.cls.negated;
        if (negate_after && node->may_strings) {
            uset_close(raw); uset_close(result); re_fail(p, p->pos); return false;
        }
    }
    if (negate_after) re_complement_set(result, true, universe);
    uset_close(raw);
    node->kind = RE_N_CLASS;
    memset(&node->u, 0, sizeof(node->u));
    node->compile_set = result;
    int32_t nranges = uset_getRangeCount(result);
    for (int32_t i = 0; i < nranges; i++) {
        UErrorCode error = U_ZERO_ERROR; UChar32 lo, hi;
        uset_getItem(result, i, &lo, &hi, NULL, 0, &error);
        re_range_push(p, node, lo, hi);
    }
    for (int32_t i = nranges; i < uset_getItemCount(result); i++) {
        UErrorCode error = U_ZERO_ERROR; UChar32 lo, hi;
        int32_t len = uset_getItem(result, i, &lo, &hi, NULL, 0, &error);
        uint16_t* text = TSC_GC_MALLOC((len ? len : 1) * sizeof(*text));
        error = U_ZERO_ERROR; uset_getItem(result, i, &lo, &hi, text, len, &error);
        re_qstr_push(p, node, text, len);
    }
    /* Match longer strings first, retaining every shorter continuation. */
    for (size_t i = 1; i < node->u.cls.nstrs; i++) {
        tsc_re_qstr_t text = node->u.cls.strs[i]; size_t j = i;
        while (j && node->u.cls.strs[j - 1].len < text.len) {
            node->u.cls.strs[j] = node->u.cls.strs[j - 1]; j--;
        }
        node->u.cls.strs[j] = text;
    }
    return true;
}
static bool re_compile_sets(tsc_re_parser_t* p) {
    USet* all = uset_open(0, re_is_unicode(p) ? 0x10ffff : 0xffff);
    USet* folded_universe = NULL;
    typedef struct { tsc_re_node_t* node; size_t index; } frame_t;
    frame_t* frames = TSC_GC_MALLOC((p->nnodes ? p->nnodes : 1) * sizeof(*frames));
    bool ok = true;
    for (size_t i = 0; ok && i < p->nnodes; i++) {
        tsc_re_node_t* node = p->nodes[i];
        if (node->compile_set || (node->kind != RE_N_CLASS && node->kind != RE_N_PROP &&
                                 node->kind != RE_N_CLASS_ESCAPE)) continue;
        size_t depth = 1; frames[0] = (frame_t){node, 0};
        while (ok && depth) {
            frame_t* frame = &frames[depth - 1]; node = frame->node;
            if (node->kind == RE_N_CLASS && frame->index < node->u.cls.nitems) {
                tsc_re_node_t* child = node->u.cls.items[frame->index++];
                if (!child->compile_set) frames[depth++] = (frame_t){child, 0};
            } else {
                if (node->flags.ignore_case && !folded_universe)
                    folded_universe = re_fold_set(all, true, re_is_unicode(p));
                ok = re_normalize_set(p, node, node->flags.ignore_case ? folded_universe : all); depth--;
            }
        }
    }
    for (size_t i = 0; i < p->nnodes; i++) {
        if (p->nodes[i]->compile_set) { uset_close(p->nodes[i]->compile_set); p->nodes[i]->compile_set = NULL; }
    }
    if (folded_universe) uset_close(folded_universe);
    uset_close(all);
    return ok;
}

/* Boxing retains one object identity and the prototype from the creation
 * Realm. The ordinary accessor collection also supplies string coercion. */
static const char regexp_intrinsics_realm_key = 0;
typedef struct { tsc_object_t* prototype; tsc_value_t constructor; void* constructor_root; } regexp_intrinsics_t;

static tsc_value_t regexp_species_get(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env; (void)args; return receiver;
}
static tsc_value_t regexp_escape_apply(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env; (void)receiver;
    tsc_value_t input = args && args->len ? TSC_ARR(tsc_value_t, args, 0) : tsc_value_undefined();
    if (!value_is_box(input) || value_tag(input) != TSC_VALUE_TAG_STRING)
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("RegExp.escape requires a string"));
    return tsc_value_string(tsc_regexp_escape(value_ptr(input)));
}
typedef enum { RE_P_SOURCE, RE_P_FLAGS, RE_P_GLOBAL, RE_P_INDICES, RE_P_IGNORE_CASE,
               RE_P_MULTILINE, RE_P_DOT_ALL, RE_P_UNICODE, RE_P_UNICODE_SETS, RE_P_STICKY } regexp_property_t;
typedef struct { const char* name; regexp_property_t property; } regexp_property_descriptor_t;
static const regexp_property_descriptor_t regexp_properties[] = {
    {"source", RE_P_SOURCE}, {"flags", RE_P_FLAGS}, {"global", RE_P_GLOBAL},
    {"hasIndices", RE_P_INDICES}, {"ignoreCase", RE_P_IGNORE_CASE}, {"multiline", RE_P_MULTILINE},
    {"dotAll", RE_P_DOT_ALL}, {"unicode", RE_P_UNICODE}, {"unicodeSets", RE_P_UNICODE_SETS}, {"sticky", RE_P_STICKY}
};
static tsc_value_t regexp_property_get(void* env, tsc_value_t receiver) {
    const regexp_property_descriptor_t* descriptor = env;
    if (!tsc_value_is_object(receiver))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("RegExp getter called on incompatible receiver"));
    if (descriptor->property == RE_P_FLAGS) {
        static const struct { const char* name; char flag; } flags[] = {
            {"hasIndices", 'd'}, {"global", 'g'}, {"ignoreCase", 'i'}, {"multiline", 'm'},
            {"dotAll", 's'}, {"unicode", 'u'}, {"unicodeSets", 'v'}, {"sticky", 'y'}
        };
        tsc_str_t* result = str_alloc(sizeof(flags) / sizeof(*flags)); size_t len = 0;
        for (size_t i = 0; i < sizeof(flags) / sizeof(*flags); i++) {
            if (tsc_value_is_truthy(tsc_value_get_prop(receiver, tsc_str_from_cstr(flags[i].name))))
                ((char*)result->data)[len++] = flags[i].flag;
        }
        result->len = len; ((char*)result->data)[len] = 0;
        return tsc_value_string(result);
    }
    if (!value_is_box(receiver) || value_tag(receiver) != TSC_VALUE_TAG_OBJECT)
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("RegExp getter called on incompatible receiver"));
    const tsc_object_t* object = value_ptr(receiver);
    if (!object->is_regexp) {
        if (receiver == tsc_regexp_prototype_value()) return descriptor->property == RE_P_SOURCE
            ? tsc_value_string(tsc_str_from_lit("(?:)", 4)) : tsc_value_undefined();
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("RegExp getter called on incompatible receiver"));
    }
    const tsc_regexp_t* re = object->class_ptr;
    switch (descriptor->property) {
    case RE_P_SOURCE: return tsc_value_string(tsc_regexp_source(re));
    case RE_P_GLOBAL: return tsc_value_bool(re->global);
    case RE_P_INDICES: return tsc_value_bool(re->has_indices);
    case RE_P_IGNORE_CASE: return tsc_value_bool(re->ignore_case);
    case RE_P_MULTILINE: return tsc_value_bool(re->multiline);
    case RE_P_DOT_ALL: return tsc_value_bool(re->dot_all);
    case RE_P_UNICODE: return tsc_value_bool(re->unicode);
    case RE_P_UNICODE_SETS: return tsc_value_bool(re->unicode_sets);
    case RE_P_STICKY: return tsc_value_bool(re->sticky);
    case RE_P_FLAGS: break;
    }
    tsc_panic("unknown RegExp getter");
}
static tsc_value_t regexp_property_get_apply(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)args; return regexp_property_get(env, receiver);
}
static void regexp_define_getter(tsc_value_t object, tsc_str_t* key, tsc_str_t* name,
                                 tsc_generic_function_t getter, void* env) {
    tsc_object_t* descriptor = tsc_object_new();
    tsc_object_set(descriptor, tsc_str_from_lit("get", 3), tsc_value_function_builtin_named(getter, env, 0, name));
    tsc_object_set(descriptor, tsc_str_from_lit("enumerable", 10), tsc_value_bool(false));
    tsc_object_set(descriptor, tsc_str_from_lit("configurable", 12), tsc_value_bool(true));
    tsc_value_define_property_descriptor(object, key, tsc_value_object(descriptor));
}
static tsc_value_t regexp_to_string_apply(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env; (void)args;
    if (!tsc_value_is_object(receiver))
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("RegExp toString called on non-object"));
    tsc_str_t* source = tsc_value_to_string(tsc_value_get_prop(receiver, tsc_str_from_lit("source", 6)));
    tsc_str_t* flags = tsc_value_to_string(tsc_value_get_prop(receiver, tsc_str_from_lit("flags", 5)));
    return tsc_value_string(tsc_str_concat_n(4, tsc_str_from_lit("/", 1), source,
        tsc_str_from_lit("/", 1), flags));
}
tsc_value_t tsc_regexp_prototype_value(void) {
    regexp_intrinsics_t* state = tsc_realm_state_get(&regexp_intrinsics_realm_key);
    if (state) return tsc_value_object(state->prototype);
    tsc_runtime_lock();
    state = tsc_realm_state_get(&regexp_intrinsics_realm_key);
    if (!state) {
        state = TSC_GC_MALLOC(sizeof(*state));
        memset(state, 0, sizeof(*state));
        tsc_object_t* prototype = state->prototype = tsc_object_new();
        tsc_realm_state_set(&regexp_intrinsics_realm_key, state);
        state->constructor = tsc_value_function_named_kind(
            tsc_regexp_constructor_apply, tsc_regexp_constructor_apply, NULL, 2,
            tsc_str_from_lit("RegExp", 6), TSC_FUNCTION_IDENTITY_BUILTIN);
        state->constructor_root = tsc_value_gc_root(state->constructor);
        tsc_function_identity_t* identity = value_ptr(state->constructor);
        identity->construct_allocates_receiver = false;
        identity->construct_default_prototype = TSC_INTRINSIC_DEFAULT_REGEXP_PROTOTYPE;
        tsc_function_identity_set_own_prototype(identity, tsc_value_object(prototype));
        identity->func_prototype_writable = false;
        tsc_object_define(prototype, tsc_str_from_lit("constructor", 11), state->constructor, true, false, true);
        regexp_define_getter(state->constructor, tsc_symbol_property_key(tsc_symbol_species()),
            tsc_str_from_lit("get [Symbol.species]", 20), regexp_species_get, NULL);
        tsc_value_define_property_desc(state->constructor, tsc_str_from_lit("escape", 6),
            tsc_value_function_builtin_named(regexp_escape_apply, NULL, 1, tsc_str_from_lit("escape", 6)),
            true, true, true, false, true, true, true);
        for (size_t i = 0; i < sizeof(regexp_properties) / sizeof(*regexp_properties); i++) {
            const regexp_property_descriptor_t* descriptor = &regexp_properties[i];
            tsc_str_t* key = tsc_str_from_cstr(descriptor->name);
            regexp_define_getter(tsc_value_object(prototype), key,
                tsc_str_concat(tsc_str_from_lit("get ", 4), key), regexp_property_get_apply, (void*)descriptor);
        }
        static const struct { const char* name; double length; tsc_generic_function_t apply; } methods[] = {
            {"exec", 1, tsc_regexp_exec_apply}, {"test", 1, tsc_regexp_test_apply},
            {"compile", 2, tsc_regexp_compile_apply},
            {"toString", 0, regexp_to_string_apply}
        };
        for (size_t i = 0; i < sizeof(methods) / sizeof(*methods); i++) {
            tsc_str_t* name = tsc_str_from_cstr(methods[i].name);
            tsc_object_define(prototype, name,
                tsc_value_function_builtin_named(methods[i].apply, NULL, methods[i].length, name), true, false, true);
        }
        const struct { tsc_symbol_t* key; const char* name; tsc_generic_function_t apply; double length; } symbols[] = {
            {tsc_symbol_match(), "[Symbol.match]", tsc_regexp_match_apply, 1},
            {tsc_symbol_search(), "[Symbol.search]", tsc_regexp_search_apply, 1},
            {tsc_symbol_replace(), "[Symbol.replace]", tsc_regexp_replace_apply, 2},
            {tsc_symbol_split(), "[Symbol.split]", tsc_regexp_split_apply, 2},
            {tsc_symbol_match_all(), "[Symbol.matchAll]", tsc_regexp_match_all_apply, 1}
        };
        for (size_t i = 0; i < sizeof(symbols) / sizeof(*symbols); i++) {
            tsc_value_t method = tsc_value_function_builtin_named(symbols[i].apply, NULL, symbols[i].length,
                tsc_str_from_cstr(symbols[i].name));
            tsc_value_define_symbol_property_desc(tsc_value_object(prototype), symbols[i].key,
                method, true, true, true, false, true, true, true);
        }
    }
    tsc_runtime_unlock();
    return tsc_value_object(state->prototype);
}
tsc_value_t tsc_regexp_constructor_value(void) {
    (void)tsc_regexp_prototype_value();
    regexp_intrinsics_t* state = tsc_realm_state_get(&regexp_intrinsics_realm_key);
    return state->constructor;
}

bool tsc_re_named_at(const tsc_re_compiled_t* re, size_t position, const size_t* captures,
    const char** name, size_t* name_len, size_t* group_index) {
    if (!re || position >= re->nnamed) return false;
    *name = re->named[position].name;
    *name_len = re->named[position].name_len;
    *group_index = re_named_participant(&re->named[position], captures);
    return true;
}
