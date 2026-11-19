'use strict';
const VERSION='0.2';
const $=(s,e=document)=>e.querySelector(s);
const PR=['fajr','dhuhr','asr','maghrib','isha'];
const NAME={fajr:'Fajr',dhuhr:'Dhuhr',asr:'Asr',maghrib:'Maghrib',isha:'Isha'};
const CITIES={Sharjah:[25.3463,55.4209,4],Dubai:[25.2048,55.2708,4],'Abu Dhabi':[24.4539,54.3773,4],Ajman:[25.4052,55.5136,4],'Ras Al Khaimah':[25.7895,55.9432,4],Fujairah:[25.1288,56.3265,4],'Al Ain':[24.2075,55.7447,4],Makkah:[21.3891,39.8579,3],Madinah:[24.4672,39.6024,3],Riyadh:[24.7136,46.6753,3],Doha:[25.2854,51.531,3],Kuwait:[29.3759,47.9774,3],Muscat:[23.588,58.3829,4],Karachi:[24.8607,67.0011,5],Lahore:[31.5204,74.3587,5],Delhi:[28.6139,77.209,5.5],Dhaka:[23.8103,90.4125,6],Cairo:[30.0444,31.2357,'auto'],Istanbul:[41.0082,28.9784,'auto'],London:[51.5074,-0.1278,'auto']};
const DEF={theme:'auto',fmt24:false,city:'Sharjah',lat:25.3463,lng:55.4209,method:'UAE',hanafi:false,notif:false,adhan:true,adhanName:'',pp:{fajr:1,dhuhr:1,asr:1,maghrib:1,isha:1}};

/* ---------- storage (IndexedDB, on-device only) ---------- */
let _db;const idb=()=>_db||(_db=new Promise((res,rej)=>{const r=indexedDB.open('salat',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}));
async function kvGet(k){const d=await idb();return new Promise(r=>{const q=d.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>r(q.result);q.onerror=()=>r()})}
async function kvSet(k,v){const d=await idb();return new Promise(r=>{const t=d.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=()=>r();t.onerror=()=>r()})}
const S={set:{...DEF},logs:{},qada:0,fired:{}};
const save=()=>{kvSet('settings',S.set)};const saveLogs=()=>kvSet('logs',S.logs);

/* ---------- helpers ---------- */
const dkey=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const noon=d=>{const x=new Date(d);x.setHours(12,0,0,0);return x};
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
let cur=noon(new Date()),tab='today';
const isToday=()=>dkey(cur)===dkey(new Date());
function loc(){const s=S.set;if(s.city!=='GPS'&&CITIES[s.city]){const[c,l,t]=CITIES[s.city];return{lat:c,lng:l,tz:t}}return{lat:s.lat,lng:s.lng,tz:'auto'}}
function times(date){const L=loc(),tz=L.tz==='auto'?-date.getTimezoneOffset()/60:L.tz;
 const T=SalatCalc.calc(date.getFullYear(),date.getMonth()+1,date.getDate(),L.lat,L.lng,tz,SalatCalc.METHODS[S.set.method],S.set.hanafi?2:1);
 const out={};for(const k in T){const h=T[k];out[k]={h,ts:Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())+(h-tz)*36e5}}return out}
function fmt(h){let m=Math.round(h*60)%1440;if(m<0)m+=1440;let hh=Math.floor(m/60);const mm=String(m%60).padStart(2,'0');
 if(S.set.fmt24)return String(hh).padStart(2,'0')+':'+mm;const ap=hh>=12?'pm':'am';hh=hh%12||12;return hh+':'+mm+' '+ap}
const dur=ms=>{const m=Math.max(0,Math.round(ms/6e4));return m>=60?Math.floor(m/60)+'h '+(m%60)+'m':m+'m'};
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),2400)}
const prayed=v=>v==='ontime'||v==='late';
const complete=k=>S.logs[k]&&PR.every(p=>prayed(S.logs[k][p]));
const count=k=>S.logs[k]?PR.filter(p=>prayed(S.logs[k][p])).length:0;
function hijri(d){try{return new Intl.DateTimeFormat('en-u-ca-islamic-umalqura',{day:'numeric',month:'long',year:'numeric'}).format(d)}catch(e){return''}}

