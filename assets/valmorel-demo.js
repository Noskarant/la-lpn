// Valmorel : prototype indépendant de signalétique, sans affiliation officielle.
const SECTORS=[
 {id:'station',name:'VALMOREL',altitude:1400,lat:45.461639,lon:6.443518},
 {id:'planchamp',name:'PLANCHAMP',altitude:1920,lat:45.449344,lon:6.424188},
 {id:'mottet',name:'COL DU MOTTET',altitude:2400,lat:45.446,lon:6.456}
];
const LIFTS=[
 {name:'TC Planchamp',aliases:['TC Planchamp','Planchamp']},
 {name:'TS Biollène',aliases:['TS Biollène','Biollène']},
 {name:'TS Roset',aliases:['TS Roset','Roset']},
 {name:'TS Madeleine',aliases:['TS Madeleine','Madeleine']}
];
const LOGO_URL='https://skipass.valmorel.com/media/image/valmorelb2c/cms/media/Logoth%C3%A8que/logo-valmorel-signature-moyen-format.png';
const $=id=>document.getElementById(id);
const n=x=>x===undefined||x===null||x===''||!Number.isFinite(Number(x))?null:Number(x);
const fmt=(v,d=0)=>v===null||!Number.isFinite(v)?'—':v.toLocaleString('fr-FR',{minimumFractionDigits:d,maximumFractionDigits:d});
const unit=(v,u,d=0)=>v===null||!Number.isFinite(v)?'—':fmt(v,d)+' '+u;
const clock=()=>new Date().toLocaleTimeString('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit'});
const date=()=>new Date().toLocaleDateString('fr-FR',{timeZone:'Europe/Paris',weekday:'long',day:'numeric',month:'long'});
const DIRECTIONS=['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO'];
function windName(degrees){
 const v=n(degrees);return v===null?'—':DIRECTIONS[Math.round(((v%360)+360)%360/22.5)%16];
}
function weatherLabel(code){
 const c=n(code);
 if(c===null)return 'PRÉVISIONS INDISPONIBLES';
 if(c===0)return 'ENSOLEILLÉ';
 if(c<=2)return 'ÉCLAIRCIES';
 if(c===3)return 'NUAGEUX';
 if(c<=48)return 'BROUILLARD';
 if([71,73,75,77,85,86].includes(c))return 'NEIGE';
 if(c>=95)return 'ORAGE';
 if(c>=51&&c<=67||c>=80&&c<=82)return 'PLUIE / AVERSES';
 return 'VARIABLE';
}
const switcher=document.createElement('button');
switcher.id='lpnModeSwitch';switcher.type='button';switcher.textContent='Démo Valmorel';
switcher.setAttribute('aria-pressed','false');document.body.append(switcher);
const root=document.createElement('section');root.id='valmorelDemo';root.hidden=true;
root.setAttribute('aria-label','Démo non officielle : informations météo pour Valmorel');
function sectorHTML(s){
 const k=s.id;
 return [
  '<article class="vd-sector" aria-label="'+s.name+' '+s.altitude+' m">',
  '<header class="vd-sector-head"><h2>'+s.name+'</h2><span class="vd-alt">'+fmt(s.altitude)+' m</span></header>',
  '<div class="vd-conditions"><div class="vd-temperature"><span class="vd-key">Température</span><strong class="vd-big" id="vdTemp-'+k+'">—</strong></div>',
  '<div class="vd-feels"><span class="vd-key">Ressenti</span><strong id="vdFeels-'+k+'">—</strong></div></div>',
  '<div class="vd-weather" id="vdWeather-'+k+'">CHARGEMENT</div>',
  '<div class="vd-snow-row"><span class="vd-key">Neige au sol*</span><strong id="vdSnow-'+k+'">—</strong></div>',
  '<div class="vd-wind"><div><span class="vd-key">Vent moyen</span><strong id="vdWind-'+k+'">—</strong></div>',
  '<div><span class="vd-key">Rafales</span><strong id="vdGust-'+k+'">—</strong></div></div>',
  '<div class="vd-bottom"><div class="vd-direction"><div class="vd-compass" aria-hidden="true"><div class="vd-needle" id="vdCompass-'+k+'"></div></div>',
  '<div><span class="vd-key">Vent de</span><strong class="vd-direction-value" id="vdDir-'+k+'">—</strong></div></div>',
  '<div class="vd-precip"><span class="vd-key">Précipitations 6 h</span><strong id="vdPrecip-'+k+'">—</strong></div></div>',
  '<div class="vd-status"><span class="vd-status-dot" id="vdDot-'+k+'"></span><span id="vdState-'+k+'">Actualisation…</span></div>',
  '</article>'
 ].join('');
}
root.innerHTML=[
 '<header class="vd-top">',
 '<div class="vd-logo"><img id="vdLogo" src="'+LOGO_URL+'" alt="Logo officiel Valmorel Le Grand Domaine">',
 '<span class="vd-logo-fallback">VALMOREL</span></div>',
 '<div class="vd-title">MÉTÉO & ENNEIGEMENT<small>LE GRAND DOMAINE · PAR ALTITUDE</small></div>',
 '<div class="vd-clock"><span id="vdDate">—</span><strong id="vdClock">—</strong></div>',
 '</header>',
 '<div class="vd-notice">DÉMONSTRATION INDÉPENDANTE · NON OFFICIELLE — aucune affiliation à Valmorel.</div>',
 '<section class="vd-summary" aria-label="Limite pluie-neige et isotherme">',
 '<div class="vd-summary-item"><div class="vd-summary-title">CONDITIONS EN MONTAGNE<small>Station · Planchamp · Col du Mottet</small></div></div>',
 '<div class="vd-summary-item"><span class="vd-summary-label">Limite pluie-neige estimée</span><strong id="vdLpn">—</strong><small>Estimation sur la vallée</small></div>',
 '<div class="vd-summary-item"><span class="vd-summary-label">Isotherme 0 °C</span><strong id="vdZero">—</strong><small>Estimation à partir du profil météo</small></div>',
 '</section>',
 '<main class="vd-main">',SECTORS.map(sectorHTML).join(''),'</main>',
 '<section class="vd-lifts" aria-label="Temps d’attente remontées mécaniques">',
 '<div class="vd-lifts-title"><strong>REMONTÉES MÉCANIQUES · TEMPS D’ATTENTE</strong><span id="vdLiftsStatus">Flux officiel non connecté</span></div>',
 '<div class="vd-lifts-grid">',
 LIFTS.map((lift,i)=>'<div class="vd-lift" id="vdLift-'+i+'"><span class="vd-lift-name">'+lift.name+'</span><strong id="vdLiftValue-'+i+'">—</strong></div>').join(''),
 '</div></section>',
 '<footer class="vd-footer"><span id="vdSource">* Neige au sol : prévision modélisée, non mesure terrain. Vent à 10 m. Données Open-Meteo.</span>',
 '<span>Démo non officielle · Logo affiché à des fins de présentation, autorisation requise pour usage public</span></footer>'
].join('');
document.body.append(root);
$('vdLogo').onerror=()=>{
 $('vdLogo').style.display='none';
 root.querySelector('.vd-logo-fallback').style.display='block';
};
let active=false,revision=0,controller=null,lastWeatherAt=0,records=new Map();
function put(id,value){$(id).textContent=value}
function tick(){
 put('vdClock',clock());put('vdDate',date());
 const lpn=String($('lpn-val')?.textContent||'').replace(/^≈\s*/,'').trim();
 put('vdLpn',lpn&&lpn!=='--'?lpn:'—');
 const iso=String($('m-method')?.textContent||'').match(/Iso 0 °C\s*:\s*(\d+)\s*m/);
 put('vdZero',iso?fmt(Number(iso[1]))+' m':'—');
}
function switchMode(isOn){
 active=Boolean(isOn);root.hidden=!active;
 switcher.textContent=active?'← Ma version':'Démo Valmorel';
 switcher.setAttribute('aria-pressed',String(active));
 switcher.setAttribute('aria-label',active?'Revenir à La LPN personnelle':'Afficher la démonstration Valmorel');
 document.title=active?'Valmorel — Démo météo non officielle':'Limite Pluie-Neige — Visualisation montagne premium';
 if(active){tick();if(!lastWeatherAt||Date.now()-lastWeatherAt>10*60000)void loadWeather();void loadLifts();}
 else{if(controller)controller.abort();revision++;}
}
switcher.onclick=()=>switchMode(!active);
function hourIndex(doc){
 const iso=String(doc.current?.time||'').slice(0,13);
 const pos=doc.hourly.time.findIndex(t=>t.slice(0,13)===iso);
 return pos>=0?pos:0;
}
function extract(doc){
 const i=hourIndex(doc),h=doc.hourly,c=doc.current||{};
 const v=key=>n(c[key])??n(h[key]?.[i]);
 const snow=n(h.snow_depth?.[i]),rain=h.precipitation?.slice(i,i+6)||[];
 return{
  temperature:v('temperature_2m'),feels:v('apparent_temperature'),
  wind:v('wind_speed_10m'),gust:v('wind_gusts_10m'),direction:v('wind_direction_10m'),
  weather:v('weather_code'),snow:snow===null?null:Math.max(0,Math.round(snow*1000)/10),
  precip6:rain.length===6&&rain.every(x=>n(x)!==null)?rain.reduce((a,b)=>a+Number(b),0):null,
  fusion:false
 };
}
function render(s,r){
 const k=s.id,yes=Boolean(r);
 put('vdTemp-'+k,yes?unit(r.temperature,'°C',1):'—');
 put('vdFeels-'+k,yes?unit(r.feels,'°C',1):'—');
 put('vdSnow-'+k,yes?unit(r.snow,'cm',1):'—');
 put('vdWind-'+k,yes?unit(r.wind,'km/h'):'—');
 put('vdGust-'+k,yes?unit(r.gust,'km/h'):'—');
 put('vdDir-'+k,yes?windName(r.direction):'—');
 put('vdPrecip-'+k,yes?unit(r.precip6,'mm',1):'—');
 put('vdWeather-'+k,yes?weatherLabel(r.weather):'PRÉVISIONS INDISPONIBLES');
 put('vdState-'+k,yes?'Prévisions · '+clock()+(r.fusion?' · SnowFusion':''):'Données indisponibles');
 $('vdDot-'+k).className='vd-status-dot '+(yes?'ok':'fail');
 const dir=yes?n(r.direction):null;
 $('vdCompass-'+k).style.transform='rotate('+(dir===null?0:dir)+'deg)';
 $('vdCompass-'+k).style.opacity=dir===null?'.25':'1';
}
async function fetchForecast(s,signal){
 const q=new URLSearchParams({
  latitude:String(s.lat),longitude:String(s.lon),elevation:String(s.altitude),
  timezone:'Europe/Paris',wind_speed_unit:'kmh',
  current:'temperature_2m,apparent_temperature,wind_speed_10m,wind_gusts_10m,wind_direction_10m,weather_code',
  hourly:'temperature_2m,apparent_temperature,wind_speed_10m,wind_gusts_10m,wind_direction_10m,weather_code,precipitation,snowfall,snow_depth,rain,shortwave_radiation',
  daily:'sunrise,sunset,temperature_2m_max,temperature_2m_min,precipitation_sum,rain_sum,snowfall_sum,weather_code',
  past_hours:'48',forecast_days:'2'
 });
 const res=await fetch('https://api.open-meteo.com/v1/forecast?'+q.toString(),{signal});
 if(!res.ok)throw new Error('Prévision météo '+s.id+' : HTTP '+res.status);
 const data=await res.json();
 if(!data?.current?.time||!Array.isArray(data?.hourly?.time))throw new Error('Prévision incomplète');
 return data;
}
async function loadWeather(){
 if(!active)return;
 const rev=++revision;
 if(controller)controller.abort();controller=new AbortController();
 const settled=await Promise.allSettled(SECTORS.map(s=>fetchForecast(s,controller.signal)));
 if(rev!==revision||!active)return;
 lastWeatherAt=Date.now();records=new Map();
 settled.forEach((item,i)=>{
  if(item.status==='fulfilled'){
   const r=extract(item.value);records.set(SECTORS[i].id,r);render(SECTORS[i],r);
  }else{
   render(SECTORS[i],null);
   if(item.reason?.name!=='AbortError')console.warn('Météo Valmorel indisponible',item.reason);
  }
 });
 const count=settled.filter(item=>item.status==='fulfilled').length;
 put('vdSource','* Neige au sol : estimation de modèle, non mesure en station. Vent à 10 m. '+count+'/3 secteurs météo · Open-Meteo.');
 void enrichSnow(settled,rev);
}
async function enrichSnow(settled,rev){
 const pairs=settled.map((result,i)=>({result,i})).filter(item=>item.result.status==='fulfilled');
 if(!pairs.length)return;
 try{
  const {applyMyWeatherSnowpack}=await import('./myweather-snowpack.js');
  const copies=pairs.map(item=>JSON.parse(JSON.stringify(item.result.value)));
  const points=pairs.map(item=>({a:SECTORS[item.i].altitude,lat:SECTORS[item.i].lat,lon:SECTORS[item.i].lon}));
  await applyMyWeatherSnowpack(copies,points);
  if(!active||rev!==revision)return;
  copies.forEach((doc,i)=>{
   const s=SECTORS[pairs[i].i],depth=n(doc._snowFusionHourly?.[hourIndex(doc)]?.depth),r=records.get(s.id);
   if(r&&depth!==null){r.snow=Math.max(0,Math.round(depth*10)/10);r.fusion=true;render(s,r);}
  });
  put('vdSource','* Neige au sol : estimation SnowFusion si disponible, sinon modèle Open-Meteo. Aucune mesure sur piste. Vent à 10 m.');
 }catch(err){console.warn('Neige SnowFusion indisponible',err);}
}
function normalize(s){
 return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
}
function clearLifts(message){
 LIFTS.forEach((lift,i)=>{put('vdLiftValue-'+i,'—');$('vdLift-'+i).classList.remove('available');});
 put('vdLiftsStatus',message);
}
function setLifts(data){
 const updated=Date.parse(data?.updated_at||'');
 if(!Number.isFinite(updated)||updated>Date.now()+60000||Date.now()-updated>900000)throw new Error('Remontées : données périmées');
 if(!Array.isArray(data.lifts))throw new Error('Remontées : format invalide');
 clearLifts('Dernière mise à jour '+new Date(updated).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}));
 let count=0;
 for(const entry of data.lifts){
  const i=LIFTS.findIndex(lift=>lift.aliases.some(name=>normalize(name)===normalize(entry?.name)));
  const wait=n(entry?.wait_minutes);
  if(i<0||wait===null||wait<0||wait>120)continue;
  put('vdLiftValue-'+i,Math.round(wait)+' min');$('vdLift-'+i).classList.add('available');count++;
 }
 if(!count)clearLifts('Aucun temps disponible');
}
async function loadLifts(){
 // Aucun temps d’attente fictif : seul un endpoint officiel autorisé est accepté.
 const endpoint=window.VALMOREL_LIFTS_ENDPOINT;
 if(!endpoint){clearLifts('Flux officiel non connecté');return;}
 try{
  const url=new URL(endpoint,location.href);
  if(url.protocol!=='https:')throw new Error('HTTPS requis');
  const res=await fetch(url,{cache:'no-store'});
  if(!res.ok)throw new Error('HTTP '+res.status);
  if(active)setLifts(await res.json());
 }catch(err){
  if(active)clearLifts('Temps d’attente indisponibles');
  console.warn('Remontées non disponibles',err);
 }
}
tick();
setInterval(()=>{if(active){tick();if(Date.now()-lastWeatherAt>10*60000)void loadWeather();}},30000);
setInterval(()=>{if(active)void loadLifts();},120000);
