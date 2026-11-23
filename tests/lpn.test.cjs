// node tests/lpn.test.cjs
const {readFileSync}=require('node:fs');
const assert=require('node:assert/strict');
const html=readFileSync('index.html','utf8');
const js=html.split('<script>')[1]?.split('</script>')[0];
assert.ok(js,'script HTML présent');
new Function(js);
const start=js.indexOf('const LOCAL_ALTS='),end=js.indexOf('let state=',start);
assert.ok(start>=0&&end>start,'moteur LPN présent');
const core=js.slice(start,end);
const alts=[200,450,500,1150,1516,1920,2400,2832];
const preamble='const A_MIN=450,A_MAX=4810;const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));const MODEL_POINTS='+JSON.stringify(alts.map(a=>({a})))+';let state={points:{}};';
const m=new Function(preamble+core+'return {estimateLpn,wetBulbC,cleanObservations,setObs:(arr)=>{obsValid=arr}};')();
function sample({zero=1600,rh=95,rate=.3,wind=5,hours=1}={}){
 return alts.map(a=>{
  const t=(zero-a)*.0065;
  const precipitation=Array.from({length:12},(_,i)=>i>=5-hours&&i<=5?rate:0);
  return {current:{temperature_2m:t,relative_humidity_2m:rh,wind_speed_10m:wind,precipitation:rate},
   hourly:{temperature_2m:Array(12).fill(t),relative_humidity_2m:Array(12).fill(rh),
    wind_speed_10m:Array(12).fill(wind),precipitation}};
 });
}
const estimate=(opts)=>m.estimateLpn(sample(opts),5,true);
assert.ok(Math.abs(m.wetBulbC(0,100,1500))<.01,'air saturé : Tw = T');
assert.ok(m.wetBulbC(2,65,1500)<2,'air sec : Tw < T');
const weak=estimate({zero:1600,rh:95,rate:.3});
const heavy=estimate({zero:1600,rh:95,rate:5,hours:3});
const dry=estimate({zero:1600,rh:65,rate:.3});
const warm=estimate({zero:3200,rh:95,rate:6,hours:3});
const windy=estimate({zero:1600,rh:95,rate:5,hours:3,wind:38});
assert.equal(weak.isoDrop,0,'pas de refroidissement supplémentaire sous faible pluie');
assert.ok(heavy.isoDrop>0,'isothermie possible sous fortes précipitations durables');
assert.ok(heavy.level<weak.level,'LPN abaissée pendant épisode persistant');
assert.ok(dry.level<weak.level,'évaporation en atmosphère sèche');
assert.equal(warm.isoDrop,0,'températures trop chaudes : pas de correction');
assert.equal(windy.isoDrop,0,'vent soutenu : pas de refroidissement isotherme renforcé');
assert.ok(heavy.level<heavy.iso0,'LPN sous l’isotherme');
const now=new Date().toISOString();
const good={name:'station montagne',lat:45.45,lon:6.50,altitude:1516,time:now,temperature:1,humidity:95,precipitation_1h:4};
assert.equal(m.cleanObservations({stations:[good]}).length,1,'station récente proche acceptée');
assert.equal(m.cleanObservations({stations:[{...good,time:new Date(Date.now()-90*60000).toISOString()}]}).length,0,'observation périmée refusée');
assert.equal(m.cleanObservations({stations:[{...good,lat:48.8}]}).length,0,'observation éloignée refusée');
m.setObs([good]);
const observed=estimate({zero:1600,rh:95,rate:4,hours:3});
assert.ok(observed.obsUsed,'stations intégrées si disponibles');
const future=m.estimateLpn(sample({zero:1600,rh:95,rate:4,hours:3}),5,false);
assert.equal(future.obsUsed,false,'observations non appliquées aux prévisions futures');
m.setObs([]);
// La neige au sol peut être fusionnée sans modifier le moteur LPN.
const snowStart=js.indexOf('function snowDepthCm('),snowEnd=js.indexOf('/* Extrêmes du jour civil',snowStart);
assert.ok(snowStart>0&&snowEnd>snowStart,'fonctions de neige au sol présentes');
const depth=new Function(js.slice(snowStart,snowEnd)+'return {snowDepthCm,modelPoint};')();
const hourly={time:['2026-11-23T10:00'],snow_depth:[0.275]};
const sampleDepth={current:{time:'2026-11-23T10:00',temperature_2m:0.4},hourly};
assert.equal(depth.snowDepthCm(sampleDepth,0),27.5,'repli Open-Meteo en m converti en cm');
assert.equal(depth.modelPoint(sampleDepth).snow,27.5,'valeur au sol réutilisée dans les repères');
sampleDepth._snowFusionHourly=[{depth:31.7}];
assert.equal(depth.modelPoint(sampleDepth).snow,31.7,'SnowFusion prioritaire quand présent');
sampleDepth._snowFusionHourly=[null];
assert.equal(depth.modelPoint(sampleDepth).snow,27.5,'repli si heure SnowFusion absente');
sampleDepth.hourly.snow_depth=[null];
assert.equal(depth.modelPoint(sampleDepth).snow,null,'valeur manquante distincte de 0 cm');
assert.ok(js.includes("updateSnowOnlyFromMyWeather(docs,snowRevision)"),'fusion déclenchée après données LPN');
assert.ok(js.includes("past_hours:'48'"),'historique utilisé pour tassement du manteau');
console.log('Neige au sol : priorité SnowFusion, repli modèle et données manquantes vérifiés.');

