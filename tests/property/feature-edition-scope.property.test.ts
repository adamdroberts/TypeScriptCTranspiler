import {expect,test} from 'bun:test';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {featureDisposition,featureIntroductionId,featureIntroductionTrees,featureIntroductionTreeId,introductionCheckout,loadFeatureEditionReviews,postEditionFeatureTags,requirePostEditionFeatureTags,validateFeatureEditionReviews,verifyFeatureIntroductions,type FeatureEditionReviews} from '../test262/feature-edition';
import {scopeFor} from '../test262/inventory';
import {parseFeatureRegistry,type FeatureRegistry} from '../test262/metadata';
import {complianceDir,defaultCacheRoot,loadBaseline,readJson,sha256Text,type Baseline} from '../test262/model';
import type {ClauseCatalog} from '../test262/spec-catalog';

function registry(tags:Record<'standard'|'proposed'|'harness',string[]>):FeatureRegistry{return{standard:new Set(tags.standard),proposed:new Set(tags.proposed),harness:new Set(tags.harness),all:new Set(Object.values(tags).flat())};}
function input(depth:number):{baseline:Baseline;catalog:ClauseCatalog;document:FeatureEditionReviews}{
 const commit='1'.repeat(40),tree='2'.repeat(40),sha='3'.repeat(64),introduced='4'.repeat(40),text=Array.from({length:depth},(_,index)=>`<emu-clause id="new-${index}">`).join('')+'</emu-clause>'.repeat(depth);
 const baseline={ecma262:{repository:'https://github.com/tc39/ecma262.git',commit,tree,specSource:'spec.html',specSourceSha256:sha},test262:{ecma402FeatureTags:['intl'],postEditionFeatureTags:['proposal','later']}} as Baseline;
 const catalog={commit,tree,specSourceSha256:sha,anchors:[{id:'target'}]} as ClauseCatalog;
 const sourceId=featureIntroductionId({repository:baseline.ecma262.repository,commit:introduced,specSource:'spec.html'});
 const document:FeatureEditionReviews={schemaVersion:2,target:{commit,specSourceSha256:sha},sources:[{id:sourceId,repository:baseline.ecma262.repository,commit:introduced,tree:'5'.repeat(40),specSource:'spec.html',specSourceSha256:'6'.repeat(64),excerpts:[{clause:'new-0',byteStart:0,byteEnd:Buffer.byteLength(text),sha256:sha256Text(text),text}]}],reviews:[{feature:'later',evidence:[{source:sourceId,introducedClauses:['new-0']}],primarySource:'https://github.com/tc39/ecma262/pull/3000',reviewedBy:'property review',rationale:'Exact later source forest absent from target.'}]};return{baseline,catalog,document};
}