/* ---------- theme ---------- */
function applyTheme(){const m=matchMedia('(prefers-color-scheme: dark)').matches;const t=S.set.theme==='auto'?(m?'dark':'light'):S.set.theme;
 document.documentElement.dataset.theme=t;$('meta[name=theme-color]').content=t==='dark'?'#0b1011':'#f3f5f6'}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',applyTheme);

/* ---------- views ---------- */
const ICON={today:'<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',stats:'<path d="M5 20V10M12 20V4M19 20v-7"/>',qibla:'<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',settings:'<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>'};
const LABEL={today:'Today',stats:'Progress',qibla:'Qibla',settings:'Settings'};
function renderNav(){$('#tabs').innerHTML=Object.keys(ICON).map(k=>`<button class="${tab===k?'on':''}" data-a="tab" data-t="${k}"><svg viewBox="0 0 24 24">${ICON[k]}</svg>${LABEL[k]}</button>`).join('')}

function viewToday(){
 const T=times(cur),k=dkey(cur),L=S.logs[k]||{},now=Date.now();
 let nextP=null,nextTs=0;
 if(isToday()){for(const p of PR){if(T[p].ts>now){nextP=p;nextTs=T[p].ts;break}}
  if(!nextP){const tm=times(addDays(cur,1));nextP='fajr';nextTs=tm.fajr.ts;}}
 const done=count(k);
 const dstr=cur.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short'});
 return `<div class="head"><div><h1>${dstr}</h1><div class="mut sm">${hijri(cur)}</div></div>
  <div class="nav"><button class="ib" data-a="prev" aria-label="Previous day">‹</button><button class="ib" data-a="next" aria-label="Next day" ${isToday()?'disabled':''}>›</button></div></div>
  ${isToday()?`<div class="card pad next"><div><div class="mut sm">Next prayer</div><b>${NAME[nextP]}</b></div><div style="text-align:right"><div style="font-weight:600">${fmt(times(nextTs>T.isha.ts+1&&nextP==='fajr'?addDays(cur,1):cur)[nextP].h)}</div><div class="mut sm" id="cd">in ${dur(nextTs-now)}</div></div></div>`:`<div style="margin-bottom:12px"><button class="pill" data-a="today">Back to today</button></div>`}
  <div class="card">${PR.map(p=>`<div class="row ${nextP===p?'cur':''}"><div class="nm"><b>${NAME[p]}</b><span>${fmt(T[p].h)}</span></div><div class="seg">
   ${[['ontime','✓','On time'],['late','◐','Late'],['missed','✕','Missed']].map(([s,i,l])=>`<button class="b ${s} ${L[p]===s?'on':''}" data-a="set" data-p="${p}" data-s="${s}" aria-label="${NAME[p]} ${l}">${i}</button>`).join('')}</div></div>`).join('')}</div>
  <div class="bar"><i style="width:${done*20}%"></i></div>
  <div class="legend"><span>✓ On time</span><span>◐ Late</span><span>✕ Missed</span></div>
  <p class="mut sm" style="text-align:center;margin-top:10px">${done} of 5 prayed · Sunrise ${fmt(T.sunrise.h)}</p>`}

function streaks(){const keys=Object.keys(S.logs).filter(complete).sort();let best=0,run=0,prev=null;
 for(const k of keys){const d=new Date(k+'T12:00:00');run=prev&&Math.round((d-prev)/864e5)===1?run+1:1;best=Math.max(best,run);prev=d}
 let d=noon(new Date());if(!complete(dkey(d)))d=addDays(d,-1);let c=0;while(complete(dkey(d))){c++;d=addDays(d,-1)}
 return{cur:c,best}}