console.log('LPN : tests réussis (syntaxe, humidité, précipitations, isothermie, observations).');


const demoJs=readFileSync('assets/valmorel-demo.js','utf8');
const demoCss=readFileSync('assets/valmorel-demo.css','utf8');
new Function(demoJs);
assert.match(html,/assets\/valmorel-demo\.css/,'CSS de démonstration chargé');
assert.match(html,/type="module" src="\.\/assets\/valmorel-demo\.js/,'module Valmorel chargé');
assert.match(demoJs,/lpnModeSwitch/,'sélecteur discret intégré');
assert.match(demoJs,/if\(active\)/,'démonstration activable indépendamment');
assert.match(demoJs,/altitude:1400/,'station 1400 m disponible');
assert.match(demoJs,/altitude:1920/,'Planchamp disponible');
assert.match(demoJs,/altitude:2400/,'Col du Mottet disponible');
for(const variable of ['temperature_2m','apparent_temperature','wind_speed_10m','wind_gusts_10m','snow_depth']) {
 assert.ok(demoJs.includes(variable),'variable météo présente : '+variable);
}
assert.match(demoJs,/applyMyWeatherSnowpack/,'SnowFusion réutilisé');
assert.match(demoJs,/VALMOREL_LIFTS_ENDPOINT/,'flux des remontées configurable');
assert.match(demoJs,/aucun temps d’attente fictif/i,'absence de fausses attentes');
assert.match(demoCss,/#valmorelDemo\[hidden\]/,'la version personnelle reste visible par défaut');
assert.match(demoCss,/@media\(max-width:900px\)/,'adaptation écran mobile');
assert.match(demoJs,/wind_direction_10m/,'direction du vent depuis le modèle');
assert.match(demoJs,/vdCompass-/,'boussole lisible par altitude');
assert.match(demoJs,/rotate\(/,'rotation de boussole animable');
assert.match(demoJs,/LOGO_URL/,'vrai logo issu de la logothèque officielle');
assert.match(demoJs,/Démo non officielle/,'absence de revendication de partenariat');
assert.match(demoJs,/SECTORS\.map\(sectorHTML\)/,'trois altitudes côte à côte sans interaction');
for(const lift of ['TC Planchamp','TS Biollène','TS Roset','TS Madeleine'])assert.ok(demoJs.includes(lift),'remontée officielle : '+lift);
assert.match(demoCss,/--red:#e21b2b/,'palette rouge Valmorel');
assert.match(demoCss,/\.vd-lifts-grid/,'affichage panneau des remontées');
assert.match(demoJs,/vdTomorrowIcon-/,'pictogramme pour demain');
assert.match(demoJs,/vdNowIcon-/,'pictogramme météo actuelle');
assert.match(demoJs,/weatherSvg/,'pictogrammes météo autonomes');
assert.match(demoJs,/daily\?\.weather_code\?\.\[1\]/,'code météo demain issu du bulletin journalier');
assert.match(demoJs,/vdPiste-/,'état de neige SUR LES PISTES');
assert.match(demoJs,/VALMOREL_PISTE_CONDITIONS_ENDPOINT/,'état pistes uniquement depuis un flux autorisé');
assert.match(demoJs,/À confirmer/,'état non inventé sans bulletin');
assert.equal(/DÉMONSTRATION INDÉPENDANTE · NON OFFICIELLE/.test(demoJs),false,'bandeau juridique superflu supprimé');
assert.match(demoCss,/grid-template-rows:/,'grille de hauteur déterminée pour écran TV');
assert.match(demoCss,/minmax\(0,1fr\)/,'zone centrale souple, sans recouvrement des remontées');
assert.match(demoCss,/\.vd-status\{display:none!important\}/,'statut répétitif masqué');
assert.match(demoCss,/\.vd-piste/,'styles des conditions sur pistes');
assert.match(demoCss,/\.vd-forecast-line/,'météo compacte sur deux jours');
assert.match(demoCss,/@media\(min-width:901px\)/,'affichage TV distinct du mobile');
console.log('Démo Valmorel : interface station, trois altitudes, direction du vent, boussoles et données vérifiées.');
