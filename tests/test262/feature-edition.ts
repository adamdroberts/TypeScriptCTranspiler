import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {complianceDir,defaultCacheRoot,readJson,sha256File,sha256Text,verifyPinnedCheckout,type Baseline,type PinnedRepository} from './model';
import type {FeatureRegistry} from './metadata';
import type {ClauseCatalog} from './spec-catalog';

export type FeatureDisposition='standard'|'ecma402-only'|'harness-only'|'post-edition';
interface IntroductionExcerpt {clause:string;byteStart:number;byteEnd:number;sha256:string;text:string;}
export interface FeatureIntroduction extends PinnedRepository {id:string;specSource:string;specSourceSha256:string;excerpts:IntroductionExcerpt[];}
export interface FeatureEditionReview {feature:string;source:string;introducedClauses:string[];primarySource:string;reviewedBy:string;rationale:string;}
export interface FeatureEditionReviews {schemaVersion:1;target:{commit:string;specSourceSha256:string};sources:FeatureIntroduction[];reviews:FeatureEditionReview[];}
function fail(detail:string):never{throw new Error('invalid feature edition review: '+detail);}
function object(value:unknown,keys:readonly string[],label:string):void{
 if(!value||typeof value!=='object'||Array.isArray(value)||JSON.stringify(Object.keys(value).sort())!==JSON.stringify([...keys].sort()))fail(label+' shape');
}
function fullSha(value:string,label:string):void{if(!/^[0-9a-f]{40}$/.test(value))fail(label+' identity');}
function digest(value:string,label:string):void{if(!/^[0-9a-f]{64}$/.test(value))fail(label+' digest');}
function strings(values:readonly string[],label:string):void{if(!Array.isArray(values)||!values.length||values.some(value=>typeof value!=='string'||!value)||new Set(values).size!==values.length)fail(label+' collection');}
/** One retained source forest proves reviewed introductions independently of
 * the registry's current standard/proposal category and review cardinality. */