function viewStats(){
 const st=streaks();let on=0,tot=0;for(let i=0;i<30;i++){const L=S.logs[dkey(addDays(new Date(),-i))];if(L)for(const p of PR){if(L[p]){tot++;if(L[p]==='ontime')on++}}}
 const missed=Object.values(S.logs).reduce((a,L)=>a+PR.filter(p=>L[p]==='missed').length,0);const owed=Math.max(0,missed-S.qada);
 const today=noon(new Date()),dow=today.getDay(),start=addDays(today,-(11*7+dow));let cells='';
 for(let i=0;i<84;i++){const d=addDays(start,i);if(d>today){cells+='<i class="f"></i>';continue}cells+=`<i class="l${count(dkey(d))}" title="${dkey(d)}"></i>`}
 let wk='';for(let i=6;i>=0;i--){const d=addDays(today,-i),n=count(dkey(d));wk+=`<div><i style="height:${Math.max(4,n/5*64)}px"></i>${d.toLocaleDateString('en-GB',{weekday:'narrow'})}</div>`}
 return `<div class="head"><h1>Progress</h1></div>
 <div class="grid2"><div class="card stat"><b>${st.cur}</b><span class="mut sm">Day streak</span></div><div class="card stat"><b>${st.best}</b><span class="mut sm">Best streak</span></div>
 <div class="card stat"><b>${tot?Math.round(on/tot*100):0}%</b><span class="mut sm">On time, 30 days</span></div><div class="card stat"><b>${owed}</b><span class="mut sm">Qada owed</span></div></div>
 <h2>Last 7 days</h2><div class="card pad"><div class="week">${wk}</div></div>
 <h2>Last 12 weeks</h2><div class="card pad"><div class="heat">${cells}</div></div>
 <h2>Qada</h2><div class="card pad qada"><div><b>${owed} owed</b><div class="mut sm">${S.qada} made up so far</div></div><div class="seg"><button class="btn sec" data-a="qada" data-n="-1" ${S.qada?'':'disabled'}>Undo</button><button class="btn" data-a="qada" data-n="1" ${owed?'':'disabled'}>Made up one</button></div></div>`}

let heading=null,qOn=false;
function viewQibla(){const L=loc(),q=SalatCalc.qibla(L.lat,L.lng);
 let ticks='';for(let a=0;a<360;a+=10){const m=a%90===0;ticks+=`<line x1="100" y1="${m?8:12}" x2="100" y2="${m?20:17}" stroke="var(--mut)" stroke-width="${m?2:1}" transform="rotate(${a} 100 100)"/>`}
 return `<div class="head"><div><h1>Qibla</h1><div class="mut sm">${S.set.city==='GPS'?'My location':S.set.city}</div></div></div>
 <div class="qbig">${Math.round(q)}°</div><div class="mut sm" style="text-align:center">from true north</div>
 <div class="qwrap" style="position:relative"><div class="ptr" id="ptr"></div>
 <div id="dial" style="transform:rotate(${heading==null?0:-heading}deg)"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="94" fill="var(--card)" stroke="var(--line)" stroke-width="2"/>${ticks}
  <text x="100" y="40" text-anchor="middle" font-size="13" font-weight="700" fill="var(--miss)">N</text><text x="162" y="105" text-anchor="middle" font-size="11" fill="var(--mut)">E</text><text x="100" y="172" text-anchor="middle" font-size="11" fill="var(--mut)">S</text><text x="38" y="105" text-anchor="middle" font-size="11" fill="var(--mut)">W</text>
  <g transform="rotate(${q} 100 100)"><line x1="100" y1="100" x2="100" y2="34" stroke="var(--ac)" stroke-width="3" stroke-linecap="round"/><rect x="90" y="14" width="20" height="20" rx="3" fill="var(--ac)"/><rect x="90" y="19" width="20" height="3" fill="var(--card)" opacity=".55"/></g>
  <circle cx="100" cy="100" r="5" fill="var(--ac)"/></svg></div></div>
 <p class="mut sm" id="qmsg" style="text-align:center">${qOn?(heading==null?'Waiting for compass…':'Turn until the Kaaba icon points to the top mark.'):'Hold the phone flat, then enable the compass.'}</p>
 <div style="text-align:center;margin-top:8px">${qOn?'':'<button class="btn" data-a="compass">Enable compass</button>'}</div>
 <p class="mut sm" style="text-align:center;margin-top:14px">Keep away from metal and magnets. Move the phone in a figure 8 if the reading drifts.</p>`}

