// Valmorel TV demo — separate UI and forecast; does not alter the personal LPN engine.
// Illustrative panorama (not georeferenced) and unofficial branding.
// Official ski lift queue data must be supplied by an authorized feed.
const WEATHER_API='https://api.open-meteo.com/v1/forecast';
const SECTORS=[
  {id:'station',name:'Valmorel station',altitude:1400,lat:45.461639,lon:6.443518},
  {id:'planchamp',name:'Sommet Planchamp',altitude:1920,lat:45.449344,lon:6.424188},
  // Approximate area representative point: verify the precise summit GPS before commercial launch.
  {id:'mottet',name:'Col du Mottet',altitude:2400,lat:45.446,lon:6.456}
];
const $=(id)=>document.getElementById(id);
const number=v=>v===null||v===undefined||v===''||!Number.isFinite(Number(v))?null:Number(v);
const amount=(v,d=0)=>number(v)===null?'—':Number(v).toLocaleString('fr-FR',{maximumFractionDigits:d,minimumFractionDigits:d});
const unit=(v,u,d=0)=>number(v)===null?'—':amount(v,d)+' '+u;
const now=()=>new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris',weekday:'long',day:'numeric',month:'long'});
const clock=()=>new Date().toLocaleTimeString('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit'});
const LIMITS={wind:null,gusts:null,temp:null,feels:null,snow:null,precip6:null,cloud:20,day:1,code:3};
let selected=SECTORS[0], weather=null, active=false, loadingRevision=0, controller=null;
let landscapeFrame=0, landscapeTime=0, landscapeSize=[0,0], snowSource='Open-Meteo', lastLoaded=0;
const cache=new Map();
const switcher=document.createElement('button');
switcher.id='lpnModeSwitch';switcher.type='button';switcher.textContent='◈ Démo Valmorel';
switcher.setAttribute('aria-label','Ouvrir la démonstration Valmorel');
switcher.setAttribute('aria-pressed','false');
document.body.append(switcher);
const root=document.createElement('section');
root.id='valmorelDemo';root.hidden=true;root.setAttribute('aria-label','Démonstration immersive Valmorel non officielle');
root.innerHTML=[
  '<header class="vd-header">',
    '<div><div class="vd-brand">VALMOREL<i> /</i></div><div class="vd-brand-caption">DÉMONSTRATION NON OFFICIELLE</div></div>',
    '<div class="vd-header-title">Cockpit météo montagne<strong>La montagne, en direct.</strong></div>',
    '<div class="vd-clock"><span id="vdDate">—</span><strong id="vdClock">—</strong></div>',
  '</header>',
  '<div class="vd-stage">',
    '<canvas id="vdLandscape" aria-label="Illustration animée de montagnes enneigées" role="img"></canvas>',
    '<div class="vd-content">',
      '<div><div class="vd-eyebrow">Informations par altitude · Domaine de Valmorel</div>',
      '<h1 class="vd-title">Chaque altitude.<br>Une autre météo.</h1>',
      '<p class="vd-subtitle">Neige au sol, limite pluie-neige, température, vent et ressenti. Des repères lisibles pour profiter de la montagne.</p>',
      '<div class="vd-live"><span class="vd-dot"></span><span id="vdStatus" aria-live="polite">Chargement des prévisions…</span></div></div>',
      '<div class="vd-metrics">',
        '<div class="vd-metric"><span>Limite pluie-neige estimée</span><strong id="vdLpn">—</strong><small>Référence vallée · estimation</small></div>',
        '<div class="vd-metric"><span>Température à l’altitude</span><strong id="vdTemp">—</strong><small id="vdTempAlt">1 400 m · station</small></div>',
        '<div class="vd-metric"><span>Vent / rafales</span><strong id="vdWindGust">—</strong><small>km/h à 10 m du sol</small></div>',
        '<div class="vd-metric"><span>Température ressentie</span><strong id="vdFeels">—</strong><small>Ressenti estimé par le modèle</small></div>',
      '</div>',
    '</div>',
    '<aside class="vd-side" aria-label="Détails météorologiques">',
      '<div class="vd-side-title">Conditions en altitude</div>',
      '<label for="vdSector">Choisir un secteur</label>',
      '<select id="vdSector"><option value="station">Valmorel station · 1 400 m</option><option value="planchamp">Planchamp · 1 920 m</option><option value="mottet">Col du Mottet · 2 400 m</option></select>',
      '<div class="vd-altitude"><strong id="vdAlt">1 400 m</strong><span id="vdWeather">Prévisions en cours…</span></div>',
      '<div class="vd-conditions">',
        '<div class="vd-cond"><span>❄ Neige au sol</span><strong id="vdSnow">—</strong></div>',
        '<div class="vd-cond"><span>🌬 Vent moyen*</span><strong id="vdWind">—</strong></div>',
        '<div class="vd-cond"><span>💨 Rafales</span><strong id="vdGust">—</strong></div>',
        '<div class="vd-cond"><span>🌡 Ressenti</span><strong id="vdFeelSmall">—</strong></div>',
        '<div class="vd-cond"><span>☁ Isotherme 0 °C</span><strong id="vdZero">—</strong></div>',
        '<div class="vd-cond"><span>🌧 Précipitations 6 h</span><strong id="vdPrecip">—</strong></div>',
      '</div>',
      '<p style="font-size:10px;line-height:1.4;color:#bad0df" id="vdSnowSource">Neige au sol : estimation de modèle.</p>',
      '<div class="vd-lift"><div class="vd-side-title">Remontées · Temps d’attente</div>',
      '<div class="vd-lift-state" id="vdLiftState">Connexion au flux officiel requise · aucune durée fictive affichée.</div>',
      '<div id="vdLiftList" aria-live="polite"></div></div>',
      '<div class="vd-error" id="vdError" role="status"></div>',
    '</aside>',
  '</div>',
  '<footer class="vd-foot"><div class="vd-sectors">',
  SECTORS.map(s=>'<button type="button" class="vd-sector" data-sector="'+s.id+'" aria-pressed="'+(s.id==='station')+'">'+s.name+'<small>'+amount(s.altitude)+' m</small></button>').join(''),
  '</div><div class="vd-footnote">Prototype non officiel. Prévisions Open-Meteo/SnowFusion, non mesures locales. Relief illustratif, non géoréférencé. *Vent à 10 m.</div></footer>'
].join('');
document.body.append(root);
const canvas=$('vdLandscape'),ctx=canvas.getContext('2d',{alpha:false});
function setClock(){$('vdDate').textContent=now();$('vdClock').textContent=clock()}
function setMode(open){
 active=Boolean(open);root.hidden=!active;
 switcher.textContent=active?'← Ma version':'◈ Démo Valmorel';
 switcher.setAttribute('aria-pressed',String(active));
 switcher.setAttribute('aria-label',active?'Revenir à ma version de La LPN':'Ouvrir la démonstration Valmorel');
 if(active){
  document.title='Valmorel · Démonstration météo immersive — La LPN';
  setClock();copyValleyLpn();resizeLandscape();startLandscape();
  if(!lastLoaded||Date.now()-lastLoaded>300000)void loadWeather();
  void loadLifts();
 }else{
  document.title='Limite Pluie-Neige — Visualisation montagne premium';
  if(controller)controller.abort();loadingRevision++;
  if(landscapeFrame)cancelAnimationFrame(landscapeFrame);
  landscapeFrame=0;
 }
}
switcher.addEventListener('click',()=>setMode(!active));
root.querySelectorAll('[data-sector]').forEach(btn=>btn.addEventListener('click',()=>choose(btn.dataset.sector)));
$('vdSector').addEventListener('change',event=>choose(event.target.value));
function choose(id){
 const next=SECTORS.find(s=>s.id===id);
 if(!next)return;
 selected=next;$('vdSector').value=id;
 root.querySelectorAll('[data-sector]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.sector===id)));
 $('vdAlt').textContent=amount(next.altitude)+' m';
 $('vdTempAlt').textContent=next.name+' · '+amount(next.altitude)+' m';
 $('vdStatus').textContent='Chargement des prévisions · '+next.name;
 LIMITS.wind=LIMITS.gusts=LIMITS.temp=LIMITS.feels=LIMITS.snow=LIMITS.precip6=null;
 weather=null;snowSource='Open-Meteo';renderNumbers();
 if(active)void loadWeather();
}
function copyValleyLpn(){
 const value=$('lpn-val')?.textContent?.trim()||'—';
 $('vdLpn').textContent=value==='--'?'—':value;
 const iso=String($('m-method')?.textContent||'').match(/Iso 0 °C\s*:\s*(\d+)\s*m/);
 $('vdZero').textContent=iso?amount(Number(iso[1]))+' m':'—';
}
function describe(code){
 const n=number(code);
 if(n===null)return 'Météo indisponible';
 if(n===0)return 'Ciel dégagé';
 if(n<=2)return 'Éclaircies';
 if(n===3)return 'Nuageux';
 if(n<=48)return 'Brume / brouillard';
 if(n>=71&&n<=77||n===85||n===86)return 'Chutes de neige';
 if(n>=95)return 'Orage';
 if(n>=51&&n<=67||n>=80&&n<=82)return 'Pluie / averses';
 return 'Conditions variables';
}
function renderNumbers(){
 $('vdTemp').textContent=unit(LIMITS.temp,'°C',1);
 $('vdFeels').textContent=unit(LIMITS.feels,'°C',1);
 $('vdFeelSmall').textContent=unit(LIMITS.feels,'°C',1);
 $('vdWind').textContent=unit(LIMITS.wind,'km/h');
 $('vdGust').textContent=unit(LIMITS.gusts,'km/h');
 const wind=number(LIMITS.wind),gust=number(LIMITS.gusts);
 $('vdWindGust').textContent=wind===null&&gust===null?'—':(wind===null?'—':amount(wind))+' / '+(gust===null?'—':amount(gust));
 $('vdSnow').textContent=unit(LIMITS.snow,'cm',1);
 $('vdPrecip').textContent=unit(LIMITS.precip6,'mm',1);
 $('vdWeather').textContent=weather?describe(LIMITS.code):'Chargement…';
 $('vdSnowSource').textContent='Neige au sol : '+snowSource+' · estimation, pas mesure sur piste.';
}
function activeHourIndex(data){
 const times=data?.hourly?.time||[], current=String(data?.current?.time||'').slice(0,13);
 const exact=times.findIndex(time=>String(time).slice(0,13)===current);
 return exact>=0?exact:Math.max(0,times.findLastIndex(time=>String(time).slice(0,13)<=current));
}
async function fetchForecast(sector,signal){
 const q=new URLSearchParams({
  latitude:String(sector.lat),longitude:String(sector.lon),elevation:String(sector.altitude),timezone:'Europe/Paris',
  current:'temperature_2m,apparent_temperature,wind_speed_10m,wind_gusts_10m,weather_code,cloud_cover,is_day,precipitation,snowfall',
  hourly:'temperature_2m,apparent_temperature,wind_speed_10m,wind_gusts_10m,weather_code,cloud_cover,shortwave_radiation,rain,precipitation,snowfall,snow_depth',
  daily:'sunrise,sunset,temperature_2m_max,temperature_2m_min,precipitation_sum,rain_sum,snowfall_sum,weather_code',
  past_hours:'48',forecast_days:'2',wind_speed_unit:'kmh',temperature_unit:'celsius',precipitation_unit:'mm'
 });
 const response=await fetch(WEATHER_API+'?'+q,{signal});
 if(!response.ok)throw Error('API météo : HTTP '+response.status);
 const d=await response.json();
 if(!Array.isArray(d?.hourly?.time)||!d.current)throw Error('Données météo incomplètes');
 return d;
}
async function loadWeather(){
 if(!active)return;
 const sector=selected,revision=++loadingRevision;
 if(controller)controller.abort();
 controller=new AbortController();
 const cached=cache.get(sector.id);
 try{
  let data;
  if(cached&&Date.now()-cached.at<5*60000)data=cached.data;
  else{
   data=await fetchForecast(sector,controller.signal);
   cache.set(sector.id,{at:Date.now(),data});
  }
  if(revision!==loadingRevision||!active)return;
  weather=data;lastLoaded=Date.now();
  const i=activeHourIndex(data),hour=data.hourly,cur=data.current;
  LIMITS.temp=number(cur.temperature_2m)??number(hour.temperature_2m?.[i]);
  LIMITS.feels=number(cur.apparent_temperature)??number(hour.apparent_temperature?.[i]);
  LIMITS.wind=number(cur.wind_speed_10m)??number(hour.wind_speed_10m?.[i]);
  LIMITS.gusts=number(cur.wind_gusts_10m)??number(hour.wind_gusts_10m?.[i]);
  LIMITS.cloud=number(cur.cloud_cover)??number(hour.cloud_cover?.[i])??20;
  LIMITS.day=number(cur.is_day)??1;
  LIMITS.code=number(cur.weather_code)??number(hour.weather_code?.[i])??3;
  LIMITS.snow=number(hour.snow_depth?.[i])===null?null:Math.max(0,Math.round(hour.snow_depth[i]*1000)/10);
 const six=hour.precipitation?.slice(i,i+6)||[];
 LIMITS.precip6=six.length===6&&six.every(v=>number(v)!==null)?six.reduce((sum,v)=>sum+number(v),0):null;
  snowSource='Open-Meteo Best Match';
  renderNumbers();
  $('vdStatus').textContent='Prévision actualisée · '+clock()+' · '+sector.name;
  $('vdError').textContent='';
  // Use exactly the snowpack fusion engine already shared by the personal LPN.
  // A failure leaves valid weather and base snow depth visible.
  void enrichSnowpack(sector,revision,data,i);
 }catch(error){
  if(revision!==loadingRevision||!active)return;
  if(error?.name==='AbortError')return;
  weather=null;
  const hadCache=Boolean(cached);
  if(hadCache){
   cache.delete(sector.id);
  }
  $('vdStatus').textContent='Prévisions indisponibles';
  $('vdError').textContent='Impossible de charger les données de '+sector.name+'. Réessayez dans quelques minutes.';
  console.warn('Démonstration Valmorel :',error);
 }
}
async function enrichSnowpack(sector,revision,data,index){
 try{
  const module=await import('./myweather-snowpack.js');
  const copy=JSON.parse(JSON.stringify(data));
  await module.applyMyWeatherSnowpack([copy],[{a:sector.altitude,lat:sector.lat,lon:sector.lon}]);
  if(revision!==loadingRevision||!active||selected.id!==sector.id)return;
  const depth=number(copy._snowFusionHourly?.[index]?.depth);
  if(depth!==null){
   LIMITS.snow=Math.max(0,Math.round(depth*10)/10);
   snowSource='SnowFusion (moteur MyWeather)';
   renderNumbers();
  }
 }catch(err){console.warn('SnowFusion Valmorel : modèle de secours conservé',err);}
}
function showLifts(payload){
 const list=$('vdLiftList');list.replaceChildren();
 const stamp=Date.parse(payload?.updated_at||'');
 if(!Number.isFinite(stamp)||Date.now()-stamp>15*60000||stamp>Date.now()+60000)throw Error('Flux non daté ou périmé');
 const lifts=Array.isArray(payload?.lifts)?payload.lifts:[];
 const valid=lifts.filter(v=>typeof v.name==='string'&&v.name.length<80&&Number.isFinite(Number(v.wait_minutes))&&Number(v.wait_minutes)>=0&&Number(v.wait_minutes)<=120).slice(0,8);
 if(!valid.length)throw Error('Aucune donnée remontée exploitable');
 for(const lift of valid){
  const line=document.createElement('div');line.className='vd-lift-item';
  const name=document.createElement('span');name.textContent=lift.name;
  const value=document.createElement('b');value.textContent=Math.round(Number(lift.wait_minutes))+' min';
  line.append(name,value);list.append(line);
 }
 $('vdLiftState').textContent='Temps transmis par le flux autorisé · '+new Date(stamp).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
}
async function loadLifts(){
 const url=window.VALMOREL_LIFTS_ENDPOINT;
 if(!url){$('vdLiftState').textContent='Flux officiel non connecté : aucun temps d’attente fictif affiché.';$('vdLiftList').replaceChildren();return;}
 try{
  const target=new URL(url,location.href);
  if(target.protocol!=='https:')throw Error('Endpoint sécurisé HTTPS requis');
  const response=await fetch(target,{cache:'no-store'});
  if(!response.ok)throw Error('Flux remontées HTTP '+response.status);
  const payload=await response.json();
  if(active)showLifts(payload);
 }catch(err){
  $('vdLiftState').textContent='Temps d’attente indisponibles · données officielles non validées';
  $('vdLiftList').replaceChildren();console.warn('Flux remontées :',err);
 }
}
function resizeLandscape(){
 const rect=canvas.getBoundingClientRect(),w=Math.max(1,Math.round(rect.width)),h=Math.max(1,Math.round(rect.height));
 if(landscapeSize[0]===w&&landscapeSize[1]===h)return;
 landscapeSize=[w,h];
 const scale=Math.min(2,window.devicePixelRatio||1);
 canvas.width=Math.ceil(w*scale);canvas.height=Math.ceil(h*scale);
 ctx.setTransform(scale,0,0,scale,0,0);
}
function wave(x,shift=0){
 return Math.sin(x*.014+shift)*.50+Math.sin(x*.036+shift*.8)*.24+Math.sin(x*.086+shift*.2)*.10;
}
function mountains(w,h,color,base,peaks,shift,snowLine){
 const pts=[];
 for(let x=-20;x<=w+20;x+=5){
  const normalized=x/w;
  const p=peaks.reduce((v,peak)=>v+peak.a*Math.exp(-Math.pow((normalized-peak.x)/peak.width,2)),0);
  const y=base-p+wave(x,shift)*9;
  pts.push([x,y]);
 }
 ctx.beginPath();ctx.moveTo(-30,h);for(const [x,y] of pts)ctx.lineTo(x,y);ctx.lineTo(w+30,h);ctx.closePath();
 ctx.fillStyle=color;ctx.fill();
 if(snowLine!==null){
  ctx.save();ctx.clip();
  const gleam=ctx.createLinearGradient(0,snowLine-90,w,snowLine+100);
  gleam.addColorStop(0,'#f5fcff');gleam.addColorStop(.6,'#c6dfea');gleam.addColorStop(1,'#90b5cb');
  ctx.fillStyle=gleam;ctx.fillRect(0,0,w,snowLine);
  ctx.globalAlpha=.33;ctx.strokeStyle='#546e84';ctx.lineWidth=1;
  for(let i=0;i<pts.length;i+=9){
   const [x,y]=pts[i];if(y>=snowLine+35)continue;
   ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(Math.sin(i)*16),y+22);ctx.stroke();
  }ctx.restore();
 }
}
function pine(x,y,s,color){
 ctx.fillStyle='#45372d';ctx.fillRect(x-s*.045,y-s*.33,s*.09,s*.33);
 ctx.fillStyle=color;
 for(const [f,p] of [[0,.15],[.19,.30],[.43,.45]]){
  ctx.beginPath();ctx.moveTo(x,y-s*(.93-f));
  ctx.lineTo(x-s*p,y-s*(.14+f*.1));ctx.lineTo(x+s*p,y-s*(.14+f*.1));ctx.fill();
 }
}
function chalet(x,y,s){
 ctx.fillStyle='#35434a';ctx.fillRect(x-s*.42,y-s*.35,s*.84,s*.35);
 ctx.fillStyle='#9d6b52';ctx.fillRect(x-s*.35,y-s*.31,s*.7,s*.3);
 ctx.fillStyle='#f4fbff';ctx.beginPath();ctx.moveTo(x-s*.57,y-s*.34);ctx.lineTo(x,y-s*.63);ctx.lineTo(x+s*.57,y-s*.34);ctx.closePath();ctx.fill();
 ctx.fillStyle='#f6c585';ctx.fillRect(x-s*.20,y-s*.24,s*.11,s*.1);ctx.fillRect(x+s*.13,y-s*.24,s*.11,s*.1);
}
function renderLandscape(timestamp){
 if(!active){landscapeFrame=0;return;}
 if(timestamp-landscapeTime<35){landscapeFrame=requestAnimationFrame(renderLandscape);return;}
 landscapeTime=timestamp;resizeLandscape();const [w,h]=landscapeSize;
 const night=LIMITS.day===0,gray=Math.min(1,Math.max(0,(LIMITS.cloud||0)/100));
 const gradient=ctx.createLinearGradient(0,0,0,h);
 gradient.addColorStop(0,night?'#071224':gray>.75?'#4e778e':'#3679a2');
 gradient.addColorStop(.6,night?'#25435c':gray>.75?'#8eafbd':'#a2cddc');
 gradient.addColorStop(1,night?'#41677a':'#e5f5f2');
 ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
 if(!night){
  const x=w*.75,y=h*.25;const glow=ctx.createRadialGradient(x,y,4,x,y,240);
  glow.addColorStop(0,'#fff9dcaa');glow.addColorStop(1,'#f9e4ae00');
  ctx.fillStyle=glow;ctx.fillRect(x-250,y-250,500,500);
  ctx.fillStyle='#fff9e8';ctx.beginPath();ctx.arc(x,y,24,0,Math.PI*2);ctx.fill();
 }else{
  ctx.fillStyle='#d0e7fa';
  for(let i=0;i<100;i++){const x=(Math.sin(i*129.43)*47581%1+1)%1*w;const y=(Math.sin(i*33.18)*41831%1+1)%1*h*.60;ctx.globalAlpha=.25+.55*((i%9)/9);ctx.fillRect(x,y,1.4,1.4)}
  ctx.globalAlpha=1;
 }
 // Slowly drifting clouds driven visually by modeled wind; not an observed sky image.
 const speed=3+(LIMITS.wind||0)*.21;
 ctx.save();ctx.globalAlpha=night?.17:(gray>.5?.52:.25);
 for(let c=0;c<8;c++){
  const xx=((c*.225+timestamp*speed/450000)%1.4-.25)*w;
  const yy=(.11+(c%4)*.09)*h;
  const r=w*(.13+(c%3)*.026);
  const g=ctx.createRadialGradient(xx,yy,3,xx,yy,r);
  g.addColorStop(0,'#f9fdff');g.addColorStop(1,'#ffffff00');
  ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(xx,yy,r,r*.28,0,0,Math.PI*2);ctx.fill();
 }ctx.restore();
 mountains(w,h,'#83a5b5',h*.67,[{x:.13,a:h*.26,width:.23},{x:.49,a:h*.29,width:.2},{x:.81,a:h*.29,width:.15}],1.5,h*.49);
 mountains(w,h,'#4a7893',h*.78,[{x:.30,a:h*.37,width:.21},{x:.70,a:h*.47,width:.21},{x:1.02,a:h*.23,width:.2}],2.5,h*.48);
 mountains(w,h,'#315e75',h*.94,[{x:.07,a:h*.36,width:.20},{x:.52,a:h*.25,width:.35},{x:1.00,a:h*.39,width:.26}],1.2,h*.63);
 mountains(w,h,'#173f4e',h*1.17,[{x:.23,a:h*.32,width:.38},{x:.77,a:h*.26,width:.40}],4.1,null);
 // Alpine forests and a few chalets provide scale without pretending to map actual buildings.
 for(let i=0;i<150;i++){
  const x=(i*79.917%w),y=h*(.88+(i%7)*.025);
  const s=h*(.027+(i%5)*.006);
  pine(x,y,s,i%3===0?'#214e49':'#133e40');
 }
 chalet(w*.26,h*.84,Math.max(18,h*.065));chalet(w*.32,h*.87,Math.max(18,h*.06));
 // Lift cable and small cabins, deliberately illustrative.
 ctx.strokeStyle='#d8e9eaa8';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(w*.44,h*.70);ctx.lineTo(w*.83,h*.43);ctx.stroke();
 for(let i=0;i<4;i++){
  const f=(i/4+timestamp*.000015)%1,x=w*(.44+.39*f),y=h*(.70-.27*f);
  ctx.strokeStyle='#e3e7eb';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+8);ctx.stroke();
  ctx.fillStyle='#d9e8e8';ctx.fillRect(x-6,y+8,12,10);ctx.strokeStyle='#2d556a';ctx.strokeRect(x-6,y+8,12,10);
 }
 // Subtle flakes during modeled snow, without visually claiming measured depth.
 if([71,73,75,77,85,86].includes(LIMITS.code)){
  ctx.fillStyle='#edf8ffbb';
  for(let i=0;i<100;i++){
   const x=(i*199.9+timestamp*(.012+(LIMITS.wind||0)*.0008))%(w+60)-30;
   const y=(i*83.5+timestamp*(.017+(i%4)*.002))%(h+30)-15;
   ctx.beginPath();ctx.arc(x,y,1+(i%3)*.45,0,Math.PI*2);ctx.fill();
  }
 }
 landscapeFrame=requestAnimationFrame(renderLandscape);
}
function startLandscape(){if(!landscapeFrame)landscapeFrame=requestAnimationFrame(renderLandscape)}
setClock();renderNumbers();copyValleyLpn();
setInterval(()=>{
 if(!active)return;
 setClock();copyValleyLpn();
 if(Date.now()-lastLoaded>10*60000)void loadWeather();
},30000);
setInterval(()=>{if(active)void loadLifts()},2*60000);
addEventListener('resize',()=>{if(active)resizeLandscape()},{passive:true});
