export interface RegexpPatternDepthSpec {
    generator: "regexp-pattern-depth";
    depth: number;
}

export interface StringSubstitutionTokenWorklistSpec {
    generator: "string-substitution-token-worklist";
    depth: number;
}

export interface RegexpReplaceCaptureWorklistSpec {
    generator: "regexp-replace-capture-worklist";
    depth: number;
}

export interface RegexpSplitCaptureWorklistSpec {
    generator: "regexp-split-capture-worklist";
    depth: number;
}

export interface AsyncLeadingAwaitChainSpec {
    generator: "async-leading-await-chain";
    awaitCount: number;
}

export interface AsyncBindingDefaultDepthSpec {
    generator: "async-binding-default-depth";
    depth: number;
}

export interface AsyncLogicalExpressionDepthSpec {
    generator: "async-logical-expression-depth";
    depth: number;
}

export interface DispatchCaptureWorklistWidthSpec {
    generator: "dispatch-capture-worklist-width";
    width: number;
}

export interface DnsLookupOptionAliasDepthSpec {
    generator: "dns-lookup-option-alias-depth";
    depth: number;
}

export interface GroupingReferenceDepthSpec {
    generator: "grouping-reference-depth";
    depth: number;
}

export interface ConditionalValueExpressionDepthSpec {
    generator: "conditional-value-expression-depth";
    depth: number;
}

export interface CommaValueExpressionDepthSpec {
    generator: "comma-value-expression-depth";
    depth: number;
}

export interface StrictEqualityExpressionDepthSpec {
    generator: "strict-equality-expression-depth";
    depth: number;
}

export interface ModuleNamespaceExportWidthSpec {
    generator: "module-namespace-export-width";
    width: number;
}
export interface ModuleRequestWidthSpec {
    generator: "module-request-width";
    width: number;
}
export interface DynamicImportSourceDepthSpec {
    generator: "dynamic-import-source-depth";
    depth: number;
}
export interface FsReadActualListWidthSpec {generator:"fs-read-actual-list-width";width:number;}
export interface CollectionSourceAliasDepthSpec {generator:"collection-source-alias-depth";depth:number;}
export interface PrimitivePropertyPrototypeDepthSpec {generator:"primitive-property-prototype-depth";depth:number;}
export interface GeneratorMethodOwnerDepthSpec {generator:"generator-method-owner-depth";depth:number;}
export interface PrimitivePropertyReadDepthSpec {generator:"primitive-property-read-depth";depth:number;}
export interface RestSourceLocationDepthSpec {generator:"rest-source-location-depth";depth:number;}
export interface SourceAllocationDepthSpec {generator:"source-allocation-depth";depth:number;}
export interface ListExtentCaptureDepthSpec {generator:"list-extent-capture-depth";depth:number;}
export interface ModuleRejectionOriginDepthSpec {generator:"module-rejection-origin-depth";depth:number;}
export interface PromiseStaticSourceDepthSpec {generator:"promise-static-source-depth";depth:number;}
export interface AsyncReturnAdoptionDepthSpec {generator:"async-return-adoption-depth";depth:number;}
export interface AwaitResolutionDepthSpec {generator:"await-resolution-depth";depth:number;}
export interface PromiseReturnProjectionDepthSpec {generator:"promise-return-projection-depth";depth:number;}
export interface EscapedCallbackGraphDepthSpec {generator:"escaped-callback-graph-depth";depth:number;}
export interface GeneratorSourceOwnerDepthSpec {generator:"generator-source-owner-depth";depth:number;}
export interface NativePromiseArrayDepthSpec {generator:"native-promise-array-depth";depth:number;}
export interface CallbackTimerSourceDepthSpec {generator:"callback-timer-source-depth";depth:number;}
export interface HasInstanceDepthSpec {generator:"has-instance-depth";depth:number;}
export interface RelationalSourceDepthSpec {generator:"relational-source-depth";depth:number;}
export interface StrictTypeSourceDepthSpec {generator:"strict-type-source-depth";depth:number;}
export interface PromiseCapabilitySourceDepthSpec {generator:"promise-capability-source-depth";depth:number;}
export interface JSONNumericSourceDepthSpec {generator:"json-numeric-source-depth";depth:number;}
export interface AtomicsSourceOwnerDepthSpec {generator:"atomics-source-owner-depth";depth:number;}
export interface TypedArrayMetadataDepthSpec {generator:"typed-array-metadata-depth";depth:number;}
export interface MathSourceOwnerDepthSpec {generator:"math-source-owner-depth";depth:number;}
export interface ActivationCaptureOwnerDepthSpec {generator:"activation-capture-owner-depth";depth:number;}
export interface FunctionSourceOwnerDepthSpec {generator:"function-source-owner-depth";depth:number;}
export interface EvalDeclarationDepthSpec {generator:"eval-declaration-depth";depth:number;}
export interface EvalRealmAliasDepthSpec {generator:"eval-realm-alias-depth";depth:number;}
export interface PromiseReactionDepthSpec {generator:"promise-reaction-depth";depth:number;}
export interface ConstructorCompletionDepthSpec {generator:"constructor-completion-depth";depth:number;}
export interface JobQueueDepthSpec {generator:"job-queue-depth";depth:number;}
export interface SourceProjectionProvenanceDepthSpec {generator:"source-projection-provenance-depth";depth:number;}
export interface LexicalSourceCaptureDepthSpec {generator:"lexical-source-capture-depth";depth:number;}
export interface EvalCallerEnvironmentDepthSpec {generator:"eval-caller-environment-depth";depth:number;}
export interface PendingComputedKeyDepthSpec {generator:"pending-computed-key-depth";depth:number;}
export interface SwitchNormalCompletionDepthSpec {generator:"switch-normal-completion-depth";depth:number;}
export interface ModuleAsyncCycleDepthSpec {generator:"module-async-cycle-depth";depth:number;}
export interface PathComponentDepthSpec {generator:"path-component-depth";depth:number;}
export interface ArrayIteratorSourceDepthSpec {generator:"array-iterator-source-depth";depth:number;}
export interface SetCompositionSourceDepthSpec {generator:"set-composition-source-depth";depth:number;}
export interface ObjectLiteralEffectDepthSpec {generator:"object-literal-effect-depth";depth:number;}
export interface ModuleIteratorImportDepthSpec {generator:"module-iterator-import-depth";depth:number;}
export interface ModuleFailureDepthSpec {generator:"module-failure-depth";depth:number;phase:"load"|"link";}
export interface OsUserInfoOptionDepthSpec { generator:"os-user-info-option-depth"; depth:number; }
export interface EventTargetActualsDepthSpec { generator:"event-target-actuals-depth"; depth:number; }
export interface ParseGoalSourceDepthSpec { generator:"parse-goal-source-depth"; depth:number; }
export interface JSONScalarSourceDepthSpec { generator:"json-scalar-source-depth"; depth:number; }
export interface ErrorBrandDepthSpec { generator:"error-brand-depth"; depth:number; }
export interface MapInsertionDepthSpec { generator:"map-insertion-depth"; depth:number; }
export interface DescriptorProjectionDepthSpec { generator:"descriptor-projection-depth"; depth:number; }
export interface PrototypeValidationDepthSpec { generator:"prototype-validation-depth"; depth:number; }
export interface UtilFormatSourceDepthSpec { generator:"util-format-source-depth"; depth:number; }
export interface ReturnProjectionDepthSpec { generator:"return-projection-depth"; depth:number; }
export interface ImportMetaReferenceWidthSpec {
    generator: "import-meta-reference-width";
    width: number;
}

export interface ModuleStaticSemanticsWidthSpec {
    generator: "module-static-semantics-width";
    width: number;
}

export interface ModuleStaticSemanticsDepthSpec {
    generator: "module-static-semantics-depth";
    depth: number;
}

export interface ClassExpressionMethodWidthSpec {
    generator: "class-expression-method-width";
    width: number;
}

export interface GlobalNumberParseLengthSpec {
    generator: "global-number-parse-length";
    length: number;
}

export interface UriPercentCodecLengthSpec {
    generator: "uri-percent-codec-length";
    length: number;
}

export interface StringCodeUnitListWidthSpec {
    generator: "string-code-unit-list-width";
    width: number;
}

export interface StringCodePointListWidthSpec {
    generator: "string-code-point-list-width";
    width: number;
}

export interface StringUtf16ExoticWidthSpec {
    generator: "string-utf16-exotic-width";
    width: number;
}

export interface StringConcatArgumentWidthSpec {
    generator: "string-concat-argument-width";
    width: number;
}

export interface StringRawTemplateWidthSpec {
    generator: "string-raw-template-width";
    width: number;
}

export interface JsonRawTextWidthSpec {
    generator: "json-raw-text-width";
    width: number;
}

export interface JsonReviverDepthSpec {
    generator: "json-reviver-depth";
    depth: number;
}

export interface JsonNamespaceOwnerDepthSpec {
    generator: "json-namespace-owner-depth";
    depth: number;
}

export interface JsonParseSourceOwnerDepthSpec {
    generator: "json-parse-source-owner-depth";
    depth: number;
}

export interface JsonCompositeSourceDepthSpec {
    generator: "json-composite-source-depth";
    depth: number;
}

export interface JsonReviverSourceRecordDepthSpec {
    generator: "json-reviver-source-record-depth";
    depth: number;
}

export interface BoxedJsonSourceDepthSpec {generator:"boxed-json-source-depth";depth:number;}

export interface DescriptorSourceOwnerDepthSpec {
    generator: "descriptor-source-owner-depth";
    depth: number;
}

export interface ReflectConstructArgumentWidthSpec {
    generator: "reflect-construct-argument-width";
    width: number;
}

export interface ArrowFormalBindingTreeDepthSpec {
    generator: "arrow-formal-binding-tree-depth";
    depth: number;
    sourceKind: "javascript";
}

export interface ArrayStaticFactoryItemWidthSpec {
    generator: "array-static-factory-item-width";
    width: number;
}

export interface DateStaticArgumentDepthSpec {
    generator: "date-static-argument-depth";
    depth: number;
}

export interface NumberPrototypeArgumentWidthSpec {
    generator: "number-prototype-argument-width";
    width: number;
}

export interface SwitchClauseWorklistWidthSpec {
    generator: "switch-clause-worklist-width";
    width: number;
}

export interface SwitchCaseBlockEnvironmentDepthSpec {
    generator: "switch-caseblock-environment-depth";
    depth: number;
}

export interface SwitchCaseBlockBindingDepthSpec {
    generator: "switch-caseblock-binding-depth";
    depth: number;
}

export interface SwitchCaseBlockFunctionWorklistWidthSpec {
    generator: "switch-caseblock-function-worklist-width";
    width: number;
}

export interface SwitchCaseBlockGeneratorCaptureWidthSpec {
    generator: "switch-caseblock-generator-capture-width";
    width: number;
}

export interface SwitchCaseBlockAsyncCaptureWidthSpec {
    generator: "switch-caseblock-async-capture-width";
    width: number;
}

export interface SwitchCaseBlockClassWorklistWidthSpec {
    generator: "switch-caseblock-class-worklist-width";
    width: number;
}

export type GeneratedCaseSpec =
    | RegexpPatternDepthSpec
    | RegexpSplitCaptureWorklistSpec
    | RegexpReplaceCaptureWorklistSpec
    | StringSubstitutionTokenWorklistSpec
    | AsyncLeadingAwaitChainSpec
    | AsyncBindingDefaultDepthSpec
    | AsyncLogicalExpressionDepthSpec
    | DispatchCaptureWorklistWidthSpec
    | DnsLookupOptionAliasDepthSpec
    | GroupingReferenceDepthSpec
    | ConditionalValueExpressionDepthSpec
    | CommaValueExpressionDepthSpec
    | StrictEqualityExpressionDepthSpec
    | ModuleNamespaceExportWidthSpec
    | ModuleRequestWidthSpec
    | DynamicImportSourceDepthSpec
    | ModuleFailureDepthSpec
    | CollectionSourceAliasDepthSpec
    | PrimitivePropertyPrototypeDepthSpec
    | GeneratorMethodOwnerDepthSpec
    | PrimitivePropertyReadDepthSpec
    | LexicalSourceCaptureDepthSpec
    | EvalCallerEnvironmentDepthSpec
    | PendingComputedKeyDepthSpec
    | SwitchNormalCompletionDepthSpec
    | ModuleAsyncCycleDepthSpec
    | PathComponentDepthSpec
    | ArrayIteratorSourceDepthSpec
    | SetCompositionSourceDepthSpec
    | ObjectLiteralEffectDepthSpec
    | ModuleIteratorImportDepthSpec
    | OsUserInfoOptionDepthSpec
    | EventTargetActualsDepthSpec
    | ParseGoalSourceDepthSpec
    | JSONScalarSourceDepthSpec
    | ErrorBrandDepthSpec
    | MapInsertionDepthSpec
    | DescriptorProjectionDepthSpec
    | PrototypeValidationDepthSpec
    | UtilFormatSourceDepthSpec
    | ReturnProjectionDepthSpec
    | FsReadActualListWidthSpec
    | ImportMetaReferenceWidthSpec
    | ModuleStaticSemanticsWidthSpec
    | ModuleStaticSemanticsDepthSpec
    | ClassExpressionMethodWidthSpec
    | GlobalNumberParseLengthSpec
    | UriPercentCodecLengthSpec
    | StringCodeUnitListWidthSpec
    | StringCodePointListWidthSpec
    | StringUtf16ExoticWidthSpec
    | StringConcatArgumentWidthSpec
    | StringRawTemplateWidthSpec
    | JsonRawTextWidthSpec
    | JsonReviverDepthSpec
    | JsonNamespaceOwnerDepthSpec
    | JsonParseSourceOwnerDepthSpec
    | JsonCompositeSourceDepthSpec
    | JsonReviverSourceRecordDepthSpec
    | BoxedJsonSourceDepthSpec
    | DescriptorSourceOwnerDepthSpec
    | ReflectConstructArgumentWidthSpec
    | ArrowFormalBindingTreeDepthSpec
    | ArrayStaticFactoryItemWidthSpec
    | DateStaticArgumentDepthSpec
    | NumberPrototypeArgumentWidthSpec
    | SwitchClauseWorklistWidthSpec
    | SwitchCaseBlockEnvironmentDepthSpec
    | SwitchCaseBlockBindingDepthSpec
    | SwitchCaseBlockFunctionWorklistWidthSpec
    | SwitchCaseBlockGeneratorCaptureWidthSpec
    | SwitchCaseBlockAsyncCaptureWidthSpec
    | RestSourceLocationDepthSpec
    | SourceAllocationDepthSpec
    | ListExtentCaptureDepthSpec
    | ModuleRejectionOriginDepthSpec
    | PromiseStaticSourceDepthSpec
    | AsyncReturnAdoptionDepthSpec
    | AwaitResolutionDepthSpec
    | PromiseReturnProjectionDepthSpec
    | EscapedCallbackGraphDepthSpec
    | GeneratorSourceOwnerDepthSpec
    | NativePromiseArrayDepthSpec
    | CallbackTimerSourceDepthSpec
    | HasInstanceDepthSpec
    | RelationalSourceDepthSpec
    | StrictTypeSourceDepthSpec
    | PromiseCapabilitySourceDepthSpec
    | JSONNumericSourceDepthSpec
    | AtomicsSourceOwnerDepthSpec
    | TypedArrayMetadataDepthSpec
    | MathSourceOwnerDepthSpec
    | ActivationCaptureOwnerDepthSpec
    | FunctionSourceOwnerDepthSpec
    | EvalDeclarationDepthSpec
    | EvalRealmAliasDepthSpec
    | PromiseReactionDepthSpec
    | ConstructorCompletionDepthSpec
    | JobQueueDepthSpec
    | SourceProjectionProvenanceDepthSpec
    | SwitchCaseBlockClassWorklistWidthSpec;

