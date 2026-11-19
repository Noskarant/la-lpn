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
console.log('LPN : tests réussis (syntaxe, humidité, précipitations, isothermie, observations).');
