// node tests/mobile-panorama.test.cjs
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const html=readFileSync('index.html','utf8');
const script=html.split('<script>')[1]?.split('</script>')[0];
assert.ok(script,'JS de la page présent');
new Function(script);
for(const id of ['mobilePanorama','mobileCanvasTrack','scene-prev','scene-next']){
 assert.match(html,new RegExp('id="'+id+'"'),'contrôle '+id+' présent');
}
assert.match(html,/mobilePanorama.*?role="region"[^>]*tabindex="0"/,'panorama accessible clavier');
assert.match(html,/#mobilePanorama canvas\{display:block!important/,'canvas visible sur mobile');
assert.match(html,/overflow-x:auto/,'panorama défilable horizontalement');
assert.match(script,/function labels\(\)[\s\S]*?const choices=mobile\?new Set\(\[1150,1920,2400,3200,4810\]\)/,'repères allégés sur mobile');
assert.match(script,/lastMobileFrame<33/,'animation plafonnée à 30 images/s sur mobile');
assert.match(script,/scene-prev.*?scrollBy/,'navigation vers la gauche opérationnelle');
assert.match(script,/scene-next.*?scrollBy/,'navigation vers la droite opérationnelle');
const section=script.match(/function syncSceneHost\(\)\{[\s\S]*?\n\}/);
assert.ok(section,'changement de conteneur canvas');
const canvas={parentElement:null};
const scene={appendChild(el){el.parentElement=this}};
const app={insertBefore(el,ref){assert.equal(ref,mobileNode);el.parentElement=this}};
const mobileNode={};
const nodes={mobileCanvasTrack:scene,app,mobileSimple:mobileNode};
let isMobile=true;
const host=new Function('cv','$','matchMedia',section[0]+'\nreturn syncSceneHost;')(
 canvas,id=>nodes[id],()=>({matches:isMobile}));
host();
assert.equal(canvas.parentElement,scene,'canvas déplacé en panorama sur smartphone');
isMobile=false;
host();
assert.equal(canvas.parentElement,app,'canvas réinséré sur ordinateur');
assert.doesNotMatch(html,/id="m-obs"|id="obs-status"|modèle seul/,'pas de texte technique inutile');
console.log('Mobile panorama : tests de structure, navigation, affichage et redimensionnement réussis.');
