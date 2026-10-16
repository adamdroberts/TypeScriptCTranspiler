import ts from "typescript";
import {unwrapTransparentExpression as unwrap} from "./emit/binding-tree";

export interface SourceLexicalWrite {
    readonly id:number;
    readonly origin:ts.Node;
    readonly reference:ts.Identifier;
}
interface Point {
    readonly successors:Set<number>;
    readonly write?:SourceLexicalWrite;
    readonly symbol?:ts.Symbol;
}
interface NodeTask {readonly node:ts.Node;readonly entry:number;readonly exit:number;}
interface BindingTask {
    readonly binding:ts.BindingName;readonly origin:ts.Node;readonly entry:number;readonly exit:number;
    readonly references?:ReadonlyMap<ts.Identifier,ts.Expression>;
    readonly initializer?:ts.Expression;readonly key?:ts.Expression;
}
type Task=NodeTask|BindingTask;

/** One intraprocedural may-flow graph retains normal lexical stores. A store
 * replaces the incoming definitions of its binding; joins union alternatives.
 * Opaque control regions have a shared optional, recurrent hub, so their
 * internal order cannot invent a definite replacement. An entry alternative retains prior-invocation values until a current store
 * replaces them. Reentrancy and source
 * activation eligibility belong to the caller's canonical activation graph. */
