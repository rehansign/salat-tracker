/* Offline prayer-time + Qibla calculation (no network needed) */
(function(g){
const R=Math.PI/180,sin=d=>Math.sin(d*R),cos=d=>Math.cos(d*R),tan=d=>Math.tan(d*R);
const asin=x=>Math.asin(x)/R,acos=x=>Math.acos(Math.max(-1,Math.min(1,x)))/R,atan2=(y,x)=>Math.atan2(y,x)/R,acot=x=>Math.atan(1/x)/R;
const fixA=a=>a-360*Math.floor(a/360),fixH=a=>a-24*Math.floor(a/24);
const METHODS={
 UAE:{n:'UAE (18.2° / 18.2°)',fajr:18.2,isha:18.2},
 MWL:{n:'Muslim World League',fajr:18,isha:17},
 UMM:{n:'Umm al-Qura (Makkah)',fajr:18.5,ishaMin:90},
 EGY:{n:'Egyptian Authority',fajr:19.5,isha:17.5},
 KHI:{n:'Karachi (Univ. of Islamic Sciences)',fajr:18,isha:18},
 ISNA:{n:'ISNA (North America)',fajr:15,isha:15}
};
function julian(y,m,d){if(m<=2){y-=1;m+=12}const A=Math.floor(y/100),B=2-A+Math.floor(A/4);return Math.floor(365.25*(y+4716))+Math.floor(30.6001*(m+1))+d+B-1524.5}
function sunPos(jd){const D=jd-2451545,gg=fixA(357.529+0.98560028*D),q=fixA(280.459+0.98564736*D),L=fixA(q+1.915*sin(gg)+0.02*sin(2*gg)),e=23.439-0.00000036*D;
 const RA=fixH(atan2(cos(e)*sin(L),cos(L))/15);return{decl:asin(sin(e)*sin(L)),eqt:q/15-RA}}
/* returns hours (0-24, local to tz) for fajr,sunrise,dhuhr,asr,maghrib,isha */
function calc(y,m,d,lat,lng,tz,M,asrFactor){
 const jd0=julian(y,m,d)-lng/360;
 const mid=t=>fixH(12-sunPos(jd0+t).eqt);
 const ang=(a,t,ccw)=>{const dc=sunPos(jd0+t).decl;const h=acos((-sin(a)-sin(dc)*sin(lat))/(cos(dc)*cos(lat)))/15;return mid(t)+(ccw?-h:h)};
 const asr=(f,t)=>{const dc=sunPos(jd0+t).decl;return ang(-acot(f+tan(Math.abs(lat-dc))),t)};
 let T={fajr:5,sunrise:6,dhuhr:12,asr:13,maghrib:18,isha:18};
 for(let i=0;i<2;i++){const t=k=>T[k]/24;
  T={fajr:ang(M.fajr,t('fajr'),true),sunrise:ang(0.833,t('sunrise'),true),dhuhr:mid(t('dhuhr')),asr:asr(asrFactor,t('asr')),maghrib:ang(0.833,t('maghrib')),isha:M.ishaMin?18:ang(M.isha,t('isha'))};}
 const adj=tz-lng/15;for(const k in T)T[k]+=adj;
 T.dhuhr+=1/60;
 if(M.ishaMin)T.isha=T.maghrib+M.ishaMin/60;
 return T;
}
function qibla(lat,lng){const dl=39.8262-lng,p2=21.4225;
 return fixA(atan2(sin(dl)*cos(p2),cos(lat)*sin(p2)-sin(lat)*cos(p2)*cos(dl)))}
g.SalatCalc={METHODS,calc,qibla,fixA};
/* Umm al-Qura month table (generated from ICU, 1440-1460 AH) so Hijri dates work on any phone */
const UQ_START=17785,UQ_LENS='01011101010010101101101001010101101010101010101101011001010101110100100101110110010010111010101001011011010100101011011010100101011011100100110110110010010110110101001010110110101001011010110100101010111010010010111101001001011101100100101101101010010101101010110';
const HM=['Muharram','Safar',"Rabi' I","Rabi' II",'Jumada I','Jumada II','Rajab',"Sha'ban",'Ramadan','Shawwal',"Dhu al-Qi'dah",'Dhu al-Hijjah'];
function hijri(y,m,d){const n=Math.round(Date.UTC(y,m-1,d)/864e5);
 if(n>=UQ_START){let s=UQ_START;for(let i=0;i<UQ_LENS.length;i++){const L=UQ_LENS[i]==='1'?30:29;if(n<s+L)return{d:n-s+1,m:HM[i%12],y:1440+Math.floor(i/12)};s+=L}}
 const jd=n+2440587.5,isl=(Y,M,D)=>D+Math.ceil(29.5*(M-1))+(Y-1)*354+Math.floor((3+11*Y)/30)+1948439.5-1;
 const Y=Math.floor((30*(jd-1948439.5)+10646)/10631),M=Math.min(12,Math.ceil((jd-(29+isl(Y,1,1)))/29.5)+1);
 return{d:jd-isl(Y,M,1)+1,m:HM[M-1],y:Y}}
g.SalatCalc.hijri=hijri;

})(typeof window!=='undefined'?window:globalThis);