test('one edition review forest classifies registry categories and rejects incomplete evidence',()=>{
 const tags=registry({standard:['target','later','intl'],proposed:['proposal'],harness:['cross-realm']});
 for(const depth of [1,4096]){
  const {baseline,catalog,document}=input(depth),reviews=validateFeatureEditionReviews(baseline,catalog,document,tags),intl=new Set(['intl']);
  expect(['target','later','proposal','intl','cross-realm'].map(tag=>featureDisposition(tag,tags,intl,reviews))).toEqual(['standard','post-edition','post-edition','ecma402-only','harness-only']);
  requirePostEditionFeatureTags(baseline,tags,reviews);expect(postEditionFeatureTags(tags,reviews)).toEqual(['later','proposal']);
  expect(scopeFor('test/language/main.js',['later'],new Set(postEditionFeatureTags(tags,reviews)),reviews)).toMatchObject({scope:'post-edition',reason:expect.stringContaining(document.sources[0]!.commit)});
  expect(scopeFor('test/language/main.js',['target'],new Set(postEditionFeatureTags(tags,reviews)),reviews).scope).toBe('in-scope');
  expect(scopeFor('test/harness/main.js',['later'],new Set(['later']),reviews).scope).toBe('runner-self-test');
  expect(scopeFor('test/intl402/main.js',['later'],new Set(['later']),reviews).scope).toBe('ecma402');
  expect(()=>featureDisposition('unknown',tags,intl,reviews)).toThrow('invalid feature edition review');
 }
 const imported=input(2),file=structuredClone(imported.document.sources[0]!),text='<emu-clause id="new-import"></emu-clause>';
 file.specSource='imports/feature.emu';file.id=featureIntroductionId(file);file.excerpts=[{clause:'new-import',byteStart:0,byteEnd:Buffer.byteLength(text),text,sha256:sha256Text(text)}];imported.document.sources.push(file);imported.document.reviews[0]!.evidence.push({source:file.id,introducedClauses:['new-import']});
 expect(validateFeatureEditionReviews(imported.baseline,imported.catalog,imported.document,tags).has('later')).toBe(true);
 const inconsistent=structuredClone(imported);inconsistent.document.sources[1]!.tree='8'.repeat(40);expect(()=>validateFeatureEditionReviews(inconsistent.baseline,inconsistent.catalog,inconsistent.document,tags)).toThrow('inconsistent introduction tree');
 const unsafe=structuredClone(imported);unsafe.document.sources[1]!.specSource='../feature.emu';unsafe.document.sources[1]!.id=featureIntroductionId(unsafe.document.sources[1]!);expect(()=>validateFeatureEditionReviews(unsafe.baseline,unsafe.catalog,unsafe.document,tags)).toThrow('introduction identity');
 const primary=input(1),peer=structuredClone(primary.document.sources[0]!),peerText='<emu-clause id="peer-node"></emu-clause>';
 peer.repository='https://github.com/tc39/proposal-test.git';peer.specSource='proposal/spec.emu';peer.id=featureIntroductionId(peer);peer.excerpts=[{clause:'peer-node',byteStart:0,byteEnd:Buffer.byteLength(peerText),text:peerText,sha256:sha256Text(peerText)}];primary.document.sources.push(peer);primary.document.reviews[0]!.evidence.push({source:peer.id,introducedClauses:['peer-node']});primary.document.reviews[0]!.primarySource='https://github.com/tc39/proposal-test/pull/1';
 expect(validateFeatureEditionReviews(primary.baseline,primary.catalog,primary.document,tags).has('later')).toBe(true);
 expect(introductionCheckout(peer)).not.toBe(introductionCheckout(primary.document.sources[0]!));
 expect(featureIntroductionTrees(primary.document).some(source=>source.repository===peer.repository)).toBe(true);
 for(const repository of ['http://github.com/tc39/proposal-test.git','https://github.com/else/proposal-test.git','https://tc39@github.com/tc39/proposal-test.git','https://github.com/tc39/proposal-test.git?query=1','file:///tmp/proposal-test.git']){
  const invalid=structuredClone(primary);invalid.document.sources[1]!.repository=repository;invalid.document.sources[1]!.id=featureIntroductionId(invalid.document.sources[1]!);expect(()=>validateFeatureEditionReviews(invalid.baseline,invalid.catalog,invalid.document,tags)).toThrow('introduction identity');
 }
 const unrelated=structuredClone(primary);unrelated.document.reviews[0]!.primarySource='https://github.com/tc39/unrepresented/pull/1';expect(()=>validateFeatureEditionReviews(unrelated.baseline,unrelated.catalog,unrelated.document,tags)).toThrow('review primary source authority');
 const original=input(2);
 for(const alter of [
  (value:typeof original)=>{value.document.target.commit='7'.repeat(40)},
  (value:typeof original)=>{value.catalog.anchors.push({id:'new-1'} as ClauseCatalog['anchors'][number])},
  (value:typeof original)=>{value.document.sources[0]!.excerpts[0]!.text+=' '},
  (value:typeof original)=>{value.document.sources[0]!.excerpts[0]!.byteStart=-1},
  (value:typeof original)=>{value.document.reviews[0]!.evidence[0]!.introducedClauses=['absent']},
  (value:typeof original)=>{value.document.reviews[0]!.feature='unknown'},
  (value:typeof original)=>{value.document.reviews[0]!.feature='proposal'},
  (value:typeof original)=>{value.document.reviews[0]!.feature='intl'},
  (value:typeof original)=>{value.document.reviews.push(structuredClone(value.document.reviews[0]!))},
  (value:typeof original)=>{value.document.sources[0]!.repository='https://example.com/source.git'},
  (value:typeof original)=>{value.document.sources[0]!.tree='partial'},
  (value:typeof original)=>{value.document.reviews[0]!.reviewedBy=''},
  (value:typeof original)=>{value.document.reviews[0]!.primarySource='https://example.com/pr'},
 ]){const value=structuredClone(original);alter(value);expect(()=>validateFeatureEditionReviews(value.baseline,value.catalog,value.document,tags)).toThrow('invalid feature edition review');}
 expect(()=>validateFeatureEditionReviews(original.baseline,original.catalog,null as unknown as FeatureEditionReviews,tags)).toThrow('invalid feature edition review');
 const value=structuredClone(original);value.baseline.test262.postEditionFeatureTags=['proposal'];expect(()=>requirePostEditionFeatureTags(value.baseline,tags,validateFeatureEditionReviews(value.baseline,value.catalog,value.document,tags))).toThrow('baseline derived scope collection');
});

test('reviewed standard tag rejoins the exact primary introduction and pinned target',async()=>{
 const baseline=await loadBaseline(),catalog=await readJson<ClauseCatalog>(path.join(complianceDir,'clauses.json')),tags=parseFeatureRegistry(await fs.readFile(path.join(defaultCacheRoot,'test262/features.txt'),'utf8'));
 const {document,reviews}=await loadFeatureEditionReviews(baseline,catalog,tags);await verifyFeatureIntroductions(document);requirePostEditionFeatureTags(baseline,tags,reviews);
 for(const review of reviews.values())expect(featureDisposition(review.feature,tags,new Set(baseline.test262.ecma402FeatureTags),reviews)).toBe('post-edition');
 await expect(verifyFeatureIntroductions(document,path.join(defaultCacheRoot,'missing-edition-evidence'))).rejects.toThrow('checkout is missing');
 const corrupt=structuredClone(document);corrupt.sources[0]!.specSourceSha256='0'.repeat(64);await expect(verifyFeatureIntroductions(corrupt)).rejects.toThrow('primary source bytes');
 const corruptTree=structuredClone(document),seen=new Set<string>(),duplicate=corruptTree.sources.find(source=>{const key=featureIntroductionTreeId(source);if(seen.has(key))return true;seen.add(key);return false;});expect(duplicate).toBeDefined();duplicate!.tree='0'.repeat(40);await expect(verifyFeatureIntroductions(corruptTree)).rejects.toThrow('inconsistent introduction tree');
 const corruptExcerpt=structuredClone(document);corruptExcerpt.sources[0]!.excerpts[0]!.byteStart++;await expect(verifyFeatureIntroductions(corruptExcerpt)).rejects.toThrow('primary clause forest bytes');
});