export function parseGeneratedCaseSpec(raw: string, filename: string): GeneratedCaseSpec {
    let value: unknown;
    try {
        value = JSON.parse(raw);
    } catch (error) {
        throw new Error(`invalid generated case spec ${filename}: ${String(error)}`);
    }
    if (!value || typeof value !== "object") {
        throw new Error(`invalid generated case spec ${filename}: expected an object`);
    }
    const spec = value as Record<string, unknown>;
    if(spec.generator==='primitive-property-read-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid primitive property read spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='rest-source-location-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid rest source location spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='source-allocation-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid source allocation spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='list-extent-capture-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid List extent capture spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='module-rejection-origin-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid Module rejection origin spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='promise-static-source-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid Promise static source spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='async-return-adoption-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid async return adoption spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='await-resolution-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid await resolution spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='promise-return-projection-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid Promise return projection spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='escaped-callback-graph-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid escaped callback graph spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='generator-source-owner-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid generator source owner spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='native-promise-array-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid native Promise array spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='callback-timer-source-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid callback timer source spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='has-instance-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid hasInstance spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='relational-source-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid relational source spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='strict-type-source-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid strict type source spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='promise-capability-source-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid Promise capability source spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='json-numeric-source-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid JSON numeric source spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='atomics-source-owner-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid Atomics source owner spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='typed-array-metadata-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid TypedArray metadata spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='math-source-owner-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid Math source owner spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='activation-capture-owner-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid activation capture owner spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='function-source-owner-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid Function source owner spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='eval-declaration-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid eval declaration spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='eval-realm-alias-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid eval Realm alias spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='promise-reaction-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid Promise reaction spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='constructor-completion-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid constructor completion spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='job-queue-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid job queue spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='source-projection-provenance-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid source projection provenance spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='lexical-source-capture-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid lexical source capture spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='eval-caller-environment-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid eval caller environment spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='pending-computed-key-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid pending computed key spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='switch-normal-completion-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid switch normal completion spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='module-async-cycle-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<2)throw new Error(`invalid asynchronous Module cycle spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='path-component-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid path component spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='array-iterator-source-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid Array iterator source spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='set-composition-source-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid Set composition source spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='generator-method-owner-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid generator method owner spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='primitive-property-prototype-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid primitive property prototype spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='collection-source-alias-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid collection source alias spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='object-literal-effect-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid object literal effect spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='module-iterator-import-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<1)throw new Error(`invalid iterator import source spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth};
    }
    if(spec.generator==='module-failure-depth'){
        if(typeof spec.depth!=='number'||!Number.isInteger(spec.depth)||spec.depth<2||!['load','link'].includes(String(spec.phase)))throw new Error(`invalid generated Module failure spec ${filename}`);
        return {generator:spec.generator,depth:spec.depth,phase:spec.phase as 'load'|'link'};
    }
    if (spec.generator === "string-substitution-token-worklist") {
        if (typeof spec.depth !== "number" || !Number.isInteger(spec.depth) || spec.depth < 2)
            throw new Error(`invalid generated substitution worklist spec ${filename}`);
        return { generator: spec.generator, depth: spec.depth };
    }
    if (spec.generator === "regexp-replace-capture-worklist") {
        if (typeof spec.depth !== "number" || !Number.isInteger(spec.depth) || spec.depth < 2)
            throw new Error(`invalid generated replacement worklist spec ${filename}`);
        return { generator: spec.generator, depth: spec.depth };
    }
    if (spec.generator === "regexp-split-capture-worklist") {
        if (typeof spec.depth !== "number" || !Number.isInteger(spec.depth) || spec.depth < 2)
            throw new Error(`invalid generated split worklist spec ${filename}`);
        return { generator: spec.generator, depth: spec.depth };
    }
    if (spec.generator === "regexp-pattern-depth") {
        const depth = spec.depth;
        if (typeof depth !== "number" || !Number.isInteger(depth) || depth < 2) {
            throw new Error(`invalid generated case spec ${filename}: depth must be an integer of at least 2`);
        }
        return { generator: spec.generator, depth };
    }
    if (spec.generator === "async-leading-await-chain") {
        const awaitCount = spec.awaitCount;
        if (typeof awaitCount !== "number" || !Number.isInteger(awaitCount) || awaitCount < 2) {
            throw new Error(`invalid generated case spec ${filename}: awaitCount must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            awaitCount,
        };
    }
    if (spec.generator === "async-binding-default-depth") {
        const depth = spec.depth;
        if (typeof depth !== "number" || !Number.isInteger(depth) || depth < 2) {
            throw new Error(`invalid generated case spec ${filename}: depth must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            depth,
        };
    }
    if (spec.generator === "async-logical-expression-depth") {
        const depth = spec.depth;
        if (typeof depth !== "number" || !Number.isInteger(depth) || depth < 2) {
            throw new Error(`invalid generated case spec ${filename}: depth must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            depth,
        };
    }
    if (spec.generator === "dispatch-capture-worklist-width" || spec.generator === "json-raw-text-width") {
        const width = spec.width;
        if (typeof width !== "number" || !Number.isInteger(width) || width < 2) {
            throw new Error(`invalid generated case spec ${filename}: width must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            width,
        };
    }
    if (spec.generator === "dns-lookup-option-alias-depth") {
        const depth = spec.depth;
        if (typeof depth !== "number" || !Number.isInteger(depth) || depth < 2) {
            throw new Error(`invalid generated case spec ${filename}: depth must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            depth,
        };
    }
    if (spec.generator === "conditional-value-expression-depth" || spec.generator === "comma-value-expression-depth" || spec.generator === "strict-equality-expression-depth" || spec.generator === "grouping-reference-depth" || spec.generator === "json-reviver-depth" || spec.generator === "json-namespace-owner-depth" || spec.generator === "json-parse-source-owner-depth" || spec.generator === "descriptor-source-owner-depth" || spec.generator === "json-composite-source-depth" || spec.generator === "json-reviver-source-record-depth" || spec.generator === "boxed-json-source-depth" || spec.generator === "dynamic-import-source-depth" || spec.generator === "return-projection-depth" || spec.generator === "util-format-source-depth" || spec.generator === "prototype-validation-depth" || spec.generator === "descriptor-projection-depth" || spec.generator === "map-insertion-depth" || spec.generator === "error-brand-depth" || spec.generator === "json-scalar-source-depth" || spec.generator === "parse-goal-source-depth" || spec.generator === "event-target-actuals-depth" || spec.generator === "os-user-info-option-depth") {
        const depth = spec.depth;
        if (typeof depth !== "number" || !Number.isInteger(depth) || depth < 2) {
            throw new Error(`invalid generated case spec ${filename}: depth must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            depth,
        };
    }
    if (spec.generator === "module-namespace-export-width" || spec.generator === "module-request-width" || spec.generator === "fs-read-actual-list-width" || spec.generator === "import-meta-reference-width") {
        const width = spec.width;
        if (typeof width !== "number" || !Number.isInteger(width) || width < 2) {
            throw new Error(`invalid generated case spec ${filename}: width must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            width,
        };
    }
    if (spec.generator === "module-static-semantics-width") {
        const width = spec.width;
        if (typeof width !== "number" || !Number.isInteger(width) || width < 2) {
            throw new Error(`invalid generated case spec ${filename}: width must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            width,
        };
    }
    if (spec.generator === "module-static-semantics-depth") {
        const depth = spec.depth;
        if (typeof depth !== "number" || !Number.isInteger(depth) || depth < 2) {
            throw new Error(`invalid generated case spec ${filename}: depth must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            depth,
        };
    }
    if (spec.generator === "class-expression-method-width") {
        const width = spec.width;
        if (typeof width !== "number" || !Number.isInteger(width) || width < 2) {
            throw new Error(`invalid generated case spec ${filename}: width must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            width,
        };
    }
    if (spec.generator === "global-number-parse-length") {
        const length = spec.length;
        if (typeof length !== "number" || !Number.isInteger(length) || length < 2) {
            throw new Error(`invalid generated case spec ${filename}: length must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            length,
        };
    }
    if (spec.generator === "uri-percent-codec-length") {
        const length = spec.length;
        if (typeof length !== "number" || !Number.isInteger(length) || length < 2) {
            throw new Error(`invalid generated case spec ${filename}: length must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            length,
        };
    }
    if (spec.generator === "string-code-unit-list-width") {
        const width = spec.width;
        if (typeof width !== "number" || !Number.isInteger(width) || width < 2) {
            throw new Error(`invalid generated case spec ${filename}: width must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            width,
        };
    }
    if (spec.generator === "string-code-point-list-width") {
        const width = spec.width;
        if (typeof width !== "number" || !Number.isInteger(width) || width < 2) {
            throw new Error(`invalid generated case spec ${filename}: width must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            width,
        };
    }
    if (spec.generator === "string-utf16-exotic-width") {
        const width = spec.width;
        if (typeof width !== "number" || !Number.isInteger(width) || width < 2) {
            throw new Error(`invalid generated case spec ${filename}: width must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            width,
        };
    }
    if (spec.generator === "string-concat-argument-width") {
        const width = spec.width;
        if (typeof width !== "number" || !Number.isInteger(width) || width < 2) {
            throw new Error(`invalid generated case spec ${filename}: width must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            width,
        };
    }
    if (spec.generator === "string-raw-template-width") {
        const width = spec.width;
        if (typeof width !== "number" || !Number.isInteger(width) || width < 2) {
            throw new Error(`invalid generated case spec ${filename}: width must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            width,
        };
    }
    if (spec.generator === "reflect-construct-argument-width") {
        const width = spec.width;
        if (typeof width !== "number" || !Number.isInteger(width) || width < 2) {
            throw new Error(`invalid generated case spec ${filename}: width must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            width,
        };
    }
    if (spec.generator === "arrow-formal-binding-tree-depth") {
        const depth = spec.depth;
        if (typeof depth !== "number" || !Number.isInteger(depth) || depth < 2) {
            throw new Error(`invalid generated case spec ${filename}: depth must be an integer of at least 2`);
        }
        if (spec.sourceKind !== "javascript") {
            throw new Error(`invalid generated case spec ${filename}: sourceKind must be javascript`);
        }
        return {
            generator: spec.generator,
            depth,
            sourceKind: spec.sourceKind,
        };
    }
    if (spec.generator === "array-static-factory-item-width") {
        const width = spec.width;
        if (typeof width !== "number" || !Number.isInteger(width) || width < 2) {
            throw new Error(`invalid generated case spec ${filename}: width must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            width,
        };
    }
    if (spec.generator === "date-static-argument-depth") {
        const depth = spec.depth;
        if (typeof depth !== "number" || !Number.isInteger(depth) || depth < 2) {
            throw new Error(`invalid generated case spec ${filename}: depth must be an integer of at least 2`);
        }
        return { generator: spec.generator, depth };
    }
    if (spec.generator === "number-prototype-argument-width") {
        const width = spec.width;
        if (typeof width !== "number" || !Number.isInteger(width) || width < 2) {
            throw new Error(`invalid generated case spec ${filename}: width must be an integer of at least 2`);
        }
        return { generator: spec.generator, width };
    }
    if (spec.generator === "switch-clause-worklist-width") {
        const width = spec.width;
        if (typeof width !== "number" || !Number.isInteger(width) || width < 2) {
            throw new Error(`invalid generated case spec ${filename}: width must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            width,
        };
    }
    if (spec.generator === "switch-caseblock-environment-depth") {
        const depth = spec.depth;
        if (typeof depth !== "number" || !Number.isInteger(depth) || depth < 2) {
            throw new Error(`invalid generated case spec ${filename}: depth must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            depth,
        };
    }
    if (spec.generator === "switch-caseblock-binding-depth") {
        const depth = spec.depth;
        if (typeof depth !== "number" || !Number.isInteger(depth) || depth < 2) {
            throw new Error(`invalid generated case spec ${filename}: depth must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            depth,
        };
    }
    if (spec.generator === "switch-caseblock-function-worklist-width") {
        const width = spec.width;
        if (typeof width !== "number" || !Number.isInteger(width) || width < 2) {
            throw new Error(`invalid generated case spec ${filename}: width must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            width,
        };
    }
    if (spec.generator === "switch-caseblock-generator-capture-width") {
        const width = spec.width;
        if (typeof width !== "number" || !Number.isInteger(width) || width < 2) {
            throw new Error(`invalid generated case spec ${filename}: width must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            width,
        };
    }
    if (spec.generator === "switch-caseblock-async-capture-width") {
        const width = spec.width;
        if (typeof width !== "number" || !Number.isInteger(width) || width < 2) {
            throw new Error(`invalid generated case spec ${filename}: width must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            width,
        };
    }
    if (spec.generator === "switch-caseblock-class-worklist-width") {
        const width = spec.width;
        if (typeof width !== "number" || !Number.isInteger(width) || width < 2) {
            throw new Error(`invalid generated case spec ${filename}: width must be an integer of at least 2`);
        }
        return {
            generator: spec.generator,
            width,
        };
    }
    throw new Error(`invalid generated case spec ${filename}: unknown generator ${String(spec.generator)}`);
}

function leadingAwaitChain(indent: string, seed: string, awaitCount: number): string[] {
    const lines = [
        `${indent}const value0 = await delay(0, ${JSON.stringify(seed)});`,
        `${indent}let marker = value0;`,
        `${indent}if (marker.length === 0) {`,
        `${indent}    marker = "unreachable";`,
        `${indent}}`,
        `${indent}for (let index = 0; index < 1; index++) {`,
        `${indent}    marker = value0;`,
        `${indent}}`,
        `${indent}try {`,
        `${indent}    marker = value0;`,
        `${indent}} finally {`,
        `${indent}    marker = value0;`,
        `${indent}}`,
    ];
    for (let index = 1; index < awaitCount; index++) {
        const markerCheck = index === 1 ? ' + (marker === value0 ? "" : "bad")' : "";
        lines.push(
            `${indent}const value${index} = await delay(0, value${index - 1} + "${index % 10}"${markerCheck});`,
        );
    }
    lines.push(`${indent}return value${awaitCount - 1}.length;`);
    return lines;
}

function asyncLeadingAwaitChainSource(awaitCount: number): string {
    const straightBody = (indent: string, seed: string): string =>
        leadingAwaitChain(indent, seed, awaitCount).join("\n");
    const conditionalBody = (indent: string, trueSeed: string, falseSeed: string): string => [
        `${indent}if (flag) {`,
        straightBody(`${indent}    `, trueSeed),
        `${indent}} else {`,
        straightBody(`${indent}    `, falseSeed),
        `${indent}}`,
    ].join("\n");

    return [
        'import { setTimeout as delay } from "node:timers/promises";',
        "",
        "async function declaration(): Promise<number> {",
        straightBody("    ", "d"),
        "}",
        "",
        "class Chain {",
        "    async method(): Promise<number> {",
        straightBody("        ", "m"),
        "    }",
        "}",
        "",
        "const value = async (): Promise<number> => {",
        straightBody("    ", "v"),
        "};",
        "",
        "async function branch(flag: boolean): Promise<number> {",
        conditionalBody("    ", "t", "f"),
        "}",
        "",
        "class BranchChain {",
        "    async method(flag: boolean): Promise<number> {",
        conditionalBody("        ", "a", "b"),
        "    }",
        "}",
        "",
        "const branchValue = async (flag: boolean): Promise<number> => {",
        conditionalBody("    ", "x", "y"),
        "};",
        "",
        'declaration().then((result) => console.log("declaration:", result));',
        'new Chain().method().then((result) => console.log("method:", result));',
        'value().then((result) => console.log("value:", result));',
        'branch(true).then((result) => console.log("branch-true:", result));',
        'branch(false).then((result) => console.log("branch-false:", result));',
        'new BranchChain().method(true).then((result) => console.log("method-branch-true:", result));',
        'new BranchChain().method(false).then((result) => console.log("method-branch-false:", result));',
        'branchValue(true).then((result) => console.log("value-branch-true:", result));',
        'branchValue(false).then((result) => console.log("value-branch-false:", result));',
        "",
    ].join("\n");
}

function asyncBindingDefaultDepthSource(depth: number): string {
    let pattern = "leaf = await leafValue()";
    for (let index = depth - 1; index >= 0; index--) {
        pattern = `level${index}: { ${pattern} } = await objectValue()`;
    }
    return [
        "let calls = 0;",
        "",
        "function objectValue(): Promise<any> {",
        "    calls++;",
        "    return Promise.resolve({});",
        "}",
        "",
        "function leafValue(): Promise<number> {",
        "    calls++;",
        "    return Promise.resolve(73);",
        "}",
        "",
        "async function bindingDepth(): Promise<boolean> {",
        `    const { ${pattern} }: any = {};`,
        `    return leaf === 73 && calls === ${depth + 1};`,
        "}",
        "",
        'bindingDepth().then((result) => console.log("binding depth:", result));',
        "",
    ].join("\n");
}

function asyncLogicalExpressionDepthSource(depth: number): string {
    let expression = "await finish()";
    for (let index = depth - 1; index >= 0; index--) {
        const partition = index % 3;
        const operator = partition === 0 ? "&&" : partition === 1 ? "||" : "??";
        const value = partition === 0 ? "objectValue" : partition === 1 ? "0" : "undefined";
        expression = `mark(${index}, ${value}) ${operator} (${expression})`;
    }
    return [
        `const depth = ${depth};`,
        "const objectValue = { marker: 'truthy' };",
        "let calls = 0;",
        "let ordered = true;",
        "let finishCalls = 0;",
        "function mark(index: number, value: any): any {",
        "    ordered = ordered && index === calls;",
        "    calls++;",
        "    return value;",
        "}",
        "async function finish(): Promise<number> {",
        "    finishCalls++;",
        "    return await Promise.resolve(197);",
        "}",
        "async function logicalDepth(): Promise<boolean> {",
        `    const result = ${expression};`,
        "    return result === 197 && calls === depth && ordered && finishCalls === 1;",
        "}",
        'logicalDepth().then((result) => console.log("async logical expression depth:", result));',
        "",
    ].join("\n");
}

function dispatchCaptureWorklistWidthSource(width: number): string {
    const declarations = Array.from(
        { length: width },
        (_, index) => `const capture_${index}: number[] = [${index}];`,
    );
    const observations = Array.from(
        { length: width },
        (_, index) => `        total += capture_${index}[0];`,
    );
    const mutations = Array.from(
        { length: width },
        (_, index) => `capture_${index}[0] = ${width + index};`,
    );
    return [
        "const queue = new DispatchQueue('capture-worklist');",
        ...declarations,
        "const pending = dispatch.async(queue, () => {",
        "    let total = 0;",
        ...observations,
        "    return total;",
        "});",
        ...mutations,
        `pending.then((result) => console.log("dispatch capture worklist:", result === ${(width * (width - 1)) / 2}));`,
        "",
    ].join("\n");
}

function dnsLookupOptionAliasDepthSource(depth: number): string {
    const aliases = Array.from(
        { length: depth },
        (_, index) => `const lookupOptions_${index + 1} = lookupOptions_${index};`,
    );
    return [
        'import { ALL, V4MAPPED, lookup, promises } from "dns";',
        "const lookupOptions_0 = { family: 6, hints: V4MAPPED | ALL } as const;",
        ...aliases,
        `lookup("127.0.0.1", lookupOptions_${depth}, (error: any, address: string, family: number): void => {`,
        '    console.log("dns alias stress callback:", error === null, address.indexOf("127.0.0.1") >= 0, family);',
        "});",
        `promises.lookup("127.0.0.1", lookupOptions_${depth}).then((result: any): void => {`,
        '    console.log("dns alias stress promise:", result.address.indexOf("127.0.0.1") >= 0, result.family);',
        "});",
        'console.log("dns alias stress sync");',
        "",
    ].join("\n");
}

function groupingReferenceDepthSource(depth: number): string {
    const group = (value: string): string => "(".repeat(depth) + value + ")".repeat(depth);
    return [
        "let calls = 0;",
        "function leaf(): any { calls++; return { value: 7 }; }",
        "const owner = { value: 19 };",
        `const returned = ${group("owner.value")}++;`,
        `const value = ${group("leaf()")};`,
        'console.log("grouping depth:", returned === 19 && owner.value === 20 && value.value === 7 && calls === 1);',
    ].join("\n");
}

function conditionalValueExpressionDepthSource(depth: number): string {
    let expression = "null";
    for (let index = depth - 1; index >= 0; --index) expression = `(choose(${index}) ? unreachable() : ${expression})`;
    return [
        "let calls = 0, ordered = true;",
        "function choose(index: number): boolean { ordered = ordered && index === calls; calls++; return false; }",
        "function unreachable(): any { throw new Error('unselected conditional arm'); }",
        `const result: any = ${expression};`,
        `console.log("conditional value depth:", result === null && ordered && calls === ${depth});`,
    ].join("\n");
}

function commaValueExpressionDepthSource(depth: number): string {
    let expression = "null";
    for (let index = depth - 1; index >= 0; --index) expression = `(mark(${index}), ${expression})`;
    return [
        "let calls = 0, ordered = true;",
        "function mark(index: number): void { ordered = ordered && index === calls; calls++; }",
        `const result: any = ${expression};`,
        `console.log("comma value depth:", result === null && ordered && calls === ${depth});`,
    ].join("\n");
}

function strictEqualityExpressionDepthSource(depth: number): string {
    let expression = `mark(${depth})`;
    for (let index = depth - 1; index >= 0; index--) {
        expression = `mark(${index}) === (${expression})`;
    }
    const expected = depth % 2 === 1 ? "true" : "false";
    return [
        "let calls = 0;",
        "let ordered = true;",
        "",
        "function mark(index: number): any {",
        "    ordered = ordered && index === calls;",
        "    calls++;",
        "    return false;",
        "}",
        "",
        "function strictEqualityExpressionDepth(): boolean {",
        `    const result = ${expression};`,
        `    return result === ${expected} && calls === ${depth + 1} && ordered;`,
        "}",
        "",
        'console.log("strict equality depth:", strictEqualityExpressionDepth());',
        "",
    ].join("\n");
}

function moduleNamespaceExportWidthSource(width: number): string {
    const exportedValues = Array.from(
        { length: width },
        (_, index) => `export const value${index.toString().padStart(3, "0")} = ${index};`,
    );
    const lastName = `value${(width - 1).toString().padStart(3, "0")}`;
    return [
        'import * as namespace from "./module_namespace_export_width";',
        "",
        ...exportedValues,
        "export let live = 0;",
        "export function update(value: number): void { live = value; }",
        "",
        "const names = Object.getOwnPropertyNames(namespace);",
        "const sorted = names.slice().sort();",
        "namespace.update(211);",
        "const valid =",
        `    names.length === ${width + 2} &&`,
        '    names.join("|") === sorted.join("|") &&',
        `    namespace.${lastName} === ${width - 1} &&`,
        "    namespace.live === 211 &&",
        "    namespace === namespace;",
        'console.log("module namespace width:", valid);',
        "",
    ].join("\n");
}

function importMetaReferenceWidthSource(width: number): string {
    const references = Array.from({length:width}, () => "import.meta");
    return [
        "export {};",
        "const original:any=import.meta;",
        "const empty=Reflect.ownKeys(original).length===0;",
        `const references:any[]=[${references.join(",")}];`,
        "const marker={token:71};original.retained=marker;",
        "const coherent=references.every(value=>value===original&&value.retained===marker);",
        "console.log('import-meta default owner:',empty&&coherent&&Object.getPrototypeOf(original)===null&&Object.isExtensible(original));",
        "",
    ].join("\n");
}

function globalNumberParseLengthSource(length: number): string {
    const whitespace = " ".repeat(length);
    const zeros = "0".repeat(length);
    return [
        `const integerSource = ${JSON.stringify(`${whitespace}${zeros}42tail`)};`,
        `const decimalSource = ${JSON.stringify(`${whitespace}${zeros}1.25tail`)};`,
        `const numericSource = ${JSON.stringify(`${whitespace}${zeros}1${whitespace}`)};`,
        "const valid =",
        "    parseInt(integerSource, 10) === 42 &&",
        "    parseFloat(decimalSource) === 1.25 &&",
        "    Number(numericSource) === 1 &&",
        "    isFinite(numericSource) && !isNaN(numericSource);",
        'console.log("global number parse length:", valid);',
        "",
    ].join("\n");
}

function uriPercentCodecLengthSource(length: number): string {
    return [
        `const length = ${length};`,
        `const unit = "a b;/?:@&=+$,#\\u03a9\\u{1f600}";`,
        "const source = unit.repeat(length);",
        "const reserved = \"%23\".repeat(length);",
        "let malformedTail = false;",
        "let surrogateTail = false;",
        "try { decodeURIComponent(\"%41\".repeat(length) + \"%C2\"); }",
        "catch (error) { malformedTail = error instanceof URIError; }",
        "try { encodeURI(\"a\".repeat(length) + String.fromCharCode(0xd800)); }",
        "catch (error) { surrogateTail = error instanceof URIError; }",
        "const valid =",
        "    decodeURI(encodeURI(source)) === source &&",
        "    decodeURIComponent(encodeURIComponent(source)) === source &&",
        "    decodeURI(reserved) === reserved &&",
        "    decodeURIComponent(reserved) === \"#\".repeat(length) &&",
        "    malformedTail && surrogateTail;",
        'console.log("URI percent codec length:", valid);',
        "",
    ].join("\n");
}

function stringCodeUnitListWidthSource(width: number): string {
    return [
        `const width = ${width};`,
        "const units: number[] = [];",
        "for (let index = 0; index < width; index++) units.push(65 + index % 26);",
        "const chars = String.fromCharCode(...units);",
        "const points = String.fromCodePoint(...units);",
        "const valid =",
        "    chars === points &&",
        "    chars.length === width &&",
        "    chars.charCodeAt(0) === 65 &&",
        "    chars.charCodeAt(width - 1) === units[width - 1];",
        'console.log("string code-unit list width:", valid);',
        "",
    ].join("\n");
}

function stringRawTemplateWidthSource(width: number): string {
    return [
        `const width = ${width};`,
        "const segments: string[] = [];",
        "const substitutions: number[] = [];",
        "const expectedParts: string[] = [];",
        "for (let index = 0; index < width; index++) {",
        "    const segment = \"s\" + (index % 97);",
        "    segments.push(segment);",
        "    expectedParts.push(segment);",
        "    if (index + 1 < width) {",
        "        substitutions.push(index);",
        "        expectedParts.push(String(index));",
        "    }",
        "}",
        "const expected = expectedParts.join(\"\");",
        "const template: any = { raw: segments };",
        "const direct = String.raw(template, ...substitutions);",
        "const extra = String.raw(template, ...substitutions, width * 3);",
        "const tagged = String.raw`static${0}parts`;",
        "const valid =",
        "    direct === expected &&",
        "    direct.length === expected.length &&",
        "    extra === expected &&",
        "    tagged === \"static0parts\";",
        "console.log(\"string raw template width:\", valid);",
        "",
    ].join("\n");
}

function stringCodePointListWidthSource(width: number): string {
    return [
        `const width = ${width};`,
        "const codePoints: number[] = [];",
        "for (let index = 0; index < width; index++) {",
        "    const partition = index % 4;",
        "    const codePoint = partition === 0",
        "        ? 65 + index % 26",
        "        : partition === 1",
        "            ? 0x80 + index % 0x700",
        "            : partition === 2",
        "                ? 0x800 + index % 0x5000",
        "                : 0x10000 + index % 0x10000;",
        "    codePoints.push(codePoint);",
        "}",
        "const text = String.fromCodePoint(...codePoints);",
        "let codeUnitIndex = 0;",
        "let codeUnitsMatch = true;",
        "for (const codePoint of codePoints) {",
        "    if (codePoint <= 0xffff) {",
        "        if (text.charCodeAt(codeUnitIndex) !== codePoint) codeUnitsMatch = false;",
        "        codeUnitIndex++;",
        "    } else {",
        "        const scalar = codePoint - 0x10000;",
        "        const lead = 0xd800 + (scalar >> 10);",
        "        const trail = 0xdc00 + (scalar & 0x3ff);",
        "        if (text.charCodeAt(codeUnitIndex) !== lead || text.charCodeAt(codeUnitIndex + 1) !== trail) {",
        "            codeUnitsMatch = false;",
        "        }",
        "        codeUnitIndex += 2;",
        "    }",
        "}",
        "if (!Number.isNaN(text.charCodeAt(codeUnitIndex))) codeUnitsMatch = false;",
        "let observed = 0;",
        "let valuesMatch = true;",
        "for (const value of text) {",
        "    const actual = value.codePointAt(0);",
        "    if (actual !== codePoints[observed]) valuesMatch = false;",
        "    observed++;",
        "}",
        "const valid = codeUnitsMatch && valuesMatch && observed === width;",
        'console.log("string code-point list width:", valid);',
        "",
    ].join("\n");
}

function stringUtf16ExoticWidthSource(width: number): string {
    return [
        `const width = ${width};`,
        "const codePoints: number[] = [];",
        "const expectedUnits: number[] = [];",
        "const unitOffsets: number[] = [];",
        "for (let index = 0; index < width; index++) {",
        "    const codePoint = index % 3 === 0",
        "        ? 65 + index % 26",
        "        : index % 3 === 1",
        "            ? 0x800 + index % 0x5000",
        "            : 0x10000 + index % 0x10000;",
        "    codePoints.push(codePoint);",
        "    unitOffsets.push(expectedUnits.length);",
        "    if (codePoint <= 0xffff) expectedUnits.push(codePoint);",
        "    else {",
        "        const scalar = codePoint - 0x10000;",
        "        expectedUnits.push(0xd800 + (scalar >> 10), 0xdc00 + (scalar & 0x3ff));",
        "    }",
        "}",
        "unitOffsets.push(expectedUnits.length);",
        "const text = String.fromCodePoint(...codePoints);",
        "const boxed = Object(text);",
        "const keys = Object.keys(text);",
        "const values = Object.values(text);",
        "const entries = Object.entries(text);",
        "const names = Object.getOwnPropertyNames(boxed);",
        "const descriptors = Object.getOwnPropertyDescriptors(text);",
        "let valid =",
        "    text.length === expectedUnits.length &&",
        "    boxed.length === expectedUnits.length &&",
        "    keys.length === expectedUnits.length &&",
        "    values.length === expectedUnits.length &&",
        "    entries.length === expectedUnits.length &&",
        "    names.length === expectedUnits.length + 1 &&",
        "    Reflect.get(Reflect.get(descriptors, \"length\"), \"value\") === expectedUnits.length;",
        "for (let index = 0; index < expectedUnits.length; index++) {",
        "    const key = String(index);",
        "    const directAt = text.at(index);",
        "    const relativeAt = text.at(index - expectedUnits.length);",
        "    const genericAt = String.prototype.at.call(text, index);",
        "    const directChar = text.charAt(index);",
        "    const genericChar = String.prototype.charAt.call(text, index);",
        "    const directCharCode = text.charCodeAt(index);",
        "    const genericCharCode = String.prototype.charCodeAt.call(text, index);",
        "    const directCodePoint = text.codePointAt(index);",
        "    const genericCodePoint = String.prototype.codePointAt.call(text, index);",
        "    const firstUnit = expectedUnits[index];",
        "    const followingUnit = index + 1 < expectedUnits.length ? expectedUnits[index + 1] : -1;",
        "    const expectedCodePoint = firstUnit >= 0xd800 && firstUnit <= 0xdbff &&",
        "        followingUnit >= 0xdc00 && followingUnit <= 0xdfff",
        "        ? ((firstUnit - 0xd800) * 0x400) + followingUnit - 0xdc00 + 0x10000",
        "        : firstUnit;",
        "    if (keys[index] !== key || names[index] !== key) valid = false;",
        "    if (values[index].charCodeAt(0) !== expectedUnits[index]) valid = false;",
        "    if (entries[index][0] !== key ||",
        "        entries[index][1].charCodeAt(0) !== expectedUnits[index]) valid = false;",
        "    if (descriptors[key].value.charCodeAt(0) !== expectedUnits[index]) valid = false;",
        "    if (directAt === undefined ||",
        "        directAt.charCodeAt(0) !== expectedUnits[index]) valid = false;",
        "    if (relativeAt === undefined ||",
        "        relativeAt.charCodeAt(0) !== expectedUnits[index]) valid = false;",
        "    if (genericAt === undefined ||",
        "        genericAt.charCodeAt(0) !== expectedUnits[index]) valid = false;",
        "    if (directChar.charCodeAt(0) !== firstUnit ||",
        "        genericChar.charCodeAt(0) !== firstUnit) valid = false;",
        "    if (directCharCode !== firstUnit || genericCharCode !== firstUnit) valid = false;",
        "    if (directCodePoint !== expectedCodePoint ||",
        "        genericCodePoint !== expectedCodePoint) valid = false;",
        "}",
        "if (text.at(expectedUnits.length) !== undefined || text.at(-expectedUnits.length - 1) !== undefined) valid = false;",
        "const absentCharCode = text.charCodeAt(expectedUnits.length);",
        "if (text.charAt(expectedUnits.length) !== \"\" || absentCharCode === absentCharCode ||",
        "    text.codePointAt(expectedUnits.length) !== undefined) valid = false;",
        "if (names[expectedUnits.length] !== \"length\") valid = false;",
        "let iterated = 0;",
        "for (const value of text) {",
        "    if (value.codePointAt(0) !== codePoints[iterated]) valid = false;",
        "    iterated++;",
        "}",
        "if (iterated !== width) valid = false;",
        "let probeIndex = width - 1;",
        "while (probeIndex > 0 && probeIndex % 3 !== 2) probeIndex--;",
        "const probeStart = unitOffsets[probeIndex];",
        "const probeEnd = unitOffsets[probeIndex + 1];",
        "const needle = String.fromCodePoint(codePoints[probeIndex]);",
        "const lead = String.fromCharCode(expectedUnits[probeStart]);",
        "const trail = String.fromCharCode(expectedUnits[probeStart + 1]);",
        "const alternateNeedle = lead + trail;",
        "const semanticKeys = new Map<string, number>();",
        "semanticKeys.set(needle, 1);",
        "if (alternateNeedle !== needle || !Object.is(alternateNeedle, needle) ||",
        "    semanticKeys.get(alternateNeedle) !== 1) valid = false;",
        "semanticKeys.set(alternateNeedle, 2);",
        "if (semanticKeys.size !== 1 || semanticKeys.get(needle) !== 2) valid = false;",
        "if (text.indexOf(alternateNeedle) !== probeStart ||",
        "    text.lastIndexOf(needle) !== probeStart || !text.includes(alternateNeedle, probeStart) ||",
        "    !text.startsWith(needle, probeStart) || !text.endsWith(alternateNeedle, probeEnd)) valid = false;",
        "if (text.slice(probeStart, probeEnd) !== alternateNeedle ||",
        "    text.substring(probeStart, probeEnd) !== needle ||",
        "    text.substr(probeStart, probeEnd - probeStart) !== needle) valid = false;",
        "const splitParts = text.split(alternateNeedle);",
        "const splitUnits = needle.split(\"\");",
        "const replacedOnce = text.replace(alternateNeedle, \"Q\");",
        "const replacedAll = text.replaceAll(needle, \"Q\");",
        "let functionalBoundary = 0;",
        "const functionallyReplaced = String.prototype.replaceAll.call(text, \"\", function(match: string, position: number, source: string): string {",
        "    if (match !== \"\" || position !== functionalBoundary || source !== text) valid = false;",
        "    functionalBoundary++;",
        "    return \"\";",
        "});",
        "if (splitParts.length !== 2 || splitParts[0].length !== probeStart ||",
        "    splitParts[1].length !== expectedUnits.length - probeEnd ||",
        "    splitUnits.length !== 2 || splitUnits[0].charCodeAt(0) !== expectedUnits[probeStart] ||",
        "    splitUnits[1].charCodeAt(0) !== expectedUnits[probeStart + 1] ||",
        "    replacedOnce.length !== expectedUnits.length - 1 || replacedOnce.charAt(probeStart) !== \"Q\" ||",
        "    replacedAll !== replacedOnce || functionallyReplaced !== text ||",
        "    functionalBoundary !== expectedUnits.length + 1) valid = false;",
        "const fullPad = \"X\".padStart(3, alternateNeedle);",
        "const truncatedPad = \"X\".padEnd(2, alternateNeedle);",
        "if (fullPad !== needle + \"X\" || truncatedPad.charCodeAt(1) !== expectedUnits[probeStart] ||",
        "    truncatedPad.isWellFormed() || !alternateNeedle.isWellFormed() ||",
        "    Array.from(alternateNeedle).length !== 1) valid = false;",
        "if (text.toString() !== text || text.valueOf() !== text ||",
        "    boxed.valueOf() !== text || boxed.toString() !== text) valid = false;",
        "const repairedPad = truncatedPad.toWellFormed();",
        "if (!text.isWellFormed() || text.toWellFormed() !== text ||",
        "    alternateNeedle.toWellFormed() !== alternateNeedle ||",
        "    repairedPad.length !== truncatedPad.length ||",
        "    repairedPad.charCodeAt(0) !== 0x58 ||",
        "    repairedPad.charCodeAt(1) !== 0xfffd ||",
        "    !repairedPad.isWellFormed()) valid = false;",
        "const representativeRepetitions = 3;",
        "const repeatedText = text.repeat(representativeRepetitions);",
        "const paddedWidthStart = \"X\".padStart(expectedUnits.length + 1, text);",
        "const paddedWidthEnd = \"X\".padEnd(expectedUnits.length + 1, text);",
        "if (repeatedText.length !== expectedUnits.length * representativeRepetitions ||",
        "    paddedWidthStart.length !== expectedUnits.length + 1 ||",
        "    paddedWidthEnd.length !== expectedUnits.length + 1 ||",
        "    paddedWidthStart.charCodeAt(expectedUnits.length) !== 0x58 ||",
        "    paddedWidthEnd.charCodeAt(0) !== 0x58) valid = false;",
        "for (let unitIndex = 0; unitIndex < expectedUnits.length; unitIndex++) {",
        "    for (let repetition = 0; repetition < representativeRepetitions; repetition++) {",
        "        if (repeatedText.charCodeAt(repetition * expectedUnits.length + unitIndex) !== expectedUnits[unitIndex]) valid = false;",
        "    }",
        "    if (paddedWidthStart.charCodeAt(unitIndex) !== expectedUnits[unitIndex] ||",
        "        paddedWidthEnd.charCodeAt(unitIndex + 1) !== expectedUnits[unitIndex]) valid = false;",
        "}",
        "const trimWhitespace = [0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x20, 0xa0, 0x1680, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200a, 0x2028, 0x2029, 0x202f, 0x205f, 0x3000, 0xfeff];",
        "let trimFirst = 0;",
        "while (trimFirst < expectedUnits.length && trimWhitespace.indexOf(expectedUnits[trimFirst]) !== -1) trimFirst++;",
        "let trimLast = expectedUnits.length - 1;",
        "while (trimLast >= trimFirst && trimWhitespace.indexOf(expectedUnits[trimLast]) !== -1) trimLast--;",
        "const padPrefixUnits = [0x20, 0x09, 0x0a, 0x00a0, 0x3000];",
        "const padSuffixUnits = [0x2003, 0x0d, 0x0a, 0x20];",
        "const paddedText = String.fromCharCode(...padPrefixUnits) + text + String.fromCharCode(...padSuffixUnits);",
        "const trimmedText = paddedText.trim();",
        "const trimmedStart = paddedText.trimStart();",
        "const trimmedEnd = paddedText.trimEnd();",
        "if (trimmedText.length !== Math.max(0, trimLast - trimFirst + 1) ||",
        "    trimmedStart.length !== paddedText.length - 5 - trimFirst ||",
        "    trimmedEnd.length !== paddedText.length - 4 - (expectedUnits.length - 1 - trimLast) ||",
        "    paddedText.trimLeft() !== trimmedStart ||",
        "    paddedText.trimRight() !== trimmedEnd) valid = false;",
        "for (let unitIndex = trimFirst; unitIndex <= trimLast; unitIndex++) {",
        "    if (trimmedText.charCodeAt(unitIndex - trimFirst) !== expectedUnits[unitIndex] ||",
        "        trimmedStart.charCodeAt(unitIndex - trimFirst) !== expectedUnits[unitIndex] ||",
        "        trimmedEnd.charCodeAt(unitIndex + 5) !== expectedUnits[unitIndex]) valid = false;",
        "}",
        "const caseProbe = text + String.fromCharCode(0xdf, 0xfb01, 0x130, 0x3c3, 0x3c2);",
        "const upperProbe = caseProbe.toUpperCase();",
        "const upperTail = [0x53, 0x53, 0x46, 0x49, 0x130, 0x3a3, 0x3a3];",
        "if (upperProbe.length < 7 || upperProbe.toUpperCase() !== upperProbe) valid = false;",
        "for (let tailIndex = 0; tailIndex < 7; tailIndex++) {",
        "    if (upperProbe.charCodeAt(upperProbe.length - 7 + tailIndex) !== upperTail[tailIndex]) valid = false;",
        "}",
        "const lowerProbe = String.fromCharCode(0x53, 0x53, 0x46, 0x49, 0x130, 0x3a3, 0x3a3).toLowerCase();",
        "const lowerTail = [0x73, 0x73, 0x66, 0x69, 0x69, 0x307, 0x3c3, 0x3c2];",
        "if (lowerProbe.length !== 8 || lowerProbe.toLowerCase() !== lowerProbe) valid = false;",
        "for (let tailIndex = 0; tailIndex < 8; tailIndex++) {",
        "    if (lowerProbe.charCodeAt(tailIndex) !== lowerTail[tailIndex]) valid = false;",
        "}",
        "if (text.localeCompare(text) !== 0 ||",
        "    String.fromCharCode(0x61).localeCompare(String.fromCharCode(0x62)) !== -1 ||",
        "    String.fromCharCode(0x62).localeCompare(String.fromCharCode(0x61)) !== 1 ||",
        "    text.localeCompare(text, 'tr', { toString: function() { return 'x'; } }) !== 0) valid = false;",
        "if (lowerProbe.localeCompare(upperProbe) !== -upperProbe.localeCompare(lowerProbe)) valid = false;",
        "if (caseProbe.toLocaleUpperCase() !== upperProbe ||",
        "    caseProbe.toLocaleUpperCase('tr', { toString: function() { return 'x'; } }) !== upperProbe ||",
        "    String.fromCharCode(0x53, 0x53, 0x46, 0x49, 0x130, 0x3a3, 0x3a3).toLocaleLowerCase('tr') !== lowerProbe) valid = false;",
        "const nfdE = String.fromCharCode(0xe9).normalize(\"NFD\");",
        "if (nfdE.length !== 2 || nfdE.charCodeAt(0) !== 0x65 || nfdE.charCodeAt(1) !== 0x301) valid = false;",
        "if (String.fromCharCode(0x65, 0x301).normalize(\"NFC\") !== String.fromCharCode(0xe9)) valid = false;",
        "if (String.fromCharCode(0xfb01).normalize(\"NFKC\") !== \"fi\") valid = false;",
        "if (String.fromCharCode(0x212b).normalize(\"NFC\") !== String.fromCharCode(0xc5)) valid = false;",
        "const nfcProbe = text.normalize(\"NFC\");",
        "const nfdProbe = text.normalize(\"NFD\");",
        "if (nfdProbe.normalize(\"NFC\") !== nfcProbe ||",
        "    nfcProbe.normalize(\"NFC\") !== nfcProbe ||",
        "    nfdProbe.normalize(\"NFD\") !== nfdProbe) valid = false;",
        'console.log("string UTF-16 exotic width:", valid);',
        "",
    ].join("\n");
}

function stringConcatArgumentWidthSource(width: number): string {
    return [
        `const width = ${width};`,
        "const unitPlan = [0x41, 0x20ac, 0xd83d, 0xde00, 0xd800, 0x42, 0xdc00];",
        "const parts: string[] = [];",
        "const expectedUnits: number[] = [];",
        "for (let index = 0; index < width; index++) {",
        "    const unit = unitPlan[index % unitPlan.length];",
        "    parts.push(String.fromCharCode(unit));",
        "    expectedUnits.push(unit);",
        "}",
        "let receiverConversions = 0;",
        "const receiver = {",
        "    toString(): string { receiverConversions++; return \"R\"; },",
        "};",
        "const intrinsic = String.prototype.concat;",
        "const generic = Reflect.apply(intrinsic, receiver, parts);",
        "const direct = \"R\".concat(...parts);",
        "let valid = receiverConversions === 1 && generic === direct &&",
        "    generic.length === expectedUnits.length + 1 && generic.charCodeAt(0) === 0x52;",
        "for (let index = 0; index < expectedUnits.length; index++) {",
        "    if (generic.charCodeAt(index + 1) !== expectedUnits[index]) {",
        "        valid = false;",
        "        break;",
        "    }",
        "}",
        'console.log("string concat argument worklist:", valid);',
        "",
    ].join("\n");
}

function reflectConstructArgumentWidthSource(width: number): string {
    return [
        `const width = ${width};`,
        "const reflectObject = Reflect;",
        "const argumentsList: any = { length: width };",
        "for (let index = 0; index < width; index++) argumentsList[index] = index;",
        "function Target(this: any, ...values: any[]): void {",
        "    this.count = values.length;",
        "    this.first = values[0];",
        "    this.middle = values[Math.floor(values.length / 2)];",
        "    this.last = values[values.length - 1];",
        "}",
        "const result: any = Reflect.construct(Target as any, argumentsList);",
        "const valid =",
        "    result.count === width &&",
        "    result.first === 0 &&",
        "    result.middle === Math.floor(width / 2) &&",
        "    result.last === width - 1 &&",
        "    result instanceof Target &&",
        "    Reflect === reflectObject &&",
        "    Object.getPrototypeOf(Reflect) === Object.prototype;",
        'console.log("reflect construct argument worklist:", valid);',
        "",
    ].join("\n");
}

function arrowFormalBindingTreeDepthSource(depth: number): string {
    let pattern = "leaf";
    let value = "41";
    let lexicalChain = "() => [this, arguments, new.target]";
    for (let level = 0; level < depth; level++) {
        if (level % 2 === 0) {
            pattern = `[${pattern}]`;
            value = `[${value}]`;
        } else {
            pattern = `{ value: ${pattern} }`;
            value = `{ value: ${value} }`;
        }
        lexicalChain = `() => (${lexicalChain})`;
    }
    const directivePrefix = Array.from(
        { length: depth },
        (_, index) => `    "directive-${index}";`,
    );
    return [
        "function makeArrow() {",
        `    return (${pattern}, prior = leaf, ...rest) =>`,
        "        this.base + leaf + prior + rest.length;",
        "}",
        "var directiveProbe = (value = 1) => {",
        ...directivePrefix,
        "    0;",
        '    "use strict";',
        "    return value;",
        "};",
        "function AlternateTarget() {}",
        "function makeLexicalChain(marker) {",
        `    return ${lexicalChain};`,
        "}",
        "var lexicalResult = Reflect.construct(makeLexicalChain, [43], AlternateTarget);",
        `for (var level = 0; level <= ${depth}; level++) {`,
        "    lexicalResult = lexicalResult.call({ wrong: true }, level);",
        "}",
        "var lexicalValid = lexicalResult[0] instanceof AlternateTarget &&",
        "    lexicalResult[1][0] === 43 &&",
        "    lexicalResult[2] === AlternateTarget;",
        "var arrow = makeArrow.call({ base: 1 });",
        `var result = arrow.call({ base: 999 }, ${value}, undefined, 7, 8);`,
        'console.log("arrow formal binding tree:", result === 85 && directiveProbe() === 1 && lexicalValid);',
        "",
    ].join("\n");
}

function switchClauseWorklistWidthSource(width: number): string {
    const cases = Array.from({ length: width - 1 }, (_, index) =>
        `    case select(${index + 1}, ${index + 2}): result = "wrong"; break;`,
    );
    return [
        "let evaluations = 0;",
        "let ordered = true;",
        "let result = \"unselected\";",
        "function select(index: number, value: any): any {",
        "    ordered = ordered && index === evaluations;",
        "    evaluations++;",
        "    return value;",
        "}",
        "",
        "switch (\"1\") {",
        "    case select(0, 1): result = \"coerced\"; break;",
        ...cases,
        `    case select(${width}, "1"): result = "strict"; break;`,
        "    default: result = \"default\";",
        "}",
        `const valid = result === "strict" && ordered && evaluations === ${width + 1};`,
        'console.log("switch clause worklist:", valid);',
        "",
    ].join("\n");
}

function switchCaseBlockEnvironmentDepthSource(depth: number): string {
    const lines = [
        "function verifyCaseBlockEnvironments(): boolean {",
        "    let valid = true;",
        `    let ${Array.from({ length: depth }, (_, index) => `selector_${index}: (() => number) | undefined`).join(", ")};`,
    ];
    for (let index = 0; index < depth; index++) {
        lines.push(
            `${"    ".repeat(index + 1)}switch (0 as any) {`,
            `${"    ".repeat(index + 2)}case (selector_${index} = function() { return binding_${index}; }, 0):`,
            `${"    ".repeat(index + 3)}let binding_${index} = ${index};`,
        );
    }
    for (let index = depth - 1; index >= 0; index--) {
        lines.push(
            `${"    ".repeat(index + 3)}if (!selector_${index} || selector_${index}() !== binding_${index}) valid = false;`,
            `${"    ".repeat(index + 3)}break;`,
            `${"    ".repeat(index + 1)}}`,
        );
    }
    lines.push(
        "    return valid;",
        "}",
        'console.log("switch CaseBlock environment:", verifyCaseBlockEnvironments());',
        "",
    );
    return lines.join("\n");
}

function switchCaseBlockBindingDepthSource(depth: number): string {
    let binding = "deepBinding";
    let value = "197";
    for (let index = 0; index < depth; index++) {
        if (index % 2 === 0) {
            binding = `{ value: ${binding} }`;
            value = `{ value: ${value} }`;
        } else {
            binding = `[${binding}]`;
            value = `[${value}]`;
        }
    }
    return [
        "function verifyCaseBlockBindingTree(): boolean {",
        "    let before: (() => any) | undefined;",
        "    let after: (() => any) | undefined;",
        "    switch (0 as any) {",
        "        case (before = function() { return deepBinding; }, 0):",
        `            const ${binding} = (${value}) as any;`,
        "            after = function() { return deepBinding; };",
        "            break;",
        "    }",
        "    return !!before && !!after && before() === 197 && after() === 197;",
        "}",
        'console.log("switch CaseBlock binding tree:", verifyCaseBlockBindingTree());',
        "",
    ].join("\n");
}

function switchCaseBlockFunctionWorklistWidthSource(width: number): string {
    const declarations = Array.from({ length: width }, (_, index) => {
        const result = index === width - 1
            ? "1"
            : `caseFunction_${index + 1}() + 1`;
        return `            function caseFunction_${index}(): number { return ${result}; }`;
    });
    return [
        "function verifyCaseBlockFunctionWorklist(): boolean {",
        "    let selected: (() => number) | undefined;",
        "    switch (0 as any) {",
        "        case (selected = function() { return caseFunction_0(); }, 0):",
        ...declarations,
        "            break;",
        "    }",
        `    return !!selected && selected() === ${width};`,
        "}",
        'console.log("switch CaseBlock function worklist:", verifyCaseBlockFunctionWorklist());',
        "",
    ].join("\n");
}

function switchCaseBlockGeneratorCaptureWidthSource(width: number): string {
    const yields = Array.from({ length: width }, (_, index) =>
        `                yield caseGeneratorCapture_${index};`,
    );
    const declarations = Array.from({ length: width }, (_, index) =>
        `            let caseGeneratorCapture_${index}: number = ${index};`,
    );
    return [
        "function verifyCaseBlockGeneratorCaptures(): boolean {",
        "    let selected: any;",
        "    switch (0 as any) {",
        "        case (selected = caseGeneratorCaptureWorklist, 0):",
        "            function* caseGeneratorCaptureWorklist(): Generator<number, string, undefined> {",
        ...yields,
        `                yield caseGeneratorCaptureWorklist === selected ? ${width} : -1;`,
        '                return "done";',
        "            }",
        ...declarations,
        "            break;",
        "    }",
        "    if (!selected) return false;",
        "    const iterator = selected();",
        `    for (let index = 0; index <= ${width}; index++) {`,
        "        const step: any = iterator.next();",
        "        if (step.done || step.value !== index) return false;",
        "    }",
        "    const done: any = iterator.next();",
        '    return done.done === true && done.value === "done";',
        "}",
        'console.log("switch CaseBlock generator captures:", verifyCaseBlockGeneratorCaptures());',
        "",
    ].join("\n");
}

function switchCaseBlockAsyncCaptureWidthSource(width: number): string {
    const declarations = Array.from({ length: width }, (_, index) =>
        `            let caseAsyncCapture_${index}: number = ${index};`,
    );
    const captures = Array.from({ length: width }, (_, index) =>
        `caseAsyncCapture_${index}`,
    );
    return [
        "let selectedCaseAsyncCaptureWorklist: any;",
        "switch (0 as any) {",
        "    case (selectedCaseAsyncCaptureWorklist = caseAsyncCaptureWorklist, 0):",
        "        async function caseAsyncCaptureWorklist(): Promise<any> {",
        "            await Promise.resolve();",
        `            return [${captures.join(", ")}];`,
        "        }",
        ...declarations,
        "        break;",
        "}",
        "selectedCaseAsyncCaptureWorklist().then(",
        "    function(values: any[]): void {",
        `        let valid = values.length === ${width};`,
        "        for (let index = 0; index < values.length; index++) {",
        "            if (values[index] !== index) valid = false;",
        "        }",
        '        console.log("switch CaseBlock async captures:", valid);',
        "    },",
        '    function(error: any): void { console.log("switch CaseBlock async captures error:", String(error)); },',
        ");",
        "",
    ].join("\n");
}

function switchCaseBlockClassWorklistWidthSource(width: number): string {
    const declarations = Array.from({ length: width }, (_, index) => [
        `            class CaseBlockClass_${index} {}`,
        `            constructors.push(CaseBlockClass_${index});`,
    ]).flat();
    return [
        "function verifyCaseBlockClassWorklist(): boolean {",
        "    const constructors: any[] = [];",
        "    switch (0 as any) {",
        "        case 0:",
        ...declarations,
        "            break;",
        "    }",
        `    for (let index = 0; index < ${width}; index++) {`,
        "        const constructor = constructors[index];",
        "        if (constructor.name !== \"CaseBlockClass_\" + index || constructor.length !== 0) return false;",
        "        const instance: any = new constructor();",
        "        if (!(instance instanceof constructor) || instance.constructor !== constructor) return false;",
        "        if (index > 0 && constructor === constructors[index - 1]) return false;",
        "    }",
        "    return true;",
        "}",
        'console.log("switch CaseBlock class worklist:", verifyCaseBlockClassWorklist());',
        "",
    ].join("\n");
}

function dateStaticArgumentDepthSource(depth: number): string {
    return `
const D: any = Date;
const raw: any = {};
let visits = 0, conversions = 0, expectedHint = "";
const first: any = { [Symbol.toPrimitive](hint: string): any {
    if (hint !== expectedHint || visits !== ${depth} + 7) throw raw;
    conversions++;
    return hint === "number" ? 2000 : "2000-02-29T12:34:56.789Z";
} };
const prefix: any[] = [first,1,29,12,34,56,789];
let tree: any = null;
for (let level = 0; level < ${depth}; level++) tree = {
    previous: tree, owner: D,
    value: { [Symbol.toPrimitive](): any { throw raw; } },
};
const owner: any = { tree, constructor: D };tree = null;
const iterable: any = { [Symbol.iterator](): any {
    let index = 0, cursor = owner.tree;
    return { next(): any {
        if (index < prefix.length) { visits++;return { value: prefix[index++], done: false }; }
        if (cursor !== null) {
            if (cursor.owner !== owner.constructor) throw raw;
            const value = cursor.value;cursor = cursor.previous;visits++;
            return { value, done: false };
        }
        return { done: true };
    } };
} };
const methods: any[] = [{name:"UTC",hint:"number"},{name:"parse",hint:"string"},{name:"now",hint:""}];
for (const method of methods) {
    visits = 0;conversions = 0;expectedHint = method.hint;
    const result = D[method.name](...iterable);
    const correct = method.name === "now" ? Number.isInteger(result) && result > 0 : result === 951827696789;
    console.log(method.name, correct, visits === ${depth} + 7, conversions === (method.hint === "" ? 0 : 1));
}
`;
}

function numberPrototypeArgumentWidthSource(width: number): string {
    return `
const width = ${width};
const methods: any[] = [
    { receiver: 1.125, hint: "number", name: "toString", expected: "1.001", converts: true },
    { receiver: 1.125, hint: "number", name: "toFixed", expected: "1.13", converts: true },
    { receiver: 1.125, hint: "number", name: "toExponential", expected: "1.13e+0", converts: true },
    { receiver: 1.125, hint: "number", name: "toPrecision", expected: "1.1", converts: true },
    { receiver: 1.125, hint: "number", name: "valueOf", expected: "1.125", converts: false },
    { receiver: 1.125, hint: "number", name: "toLocaleString", expected: "1.125", converts: false },
    { receiver: Number, name: "isFinite", expected: "false", converts: false },
    { receiver: Number, name: "isInteger", expected: "false", converts: false },
    { receiver: Number, name: "isNaN", expected: "false", converts: false },
    { receiver: Number, name: "isSafeInteger", expected: "false", converts: false },
    { receiver: Number, hint: "string", name: "parseFloat", expected: "2", converts: true },
    { receiver: Number, hint: "string", name: "parseInt", expected: "2", converts: true },
];
let visits = 0, conversions = 0;
let expectedHint = "";
const marker: any = { tag: "unexpected conversion or order" };
const first: any = { [Symbol.toPrimitive]: function(hint: string): number {
    if (hint !== expectedHint || visits !== width) throw marker;
    conversions++;
    return 2;
} };
const iterable: any = { [Symbol.iterator]: function(): any {
    let cursor = 0;
    return { next: function(): any {
        if (cursor === width) return { done: true };
        const index = cursor++;
        visits++;
        return { value: index === 0 ? first : index === 1 ? undefined : {
            ordinal: index,
            [Symbol.toPrimitive]: function(): any { throw marker; },
        }, done: false };
    } };
} };
for (const method of methods) {
    visits = 0; conversions = 0; expectedHint = method.hint;
    const result: any = method.receiver[method.name](...iterable);
    console.log(method.name, String(result) === method.expected, visits === width,
        conversions === (method.converts ? 1 : 0));
}
`;
}

function arrayStaticFactoryItemWidthSource(width: number): string {
    return [
        "const source: any[] = [];",
        `for (let index = 0; index < ${width}; index++) source.push(index);`,
        "const dynamicSource: any = source;",
        "const copied: any = (Array.from as any).call(Array, dynamicSource, function(value: any, index: number): number {",
        "    return value + index;",
        "});",
        "const collected: any = (Array.of as any).call(Array, ...dynamicSource);",
        `let valid = copied.length === ${width} && collected.length === ${width};`,
        `for (let index = 0; index < ${width}; index++) {`,
        "    if (copied[index] !== index * 2 || collected[index] !== index) valid = false;",
        "}",
        'console.log("array static factory item worklist:", valid);',
        "",
    ].join("\n");
}

function moduleStaticSemanticsWidthSource(width: number): string {
    const declarations: string[] = [];
    const observations: string[] = [];
    for (let index = 0; index < width; index++) {
        declarations.push(`export const lexical_${index}: number = ${index};`);
        observations.push(`lexical_${index}`);
    }
    return [
        ...declarations,
        `const observations: number[] = [${observations.join(", ")}];`,
        `let valid = observations.length === ${width};`,
        `for (let index = 0; index < ${width}; index++) {`,
        "    if (observations[index] !== index) valid = false;",
        "}",
        'console.log("module static semantics width:", valid);',
        "",
    ].join("\n");
}

function moduleStaticSemanticsDepthSource(depth: number): string {
    let nested = "observed = nestedVar;";
    for (let index = 0; index < depth; index++) nested = `{ ${nested} }`;
    return [
        "export const lexical: number = 1;",
        "var nestedVar: number = 41;",
        "let observed: number = 0;",
        nested,
        "class OuterPrivateEnvironment {",
        "    #value = 42;",
        "    make(this: any): any {",
        "        const receiver: any = this;",
        "        return class InnerPrivateEnvironment {",
        "            read(this: any): any { return receiver.#value; }",
        "        };",
        "    }",
        "}",
        "const Inner: any = new OuterPrivateEnvironment().make();",
        'console.log("module static semantics depth:", observed === 41 && new Inner().read() === 42);',
        "",
    ].join("\n");
}

function classExpressionMethodWidthSource(width: number): string {
    const methods = Array.from(
        { length: width },
        (_, index) => `        method_${index}(this: any): any { return captured + ${index}; }`,
    );
    const observations = Array.from(
        { length: width },
        (_, index) => `if (instance.method_${index}() !== ${1000 + index}) valid = false;`,
    );
    return [
        "function makeMethodWorklistClass(captured: any): any {",
        "    return class MethodWorklistClass {",
        ...methods,
        "    };",
        "}",
        "const Constructor: any = makeMethodWorklistClass(1000);",
        "const instance: any = new Constructor();",
        "let valid = true;",
        ...observations,
        'console.log("class expression method worklist:", valid);',
        "",
    ].join("\n");
}

export function generateE2eCaseSource(raw: string, filename: string): string {
    const spec = parseGeneratedCaseSpec(raw, filename);
    switch (spec.generator) {
        case "boxed-json-source-depth": {
            let text="17";for(let depth=0;depth<spec.depth;depth++)text=depth%2?"["+text+"]":"{\"child\":"+text+"}";
            return `const text=${JSON.stringify(text)};
const value: any=JSON.parse(text,function(key: string,value: any): any{return typeof value==="number"?Object(value):value});
const body=JSON.stringify(value),restored: any=eval("JSON.parse("+JSON.stringify(body)+")");
console.log("boxed JSON source depth:",JSON.stringify(restored)===text);
`;
        }
        case "json-reviver-source-record-depth": {
            let text='"43;"';for(let depth=0;depth<spec.depth;depth++)text=depth%2?'['+text+']':'{"child":'+text+'}';
            const selected="value"+Array.from({length:spec.depth},(_,i)=>(spec.depth-1-i)%2?"[0]":".child").join("");
            return `const value: any = JSON.parse(${JSON.stringify(text)},function(key: string,value: any,context: any): any {return value});
console.log("JSON reviver source record depth:",eval(${selected})===43);
`;
        }
        case "json-composite-source-depth": {
            let text="17";for(let depth=0;depth<spec.depth;depth++)text=depth%2?"["+text+"]":"{\"child\":"+text+"}";
            return `const value: any = JSON.parse(${JSON.stringify(text)});
const body = JSON.stringify(value);
const restored: any = eval("JSON.parse("+JSON.stringify(body)+")");
console.log("JSON composite source depth:",JSON.stringify(restored)===body);
`;
        }
        case "descriptor-source-owner-depth": {
            const nodes=Array.from({length:spec.depth},(_,index)=>`const value${index}: any = {};Object.defineProperty(value${index},"item",{get enumerable(){return true},get configurable(){return true},get value(){return ${index?"value"+(index-1):"{body:'193;'}"}},get writable(){return true}});`);
            return nodes.join("\n")+`\nconsole.log("descriptor source owner depth:",eval(value${spec.depth-1}${".item".repeat(spec.depth)}.body)===193);\n`;
        }
        case "json-parse-source-owner-depth": {
            let text='"241;"';
            for(let depth=0;depth<spec.depth;depth++)text=depth%2?'['+text+']':'{"child":'+text+'}';
            const selected="value"+Array.from({length:spec.depth},(_,index)=>(spec.depth-1-index)%2?"[0]":".child").join("");
            return `const value: any = JSON.parse(${JSON.stringify(text)});
console.log("JSON parsed source owner depth:", eval(${selected}) === 241);
`;
        }
        case "json-namespace-owner-depth":
            return `const owner = JSON, parse = owner.parse;
let chain: any = { previous: null, owner, parse };
for (let depth = 0; depth < ${spec.depth}; depth++) chain = { previous: chain, owner, parse };
let count = 0, valid = true;
const args: any[] = ["17"];
for (let node: any = chain; node; node = node.previous) {
    valid = valid && node.owner === owner && node.parse === parse && node.owner[Symbol.toStringTag] === "JSON";
    args.push(count++);
}
console.log("JSON namespace owner depth:", valid && count === ${spec.depth}+1 && Reflect.apply(parse, owner, args) === 17);
`;
        case "json-reviver-depth":
            return `const text = "[".repeat(${spec.depth}) + "17" + "]".repeat(${spec.depth});
let calls = 0, sources = 0, valid = true;
const parsed = JSON.parse(text, function(key: string, value: any, context: any): any {
    calls++;
    if (Object.hasOwn(context, "source")) {
        sources++;
        valid = valid && value === 17 && context.source === "17";
    }
    return value;
});
let cursor: any = parsed, observed = 0;
while (Array.isArray(cursor)) { cursor = cursor[0]; observed++; }
console.log("JSON reviver depth:", valid && observed === ${spec.depth} && cursor === 17 && calls === ${spec.depth}+1 && sources === 1);
`;
        case "json-raw-text-width":
            return `const body = "💛".repeat(${spec.width});
const text = '"' + body + '"';
const args: any[] = [text];
let evaluated = 0;
for (let index = 0; index < ${spec.width}; index++) args.push(++evaluated);
const raw = Reflect.apply(JSON.rawJSON, null, args);
const brandArgs: any[] = [raw, ...args];
const valid = evaluated === ${spec.width} && raw.rawJSON === text &&
    JSON.stringify(raw) === text && Reflect.apply(JSON.isRawJSON, null, brandArgs) &&
    Object.isFrozen(raw) && Object.getPrototypeOf(raw) === null;
console.log("raw JSON text width:", valid);
`;
        case "string-substitution-token-worklist":
            return [
                "const depth: number = DEPTH;",
                "let gets: number = 0, conversions: number = 0;",
                "const group={get part(){gets++;return{toString(){conversions++;return'G'}}}};",
                "const receiver: any = {flags:'',exec(){return{0:'b',1:undefined,2:'C',length:3,index:1,groups:group}}};",
                "const piece='$$:$&:$1:$2:$01:$20:$<part>:$`:$\\':';",
                "const expected='$:b::C::C0:G:a:c:';",
                "const output=RegExp.prototype[Symbol.replace].call(receiver,'abc',piece.repeat(depth));",
                "let graph: any = null;",
                "for(let index=0;index<depth;index++)graph={index,output,previous:graph};",
                "let valid=output==='a'+expected.repeat(depth)+'c'&&gets===depth&&conversions===depth;",
                "for(let index=depth-1;index>=0;index--){valid=valid&&graph.index===index&&graph.output===output;graph=graph.previous;}",
                "console.log('substitution worklist:',valid&&graph===null);"
            ].join("\n").replace("DEPTH",String(spec.depth))+"\n";
        case "regexp-replace-capture-worklist":
            return `const replace: any = RegExp.prototype[Symbol.replace];
const captures: any = { 0: "x", index: 0, length: ${spec.depth} + 1 };
const groups: any = { part: "named" }; captures.groups = groups;
let graph: any = null, converted: number = 0, valid: boolean = true;
for (let index = 1; index <= ${spec.depth}; index++) {
    const capture: any = { index, toString(): string {
        converted++; valid = valid && converted === index; return "c" + index;
    } };
    captures[index] = capture; graph = { capture, previous: graph };
}
const owner: any = { flags: "", exec(): any { return captures; } };
const output: string = replace.call(owner, "x", function(this: any): string {
    "use strict";
    valid = valid && this === undefined && arguments.length === ${spec.depth} + 4 &&
        arguments[0] === "x" && arguments[${spec.depth} + 1] === 0 &&
        arguments[${spec.depth} + 2] === "x" && arguments[${spec.depth} + 3] === groups;
    for (let index = 1; index <= ${spec.depth}; index++) valid = valid && arguments[index] === "c" + index;
    return "callback";
});
valid = valid && output === "callback" && converted === ${spec.depth};
for (let index = ${spec.depth}; index >= 1; index--) {
    valid = valid && graph.capture === captures[index] && graph.capture.index === index;
    graph = graph.previous;
}
converted = 0;
const substituted: string = replace.call(owner, "x", "$$:$&:$1:$99:$<part>");
valid = valid && substituted === "$:x:c1:c99:named" && converted === ${spec.depth};
console.log("replace worklist:", valid && graph === null);
`;
        case "regexp-split-capture-worklist":
            return `const split: any = RegExp.prototype[Symbol.split];
let graph: any = null;
for (let index = 0; index < ${spec.depth}; index++) {
    const capture: any = { index };
    function Species(): any {
        return { lastIndex: 0, exec(): any {
            if (this.lastIndex !== 0) return null;
            this.lastIndex = 1; return { 0: "x", 1: capture, length: 2 };
        } };
    }
    const value: any = split.call({ constructor: { [Symbol.species]: Species }, flags: "" }, "x", 2);
    graph = { capture, value, previous: graph };
}
let valid = true;
for (let index = ${spec.depth} - 1; index >= 0; index--) {
    valid = valid && graph.capture.index === index && graph.value.length === 2 &&
        graph.value[0] === "" && graph.value[1] === graph.capture;
    graph = graph.previous;
}
const captures: any = { 0: "x", length: ${spec.depth} + 1 };
for (let index = 1; index <= ${spec.depth}; index++) captures[index] = { index };
function WideSpecies(): any { return { lastIndex: 0, exec(): any { this.lastIndex = 1; return captures; } }; }
const values: any = split.call({ constructor: { [Symbol.species]: WideSpecies }, flags: "" }, "x");
valid = valid && values.length === ${spec.depth} + 2 && values[0] === "" && values[values.length - 1] === "";
for (let index = 1; index <= ${spec.depth}; index++) valid = valid && values[index] === captures[index];
console.log("split worklist:", valid && graph === null);
`;
        case "regexp-pattern-depth":
            return `const openings: string[] = [];
                let captures = 0;
                for (let index = 0; index < ${spec.depth}; index++) {
                    const kind = index % 3;
                    openings.push(kind === 0 ? "(?i:" : kind === 1 ? "(?-i:" : "(");
                    if (kind === 2) captures++;
                }
                const pattern = openings.join("") + "(?i:(?:(?<part>a)|(?<part>ab)))c" + ")".repeat(${spec.depth}) + "|(?<part>d)";
                const re = new RegExp(pattern, "d");
                const hit = re.exec("ABc");
                console.log("regexp-depth:", hit === null ? "missing" : hit[0],
                    hit !== null && hit.length === captures + 4, hit === null ? "missing" : hit[hit.length - 2]);
                console.log("regexp-indices:", hit !== null && hit.indices!.length === hit.length);
                console.log("regexp-named:", hit === null ? "missing" : hit.groups!.part,
                    hit !== null && hit.indices!.groups!.part === hit.indices![hit.length - 2]);
                console.log("regexp-protocols:", "ABc".match(re)![0], "ABc".search(re));
                console.log("regexp-outer:", re.test("D"));
                const escaped = RegExp.escape(pattern);
                console.log("regexp-serialization:", new RegExp(re.source, "d").test("ABc"),
                    new RegExp("^(?:" + escaped + ")$", "u").test(pattern));
                console.log("regexp-replacement:", "ABc".replace(re, "$<part>:$&"),
                    "ABc".replace(re, (match: string, ...args: any[]) => match + ":" + args[args.length - 1].part));
                const iterator = "ABc".matchAll(new RegExp(pattern, "dg"));
                const iterated: any = iterator.next().value;
                console.log("regexp-iterator:", iterated[0], iterated.length === captures + 4,
                    iterated.indices.groups.part === iterated.indices[iterated.length - 2], iterator.next().done);`;
        case "async-leading-await-chain":
            return asyncLeadingAwaitChainSource(spec.awaitCount);
        case "async-binding-default-depth":
            return asyncBindingDefaultDepthSource(spec.depth);
        case "async-logical-expression-depth":
            return asyncLogicalExpressionDepthSource(spec.depth);
        case "dispatch-capture-worklist-width":
            return dispatchCaptureWorklistWidthSource(spec.width);
        case "dns-lookup-option-alias-depth":
            return dnsLookupOptionAliasDepthSource(spec.depth);
        case "grouping-reference-depth":
            return groupingReferenceDepthSource(spec.depth);
        case "conditional-value-expression-depth":
            return conditionalValueExpressionDepthSource(spec.depth);
        case "comma-value-expression-depth":
            return commaValueExpressionDepthSource(spec.depth);
        case "strict-equality-expression-depth":
            return strictEqualityExpressionDepthSource(spec.depth);
        case "module-namespace-export-width":
            return moduleNamespaceExportWidthSource(spec.width);
        case "module-request-width": {
            const names = Array.from({length:spec.width}, (_, index) => `namespace${index}`);
            const imports = names.map((name, index) =>
                `import * as ${name} from ${JSON.stringify("./".repeat(index+1)+"module_request_width")} ` +
                (index%2 ? 'with {type:"javascript"};' : ';'));
            return imports.join("\n") + `\nexport const value = 17;\nconst namespaces: any[] = [${names.join(",")}];\n` +
                `for (const namespace of namespaces) if(namespace !== namespaces[0] || namespace.value !== 17) throw new Error("Module request identity");\n` +
                `console.log("requests:", true, namespaces[0].value);\n`;
        }
        case "fs-read-actual-list-width":
            return `import {openSync as stressOpen,writeFileSync as stressWrite,readSync as stressRead,closeSync as stressClose,rmSync as stressRemove} from 'node:fs';\n` +
                `const stressPath='/tmp/tsc2c-fs-actual-list-'+process.pid;stressWrite(stressPath,'ABCD');const stressFD=stressOpen(stressPath,'r+');\n` +
                `const stressView=Buffer.alloc(4);let stressSeen=0;const stressOptions={get offset(){stressSeen++;return 0},get length(){stressSeen++;return 4},get position(){stressSeen++;return 0}};\n` +
                `const stressBytes=stressRead(stressFD,stressView,stressOptions,...Array.from({length:${spec.width}},()=>++stressSeen));\n` +
                `console.log('bytes:',stressBytes,'seen:',stressSeen,'text:',stressView.toString());stressClose(stressFD);stressRemove(stressPath);\n`;
        case "collection-source-alias-depth": return collectionSourceAliasInput(spec.depth);
        case "primitive-property-prototype-depth": return primitivePropertyPrototypeInput(spec.depth);
        case "generator-method-owner-depth": return generatorMethodOwnerInput(spec.depth);
        case "primitive-property-read-depth": return primitivePropertyReadInput(spec.depth);
        case "rest-source-location-depth": return restSourceLocationInput(spec.depth);
        case "source-allocation-depth": return sourceAllocationInput(spec.depth);
        case "list-extent-capture-depth": return listExtentCaptureInput(spec.depth);
        case "module-rejection-origin-depth": return "import('./rejection-origin-0.mjs').then(()=>console.log('Module rejection:',false),error=>console.log('Module rejection:',error instanceof RangeError));\n";
        case "promise-static-source-depth": return promiseStaticSourceInput(spec.depth);
        case "async-return-adoption-depth": return asyncReturnAdoptionInput(spec.depth);
        case "await-resolution-depth": return awaitResolutionInput(spec.depth);
        case "promise-return-projection-depth": return promiseReturnProjectionInput(spec.depth);
        case "escaped-callback-graph-depth": return escapedCallbackGraphInput(spec.depth);
        case "generator-source-owner-depth": return generatorSourceOwnerInput(spec.depth);
        case "native-promise-array-depth": return nativePromiseArrayInput(spec.depth);
        case "callback-timer-source-depth": return callbackTimerSourceInput(spec.depth);
        case "has-instance-depth": return hasInstanceInput(spec.depth);
        case "relational-source-depth": return relationalSourceInput(spec.depth);
        case "strict-type-source-depth": return strictTypeSourceInput(spec.depth);
        case "promise-capability-source-depth": return promiseCapabilitySourceInput(spec.depth);
        case "json-numeric-source-depth": return jsonNumericSourceInput(spec.depth);
        case "atomics-source-owner-depth": return atomicsSourceOwnerInput(spec.depth);
        case "typed-array-metadata-depth": return typedArrayMetadataInput(spec.depth);
        case "math-source-owner-depth": return mathSourceOwnerInput(spec.depth);
        case "activation-capture-owner-depth": return activationCaptureOwnerInput(spec.depth);
        case "function-source-owner-depth": return functionSourceOwnerInput(spec.depth);
        case "eval-declaration-depth": return evalDeclarationInput(spec.depth);
        case "eval-realm-alias-depth": return evalRealmAliasInput(spec.depth);
        case "promise-reaction-depth": return promiseReactionInput(spec.depth);
        case "constructor-completion-depth": return constructorCompletionInput(spec.depth);
        case "job-queue-depth": return jobQueueInput(spec.depth);
        case "source-projection-provenance-depth": return sourceProjectionProvenanceInput(spec.depth);
        case "lexical-source-capture-depth": return lexicalSourceCaptureInput(spec.depth);
        case "eval-caller-environment-depth": return evalCallerEnvironmentInput(spec.depth);
        case "pending-computed-key-depth": return pendingComputedKeyInput(spec.depth);
        case "switch-normal-completion-depth": return switchNormalCompletionInput(spec.depth);
        case "module-async-cycle-depth": return moduleAsyncCycleInput(spec.depth).source;
        case "path-component-depth": return pathComponentInput(spec.depth);
        case "array-iterator-source-depth": return arrayIteratorSourceInput(spec.depth);
        case "set-composition-source-depth": return setCompositionSourceInput(spec.depth);
        case "object-literal-effect-depth": return objectLiteralEffectInput(spec.depth);
        case "module-iterator-import-depth": return moduleIteratorImportInput(spec.depth).source;
        case "module-failure-depth":
            return moduleFailureDepthInput(spec.depth,spec.phase).source;
        case "os-user-info-option-depth":
            return `import {userInfo as optionDepthUserInfo} from 'node:os';let optionDepthReads=0;let optionDepthOwner:any={get encoding(){optionDepthReads++;return 'buffer'}};\n` +
                `for(let index=0;index<${spec.depth};index++)optionDepthOwner=Object.create(optionDepthOwner);\n` +
                `const optionDepthResult=optionDepthUserInfo(optionDepthOwner);console.log('option-depth:',optionDepthReads===1,Buffer.isBuffer(optionDepthResult.username));\n`;
        case "event-target-actuals-depth":
            return `// @ts-nocheck\nconst eventTargetActualsOwner=new EventTarget();let eventTargetActualsCount=0;const eventTargetActualsListeners=[];\n` +
                `for(let index=0;index<${spec.depth};index++){const value={index};const callback=()=>{if(value.index===index)eventTargetActualsCount++};eventTargetActualsListeners.push(callback);eventTargetActualsOwner.addEventListener('retained',callback,{capture:Boolean(index%2),once:true})}\n` +
                `eventTargetActualsOwner.dispatchEvent(new Event('retained'));eventTargetActualsOwner.dispatchEvent(new Event('retained'));console.log('event-target-actuals-depth:',eventTargetActualsCount===${spec.depth});\n`;
        case "parse-goal-source-depth":
            return `// @ts-nocheck\nfunction parseGoalSource0(){return eval('(function(){return this===undefined})()');}\n` +
                Array.from({length:spec.depth},(_,index)=>`function parseGoalSource${index+1}(){return parseGoalSource${index}();}`).join('\n') +
                `\nconsole.log('parse-goal-source-depth:',parseGoalSource${spec.depth}());\n`;
        case "json-scalar-source-depth":
            return `// @ts-nocheck\nlet jsonScalarSourceValue=0;for(let index=0;index<7;index++)jsonScalarSourceValue++;\n` +
                `const jsonScalarSourceState={source:'17;'},jsonScalarSourceOwner0={value:jsonScalarSourceValue};\n` +
                Array.from({length:spec.depth},(_,index)=>`const jsonScalarSourceOwner${index+1}={value:jsonScalarSourceOwner${index}.value};`).join('\n') +
                `\nconst jsonScalarSourceText=JSON.stringify(jsonScalarSourceOwner${spec.depth}.value);console.log('json-scalar-source-depth:',jsonScalarSourceText,eval(jsonScalarSourceState.source));\n`;
        case "error-brand-depth":
            return `// @ts-nocheck\nlet errorBrandGraph=null;\n` +
                `for(let index=0;index<${spec.depth};index++){const value=new TypeError('retained');Object.setPrototypeOf(value,null);errorBrandGraph={value,next:errorBrandGraph}}\n` +
                `while(errorBrandGraph!==null){if(!Error.isError(errorBrandGraph.value)||Error.isError(Object.create(errorBrandGraph.value)))throw new Error('error data owner');errorBrandGraph=errorBrandGraph.next}\n` +
                `console.log('error-brand-depth:',true);\n`;
        case "map-insertion-depth":
            return `// @ts-nocheck\nconst mapInsertionOwners=new Map();let mapInsertionGraph=null;\n` +
                `for(let index=0;index<${spec.depth};index++){const key={index};const value=mapInsertionOwners.getOrInsertComputed(key,()=>({key}));mapInsertionGraph={key,value,next:mapInsertionGraph}}\n` +
                `while(mapInsertionGraph!==null){const owner=mapInsertionGraph;if(mapInsertionOwners.getOrInsert(owner.key,null)!==owner.value||owner.value.key!==owner.key)throw new Error('map insertion owner');mapInsertionGraph=owner.next}\n` +
                `console.log('map-insertion-depth:',true);\n`;
        case "descriptor-projection-depth":
            return `// @ts-nocheck\nlet descriptorProjectionGraph=Object.create(null);const descriptorProjectionGetter=()=>17;Object.defineProperty(descriptorProjectionGraph,'field',{get:descriptorProjectionGetter});\n` +
                `for(let index=0;index<${spec.depth};index++)descriptorProjectionGraph=Object.create(descriptorProjectionGraph);\n` +
                `console.log('descriptor-lookup-depth:',Object.prototype.__lookupGetter__.call(descriptorProjectionGraph,'field')===descriptorProjectionGetter);\n` +
                `let descriptorProjectionRecords=null;\n` +
                `for(let index=0;index<${spec.depth};index++){const step=[{marker:index}].values().next();const descriptor=Object.getOwnPropertyDescriptor(step,'value');descriptorProjectionRecords={step,descriptor,next:descriptorProjectionRecords}}\n` +
                `while(descriptorProjectionRecords!==null){const owner=descriptorProjectionRecords;if(owner.step.value!==owner.descriptor.value||owner.step.done||typeof owner.step.value.marker!=='number')throw new Error('retained record owner');descriptorProjectionRecords=owner.next}\n` +
                `console.log('descriptor-record-depth:',true);\n`;
        case "prototype-validation-depth":
            return `// @ts-nocheck\nlet prototypeValidationGraph=null;\n` +
                `for(let index=0;index<${spec.depth};index++){try{Reflect.setPrototypeOf({},index)}catch(error){prototypeValidationGraph={error,next:prototypeValidationGraph}}}\n` +
                `while(prototypeValidationGraph!==null){if(!(prototypeValidationGraph.error instanceof TypeError))throw new Error('prototype error owner');prototypeValidationGraph=prototypeValidationGraph.next}\n` +
                `console.log('prototype-error-depth: '+true);\n`;
        case "util-format-source-depth":
            return `import {format as stressFormat} from 'util';\n` +
                `let stressRead:any=(value:any)=>stressFormat('%s','23;');\n` +
                `for(let index=0;index<${spec.depth};index++){const previous=stressRead;stressRead=(value:any)=>previous(value)}\n` +
                `console.log('source:',eval(stressRead(17)));\n`;
        case "return-projection-depth":
            return `export {};\nconst marker:any={source:'23;'};let read:any=(ignored:any)=>marker.source;\n` +
                `for(let index=0;index<${spec.depth};index++){const previous=read;read=(ignored:any)=>previous(ignored)}\n` +
                `console.log('source:',eval(read(17)));\n`;
        case "dynamic-import-source-depth": {
            const chain=Array.from({length:spec.depth},(_,index)=>
                `const owner${index}=Object.create(${index?'owner'+(index-1):"{get with(){body='23;';return {}}}"});`);
            return `export const value=17;\nlet body='17;';\n${chain.join("\n")}\n` +
                `const pending=import('./eval_dynamic_import_source_depth',owner${spec.depth-1});\n` +
                `console.log('source:',eval(body));pending.catch(()=>{});\n`;
        }
        case "import-meta-reference-width":
            return importMetaReferenceWidthSource(spec.width);
        case "module-static-semantics-width":
            return moduleStaticSemanticsWidthSource(spec.width);
        case "module-static-semantics-depth":
            return moduleStaticSemanticsDepthSource(spec.depth);
        case "class-expression-method-width":
            return classExpressionMethodWidthSource(spec.width);
        case "global-number-parse-length":
            return globalNumberParseLengthSource(spec.length);
        case "uri-percent-codec-length":
            return uriPercentCodecLengthSource(spec.length);
        case "string-code-unit-list-width":
            return stringCodeUnitListWidthSource(spec.width);
        case "string-code-point-list-width":
            return stringCodePointListWidthSource(spec.width);
        case "string-utf16-exotic-width":
            return stringUtf16ExoticWidthSource(spec.width);
        case "string-concat-argument-width":
            return stringConcatArgumentWidthSource(spec.width);
        case "string-raw-template-width":
            return stringRawTemplateWidthSource(spec.width);
        case "reflect-construct-argument-width":
            return reflectConstructArgumentWidthSource(spec.width);
        case "arrow-formal-binding-tree-depth":
            return arrowFormalBindingTreeDepthSource(spec.depth);
        case "array-static-factory-item-width":
            return arrayStaticFactoryItemWidthSource(spec.width);
        case "date-static-argument-depth":
            return dateStaticArgumentDepthSource(spec.depth);
        case "number-prototype-argument-width":
            return numberPrototypeArgumentWidthSource(spec.width);
        case "switch-clause-worklist-width":
            return switchClauseWorklistWidthSource(spec.width);
        case "switch-caseblock-environment-depth":
            return switchCaseBlockEnvironmentDepthSource(spec.depth);
        case "switch-caseblock-binding-depth":
            return switchCaseBlockBindingDepthSource(spec.depth);
        case "switch-caseblock-function-worklist-width":
            return switchCaseBlockFunctionWorklistWidthSource(spec.width);
        case "switch-caseblock-generator-capture-width":
            return switchCaseBlockGeneratorCaptureWidthSource(spec.width);
        case "switch-caseblock-async-capture-width":
            return switchCaseBlockAsyncCaptureWidthSource(spec.width);
        case "switch-caseblock-class-worklist-width":
            return switchCaseBlockClassWorklistWidthSource(spec.width);
    }
}

/** One retained static request graph is shared by property and CLI stress. */
export function moduleFailureDepthInput(depth:number,phase:'load'|'link'='load'):{source:string;files:Readonly<Record<string,string>>}{
    const files:Record<string,string>=phase==='load'?{'failure-leaf.mjs':'var value;function value(){}\n'}:{'failure-leaf.mjs':"export {missing} from './failure-valid.mjs';\n",'failure-valid.mjs':'export const value=17;globalThis.failureDepthEffect=true;\n'};
    for(let index=0;index<depth;index++)files[`failure-chain-${index}.mjs`]=`import './${index+1<depth?`failure-chain-${index+1}`:'failure-leaf'}.mjs';globalThis.failureDepthEffect=true;\n`;
    return {files,source:`const failureDepthState:any=globalThis;failureDepthState.failureDepthEffect=false;async function failureDepthMain(){try{await import('./failure-chain-0.mjs');console.log('${phase}-depth:',false)}catch(error){console.log('${phase}-depth:',error instanceof SyntaxError&&!failureDepthState.failureDepthEffect)}}failureDepthMain();\n`};
}
export function generateE2eCaseFiles(raw:string,filename:string):Readonly<Record<string,string>>{
    const spec=parseGeneratedCaseSpec(raw,filename);
    if(spec.generator==='module-rejection-origin-depth')return moduleRejectionOriginInput(spec.depth).files;
    if(spec.generator==='lexical-source-capture-depth')return lexicalSourceCaptureFiles;
    if(spec.generator==='module-async-cycle-depth')return moduleAsyncCycleInput(spec.depth).files;
    if(spec.generator==='module-iterator-import-depth')return moduleIteratorImportInput(spec.depth).files;
    return spec.generator==='module-failure-depth'?moduleFailureDepthInput(spec.depth,spec.phase).files:{};
}

export function moduleIteratorImportInput(depth:number):{source:string;files:Readonly<Record<string,string>>}{
    const aliases=['const requests0=["./a.mjs"];'];
    for(let index=1;index<depth;index++)aliases.push(`const requests${index}=requests${index-1};`);
    return {files:{"a.mjs":"export const value=17;\n","b.mjs":"export const value=19;\n"},source:`export {};${aliases.join("\n")}async function main(){let total=0;for(const request of ["./a.mjs","./b.mjs"])total+=(await import(request)).value;for(const request of [])await import(request);for(const request of requests${depth-1})total+=(await import(request)).value;console.log("iterator source:",total===53)}main();\n`};
}

/** One nested property tree supplies the native property and CLI stress input. */
export function objectLiteralEffectInput(depth:number):string {
    const marker="__unused_object_body__";
    let value='{method(){return "'+marker+'"},get value(){return "'+marker+'"}}';
    for(let index=0;index<depth;index++)value='{nested:'+value+',method(){return "'+marker+'"},set value(input:string){console.log("'+marker+'",input)}}';
    return 'export {};const unused:unknown='+value+';console.log("done");\n';
}

export function collectionSourceAliasInput(depth:number):string {
    const aliases=['const owner0=new Map([["key","17;"]]);'];
    for(let index=1;index<depth;index++)aliases.push(`const owner${index}=owner${index-1};`);
    return `export {};${aliases.join("\n")}let total=Number(eval(owner${depth-1}.get("key")));for(const source of new Set(["19;","23;"]))total+=Number(eval(source));for(const [key,source]of new Map([["key","29;"]]).entries())total+=Number(eval(source));console.log(total===88);\n`;
}

/** Prototype cardinality is independent of the primitive domain partitions. */
export function primitivePropertyPrototypeInput(depth:number):string {
    return `export {};const prototype=Number.prototype as any,previous=Object.getPrototypeOf(prototype);let seen=0;let parent:any={set probe(value:number){'use strict';if(typeof this==='number'&&(this as any)===17&&value===19)seen++;}};for(let index=0;index<${depth};index++)parent=Object.create(parent);Object.setPrototypeOf(prototype,parent);(17 as any).probe=19;Object.setPrototypeOf(prototype,previous);console.log('primitive prototype:',seen===1);\n`;
}

export function generatorMethodOwnerInput(depth:number):string {
    return `export {};function* source(){yield 17;return 19;}let owner:any={iterator:source(),method:source().next,prototype:Object.prototype};for(let index=0;index<${depth};index++)owner={next:owner};for(let index=0;index<${depth};index++)owner=owner.next;const first=owner.method.call(owner.iterator),last=owner.method.call(owner.iterator);console.log('generator owner:',first.value===17&&!first.done&&last.value===19&&last.done&&Object.getPrototypeOf(last)===owner.prototype);\n`;
}

export function setCompositionSourceInput(depth:number):string {
    const aliases=[`const owner0=new Set(['17;','19;']).union(new Set(['19;','23;']));`];
    for(let index=1;index<depth;index++)aliases.push(`const owner${index}=owner${index-1};`);
    return `export {};${aliases.join('\n')}let total=0;for(const source of owner${depth-1})total+=Number(eval(source));console.log('composition source:',total===59);\n`;
}

export function arrayIteratorSourceInput(depth:number):string {
    const aliases=[`const owner0={0:'17;',2:'19;',length:3};`];
    for(let index=1;index<depth;index++)aliases.push(`const owner${index}=owner${index-1};`);
    return `export {};${aliases.join('\n')}let total=0;for(const entry of Array.prototype.entries.call(owner${depth-1})){if(entry[1]!==undefined)total+=Number(eval(entry[1]));}console.log('array iterator source:',total===36);\n`;
}

export function pathComponentInput(depth:number):string {
    return `import path from 'node:path';const count=${depth};let parts:string[]=[];for(let index=0;index<count;index++)parts.push('component'+index);const long=parts.join('/'),joined=path.join(...parts),normalized=path.normalize(long+'/../tail/'),resolved=path.resolve('/root',...parts,'..','tail'),relative=path.relative('/root/'+long,'/root/leaf');console.log('path components:',joined===long&&normalized===parts.slice(0,-1).join('/')+'/tail/'&&resolved==='/root/'+parts.slice(0,-1).join('/')+'/tail'&&relative==='../'.repeat(count)+'leaf');\n`;
}

export function moduleAsyncCycleInput(depth:number):{source:string;files:Record<string,string>} {
    const files:Record<string,string>={'cycle-shared.mjs':`export const events=[];`};
    for(let index=0;index<depth;index++)files[`cycle-${index}.mjs`]=`import './cycle-${(index+1)%depth}.mjs';import {events} from './cycle-shared.mjs';events.push('start:${index}');await Promise.resolve();events.push('end:${index}');export function read(){return ${index};}`;
    files['cycle-consumer.mjs']=`import {read} from './cycle-${Math.floor(depth/2)}.mjs';import {events} from './cycle-shared.mjs';events.push('consumer:'+read());`;
    const expected=Array.from({length:depth},(_,index)=>depth-1-index).flatMap(index=>[`start:${index}`,`end:${index}`]);expected.push('consumer:'+Math.floor(depth/2));
    return {files,source:`import './cycle-0.mjs';import './cycle-consumer.mjs';import {events} from './cycle-shared.mjs';console.log('module async cycle:',events.join('|')===${JSON.stringify(expected.join('|'))});\n`};
}

export function switchNormalCompletionInput(depth:number):string {
    const clauses=Array.from({length:depth},(_,index)=>`case yield ${index}: return 'matched';`);
    return `export {};function* select():Generator<number,string,any>{switch('domain'){${clauses.join('\n')}}return 'after';}const iterator=select();let step=iterator.next(),index=0,ordered=true;while(!step.done){ordered=ordered&&step.value===index;step=iterator.next(index++);}console.log('switch normal tree:',ordered&&index===${depth}&&step.value==='after');\n`;
}

/** Pending generated eval results flow through the same computed-read graph. */
export function pendingComputedKeyInput(depth:number):string {
    const aliases=Array.from({length:depth},(_,index)=>`const key${index}:any=${index?'key'+(index-1):'eval("\'selected\'")'};`);
    return `const object:any={selected:'17;',other:'19;'};console.log('earlier:',eval(object.selected));\n${aliases.join('\n')}\nconst source=object[key${depth-1}];console.log('pending key:',eval(source));\n`;
}

/** The generated lexical graph is shared by source facts and typed CLI. */
export function evalCallerEnvironmentInput(depth:number):string {
    const bindings=Array.from({length:depth},(_,index)=>`const source${index}:any=${index?'source'+(index-1):"'47;'"};`);
    return `function caller():any{${bindings.join('\n')}return eval('source${depth-1}');}console.log('eval caller graph:',eval(caller()));\n`;
}

export const lexicalSourceCaptureFiles:Readonly<Record<string,string>>={'data.json':'262\n'};
/** One synchronous source capture precedes the later import reaction. */
export function lexicalSourceCaptureInput(depth:number):string {
    const aliases=Array.from({length:depth},(_,index)=>`const saved${index}:any=${index?'saved'+(index-1):'body'};`);
    return `let body:any='61;';const options={get with(){body='67;';return {type:'json'}}};const pending=import('./data.json',options);${aliases.join('\n')}\nconsole.log('lexical source capture:',eval(saved${depth-1}));pending.then((namespace:any)=>console.log('module:',namespace.default));\n`;
}

/** Literal String reads share the ordinary primitive prototype graph. */
export function primitivePropertyReadInput(depth:number):string {
    return `export {};{const prototype=String.prototype as any,previous=Object.getPrototypeOf(prototype);let seen=0;let parent:any={get probe(){'use strict';seen++;return typeof this==='string'&&this==='value'?71:0;}};for(let index=0;index<${depth};index++)parent=Object.create(parent);Object.setPrototypeOf(prototype,parent);const result=('value' as any).probe;Object.setPrototypeOf(prototype,previous);console.log('primitive read graph:',result===71&&seen===1); }\n`;
}

export function sourceProjectionProvenanceInput(depth:number):string {
 const aliases=Array.from({length:depth},(_,index)=>`const source${index}:any=${index?'String(source'+(index-1)+')':"'37;'"};`);
 return `{
${aliases.join('\n')}
function select(value:any):any{return String(value)}
function twice(fn:(value:any)=>any,value:any):any{return fn(fn(value))}
console.log('source:',eval(twice(select,source${depth-1})));
}
`;
}

export function jobQueueInput(depth:number):string {
 return `let observed=0;for(let index=0;index<${depth};++index){const payload={index};queueMicrotask(()=>{if(payload.index!==observed++)throw new Error('FIFO')})}queueMicrotask(()=>console.log('jobs:',observed));\n`;
}

export function constructorCompletionInput(depth:number):string {
 return `const owner:any=eval('(class extends Object{constructor(){}})');let graph:any=null;for(let index=0;index<${depth};++index)graph={owner,next:graph};let valid=true;while(graph){try{new graph.owner();valid=false}catch(error){if(!(error instanceof ReferenceError))valid=false}graph=graph.next}console.log('constructor:',valid);\n`;
}

export function promiseReactionInput(depth:number):string {
 return `let chain:Promise<number>=Promise.resolve(0);for(let index=0;index<${depth};++index){const payload={index};chain=chain.then(value=>{if(value!==payload.index)throw new Error('reaction order');return value+1})}chain.then(value=>console.log('reactions:',value));\n`;
}

export function evalRealmAliasInput(depth:number,foreign=false):string {
 const aliases=Array.from({length:depth},(_,index)=>`const owner${index}:any=${index?'owner'+(index-1):foreign?'$262.createRealm().global':'globalThis'};`);
 return `{${aliases.join('\n')}owner${depth-1}.source='59;';const evaluate=owner${depth-1}.eval;console.log('Realm:',evaluate('source'));}\n`;
}

export function evalDeclarationInput(depth:number):string {
 const declarations=Array.from({length:depth},(_,index)=>`var source${index}=${index?'source'+(index-1):"'79;'"};`).join('');
 return `{(0,eval)(${JSON.stringify(declarations)});console.log('declaration:',eval((globalThis as any).source${depth-1}));}\n`;
}

export function restSourceLocationInput(depth:number):string {
    const aliases=Array.from({length:depth},(_,index)=>`const list${index}:any=${index?'list'+(index-1):'tail'};`);
    return `function restSourceForward(ignored:any,...tail:any[]):any{${aliases.join('\n')}return Function(...list${depth-1});}console.log('rest:',eval(restSourceForward(0,"return '67;'")()));\n`;
}

export function functionSourceOwnerInput(depth:number):string {
 const aliases=Array.from({length:depth},(_,index)=>`const owner${index}:any=${index?'owner'+(index-1):'Function(\"return \'61;\'\")'};`);
 return `{${aliases.join('\n')}const opaque:any=Function('return missing()');console.log('Function:',eval(owner${depth-1}()));}\n`;
}

export function sourceAllocationInput(depth:number):string {
 const owners=Array.from({length:depth},(_,index)=>`const allocation${index}:any=${index?`{body:allocation${index-1}.body,previous:allocation${index-1}}`:`{body:'return 83;',previous:null}`};`);
 return `{Math.random();${owners.join('\n')}console.log('allocation:',Function(allocation${depth-1}.body)());}\n`;
}

export function listExtentCaptureInput(depth:number):string {
 const aliases=Array.from({length:depth},(_,index)=>`const extentOwner${index}:any=${index?'extentOwner'+(index-1):'flag?["return 103;"]:["return 107;"]'};`);
 return `function extentSelect(flag:boolean):any{${aliases.join('\n')}return Function.apply(null,[...extentOwner${depth-1}]);}console.log('extent:',extentSelect(true)(),extentSelect(false)());\nasync function* extentLater(){yield 1}extentLater().next();\n`;
}

export function mathSourceOwnerInput(depth:number):string {
 const aliases=Array.from({length:depth},(_,index)=>`const mathSource${index}:any=${index?'mathSource'+(index-1):'Math.random()<0.5?["return 109;"]:["return 109;"]'};`);
 return `{${aliases.join('\n')}console.log('Math source:',Function.apply(null,[...mathSource${depth-1}])());}\nasync function* mathSourceLater(){yield 1}mathSourceLater().next();\n`;
}

export function activationCaptureOwnerInput(depth:number):string {
 const owners=Array.from({length:depth},(_,index)=>`const capturedOwner${index}:any=${index?`{body:capturedOwner${index-1}.body,previous:capturedOwner${index-1}}`:`{body:'return 113;',previous:null}`};`);
 return `async function capturedOwnerRun():Promise<any>{${owners.join('\n')}await 0;return Function(capturedOwner${depth-1}.body)()}capturedOwnerRun().then(value=>console.log('captured owner:',value));\n`;
}

export function typedArrayMetadataInput(depth:number):string {
 const owners=Array.from({length:depth},(_,index)=>`const elementOwner${index}:any=${index?`{width:elementOwner${index-1}.width,previous:elementOwner${index-1}}`:`{width:Int32Array.BYTES_PER_ELEMENT,previous:null}`};`);
 return `{${owners.join('\n')}console.log('element source:',Function('return '+elementOwner${depth-1}.width+';')());}\n`;
}

export function atomicsSourceOwnerInput(depth:number):string {
 const owners=Array.from({length:depth},(_,index)=>`const atomicOwner${index}:any=${index?`{body:atomicOwner${index-1}.body,previous:atomicOwner${index-1}}`:`{body:'return 31;',previous:null}`};`);
 return `{const atomicView=new Int32Array(new SharedArrayBuffer(4));${owners.join('\n')}Atomics.load(atomicView,0);console.log('atomic source:',Function(atomicOwner${depth-1}.body)());}\n`;
}

export function jsonNumericSourceInput(depth:number):string {
 const owners=Array.from({length:depth},(_,index)=>`const jsonNumericOwner${index}:any=${index?`{body:jsonNumericOwner${index-1}.body,previous:jsonNumericOwner${index-1}}`:`{body:'return 37;',previous:null}`};`);
 return `{const view=new BigInt64Array(new SharedArrayBuffer(8));${owners.join('\n')}try{JSON.stringify(Atomics.load(view,0))}catch(error){}console.log('JSON numeric source:',Function(jsonNumericOwner${depth-1}.body)());}\n`;
}

export function promiseCapabilitySourceInput(depth:number):string {
 const owners=Array.from({length:depth},(_,index)=>`const promiseSourceOwner${index}:any=${index?`{body:promiseSourceOwner${index-1}.body,previous:promiseSourceOwner${index-1}}`:`{body:'return 41;',previous:null}`};`);
 return `{${owners.join('\n')}new Promise<any>(resolve=>resolve(promiseSourceOwner${depth-1}.body)).then(body=>console.log('Promise capability source:',Function(body)()));}\n`;
}

export function strictTypeSourceInput(depth:number):string {
 const owners=Array.from({length:depth},(_,index)=>`const strictTypeOwner${index}:any=${index?`{body:strictTypeOwner${index-1}.body,previous:strictTypeOwner${index-1}}`:`{body:'return 59;',previous:null}`};`);
 return `{${owners.join('\n')}if(globalThis.setTimeout===undefined)throw new Error('timer absent');console.log('strict type source:',Function(strictTypeOwner${depth-1}.body)());}\n`;
}

export function relationalSourceInput(depth:number):string {
 const owners=Array.from({length:depth},(_,index)=>`const relationOwner${index}:any=${index?`{value:relationOwner${index-1}.value,previous:relationOwner${index-1}}`:`{value:7n,previous:null}`};`);
 return `{${owners.join('\n')}const left:any={valueOf(){return relationOwner${depth-1}.value}};console.log('relational source:',Function('return '+(left<9n)+';')());}\n`;
}

export function hasInstanceInput(depth:number):string {
 return `{function InstanceTarget(){}const target:any=InstanceTarget;let object:any=Object.create(target.prototype),bound:any=target;for(let index=0;index<${depth};index++){object=Object.create(object);bound=bound.bind(null)}console.log('hasInstance depth:',object instanceof bound,Function.prototype[Symbol.hasInstance].call(bound,object));}\n`;
}

export function callbackTimerSourceInput(depth:number):string {
 const owners=Array.from({length:depth},(_,index)=>`const timerSourceOwner${index}:any=${index?`{body:timerSourceOwner${index-1}.body,previous:timerSourceOwner${index-1}}`:`{body:'return 71;',previous:null}`};`);
 return `{${owners.join('\n')}setTimeout((body:string)=>console.log('timer source:',Function(body)()),0,timerSourceOwner${depth-1}.body);}\n`;
}

export function promiseStaticSourceInput(depth:number):string {
 const owners=Array.from({length:depth},(_,index)=>`const staticPromiseOwner${index}:any=${index?`{body:staticPromiseOwner${index-1}.body,previous:staticPromiseOwner${index-1}}`:`{body:'return 79;',previous:null}`};`);
 return `{${owners.join('\n')}Promise.try((body:string)=>body,staticPromiseOwner${depth-1}.body).then(body=>console.log('static Promise source:',Function(body)()));}\n`;
}

export function asyncReturnAdoptionInput(depth:number):string {
 const forwards=Array.from({length:depth},(_,index)=>`async function adoptedReturn${index}():Promise<string>{return ${index?`adoptedReturn${index-1}()`:`Promise.resolve('return 101;')`}}`);
 return `{${forwards.join('\n')}adoptedReturn${depth-1}().then(body=>console.log('async adoption:',Function(body)()));}\n`;
}

export function awaitResolutionInput(depth:number):string {
 const owners=Array.from({length:depth},(_,index)=>`const awaitSourceOwner${index}:any=${index?`{body:awaitSourceOwner${index-1}.body,previous:awaitSourceOwner${index-1}}`:`{body:'return 149;',previous:null}`};`);
 return `{${owners.join('\n')}async function awaitedSource():Promise<void>{const thenable:any={then(resolve:any){resolve(awaitSourceOwner${depth-1}.body)}};const body:any=await thenable;console.log('await resolution:',Function(body)())}awaitedSource();}\n`;
}

export function promiseReturnProjectionInput(depth:number):string {
 const forwards=Array.from({length:depth},(_,index)=>`async function projectedPromiseReturn${index}(value:any):Promise<any>{return ${index?`await projectedPromiseReturn${index-1}(value)`:`await Promise.resolve(value)`}}`);
 return `{${forwards.join('\n')}const first=projectedPromiseReturn${depth-1}('return 229;');projectedPromiseReturn${depth-1}('return 239;');first.then(body=>console.log('Promise projection:',Function(body)()));}\n`;
}

export function escapedCallbackGraphInput(depth:number):string {
 const owners=Array.from({length:depth},(_,index)=>`const escapedCallbackOwner${index}:any=${index?`{previous:escapedCallbackOwner${index-1}}`:`{callback,previous:null}`};`);
 return `{function callback(body:any):void{console.log('container callback:',Function(body)())}callback('return 307;');${owners.join('\n')}escapedCallbackOwner0.loop=escapedCallbackOwner${depth-1};const methods:any={call(root:any){let cursor:any=root;while(cursor.previous!==null)cursor=cursor.previous;cursor.callback('return 311;')}};const match:any=/.*/.exec('call');const selected:any=methods[match[0]];selected(escapedCallbackOwner${depth-1});}\n`;
}

export function generatorSourceOwnerInput(depth:number):string {
 const owners=Array.from({length:depth},(_,index)=>`const generatorSourceOwner${index}:any=${index?`{iterator:generatorSourceOwner${index-1}.iterator,previous:generatorSourceOwner${index-1}}`:`{iterator:source(),previous:null}`};`);
 return `{function* source():Generator<any,any,any>{yield 'return 317;'}${owners.join('\n')}console.log('generator source:',Function(generatorSourceOwner${depth-1}.iterator.next().value)());}\n`;
}

export function nativePromiseArrayInput(depth:number):string {
 const owners=Array.from({length:depth},(_,index)=>`const nativePromiseArrayOwner${index}:any=${index?`{value:nativePromiseArrayOwner${index-1}.value,previous:nativePromiseArrayOwner${index-1}}`:`{value:array,previous:null}`};`);
 return `import * as dns from 'node:dns/promises';async function verifyNativePromiseArray():Promise<void>{const array:any=await dns.resolve4('127.0.0.1');${owners.join('\n')}const retained:any=nativePromiseArrayOwner${depth-1}.value;const copied:any=await Promise.resolve(retained).then(value=>value);console.log('native Promise array:',copied===array,typeof copied[0],copied[0]);Reflect.set(copied,'1',17);Reflect.set(copied,'2',null);delete copied[0];console.log('native Promise mutation:',array===copied,!(0 in array),array[1],array[2]);}verifyNativePromiseArray();\n`;
}

export function moduleRejectionOriginInput(depth:number):{source:string;files:Record<string,string>} {
 const files:Record<string,string>={'rejection-origin-leaf.mjs':"await Promise.resolve().then(()=>Promise.reject(new RangeError()));\n"};
 for(let index=0;index<depth;index++)files[`rejection-origin-${index}.mjs`]=`import './${index+1<depth?'rejection-origin-'+(index+1):'rejection-origin-leaf'}.mjs';\n`;
 return {files,source:"import './rejection-origin-0.mjs';\n"};
}
