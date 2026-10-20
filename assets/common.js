// API client + shared helpers (all account data now lives on the server)
async function api(path,body){
 const opt={credentials:'same-origin',headers:{'Content-Type':'application/json'}};
 if(body!==undefined){opt.method='POST';opt.body=JSON.stringify(body)}
 let r;try{r=await fetch('/api/'+path,opt)}catch(e){throw new Error('Cannot reach the server. Is it running?')}
 let j={};try{j=await r.json()}catch(e){}
 if(!r.ok){const err=new Error(j.error||('Error '+r.status));err.status=r.status;throw err}
 return j}
const fmt=n=>Number(n).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function theme(){const t=localStorage.getItem('nexa_theme')||'dark';document.documentElement.dataset.theme=t;return t}
function toggleTheme(){localStorage.setItem('nexa_theme',theme()==='dark'?'light':'dark');theme()}
theme();
