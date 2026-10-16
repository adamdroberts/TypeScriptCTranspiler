import ts from 'typescript';
import {classDefinitionPlan} from './emit/class-definition';

type Definition=ts.ClassLikeDeclaration|ts.SwitchStatement;
interface Region {readonly definition:Definition;readonly domain:object;readonly index:number;}
/** Source offsets order ordinary siblings within an evaluation region.
 * Class keys precede static initialization; switch selection precedes every
 * body it selects. Deferred class bodies retain their separate activations. */
export class SourceEvaluationOrder {
    private readonly indexed=new WeakSet<ts.SourceFile>();
    private readonly regions=new WeakMap<ts.Node,Region>();
    private readonly paths=new WeakMap<ts.Node,readonly (Region|{definition:Definition})[]>();
    private index(source:ts.SourceFile):void {
        if(this.indexed.has(source))return;this.indexed.add(source);
        const pending:ts.Node[]=[source];
        while(pending.length){const node=pending.pop()!;
            if(ts.isClassLike(node)){
                const definition=node,instance={},stages=classDefinitionPlan(definition);let index=0,instanceIndex=0;
                const retain=(root:ts.Node|undefined,domain:object,position:number)=>{if(root)this.regions.set(root,{definition,domain,index:position});};
                for(const stage of stages){
                    if(stage.kind==='heritage')retain(stage.expression,definition,index++);
                    else if(stage.kind==='element'){
                        if(stage.key)retain(stage.key,definition,index++);
                        const member=stage.member;
                        if(ts.isPropertyDeclaration(member)&&!(ts.getModifiers(member)??[]).some(modifier=>modifier.kind===ts.SyntaxKind.StaticKeyword))retain(member.initializer,instance,instanceIndex++);
                    }else if(stage.kind==='complete'){
                        for(const member of definition.members){
                            if(ts.isClassStaticBlockDeclaration(member))retain(member.body,definition,index++);
                            else if(ts.isPropertyDeclaration(member)&&(ts.getModifiers(member)??[]).some(modifier=>modifier.kind===ts.SyntaxKind.StaticKeyword))retain(member.initializer,definition,index++);
                        }
                    }
                }
                for(const member of definition.members)if(ts.isFunctionLike(member)){
                    for(const parameter of member.parameters)retain(parameter,member,0);
                    if('body' in member)retain(member.body,member,0);
                }
            }
            if(ts.isSwitchStatement(node)){
                const definition=node,retain=(root:ts.Node,index:number)=>this.regions.set(root,{definition,domain:definition,index});
                retain(definition.expression,0);
                for(const clause of definition.caseBlock.clauses){
                    if(ts.isCaseClause(clause))retain(clause.expression,1);
                    for(const statement of clause.statements)retain(statement,2);
                }
            }
            ts.forEachChild(node,child=>{pending.push(child);});
        }
    }
    private path(node:ts.Node):readonly (Region|{definition:Definition})[] {
        const prior=this.paths.get(node);if(prior)return prior;
        this.index(node.getSourceFile());
        const regions=new Map<Definition,Region>(),path:(Region|{definition:Definition})[]=[];
        for(let current:ts.Node|undefined=node;current;current=current.parent){
            const region=this.regions.get(current);if(region&&!regions.has(region.definition))regions.set(region.definition,region);
            if((ts.isClassLike(current)||ts.isSwitchStatement(current))&&current!==node)path.push(regions.get(current)??{definition:current});
        }
        path.reverse();this.paths.set(node,path);return path;
    }
    before(left:ts.Node,right:ts.Node):boolean {
        if(left.getSourceFile()!==right.getSourceFile())return false;
        const before=this.path(left),after=this.path(right);
        for(let index=0;index<Math.min(before.length,after.length);index++){
            const a=before[index]!,b=after[index]!;
            if(a.definition!==b.definition)break;
            if(!('domain' in a)||!('domain' in b)||a.domain!==b.domain)return false;
            if(a.index!==b.index)return a.index<b.index;
        }
        return left.getEnd()<=right.getStart();
    }
}