export function validateFeatureEditionReviews(baseline:Baseline,catalog:ClauseCatalog,document:FeatureEditionReviews,registry?:FeatureRegistry):ReadonlyMap<string,FeatureEditionReview>{
 object(document,['schemaVersion','target','sources','reviews'],'document');object(document.target,['commit','specSourceSha256'],'target');
 if(catalog.commit!==baseline.ecma262.commit||catalog.tree!==baseline.ecma262.tree||catalog.specSourceSha256!==baseline.ecma262.specSourceSha256)fail('target catalog identity');
 if(document.schemaVersion!==1||document.target.commit!==baseline.ecma262.commit||document.target.specSourceSha256!==baseline.ecma262.specSourceSha256||!Array.isArray(document.sources)||!Array.isArray(document.reviews))fail('target identity');
 const target=new Set(catalog.anchors.map(anchor=>anchor.id)),sources=new Map<string,FeatureIntroduction>(),used=new Map<string,Set<string>>(),reviews=new Map<string,FeatureEditionReview>();
 for(const source of document.sources){
  object(source,["id","repository","commit","tree","specSource","specSourceSha256","excerpts"],"introduction");
  fullSha(source.commit,'edition introduction commit');fullSha(source.tree,'edition introduction tree');digest(source.specSourceSha256,'introduction source');
  if(source.id!==source.commit||sources.has(source.id)||source.repository!==baseline.ecma262.repository||source.commit===baseline.ecma262.commit||source.specSource!==baseline.ecma262.specSource||!Array.isArray(source.excerpts)||!source.excerpts.length)fail('introduction identity');
  const roots=new Set<string>();let previousEnd=0;
  for(const excerpt of source.excerpts){
   object(excerpt,["clause","byteStart","byteEnd","sha256","text"],"excerpt");if(typeof excerpt.clause!=="string"||typeof excerpt.text!=="string")fail("excerpt text");
   digest(excerpt.sha256,'introduced clause');
   if(!Number.isSafeInteger(excerpt.byteStart)||!Number.isSafeInteger(excerpt.byteEnd)||excerpt.byteStart<previousEnd||excerpt.byteEnd<=excerpt.byteStart||Buffer.byteLength(excerpt.text)!==excerpt.byteEnd-excerpt.byteStart||sha256Text(excerpt.text)!==excerpt.sha256||roots.has(excerpt.clause))fail('clause forest bytes');
   roots.add(excerpt.clause);previousEnd=excerpt.byteEnd;
   const pending:string[]=[];let first=true;const ids=new Set<string>();
   for(const match of excerpt.text.matchAll(/<\/?emu-clause\b[^>]*>/g)){
    if(match[0].startsWith('</')){if(!pending.pop())fail('clause forest closing edge');}
    else{if(!first&&!pending.length)fail("multiple clause roots");const id=/\bid="([^"]+)"/.exec(match[0])?.[1];if(!id||ids.has(id)||target.has(id))fail('introduced clause already belongs to target or lacks identity');if(first&&id!==excerpt.clause)fail('clause forest root');first=false;ids.add(id);pending.push(id);}
   }
   if(first||pending.length||!excerpt.text.startsWith('<emu-clause')||!excerpt.text.endsWith('</emu-clause>'))fail('clause forest shape');
  }
  sources.set(source.id,source);
 }
 for(const review of document.reviews){
  object(review,["feature","source","introducedClauses","primarySource","reviewedBy","rationale"],"review");
  if([review.feature,review.source,review.primarySource,review.reviewedBy,review.rationale].some(value=>typeof value!=="string"))fail("review fields");
  strings(review.introducedClauses,'introduced clauses');const source=sources.get(review.source);
  if(!source||!review.feature||reviews.has(review.feature)||!review.reviewedBy?.trim()||!review.rationale?.trim()||!/^https:\/\/github\.com\/tc39\/ecma262\/pull\/\d+$/.test(review.primarySource))fail('review identity');
  const roots=new Set(source.excerpts.map(excerpt=>excerpt.clause));if(review.introducedClauses.some(clause=>!roots.has(clause)))fail('unrepresented introduced clause');
  if(baseline.test262.ecma402FeatureTags.includes(review.feature))fail("ECMA-402 scope collision");
  if(registry&&(!registry.standard.has(review.feature)||registry.proposed.has(review.feature)||registry.harness.has(review.feature)))fail('reviewed tag is not a pinned standard feature');
  reviews.set(review.feature,review);let clauses=used.get(review.source);if(!clauses){clauses=new Set();used.set(review.source,clauses);}for(const clause of review.introducedClauses)clauses.add(clause);
 }
 if(used.size!==sources.size)fail('unused introduction source');for(const source of sources.values())if(source.excerpts.some(excerpt=>!used.get(source.id)!.has(excerpt.clause)))fail('unused introduced clause');return reviews;
}
export async function loadFeatureEditionReviews(baseline:Baseline,catalog:ClauseCatalog,registry?:FeatureRegistry):Promise<{document:FeatureEditionReviews;reviews:ReadonlyMap<string,FeatureEditionReview>}>{
 const filename=path.join(complianceDir,'feature-edition-reviews.json');digest(baseline.test262.featureEditionReviewSha256,'review collection');if(await sha256File(filename)!==baseline.test262.featureEditionReviewSha256)fail('review collection bytes');
 const document=await readJson<FeatureEditionReviews>(filename);return {document,reviews:validateFeatureEditionReviews(baseline,catalog,document,registry)};
}
export function introductionCheckout(source:FeatureIntroduction,cacheRoot=defaultCacheRoot):string{return path.join(cacheRoot,'edition-introductions',source.commit);}
/** Full corpus verification independently rejoins authored excerpts with the
 * exact immutable primary Git tree and source bytes; missing evidence rejects. */
export async function verifyFeatureIntroductions(document:FeatureEditionReviews,cacheRoot=defaultCacheRoot):Promise<void>{
 for(const source of document.sources){const checkout=introductionCheckout(source,cacheRoot);await verifyPinnedCheckout('ECMA-262',checkout,source);const data=await fs.readFile(path.join(checkout,source.specSource));if(sha256Text(data)!==source.specSourceSha256)fail('primary source bytes');for(const excerpt of source.excerpts)if(!data.subarray(excerpt.byteStart,excerpt.byteEnd).equals(Buffer.from(excerpt.text)))fail('primary clause forest bytes');}
}
export function featureDisposition(tag:string,registry:FeatureRegistry,ecma402:ReadonlySet<string>,reviews:ReadonlyMap<string,FeatureEditionReview>):FeatureDisposition{
 if(!registry.all.has(tag))fail('unknown feature '+tag);
 return registry.proposed.has(tag)||reviews.has(tag)?'post-edition':registry.harness.has(tag)?'harness-only':ecma402.has(tag)?'ecma402-only':'standard';
}
export function postEditionFeatureTags(registry:FeatureRegistry,reviews:ReadonlyMap<string,FeatureEditionReview>):string[]{return [...new Set([...registry.proposed,...reviews.keys()])].sort();}
export function requirePostEditionFeatureTags(baseline:Baseline,registry:FeatureRegistry,reviews:ReadonlyMap<string,FeatureEditionReview>):void{if(JSON.stringify(postEditionFeatureTags(registry,reviews))!==JSON.stringify([...baseline.test262.postEditionFeatureTags].sort()))fail('baseline derived scope collection');}