const Y=(on)=>`<span class="sw ${on?'on':''}"></span>`;
function viewSettings(){const s=S.set,perm='Notification'in window?Notification.permission:'unsupported';
 return `<div class="head"><h1>Settings</h1></div>
 <h2>Appearance</h2><div class="card"><div class="set"><span>Theme</span><div class="tabs">${['auto','light','dark'].map(t=>`<button class="${s.theme===t?'on':''}" data-a="theme" data-v="${t}">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}</div></div>
 <div class="set"><span>24-hour time</span><button data-a="fmt">${Y(s.fmt24)}</button></div></div>
 <h2>Prayer times</h2><div class="card"><div class="set"><span>City</span><select data-c="city">${Object.keys(CITIES).map(c=>`<option ${s.city===c?'selected':''}>${c}</option>`).join('')}<option value="GPS" ${s.city==='GPS'?'selected':''}>My location</option></select></div>
 <div class="set"><span>Use phone location</span><button class="btn sec" data-a="gps">Update</button></div>
 <div class="set"><span>Method</span><select data-c="method">${Object.entries(SalatCalc.METHODS).map(([k,m])=>`<option value="${k}" ${s.method===k?'selected':''}>${m.n}</option>`).join('')}</select></div>
 <div class="set"><span>Asr</span><div class="tabs"><button class="${!s.hanafi?'on':''}" data-a="asr" data-v="0">Standard</button><button class="${s.hanafi?'on':''}" data-a="asr" data-v="1">Hanafi</button></div></div></div>
 <h2>Alerts</h2><div class="card"><div class="set"><span>Notifications${perm==='denied'?'<br><span class="sm mut">Blocked in Chrome site settings</span>':''}</span><button data-a="notif">${Y(s.notif&&perm==='granted')}</button></div>
 <div class="set"><span>Play adhan</span><button data-a="adhan">${Y(s.adhan)}</button></div>
 <div class="set" style="display:block"><div class="mut sm" style="margin-bottom:8px">Alert for</div><div class="chk">${PR.map(p=>`<button class="${s.pp[p]?'on':''}" data-a="pp" data-p="${p}">${NAME[p]}</button>`).join('')}</div></div>
 <div class="set"><span>Adhan audio<br><span class="sm mut">${s.adhanName||'Soft chime (default)'}</span></span><div class="seg"><label class="btn sec" style="cursor:pointer">Choose<input type="file" accept="audio/*" data-c="adhanfile" hidden></label>${s.adhanName?'<button class="btn sec" data-a="adhanclear">Reset</button>':''}</div></div>
 <div class="set"><span>Test alert</span><button class="btn sec" data-a="test">Play now</button></div></div>
 <p class="mut sm" style="margin:8px 4px">Android PWAs cannot wake themselves at prayer time. Alerts fire reliably while the app is open or recently used. Keep it open in the background for the adhan.</p>
 <h2>Data</h2><div class="card"><div class="set"><span>Backup</span><div class="seg"><button class="btn sec" data-a="export">Export</button><label class="btn sec" style="cursor:pointer">Import<input type="file" accept="application/json" data-c="import" hidden></label></div></div>
 <div class="set"><span>Erase all data</span><button class="btn danger" data-a="wipe">Erase</button></div></div>
 <p class="mut sm" style="text-align:center;margin-top:18px">Salat Tracker v${VERSION} · Everything is stored on this device</p>`}

function render(){renderNav();const a=$('#app');
 a.innerHTML=tab==='today'?viewToday():tab==='stats'?viewStats():tab==='qibla'?viewQibla():viewSettings();
 if(tab==='qibla')updateQibla()}

/* ---------- compass ---------- */
function onOri(e){let h=null;if(e.webkitCompassHeading!=null)h=e.webkitCompassHeading;else if(e.alpha!=null&&(e.absolute||e.type==='deviceorientationabsolute'))h=360-e.alpha;if(h==null)return;heading=(h+360)%360;if(tab==='qibla')updateQibla()}
let wasHit=false;
function updateQibla(){if(heading==null)return;const d=$('#dial');if(!d)return;d.style.transform=`rotate(${-heading}deg)`;
 const q=SalatCalc.qibla(loc().lat,loc().lng);let diff=Math.abs(((q-heading+540)%360)-180);const hit=diff<4;$('#ptr').classList.toggle('hit',hit);
 $('#qmsg').textContent=hit?'Facing the Qibla':'Turn until the Kaaba icon points to the top mark.';
 if(hit&&!wasHit&&navigator.vibrate)navigator.vibrate(40);wasHit=hit}
async function enableCompass(){
 try{if(typeof DeviceOrientationEvent!=='undefined'&&DeviceOrientationEvent.requestPermission){const r=await DeviceOrientationEvent.requestPermission();if(r!=='granted'){toast('Compass permission denied');return}}}catch(e){}
 addEventListener('deviceorientationabsolute',onOri,true);addEventListener('deviceorientation',onOri,true);qOn=true;render();
 setTimeout(()=>{if(heading==null)toast('No compass sensor found on this device')},2500)}

/* ---------- audio + alerts ---------- */
let adhanUrl=null,audio=null,actx=null;
function unlock(){try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();if(actx.state==='suspended')actx.resume()}catch(e){}}
function chime(){unlock();if(!actx)return;const t0=actx.currentTime;[523.25,659.25,783.99,1046.5,783.99,659.25,523.25].forEach((f,i)=>{const o=actx.createOscillator(),g=actx.createGain();o.type='sine';o.frequency.value=f;
 const t=t0+i*.55;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.25,t+.05);g.gain.exponentialRampToValueAtTime(.001,t+1.4);o.connect(g).connect(actx.destination);o.start(t);o.stop(t+1.5)});
 showStop(true);setTimeout(()=>showStop(false),4200)}
function showStop(v){$('#stop').style.display=v?'block':'none'}
function playAdhan(){if(adhanUrl){audio=audio||new Audio();audio.src=adhanUrl;audio.onended=()=>showStop(false);audio.play().then(()=>showStop(true)).catch(()=>chime())}else chime()}
function stopAdhan(){if(audio){audio.pause();audio.currentTime=0}showStop(false)}
async function notify(title,body,tag){if(!('Notification'in window)||Notification.permission!=='granted')return;
 try{const reg=await navigator.serviceWorker.ready;await reg.showNotification(title,{body,tag,icon:'icon-192.png',badge:'icon-192.png',vibrate:[200,100,200],renotify:true})}catch(e){try{new Notification(title,{body,tag,icon:'icon-192.png'})}catch(_){}}}
function fire(p){const T=times(new Date()),label=p==='test'?'Test alert':NAME[p];
 if(S.set.notif)notify(label,p==='test'?'Alerts are working.':`It is time for ${NAME[p]} · ${fmt(T[p].h)}`,'salat-'+p);
 if(S.set.adhan)playAdhan()}
async function tick(){const now=Date.now(),d=new Date(),T=times(d);let ch=false;
 for(const p of PR){if(!S.set.pp[p]||!(S.set.notif||S.set.adhan))continue;const k=dkey(d)+p;
  if(now>=T[p].ts&&now-T[p].ts<5*6e4&&!S.fired[k]){S.fired[k]=1;ch=true;fire(p)}}
 if(ch){const t=dkey(d);for(const k in S.fired)if(!k.startsWith(t))delete S.fired[k];kvSet('fired',S.fired)}
 const cd=$('#cd');if(cd&&tab==='today'&&isToday())render()}
/* Extra: schedule via Notification Triggers where the browser supports it (works with app closed) */
async function scheduleTriggers(){try{if(!S.set.notif||!('showTrigger'in Notification.prototype)||!window.TimestampTrigger)return;
 const reg=await navigator.serviceWorker.ready;for(const n of await reg.getNotifications({includeTriggered:false}))n.close();
 for(let i=0;i<3;i++){const d=addDays(new Date(),i),T=times(d);for(const p of PR){if(!S.set.pp[p]||T[p].ts<=Date.now())continue;
  await reg.showNotification(NAME[p],{body:`It is time for ${NAME[p]} · ${fmt(T[p].h)}`,tag:'t-'+dkey(d)+p,icon:'icon-192.png',showTrigger:new TimestampTrigger(T[p].ts)})}}}catch(e){}}

/* ---------- actions ---------- */
function dl(name,blob){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
const A={
 tab:d=>{tab=d.t;render()},
 prev:()=>{cur=addDays(cur,-1);render()},
 next:()=>{if(!isToday()){cur=addDays(cur,1);render()}},
 today:()=>{cur=noon(new Date());render()},
 set:d=>{const k=dkey(cur);S.logs[k]=S.logs[k]||{};S.logs[k][d.p]=S.logs[k][d.p]===d.s?undefined:d.s;if(!PR.some(p=>S.logs[k][p]))delete S.logs[k];saveLogs();render()},
 qada:d=>{S.qada=Math.max(0,S.qada+ +d.n);kvSet('qada',S.qada);render()},
 theme:d=>{S.set.theme=d.v;save();applyTheme();render()},
 fmt:()=>{S.set.fmt24=!S.set.fmt24;save();render()},
 asr:d=>{S.set.hanafi=d.v==='1';save();scheduleTriggers();render()},
 adhan:()=>{S.set.adhan=!S.set.adhan;save();unlock();render()},
 pp:d=>{S.set.pp[d.p]=S.set.pp[d.p]?0:1;save();scheduleTriggers();render()},
 notif:async()=>{if(!('Notification'in window)){toast('Notifications not supported here');return}
  if(S.set.notif){S.set.notif=false;save();render();return}
  const r=Notification.permission==='granted'?'granted':await Notification.requestPermission();S.set.notif=r==='granted';save();if(r!=='granted')toast('Permission not granted');else scheduleTriggers();render()},
 test:()=>{unlock();fire('test')},
 adhanclear:async()=>{S.set.adhanName='';adhanUrl=null;await kvSet('adhanBlob',null);save();render()},
 compass:enableCompass,
 gps:()=>{if(!navigator.geolocation){toast('Location not available');return}toast('Getting location…');
  navigator.geolocation.getCurrentPosition(p=>{S.set.city='GPS';S.set.lat=+p.coords.latitude.toFixed(4);S.set.lng=+p.coords.longitude.toFixed(4);save();scheduleTriggers();render();toast('Location updated')},()=>toast('Location permission denied'),{timeout:15000,maximumAge:6e5})},
 export:()=>dl('salat-backup-'+dkey(new Date())+'.json',new Blob([JSON.stringify({app:'salat-tracker',v:VERSION,logs:S.logs,qada:S.qada,settings:S.set},null,1)],{type:'application/json'})),
 wipe:async()=>{if(!confirm('Erase all logs and settings on this device?'))return;S.logs={};S.qada=0;S.fired={};S.set={...DEF,pp:{...DEF.pp}};adhanUrl=null;
  for(const k of['logs','qada','fired','settings','adhanBlob'])await kvSet(k,null);applyTheme();render();toast('All data erased')}
};
document.addEventListener('click',e=>{const t=e.target.closest('[data-a]');if(!t||t.disabled)return;unlock();A[t.dataset.a]?.(t.dataset,t)});
$('#stop').onclick=stopAdhan;
document.addEventListener('change',async e=>{const t=e.target.closest('[data-c]');if(!t)return;const c=t.dataset.c;
 if(c==='city'){S.set.city=t.value;save();scheduleTriggers();render()}
 else if(c==='method'){S.set.method=t.value;save();scheduleTriggers();render()}
 else if(c==='adhanfile'&&t.files[0]){const f=t.files[0];await kvSet('adhanBlob',f);S.set.adhanName=f.name;adhanUrl=URL.createObjectURL(f);save();render();toast('Adhan audio saved')}
 else if(c==='import'&&t.files[0]){try{const j=JSON.parse(await t.files[0].text());if(j.app!=='salat-tracker')throw 0;
  S.logs=j.logs||{};S.qada=j.qada||0;S.set={...DEF,...(j.settings||{}),pp:{...DEF.pp,...((j.settings||{}).pp||{})}};saveLogs();kvSet('qada',S.qada);save();applyTheme();render();toast('Backup imported')}catch(_){toast('That file is not a Salat Tracker backup')}}});

/* ---------- boot ---------- */
(async()=>{
 try{const s=await kvGet('settings');if(s)S.set={...DEF,...s,pp:{...DEF.pp,...(s.pp||{})}};S.logs=(await kvGet('logs'))||{};S.qada=(await kvGet('qada'))||0;S.fired=(await kvGet('fired'))||{};
  const b=await kvGet('adhanBlob');if(b)adhanUrl=URL.createObjectURL(b);
  if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch(e){}
 applyTheme();render();
 if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
 setInterval(tick,20000);tick();scheduleTriggers();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(isToday()&&dkey(cur)!==dkey(new Date()))cur=noon(new Date());tick();render()}});
})();