export class SourceReachingWrites {
    private readonly points:Point[]=[];
    private readonly entries=new Map<ts.Node,number>();
    private readonly solutions=new Map<ts.Symbol,ReadonlyMap<number,ReadonlySet<SourceLexicalWrite|null>>>();
    private readonly entry=this.point();
    private readonly exit=this.point();
    constructor(root:ts.Node,
        private readonly writes:ReadonlyMap<ts.Node,ReadonlyMap<ts.Identifier,SourceLexicalWrite>>,
        private readonly sameFrame:(node:ts.Node)=>boolean,
        private readonly symbolFor:(node:ts.Identifier)=>ts.Symbol|undefined,
        parameters:readonly ts.ParameterDeclaration[]=[],
        private readonly assignmentTarget?:(target:ts.Expression)=>{binding:ts.BindingName|null;references:ReadonlyMap<ts.Identifier,ts.Expression>}) {
        const tasks:Task[]=[];
        if(parameters.length){const body=this.point();this.opaque(parameters,this.entry,body);tasks.push({node:root,entry:body,exit:this.exit});}
        else tasks.push({node:root,entry:this.entry,exit:this.exit});
        while(tasks.length){const task=tasks.pop()!;if("binding"in task)this.lowerBinding(task,tasks);else this.lower(task,tasks);}
    }
    private point(write?:SourceLexicalWrite):number {
        const index=this.points.length;this.points.push({successors:new Set(),...(write?{write,symbol:this.symbolFor(write.reference)}:{})});return index;
    }
    private edge(from:number,to:number):void {this.points[from]!.successors.add(to);}
    private sequence(nodes:readonly ts.Node[],entry:number,exit:number,tasks:Task[]):void {
        if(!nodes.length){this.edge(entry,exit);return;}
        let previous=entry;
        for(const [index,node]of nodes.entries()){
            const next=index===nodes.length-1?exit:this.point();tasks.push({node,entry:previous,exit:next});previous=next;
        }
    }
    /** Every operation in an unrepresented control region may occur in any
     * order or be skipped. The star has no syntax-size dependent shape. */
    private opaque(roots:readonly ts.Node[],entry:number,exit:number):void {
        const hub=this.point(),pending=[...roots],visited=new Set<ts.Node>();this.edge(entry,hub);this.edge(hub,exit);
        while(pending.length){const node=pending.pop()!;if(visited.has(node)||!this.sameFrame(node))continue;visited.add(node);
            if(!this.entries.has(node)){const read=this.point();this.entries.set(node,read);this.edge(hub,read);this.edge(read,hub);}
            for(const write of this.writes.get(node)?.values()??[]){const store=this.point(write);this.edge(hub,store);this.edge(store,hub);}
            ts.forEachChild(node,child=>{pending.push(child);});
        }
    }
    private store(node:ts.Node,reference:ts.Identifier,entry:number,exit:number):boolean {
        const write=this.writes.get(node)?.get(reference);if(!write)return false;
        const point=this.point(write);this.edge(entry,point);this.edge(point,exit);return true;
    }
    private lowerBinding(task:BindingTask,tasks:Task[]):void {
        let entry=task.entry;
        if(task.key){const next=this.point();this.sequence([task.key],entry,next,tasks);entry=next;}
        const afterDefault=this.point();
        const initialize=(from:number)=>{
            if(!task.initializer){this.edge(from,afterDefault);return;}
            const selected=this.point();this.edge(from,afterDefault);this.edge(from,selected);this.sequence([task.initializer],selected,afterDefault,tasks);
        };
        if(ts.isIdentifier(task.binding)){
            const reference=unwrap(task.references?.get(task.binding)??task.binding),afterReference=this.point();
            this.entries.set(reference,entry);
            if(ts.isIdentifier(reference))this.edge(entry,afterReference);else this.sequence([reference],entry,afterReference,tasks);
            initialize(afterReference);
            if(!ts.isIdentifier(reference)||!this.store(task.origin,reference,afterDefault,task.exit))this.edge(afterDefault,task.exit);
            return;
        }
        initialize(entry);
        const elements:ts.BindingElement[]=[];for(const element of task.binding.elements)if(ts.isBindingElement(element))elements.push(element);let previous=afterDefault;
        for(const [index,element]of elements.entries()){
            const next=index===elements.length-1?task.exit:this.point();
            tasks.push({binding:element.name,origin:task.origin,references:task.references,initializer:element.initializer,
                key:element.propertyName&&ts.isComputedPropertyName(element.propertyName)?element.propertyName.expression:undefined,entry:previous,exit:next});previous=next;
        }
        if(!elements.length)this.edge(afterDefault,task.exit);
    }
    private lower(task:NodeTask,tasks:Task[]):void {
        const {node,entry,exit}=task;this.entries.set(node,entry);
        if(!this.sameFrame(node)){this.edge(entry,exit);return;}
        if(ts.isExpression(node)){const transparent=unwrap(node);if(transparent!==node){this.sequence([transparent],entry,exit,tasks);return;}}
        if(ts.isSourceFile(node)||ts.isBlock(node)){this.sequence(node.statements,entry,exit,tasks);return;}
        if(ts.isExpressionStatement(node)){this.sequence([node.expression],entry,exit,tasks);return;}
        if(ts.isVariableStatement(node)){this.sequence(node.declarationList.declarations,entry,exit,tasks);return;}
        if(ts.isVariableDeclaration(node)){
            if(!node.initializer){this.edge(entry,exit);return;}
            const completed=this.point();this.sequence([node.initializer],entry,completed,tasks);
            tasks.push({binding:node.name,origin:node,entry:completed,exit});return;
        }
        if(ts.isIfStatement(node)){
            const selected=this.point();this.sequence([node.expression],entry,selected,tasks);
            const left=this.point(),right=this.point();this.edge(selected,left);this.edge(selected,right);
            tasks.push({node:node.thenStatement,entry:left,exit});
            if(node.elseStatement)tasks.push({node:node.elseStatement,entry:right,exit});else this.edge(right,exit);
            return;
        }
        if(ts.isConditionalExpression(node)){
            const selected=this.point(),left=this.point(),right=this.point();this.sequence([node.condition],entry,selected,tasks);this.edge(selected,left);this.edge(selected,right);
            tasks.push({node:node.whenTrue,entry:left,exit},{node:node.whenFalse,entry:right,exit});return;
        }
        if(ts.isReturnStatement(node)||ts.isThrowStatement(node)){
            this.sequence(node.expression?[node.expression]:[],entry,this.exit,tasks);return;
        }
        if(ts.isBinaryExpression(node)){
            const token=node.operatorToken.kind,left=unwrap(node.left);
            const logical=[ts.SyntaxKind.AmpersandAmpersandToken,ts.SyntaxKind.BarBarToken,ts.SyntaxKind.QuestionQuestionToken].includes(token);
            const conditionalStore=[ts.SyntaxKind.AmpersandAmpersandEqualsToken,ts.SyntaxKind.BarBarEqualsToken,ts.SyntaxKind.QuestionQuestionEqualsToken].includes(token);
            const assignment=token>=ts.SyntaxKind.FirstAssignment&&token<=ts.SyntaxKind.LastAssignment;
            if(assignment&&ts.isIdentifier(left)){
                const beforeStore=this.point();this.entries.set(left,entry);
                if(!this.store(node,left,beforeStore,exit)){this.opaque([node],entry,exit);return;}
                if(conditionalStore){
                    const selected=this.point(),right=this.point();this.sequence([left],entry,selected,tasks);this.edge(selected,exit);this.edge(selected,right);this.sequence([node.right],right,beforeStore,tasks);
                }else this.sequence(token===ts.SyntaxKind.EqualsToken?[node.right]:[left,node.right],entry,beforeStore,tasks);
                return;
            }
            if(assignment&&(ts.isArrayLiteralExpression(left)||ts.isObjectLiteralExpression(left))){
                const target=token===ts.SyntaxKind.EqualsToken?this.assignmentTarget?.(left):undefined;
                if(!target?.binding){this.opaque([node],entry,exit);return;}
                const completed=this.point();this.sequence([node.right],entry,completed,tasks);
                tasks.push({binding:target.binding,references:target.references,origin:node,entry:completed,exit});return;
            }
            if(logical){const selected=this.point(),right=this.point();this.sequence([node.left],entry,selected,tasks);this.edge(selected,exit);this.edge(selected,right);this.sequence([node.right],right,exit,tasks);}
            else this.sequence([node.left,node.right],entry,exit,tasks);
            return;
        }
        if(ts.isPrefixUnaryExpression(node)||ts.isPostfixUnaryExpression(node)){
            const operand=unwrap(node.operand),update=ts.isPostfixUnaryExpression(node)||node.operator===ts.SyntaxKind.PlusPlusToken||node.operator===ts.SyntaxKind.MinusMinusToken;
            if(update&&ts.isIdentifier(operand)){const completed=this.point();if(this.store(node,operand,completed,exit)){this.sequence([operand],entry,completed,tasks);return;}}
            this.sequence([node.operand],entry,exit,tasks);return;
        }
        if(ts.isCallExpression(node)||ts.isNewExpression(node)){
            if(node.flags&ts.NodeFlags.OptionalChain){this.opaque([node],entry,exit);return;}
            this.sequence([node.expression,...node.arguments??[]],entry,exit,tasks);return;
        }
        if(ts.isPropertyAccessExpression(node)){this.sequence([node.expression],entry,exit,tasks);return;}
        if(ts.isElementAccessExpression(node)){
            if(node.flags&ts.NodeFlags.OptionalChain){this.opaque([node],entry,exit);return;}
            this.sequence([node.expression,...node.argumentExpression?[node.argumentExpression]:[]],entry,exit,tasks);return;
        }
        if(ts.isArrayLiteralExpression(node)){this.sequence(node.elements,entry,exit,tasks);return;}
        if(ts.isObjectLiteralExpression(node)){this.sequence(node.properties,entry,exit,tasks);return;}
        if(ts.isPropertyAssignment(node)){this.sequence([...(ts.isComputedPropertyName(node.name)?[node.name.expression]:[]),node.initializer],entry,exit,tasks);return;}
        if(ts.isShorthandPropertyAssignment(node)){
            if(node.objectAssignmentInitializer)this.opaque([node],entry,exit);else this.sequence([node.name],entry,exit,tasks);return;
        }
        if(ts.isSpreadElement(node)||ts.isSpreadAssignment(node)){this.sequence([node.expression],entry,exit,tasks);return;}
        if(ts.isMethodDeclaration(node)||ts.isGetAccessorDeclaration(node)||ts.isSetAccessorDeclaration(node)){
            this.sequence(ts.isComputedPropertyName(node.name)?[node.name.expression]:[],entry,exit,tasks);return;
        }
        if(ts.isFunctionDeclaration(node)||ts.isFunctionExpression(node)||ts.isArrowFunction(node)){this.edge(entry,exit);return;}
        if(ts.isTypeOfExpression(node)||ts.isVoidExpression(node)||ts.isDeleteExpression(node)||ts.isAwaitExpression(node)||ts.isYieldExpression(node)){
            this.sequence(node.expression?[node.expression]:[],entry,exit,tasks);return;
        }
        if(ts.isTemplateExpression(node)){this.sequence(node.templateSpans.map(span=>span.expression),entry,exit,tasks);return;}
        if(ts.isTaggedTemplateExpression(node)){this.sequence([node.tag,...ts.isTemplateExpression(node.template)?node.template.templateSpans.map(span=>span.expression):[]],entry,exit,tasks);return;}
        // Try/finally, loops, labels, switch, class evaluation and unfamiliar
        // syntax retain their complete optional event graph, including throws.
        this.opaque([node],entry,exit);
    }
    reaching(reference:ts.Identifier):ReadonlySet<SourceLexicalWrite>|null {
        const at=this.entries.get(reference),symbol=this.symbolFor(reference);if(at===undefined||!symbol)return null;
        let solution=this.solutions.get(symbol);
        if(!solution){
            const facts=new Map<number,ReadonlySet<SourceLexicalWrite|null>>([[this.entry,new Set([null])]]),pending=[this.entry],queued=new Set(pending);
            while(pending.length){const index=pending.pop()!;queued.delete(index);const point=this.points[index]!,input=facts.get(index)!;
                const output=point.write&&point.symbol===symbol?new Set([point.write]):input;
                for(const next of point.successors){const before=facts.get(next);if(before&&[...output].every(value=>before.has(value)))continue;
                    facts.set(next,before?new Set([...before,...output]):output);if(!queued.has(next)){queued.add(next);pending.push(next);}
                }
            }
            solution=facts;this.solutions.set(symbol,solution);
        }
        const definitions=solution.get(at);return !definitions||definitions.has(null)?null:definitions as ReadonlySet<SourceLexicalWrite>;
    }
}
