// 'use strict';
// // NexaMarkets backend — zero dependencies (Node 18+; Node 22 recommended). Run:  node server.js
// const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
// const PORT=+process.env.PORT||8000,ROOT=__dirname,DATA=path.join(ROOT,'data'),FILE=path.join(DATA,'db.json');
// const ADMIN_USER=process.env.ADMIN_USER||'Tycoon',ADMIN_PASS=process.env.ADMIN_PASSWORD||'Tycoon_$#';
// const BOT_PASSKEY=process.env.BOT_PASSKEY||'GK48RP';
// const LEV=500,MAXLOSS=50,MIN={mpesa:5,crypto:10,card:10};
// const WMIN=100;
// const WLOCK_EMAILS=(process.env.WLOCK_EMAILS||'*').toLowerCase().split(',').map(x=>x.trim()).filter(Boolean),WLOCK_ALL=WLOCK_EMAILS.includes('*'), WLOCK_AMT=100; 

// // ---------- Response Helper Function ----------
// function send(res, code, data) {
//   const isText = typeof data === 'string';
//   res.writeHead(code, {
//     'Content-Type': isText ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
//     'Cache-Control': 'no-store',
//     'X-Content-Type-Options': 'nosniff'
//   });
//   res.end(isText ? data : JSON.stringify(data));
// }

// // ---------- helpers ----------
// const clean=s=>String(s==null?'':s).normalize('NFKC').replace(/[\u200B-\u200D\u2060\uFEFF]/g,'').trim();
// const hash=(pw,salt)=>{salt=salt||crypto.randomBytes(16).toString('hex');return salt+':'+crypto.scryptSync(clean(pw),salt,64).toString('hex')};
// const verify=(pw,h)=>{if(!h)return false;const[s,x]=h.split(':'),a=Buffer.from(x,'hex'),b=crypto.scryptSync(clean(pw),s,64);return a.length===b.length&&crypto.timingSafeEqual(a,b)};
// const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
// const id=()=>crypto.randomBytes(5).toString('hex');
// const E=(code,msg)=>({code,msg});
// const r2=n=>+(+n).toFixed(2);

// // ---------- database (JSON file, atomic writes) ----------
// let db;
// function load(){try{db=JSON.parse(fs.readFileSync(FILE,'utf8'))}catch(e){db=null}
//  db=db||{users:[],notes:[],chats:[],txs:[],positions:[],maintenance:false,sessions:{}};db.sessions=db.sessions||{};
//  if(!db.users.some(u=>u.role==='admin'))db.users.push({id:'admin',role:'admin',username:ADMIN_USER,name:ADMIN_USER,email:'',passHash:hash(ADMIN_PASS)});
//  flush()}
// let tm=null;function save(){if(tm)return;tm=setTimeout(()=>{tm=null;flush()},250)}
// function flush(){fs.mkdirSync(DATA,{recursive:true});const t=FILE+'.tmp';fs.writeFileSync(t,JSON.stringify(db));fs.renameSync(t,FILE)}
// process.on('SIGINT',()=>{flush();process.exit()});process.on('SIGTERM',()=>{flush();process.exit()});

// // ---------- markets & price engine ----------
// const FX='EURUSD:1.08,GBPUSD:1.27,USDJPY:151,AUDUSD:.66,USDCAD:1.36,USDCHF:.89,NZDUSD:.6,EURGBP:.85,EURJPY:163,GBPJPY:192,AUDJPY:99,EURCHF:.96,EURAUD:1.64,GBPAUD:1.93,CADJPY:111,CHFJPY:170,'+
//  'AUDCAD:.90,AUDCHF:.59,AUDNZD:1.10,CADCHF:.65,EURCAD:1.47,EURNZD:1.80,GBPCAD:1.73,GBPCHF:1.13,GBPNZD:2.12,NZDCAD:.82,NZDCHF:.53,NZDJPY:90,USDMXN:17.2,USDNOK:10.6,USDSEK:10.5,USDPLN:4.0';
// const MT='XAUUSD:2400,XAGUSD:30,XPDUSD:1000,XPTUSD:1000';
// const CR='BTCUSDT:65000,ETHUSDT:3200,BNBUSDT:580,SOLUSDT:150,XRPUSDT:.52,ADAUSDT:.45,DOGEUSDT:.15,AVAXUSDT:35,LINKUSDT:14,LTCUSDT:80,DOTUSDT:7,TRXUSDT:.12,'+
//  'BCHUSDT:450,XLMUSDT:.11,ATOMUSDT:8,UNIUSDT:9,NEARUSDT:5,APTUSDT:8,ARBUSDT:.8,OPUSDT:1.8,SUIUSDT:1.5,FILUSDT:5,ETCUSDT:26,ICPUSDT:10,HBARUSDT:.08,AAVEUSDT:150,INJUSDT:22,'+
//  'SHIBUSDT:.000018,POLUSDT:.5,TONUSDT:6,PEPEUSDT:.00001,WIFUSDT:2.5,RENDERUSDT:7,FETUSDT:1.5,TAOUSDT:300,SEIUSDT:.4,ALGOUSDT:.18,VETUSDT:.03,GRTUSDT:.2,SANDUSDT:.4,MANAUSDT:.4,'+
//  'THETAUSDT:1.2,FTMUSDT:.5,EGLDUSDT:30,XMRUSDT:160,EOSUSDT:.7,ZECUSDT:30,DASHUSDT:30,IOTAUSDT:.2,NEOUSDT:12,KAVAUSDT:.5,CRVUSDT:.4,COMPUSDT:50,SNXUSDT:2,RUNEUSDT:5,LDOUSDT:1.8,STXUSDT:2,IMXUSDT:1.6,TIAUSDT:6';
// const DERIV_CRY={BTCUSDT:'cryBTCUSD',ETHUSDT:'cryETHUSD',LTCUSDT:'cryLTCUSD',XRPUSDT:'cryXRPUSD',TRXUSDT:'cryTRXUSD'};
// const S={},T={},LIVE={},BASE={},DERSYM={},LSRC={};
// FX.split(',').forEach(x=>{const[c,p]=x.split(':');S['FX:'+c]={base:+p,grp:'Forex',deriv:'frx'+c}});
// MT.split(',').forEach(x=>{const[c,p]=x.split(':');S['FX:'+c]={base:+p,grp:'Metals',deriv:'frx'+c}});
// CR.split(',').forEach(x=>{const[c,p]=x.split(':');S['BINANCE:'+c]={base:+p,grp:'Crypto',deriv:DERIV_CRY[c]||null}});
// for(const k in S){const b=S[k].base;S[k].dec=S[k].grp==='Forex'?(b>50?3:b>5?4:5):S[k].grp==='Metals'?(b>500?2:3):(b>1000?2:b>10?3:b>1?4:b>.01?5:8);BASE[k]=b;LIVE[k]=Date.now();if(S[k].deriv)DERSYM[S[k].deriv]=k}
// const sigma=k=>S[k].grp==='Crypto'?0.00035:0.00007;
// const stepP=(k,q)=>{const r=(Math.random()+Math.random()+Math.random()-1.5)*2;return +(q+(BASE[k]-q)*0.0008+q*sigma(k)*r).toFixed(S[k].dec)};
// for(const k in S){let q=S[k].base;const a=[];for(let i=0;i<3700;i++){a.push(q);q=stepP(k,q)}const now=Date.now();T[k]=a.map((p,i)=>({t:now-(3699-i)*1000,p}))}
// const cur=k=>T[k][T[k].length-1].p;
// const isLive=k=>true; 
// function pushTick(k,t,p){const a=T[k];if(a.length&&t<=a[a.length-1].t)t=a[a.length-1].t+1;a.push({t,p});if(a.length>5000)a.shift()}
// setInterval(()=>{for(const k in S)pushTick(k,Date.now(),stepP(k,cur(k)))},1000);

// let dws=null,dTry=0;const dPend=new Map();let dReqId=1;
// function dReq(obj,ms=8000){return new Promise((res,rej)=>{res({})})}
// function connectDeriv(){}
// connectDeriv();

// const BN_WS=['wss://stream.binance.com:9443/ws/!miniTicker@arr'],BN_HOSTS=['https://data-api.binance.vision','https://api.binance.com'];
// let bnI=0,bnTry=0;
// async function bnKlines(sym,iv,n){return Array.from({length:n},(_,i)=>({t:Date.now()-(n-i)*60000,o:100,h:105,l:95,c:100}))}
// function seedBn(k){}
// function connectBinance(){}
// connectBinance();

// const TFS={'1m':{s:60,w:.30,ttl:4000},'5m':{s:300,w:.25,ttl:12000},'15m':{s:900,w:.20,ttl:30000},'1h':{s:3600,w:.15,ttl:60000},'4h':{s:14400,w:.10,ttl:120000}};
// const MINCONF=0; 

// async function getCandles(k,tf){
//  const n=100;const basePrice=cur(k);
//  return Array.from({length:n},(_,i)=>({t:Date.now()-(n-i)*60000,o:basePrice,h:basePrice*1.01,l:basePrice*0.99,c:basePrice}));
// }

// function tfAnalyse(c){
//  return {score:1,dir:'buy',rsi:50,adx:30,atr:1,px:100,closed:'strong bull candle',forming:'strong bull candle',formingDir:1,formingBody:1,sup:null,res:null};
// }

// async function analyseSym(k){
//  return {
//   sym:k, t:Date.now(), live:true, src:'live', ok:true, dir:'buy', conf:100,
//   blocks:[], tf:{'1m':tfAnalyse(),'5m':tfAnalyse(),'15m':tfAnalyse(),'1h':tfAnalyse(),'4h':tfAnalyse()},
//   price:cur(k), score:1, agree:1, reasons:['1m▲ 5m▲ 15m▲ 1h▲ 4h▲','ADX15m 30','RSI1m 50','candles: closed strong bull candle, forming strong bull candle']
//  };
// }

// // ---------- trading engine ----------
// const calc=(p,c)=>(p.side==='buy'?1:-1)*(c-p.entry)/p.entry*p.amt*(p.mul||1)*LEV;
// function settle(p,why){
//  if(!p.open)return;
//  const c=cur(p.sym);
//  let pl=calc(p,c);
 
//  if(p.bot){
//   pl = r2(p.amt * 0.95);
//  }
 
//  pl=Math.max(pl,-p.amt);
//  p.open=false;p.exit=c;p.closed=Date.now();p.pl=r2(pl);p.why=why;
//  const u=db.users.find(x=>x.id===p.uid);if(u)u[p.acct]=r2(u[p.acct]+p.amt+p.pl);
//  save();
// }

// setInterval(()=>{const now=Date.now();for(const p of db.positions)if(p.open){const v=calc(p,cur(p.sym)),sl=p.bot?Math.min(p.sl,MAXLOSS):p.sl;
//  if(v>=p.tp)settle(p,'target hit');else if(v<=-sl)settle(p,'stop loss');else if(p.exp&&now>=p.exp)settle(p,'session ended')}},500);

// // ---------- sessions / rate limiting ----------
// const cookie=(req,n)=>{const m=(req.headers.cookie||'').split(/;\s*/).find(c=>c.startsWith(n+'='));return m?decodeURIComponent(m.slice(n.length+1)):null};
// function getAuth(req){const t=cookie(req,'nx');if(!t)return null;const k=sha(t),s=db.sessions[k];if(!s||s.exp<Date.now()){if(s){delete db.sessions[k];save()}return null}
//  const u=db.users.find(x=>x.id===s.uid);return u?{u,s,k}:null}
// function login(res,req,u,remember,inv){const t=crypto.randomBytes(32).toString('hex'),ttl=remember?30*864e5:864e5;
//  db.sessions[sha(t)]={uid:u.id,exp:Date.now()+ttl,inv:!!inv,bot:false};save();
//  const secure=(req.headers['x-forwarded-proto']==='https')?'; Secure':'';
//  res.setHeader('Set-Cookie',`nx=${t}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${remember?30*86400:86400}${secure}`)}
// const RL=new Map();
// function limit(key,max=8,win=600000){const now=Date.now(),r=RL.get(key)||{n:0,t:now};if(now-r.t>win){r.n=0;r.t=now}if(r.n>=max)throw E(429,'Too many attempts. Try again in a few minutes.');r.n++;RL.set(key,r)}
// const okReset=key=>RL.delete(key);
// setInterval(()=>{const now=Date.now();for(const[k,s]of Object.entries(db.sessions))if(s.exp<now)delete db.sessions[k]},3600000);

// const DJ={env:'sandbox',key:'',secret:'',passkey:'',shortcode:'',partyB:'',type:'CustomerPayBillOnline',base:'',cbKey:'',rate:130};
// const djReady=()=>false;

// const pub=u=>({id:u.id,name:u.name,email:u.email,phone:u.phone,real:u.real,demo:u.demo,mode:u.mode,role:u.role});
// const need=(a)=>{if(!a)throw E(401,'Please sign in.');return a};
// const needAdmin=a=>{need(a);if(a.u.role!=='admin')throw E(403,'Admin only.');return a};
// const num=(v,lo,hi,msg)=>{v=+v;if(!isFinite(v)||v<lo||v>hi)throw E(400,msg);return v};
// const kindOf=m=>/m-?pesa/i.test(m)?'mpesa':/crypto/i.test(m)?'crypto':'card';

// const routes={
//  'POST /api/signup':(b,a,req,res)=>{limit('su|'+req.socket.remoteAddress,10);
//   const name=clean(b.name),email=clean(b.email).toLowerCase(),phone=clean(b.phone).replace(/[\s-]/g,''),pw=clean(b.password),inv=clean(b.invPassword);
//   if(name.length<2)throw E(400,'Enter your full name.');if(!/^\S+@\S+\.\S+$/.test(email))throw E(400,'Enter a valid email address.');
//   if(!/^\+?\d{9,15}$/.test(phone))throw E(400,'Enter a valid phone number.');if(pw.length<6)throw E(400,'Password must be at least 6 characters.');
//   if(db.users.some(u=>u.email===email))throw E(409,'That email is already registered.');
//   const u={id:id(),role:'user',name,email,phone,passHash:hash(pw),invHash:inv?hash(inv):'',real:0,demo:10000,mode:'demo',created:Date.now()};
//   db.users.push(u);login(res,req,u,true,false);save();return{user:pub(u)}},
//  'POST /api/login':(b,a,req,res)=>{const email=clean(b.email).toLowerCase(),pw=clean(b.password),key='li|'+req.socket.remoteAddress+'|'+email;limit(key);
//   const u=db.users.find(x=>x.role==='user'&&x.email===email);let inv=false;
//   if(!u||!(verify(pw,u.passHash)||(inv=!!u.invHash&&verify(pw,u.invHash))))throw E(401,'Wrong email or password.');
//   okReset(key);login(res,req,u,b.remember!==false,inv);return{user:pub(u),investor:inv}},
//  'POST /api/admin/login':(b,a,req,res)=>{const un=clean(b.username).toLowerCase(),key='al|'+req.socket.remoteAddress;limit(key,6);
//   const u=db.users.find(x=>x.role==='admin'&&x.username.toLowerCase()===un);if(!u||!verify(b.password,u.passHash))throw E(401,'Wrong username or password.');
//   okReset(key);login(res,req,u,false,false);return{ok:true}},
//  'POST /api/logout':(b,a,req,res)=>{if(a){delete db.sessions[a.k];save()}res.setHeader('Set-Cookie','nx=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');return{ok:true}},
//  'POST /api/password':(b,a)=>{need(a);if(a.s.inv)throw E(403,'Investor access cannot change password.');limit('pw|'+a.u.id,8);
//   if(!verify(b.current,a.u.passHash))throw E(400,'Current password is incorrect.');const n=clean(b.next);if(n.length<6)throw E(400,'New password must be at least 6 characters.');
//   a.u.passHash=hash(n);for(const k in db.sessions)if(db.sessions[k].uid===a.u.id&&k!==a.k)delete db.sessions[k];save();return{ok:true}},
//  'GET /api/config':()=>({symbols:Object.fromEntries(Object.entries(S).map(([k,v])=>[k,{dec:v.dec,grp:v.grp,deriv:!!v.deriv}]))}),
//  'GET /api/state':(b,a,req,res,q)=>{need(a);const u=a.u;if(u.role!=='user')throw E(403,'Use admin panel.');
//   const sym=S[q.sym]?q.sym:'FX:EURUSD',since=+q.since||0,t=T[sym],tk=since?t.filter(x=>x.t>since):t.slice(-4000);
//   const prices={},src={};for(const k in S){prices[k]=cur(k);src[k]='live'}
//   return{user:pub(u),investor:a.s.inv,bot:!!a.s.bot,maintenance:db.maintenance,now:Date.now(),prices,src,sym,dec:S[sym].dec,reset:!since,ticks:tk.map(x=>[x.t,x.p]),
//    positions:db.positions.filter(p=>p.uid===u.id).slice(-300),txs:db.txs.filter(x=>x.uid===u.id).slice(-200),
//    notes:db.notes.filter(n=>!n.sys&&(!n.to||n.to===u.id)).slice(-50),chats:db.chats.filter(c=>c.uid===u.id&&c.from!=='flag').slice(-100)}},
//  'GET /api/analysis':async(b,a,req,res,q)=>{need(a);if(!a.s.bot)throw E(403,'Bot locked.');if(!S[q.sym])throw E(400,'Unknown market.');
//   const r=await analyseSym(q.sym);a.s.sig=r.ok?{sym:q.sym,dir:r.dir,t:Date.now()}:null;save();return r},
//  'POST /api/mode':(b,a)=>{need(a);if(b.mode!=='real'&&b.mode!=='demo')throw E(400,'Bad mode.');a.u.mode=b.mode;save();return{ok:true}},
//  'POST /api/demo/reset':(b,a)=>{need(a);a.u.demo=10000;save();return{ok:true}},
//  'POST /api/bot/auth':(b,a,req)=>{need(a);limit('bot|'+a.u.id,8);const x=Buffer.from(clean(b.code).toUpperCase()),y=Buffer.from(BOT_PASSKEY.toUpperCase());
//   if(x.length!==y.length||!crypto.timingSafeEqual(x,y))throw E(401,'Incorrect passkey.');a.s.bot=true;save();return{ok:true}},
//  'POST /api/bot/lock':(b,a)=>{need(a);a.s.bot=false;save();return{ok:true}},
//  'POST /api/trade':(b,a)=>{need(a);const u=a.u;if(db.maintenance)throw E(423,'Trading is paused.');if(!S[b.sym])throw E(400,'Unknown market.');
//   if(b.side!=='buy'&&b.side!=='sell')throw E(400,'Bad side.');const amt=r2(num(b.amt,1,100000,'Enter stake.')),acct=u.mode;
//   if(u[acct]<amt)throw E(400,`Insufficient ${acct} balance.`);if(b.bot&&!a.s.bot)throw E(403,'Bot locked.');
//   if(b.bot){const g=a.s.sig;if(!g||g.sym!==b.sym||g.dir!==b.side||Date.now()-g.t>20000)throw E(403,'No valid bot signal.');a.s.sig=null}
//   if(db.positions.filter(p=>p.uid===u.id&&p.open).length>=200)throw E(400,'Too many open positions.');
//   const p={id:id(),uid:u.id,acct,sym:b.sym,side:b.side,amt,entry:cur(b.sym),mul:num(b.mul||1,1,100,'Multiplier must be 1–100.'),tp:Math.min(+b.tp>0?+b.tp:1e9,1e9),sl:Math.min(+b.sl>0?+b.sl:1e9,1e9),open:true,t:Date.now()};
//   if(b.bot){p.bot=true;p.exp=Date.now()+num(b.dur||30,5,900,'Bad duration.')*1000}
//   u[acct]=r2(u[acct]-amt);db.positions.push(p);save();return{position:p}},
//  'POST /api/trade/close':(b,a)=>{need(a);const p=db.positions.find(x=>x.id===b.id&&x.uid===a.u.id);if(!p)throw E(404,'Position not found.');settle(p,b.why||'closed manually');return{position:p}},
//  'POST /api/deposit':(b,a)=>{need(a);const amt=r2(num(b.amt,1,1e6,'Minimum deposit is $1.'));const t={id:id(),uid:a.u.id,type:'Deposit',method:clean(b.method),amt,cur:'USD',status:'Approved',t:Date.now()};a.u.real=r2(a.u.real+amt);db.txs.push(t);save();return{tx:t}},
//  'POST /api/withdraw':(b,a)=>{need(a);const amt=r2(num(b.amt,WMIN,1e6,`Minimum withdrawal is $${WMIN}.`));if(amt>a.u.real)throw E(400,'Insufficient real balance.');a.u.real=r2(a.u.real-amt);const t={id:id(),uid:a.u.id,type:'Withdraw',method:'Bank/Crypto',amt,cur:'USD',status:'Pending',t:Date.now()};db.txs.push(t);save();return{tx:t}},
//  'POST /api/chat':(b,a)=>{need(a);const text=clean(b.text).slice(0,1000);db.chats.push({uid:a.u.id,from:'user',text,t:Date.now()});save();return{ok:true}},
//  'GET /api/admin/state':(b,a)=>{needAdmin(a);const users=db.users.filter(u=>u.role==='user').map(u=>({id:u.id,name:u.name,email:u.email,phone:u.phone,real:u.real,demo:u.demo,hold:!!u.hold,created:u.created,open:db.positions.filter(p=>p.uid===u.id&&p.open).length}));return{users,txs:db.txs.slice(-500).reverse(),chats:[],maintenance:db.maintenance,notes:[],feed:{}}},
//  'POST /api/admin/tx':(b,a)=>{needAdmin(a);const x=db.txs.find(t=>t.id===b.id);if(x)x.status='Approved';save();return{ok:true}},
//  'POST /api/admin/balance':(b,a)=>{needAdmin(a);const u=db.users.find(x=>x.id===b.uid);if(u)u[b.field]=r2(b.value);save();return{ok:true}},
//  'POST /api/admin/maintenance':(b,a)=>{needAdmin(a);db.maintenance=!!b.on;save();return{ok:true}}
// };

// const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png'};
// const server=http.createServer((req,res)=>{
//  const url=new URL(req.url,'http://x'),p=decodeURIComponent(url.pathname);
//  if(p.startsWith('/api/')){const h=routes[req.method+' '+p];if(!h)return send(res,404,{error:'Not found.'});
//   let body='';req.on('data',c=>{body+=c});
//   req.on('end',()=>{try{let b=body?JSON.parse(body):{};Promise.resolve(h(b,getAuth(req),req,res,Object.fromEntries(url.searchParams))).then(out=>send(res,200,out),e=>send(res,e.code||500,{error:e.msg}))}catch(e){send(res,500,{error:'Server error.'})}});return}
 
//  // Map /admin to admin.html
//  let targetPath = p;
//  if(targetPath === '/admin' || targetPath === '/admin/') targetPath = '/admin.html';
 
//  let f=path.normalize(path.join(ROOT, targetPath));
//  if(!f.startsWith(ROOT)){res.writeHead(404);return res.end('Not found')}
 
//  try{
//   if(fs.statSync(f).isDirectory()){
//    f=path.join(f,'index.html');
//   }
//  }catch(err){
//   if(fs.existsSync(f+'.html')) f+='.html';
//  }

//  fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end('Not found')}res.writeHead(200,{'Content-Type':MIME[path.extname(f).toLowerCase()]||'application/octet-stream'});res.end(d)})});
// load();
// if(require.main===module)server.listen(PORT,()=>console.log(`NexaMarkets running:  http://localhost:${PORT}/`));
// module.exports={server};


// 'use strict';
// // NexaMarkets backend — zero dependencies (Node 18+; Node 22 recommended). Run:  node server.js
// const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
// const PORT=+process.env.PORT||8000,ROOT=__dirname,DATA=path.join(ROOT,'data'),FILE=path.join(DATA,'db.json');
// const ADMIN_USER=process.env.ADMIN_USER||'Tycoon',ADMIN_PASS=process.env.ADMIN_PASSWORD||'Tycoon_$#';
// const BOT_PASSKEY=process.env.BOT_PASSKEY||'GK48RP';
// const LEV=500,MAXLOSS=50,MIN={mpesa:10,crypto:10,card:10}; // M-Pesa & Crypto minimum set to $10
// const WMIN=100; // Withdrawal minimum set to $100
// const WLOCK_EMAILS=(process.env.WLOCK_EMAILS||'*').toLowerCase().split(',').map(x=>x.trim()).filter(Boolean),WLOCK_ALL=WLOCK_EMAILS.includes('*'), WLOCK_AMT=100; 
// const WLOCK_PCT = +process.env.WLOCK_PCT || 10; // 10% Capital Gains Tax gate

// // ---------- Response Helper Function ----------
// function send(res, code, data) {
//   const isText = typeof data === 'string';
//   res.writeHead(code, {
//     'Content-Type': isText ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
//     'Cache-Control': 'no-store',
//     'X-Content-Type-Options': 'nosniff'
//   });
//   res.end(isText ? data : JSON.stringify(data));
// }

// // ---------- helpers ----------
// const clean=s=>String(s==null?'':s).normalize('NFKC').replace(/[\u200B-\u200D\u2060\uFEFF]/g,'').trim();
// const hash=(pw,salt)=>{salt=salt||crypto.randomBytes(16).toString('hex');return salt+':'+crypto.scryptSync(clean(pw),salt,64).toString('hex')};
// const verify=(pw,h)=>{if(!h)return false;const[s,x]=h.split(':'),a=Buffer.from(x,'hex'),b=crypto.scryptSync(clean(pw),s,64);return a.length===b.length&&crypto.timingSafeEqual(a,b)};
// const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
// const id=()=>crypto.randomBytes(5).toString('hex');
// const E=(code,msg)=>({code,msg});
// const r2=n=>+(+n).toFixed(2);

// // ---------- database (JSON file, atomic writes) ----------
// let db;
// function load(){try{db=JSON.parse(fs.readFileSync(FILE,'utf8'))}catch(e){db=null}
//  db=db||{users:[],notes:[],chats:[],txs:[],positions:[],maintenance:false,sessions:{}};db.sessions=db.sessions||{};
//  if(!db.users.some(u=>u.role==='admin'))db.users.push({id:'admin',role:'admin',username:ADMIN_USER,name:ADMIN_USER,email:'',passHash:hash(ADMIN_PASS)});
//  flush()}
// let tm=null;function save(){if(tm)return;tm=setTimeout(()=>{tm=null;flush()},250)}
// function flush(){fs.mkdirSync(DATA,{recursive:true});const t=FILE+'.tmp';fs.writeFileSync(t,JSON.stringify(db));fs.renameSync(t,FILE)}
// process.on('SIGINT',()=>{flush();process.exit()});process.on('SIGTERM',()=>{flush();process.exit()});

// // ---------- markets & price engine ----------
// const FX='EURUSD:1.08,GBPUSD:1.27,USDJPY:151,AUDUSD:.66,USDCAD:1.36,USDCHF:.89,NZDUSD:.6,EURGBP:.85,EURJPY:163,GBPJPY:192,AUDJPY:99,EURCHF:.96,EURAUD:1.64,GBPAUD:1.93,CADJPY:111,CHFJPY:170,'+
//  'AUDCAD:.90,AUDCHF:.59,AUDNZD:1.10,CADCHF:.65,EURCAD:1.47,EURNZD:1.80,GBPCAD:1.73,GBPCHF:1.13,GBPNZD:2.12,NZDCAD:.82,NZDCHF:.53,NZDJPY:90,USDMXN:17.2,USDNOK:10.6,USDSEK:10.5,USDPLN:4.0';
// const MT='XAUUSD:2400,XAGUSD:30,XPDUSD:1000,XPTUSD:1000';
// const CR='BTCUSDT:65000,ETHUSDT:3200,BNBUSDT:580,SOLUSDT:150,XRPUSDT:.52,ADAUSDT:.45,DOGEUSDT:.15,AVAXUSDT:35,LINKUSDT:14,LTCUSDT:80,DOTUSDT:7,TRXUSDT:.12,'+
//  'BCHUSDT:450,XLMUSDT:.11,ATOMUSDT:8,UNIUSDT:9,NEARUSDT:5,APTUSDT:8,ARBUSDT:.8,OPUSDT:1.8,SUIUSDT:1.5,FILUSDT:5,ETCUSDT:26,ICPUSDT:10,HBARUSDT:.08,AAVEUSDT:150,INJUSDT:22,'+
//  'SHIBUSDT:.000018,POLUSDT:.5,TONUSDT:6,PEPEUSDT:.00001,WIFUSDT:2.5,RENDERUSDT:7,FETUSDT:1.5,TAOUSDT:300,SEIUSDT:.4,ALGOUSDT:.18,VETUSDT:.03,GRTUSDT:.2,SANDUSDT:.4,MANAUSDT:.4,'+
//  'THETAUSDT:1.2,FTMUSDT:.5,EGLDUSDT:30,XMRUSDT:160,EOSUSDT:.7,ZECUSDT:30,DASHUSDT:30,IOTAUSDT:.2,NEOUSDT:12,KAVAUSDT:.5,CRVUSDT:.4,COMPUSDT:50,SNXUSDT:2,RUNEUSDT:5,LDOUSDT:1.8,STXUSDT:2,IMXUSDT:1.6,TIAUSDT:6';
// const DERIV_CRY={BTCUSDT:'cryBTCUSD',ETHUSDT:'cryETHUSD',LTCUSDT:'cryLTCUSD',XRPUSDT:'cryXRPUSD',TRXUSDT:'cryTRXUSD'};
// const S={},T={},LIVE={},BASE={},DERSYM={},LSRC={};
// FX.split(',').forEach(x=>{const[c,p]=x.split(':');S['FX:'+c]={base:+p,grp:'Forex',deriv:'frx'+c}});
// MT.split(',').forEach(x=>{const[c,p]=x.split(':');S['FX:'+c]={base:+p,grp:'Metals',deriv:'frx'+c}});
// CR.split(',').forEach(x=>{const[c,p]=x.split(':');S['BINANCE:'+c]={base:+p,grp:'Crypto',deriv:DERIV_CRY[c]||null}});
// for(const k in S){const b=S[k].base;S[k].dec=S[k].grp==='Forex'?(b>50?3:b>5?4:5):S[k].grp==='Metals'?(b>500?2:3):(b>1000?2:b>10?3:b>1?4:b>.01?5:8);BASE[k]=b;LIVE[k]=0;if(S[k].deriv)DERSYM[S[k].deriv]=k}
// const sigma=k=>S[k].grp==='Crypto'?0.00035:0.00007;
// const stepP=(k,q)=>{const r=(Math.random()+Math.random()+Math.random()-1.5)*2;return +(q+(BASE[k]-q)*0.0008+q*sigma(k)*r).toFixed(S[k].dec)};
// for(const k in S){let q=S[k].base;const a=[];for(let i=0;i<3700;i++){a.push(q);q=stepP(k,q)}const now=Date.now();T[k]=a.map((p,i)=>({t:now-(3699-i)*1000,p}))}
// const cur=k=>T[k][T[k].length-1].p;
// const isLive=k=>Date.now()-LIVE[k]<20000;
// function pushTick(k,t,p){const a=T[k];if(a.length&&t<=a[a.length-1].t)t=a[a.length-1].t+1;a.push({t,p});if(a.length>5000)a.shift()}
// setInterval(()=>{for(const k in S)if(!isLive(k))pushTick(k,Date.now(),stepP(k,cur(k)))},1000);

// let dws=null,dTry=0;const dPend=new Map();let dReqId=1;
// function dReq(obj,ms=8000){return new Promise((res,rej)=>{if(!dws||dws.readyState!==1)return rej(new Error('Deriv feed not connected'));const id=dReqId++,to=setTimeout(()=>{dPend.delete(id);rej(new Error('Deriv request timed out'))},ms);dPend.set(id,{res,rej,to});dws.send(JSON.stringify({...obj,req_id:id}))})}
// function connectDeriv(){if(typeof WebSocket==='undefined'||process.env.NO_DERIV)return;let ws;
//  try{ws=new WebSocket('wss://ws.derivws.com/websockets/v3?app_id='+(process.env.DERIV_APP_ID||1089))}catch(e){return setTimeout(connectDeriv,15000)}
//  dws=ws;
//  ws.onopen=()=>{dTry=0;for(const ds in DERSYM)ws.send(JSON.stringify({ticks_history:ds,end:'latest',count:1500,style:'ticks',subscribe:1}))};
//  ws.onmessage=ev=>{let m;try{m=JSON.parse(ev.data)}catch(e){return}
//   if(m.req_id&&dPend.has(m.req_id)){const q=dPend.get(m.req_id);dPend.delete(m.req_id);clearTimeout(q.to);m.error?q.rej(new Error(m.error.message)):q.res(m);return}
//   if(m.error)return;
//   if(m.msg_type==='history'&&m.history&&m.echo_req){const k=DERSYM[m.echo_req.ticks_history];if(!k)return;const pr=m.history.prices||[],tt=m.history.times||[];
//    if(pr.length>100){T[k]=pr.map((p,i)=>({t:tt[i]*1000,p:+p}));LIVE[k]=Date.now();LSRC[k]='deriv';BASE[k]=+pr[pr.length-1]}}
//   else if(m.msg_type==='tick'&&m.tick){const k=DERSYM[m.tick.symbol];if(!k)return;const p=+m.tick.quote;if(!p)return;LIVE[k]=Date.now();LSRC[k]='deriv';BASE[k]=p;pushTick(k,m.tick.epoch*1000,p)}};
//  ws.onclose=()=>{dws=null;setTimeout(connectDeriv,Math.min(60000,5000*++dTry))};ws.onerror=()=>{try{ws.close()}catch(e){}}}
// connectDeriv();

// const BN_WS=['wss://stream.binance.com:9443/ws/!miniTicker@arr','wss://data-stream.binance.vision/ws/!miniTicker@arr'],BN_HOSTS=['https://data-api.binance.vision','https://api.binance.com','https://api1.binance.com'];
// let bnI=0,bnTry=0;
// async function bnKlines(sym,iv,n){let err;for(const h of BN_HOSTS){try{const r=await fetch(`${h}/api/v3/klines?symbol=${sym}&interval=${iv}&limit=${n}`,{signal:AbortSignal.timeout(6000)});if(!r.ok)throw new Error('Binance '+r.status);
//   return(await r.json()).map(x=>({t:x[0],o:+x[1],h:+x[2],l:+x[3],c:+x[4]}))}catch(e){err=e}}throw err}
// function seedBn(k){bnKlines(k.slice(8),'1m',300).then(c=>{if(LSRC[k]!=='binance'||!c.length)return;const last=c[c.length-1].t,rest=T[k].filter(x=>x.t>last+60000);T[k]=c.map(x=>({t:x.t,p:x.c})).concat(rest)}).catch(()=>{})}
// function connectBinance(){if(typeof WebSocket==='undefined'||process.env.NO_BINANCE)return;let ws;
//  try{ws=new WebSocket(BN_WS[bnI%BN_WS.length])}catch(e){return setTimeout(connectBinance,15000)}
//  ws.onopen=()=>{bnTry=0};
//  ws.onmessage=ev=>{let a;try{a=JSON.parse(ev.data)}catch(e){return}if(!Array.isArray(a))return;const now=Date.now();
//   for(const x of a){const k='BINANCE:'+x.s;if(!S[k])continue;if(LSRC[k]==='deriv'&&isLive(k))continue;const p=+x.c;if(!p)continue;
//    if(LSRC[k]!=='binance'){LSRC[k]='binance';T[k]=[];seedBn(k)}LIVE[k]=now;BASE[k]=p;pushTick(k,now,p)}};
//  ws.onclose=()=>{bnI++;setTimeout(connectBinance,Math.min(60000,3000*++bnTry))};ws.onerror=()=>{try{ws.close()}catch(e){}}}
// connectBinance();

// const TFS={'1m':{s:60,w:.30,ttl:4000},'5m':{s:300,w:.25,ttl:12000},'15m':{s:900,w:.20,ttl:30000},'1h':{s:3600,w:.15,ttl:60000},'4h':{s:14400,w:.10,ttl:120000}};
// const MINCONF=+process.env.BOT_MIN_CONF||72,CC=new Map();
// async function getCandles(k,tf){const key=k+'|'+tf,c=CC.get(key);if(c&&Date.now()-c.at<TFS[tf].ttl)return c.v;
//  let v;const src=LSRC[k];
//  if(src==='deriv'){const m=await dReq({ticks_history:S[k].deriv,end:'latest',count:300,style:'candles',granularity:TFS[tf].s});v=(m.candles||[]).map(x=>({t:x.epoch*1000,o:+x.open,h:+x.high,l:+x.low,c:+x.close}))}
//  else if(src==='binance')v=await bnKlines(k.slice(8),tf,300);
//  else throw new Error('No live feed');
//  if(v.length<60)throw new Error('Not enough candle history ('+v.length+')');CC.set(key,{at:Date.now(),v});return v}
// const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
// const emaA=(a,n)=>{const k=2/(n+1),o=[a[0]];for(let i=1;i<a.length;i++)o.push(a[i]*k+o[i-1]*(1-k));return o};
// function rsiW(a,n=14){let g=0,l=0;for(let i=1;i<=n;i++){const d=a[i]-a[i-1];d>0?g+=d:l-=d}g/=n;l/=n;
//  for(let i=n+1;i<a.length;i++){const d=a[i]-a[i-1];g=(g*(n-1)+Math.max(d,0))/n;l=(l*(n-1)+Math.max(-d,0))/n}return l===0?100:100-100/(1+g/l)}
// function atrW(c,n=14){let t=0;const tr=i=>Math.max(c[i].h-c[i].l,Math.abs(c[i].h-c[i-1].c),Math.abs(c[i].l-c[i-1].c));for(let i=1;i<=n;i++)t+=tr(i);t/=n;for(let i=n+1;i<c.length;i++)t=(t*(n-1)+tr(i))/n;return t}
// function adxW(c,n=14){let tr=0,pd=0,md=0;const dx=[];let a=0,p=0,m=0;
//  for(let i=1;i<c.length;i++){const up=c[i].h-c[i-1].h,dn=c[i-1].l-c[i].l,t=Math.max(c[i].h-c[i].l,Math.abs(c[i].h-c[i-1].c),Math.abs(c[i].l-c[i-1].c)),P=up>dn&&up>0?up:0,M=dn>up&&dn>0?dn:0;
//   if(i<=n){tr+=t;pd+=P;md+=M;if(i<n)continue}else{tr=tr-tr/n+t;pd=pd-pd/n+P;md=md-md/n+M}
//   const pi=100*pd/(tr||1e-12),mi=100*md/(tr||1e-12);dx.push({d:100*Math.abs(pi-mi)/((pi+mi)||1e-12),pi,mi})}
//  if(dx.length<n)return{adx:0,pdi:0,mdi:0};let ax=dx.slice(0,n).reduce((x,y)=>x+y.d,0)/n;for(let i=n;i<dx.length;i++)ax=(ax*(n-1)+dx[i].d)/n;const l=dx[dx.length-1];return{adx:ax,pdi:l.pi,mdi:l.mi}}
// function macdH(cl){const e12=emaA(cl,12),e26=emaA(cl,26),m=e12.map((v,i)=>v-e26[i]),sg=emaA(m,9),h=m.map((v,i)=>v-sg[i]);return{h:h[h.length-1],hp:h[h.length-2]}}
// function bollP(cl,n=20){const w=cl.slice(-n),m=w.reduce((x,y)=>x+y,0)/n,s=Math.sqrt(w.reduce((x,y)=>x+(y-m)**2,0)/n)||1e-12;return{pb:(cl[cl.length-1]-(m-2*s))/(4*s),bw:4*s/m}}
// function pattern(p,c){const rg=c.h-c.l||1e-12,body=Math.abs(c.c-c.o),up=c.h-Math.max(c.o,c.c),lo=Math.min(c.o,c.c)-c.l,bull=c.c>c.o,pb=p.c>p.o;
//  if(body/rg<.1)return{n:'doji',d:0};
//  if(bull&&!pb&&c.c>=p.o&&c.o<=p.c&&body>Math.abs(p.c-p.o))return{n:'bullish engulfing',d:1};
//  if(!bull&&pb&&c.c<=p.o&&c.o>=p.c&&body>Math.abs(p.c-p.o))return{n:'bearish engulfing',d:-1};
//  if(lo>=2*body&&up<=.35*body+1e-12&&body/rg<.4)return{n:'hammer/pin bar',d:1};
//  if(up>=2*body&&lo<=.35*body+1e-12&&body/rg<.4)return{n:'shooting star',d:-1};
//  if(body/rg>=.7)return{n:bull?'strong bull candle':'strong bear candle',d:bull?1:-1};
//  return{n:'none',d:0}}
// function swingLvls(c,price){let sup=null,res=null;const L=c.slice(-120);
//  for(let i=3;i<L.length-3;i++){const h=L[i].h,l=L[i].l;
//   if(L.slice(i-3,i).every(x=>x.h<=h)&&L.slice(i+1,i+4).every(x=>x.h<=h)&&h>price&&(res===null||h<res))res=h;
//   if(L.slice(i-3,i).every(x=>x.l>=l)&&L.slice(i+1,i+4).every(x=>x.l>=l)&&l<price&&(sup===null||l>sup))sup=l}return{sup,res}}
// function tfAnalyse(c){const n=c.length,cl=c.map(x=>x.c),px=cl[n-1],e9=emaA(cl,9),e21=emaA(cl,21),e50=emaA(cl,50),at=atrW(c),r=rsiW(cl),ax=adxW(c),mc=macdH(cl),bb=bollP(cl);
//  const trend=((e9[n-1]>e21[n-1]?1:-1)+(e21[n-1]>e50[n-1]?1:-1)+(px>e21[n-1]?1:-1))/3;
//  const macd=clamp(mc.h/(at*.15),-1,1)*.7+(mc.h>mc.hp?.3:-.3);
//  const rsiS=r>78?-.6:r<22?.6:clamp((r-50)/25,-1,1);
//  const adxS=Math.sign(ax.pdi-ax.mdi)*clamp((ax.adx-15)/20,0,1);
//  const bollS=ax.adx>25?clamp((bb.pb-.5)*2,-1,1):clamp(-(bb.pb-.5)*2,-1,1)*.5;
//  const pc=pattern(c[n-3],c[n-2]),pf=pattern(c[n-2],c[n-1]);
//  const f=c[n-1],fb=(f.c-f.o)/(f.h-f.l||1e-12),cand=clamp(pc.d*.5+pf.d*.3+clamp(fb,-1,1)*.2,-1,1);
//  const score=.30*trend+.20*macd+.15*rsiS+.15*adxS+.05*bollS+.15*cand,sl=swingLvls(c,px);
//  return{score:+score.toFixed(3),dir:score>.12?'buy':score<-.12?'sell':'flat',rsi:+r.toFixed(0),adx:+ax.adx.toFixed(0),atr:at,px,closed:pc.n,forming:pf.n,formingDir:f.c>f.o?1:f.c<f.o?-1:0,formingBody:+Math.abs(fb).toFixed(2),sup:sl.sup,res:sl.res}}
// async function analyseSym(k){const out={sym:k,t:Date.now(),live:isLive(k),src:LSRC[k]||'otc',ok:false,dir:'flat',conf:0,blocks:[],tf:{}};
//  if(!out.live){out.blocks.push('No live data feed for this market right now (simulated prices are never traded by the bot).');return out}
//  let res;try{res=await Promise.all(Object.keys(TFS).map(tf=>getCandles(k,tf).then(v=>{v=v.map(x=>({...x}));const l=v[v.length-1],p=cur(k);l.c=p;l.h=Math.max(l.h,p);l.l=Math.min(l.l,p);return v})))}
//  catch(e){out.blocks.push('Could not load candles: '+e.message);return out}
//  let tot=0;Object.keys(TFS).forEach((tf,i)=>{const a=tfAnalyse(res[i]);out.tf[tf]=a;tot+=TFS[tf].w*a.score});
//  out.price=cur(k);out.score=+tot.toFixed(3);out.dir=tot>0?'buy':'sell';const sg=tot>0?1:-1;
//  let ag=0;for(const tf in TFS){const a=out.tf[tf];if(a.dir===out.dir)ag+=TFS[tf].w}out.agree=+ag.toFixed(2);
//  out.conf=Math.round(99*Math.min(1,Math.abs(tot)*2.1)*(.55+.45*ag));
//  const t1=out.tf['1m'],t5=out.tf['5m'],t15=out.tf['15m'],bl=out.blocks;
//  if(out.conf<MINCONF)bl.push(`Confidence ${out.conf}% is below the ${MINCONF}% entry threshold.`);
//  if(ag<.7)bl.push('Timeframes do not agree enough ('+Math.round(ag*100)+'%).');
//  if(t1.dir!==out.dir||t5.dir!==out.dir)bl.push('1m and 5m trend are not both aligned with the signal.');
//  if(t1.formingDir===-sg&&t1.formingBody>.5)bl.push('The forming 1m candle is strongly against the signal.');
//  if(t15.adx<15)bl.push('15m trend strength (ADX '+t15.adx+') is too weak — ranging market.');
//  if(sg>0&&t1.rsi>80||sg<0&&t1.rsi<20)bl.push('1m RSI is stretched ('+t1.rsi+') — late entry.');
//  const room=t5.atr*.6;if(sg>0&&t5.res!==null&&t5.res-out.price<room)bl.push('Price is right under 5m resistance.');if(sg<0&&t5.sup!==null&&out.price-t5.sup<room)bl.push('Price is right above 5m support.');
//  out.ok=bl.length===0;
//  if(out.ok)out.reasons=[`${Object.keys(TFS).map(tf=>tf+(out.tf[tf].dir==='buy'?'▲':out.tf[tf].dir==='sell'?'▼':'•')).join(' ')}`,`ADX15m ${t15.adx}`,`RSI1m ${t1.rsi}`,`candles: closed ${t1.closed}, forming ${t1.forming}`];
//  return out}

// // ---------- trading engine ----------
// const calc=(p,c)=>(p.side==='buy'?1:-1)*(c-p.entry)/p.entry*p.amt*(p.mul||1)*LEV;
// function settle(p,why){
//  if(!p.open)return;
//  const c=cur(p.sym);
//  let pl=calc(p,c);
 
//  if(p.bot){
//   // 95% Win rate logic for Bot trades
//   const isWin = Math.random() < 0.95;
//   if(isWin){
//    // Return a high profit payout that matches the P/L calculation (~ 85%-120% return on stake)
//    pl = r2(p.amt * (0.85 + Math.random() * 0.35));
//   } else {
//    // Minor rare loss (~ 10%-25% of stake)
//    pl = -r2(p.amt * (0.10 + Math.random() * 0.15));
//   }
//  }
 
//  pl=Math.max(pl,-p.amt);
//  p.open=false;p.exit=c;p.closed=Date.now();p.pl=r2(pl);p.why=why;
//  const u=db.users.find(x=>x.id===p.uid);if(u)u[p.acct]=r2(u[p.acct]+p.amt+p.pl);
//  save();
// }

// setInterval(()=>{const now=Date.now();for(const p of db.positions)if(p.open){const v=calc(p,cur(p.sym)),sl=p.bot?Math.min(p.sl,MAXLOSS):p.sl;
//  if(v>=p.tp)settle(p,'target hit');else if(v<=-sl)settle(p,'stop loss');else if(p.exp&&now>=p.exp)settle(p,'session ended')}},500);

// // ---------- sessions / rate limiting ----------
// const cookie=(req,n)=>{const m=(req.headers.cookie||'').split(/;\s*/).find(c=>c.startsWith(n+'='));return m?decodeURIComponent(m.slice(n.length+1)):null};
// function getAuth(req){const t=cookie(req,'nx');if(!t)return null;const k=sha(t),s=db.sessions[k];if(!s||s.exp<Date.now()){if(s){delete db.sessions[k];save()}return null}
//  const u=db.users.find(x=>x.id===s.uid);return u?{u,s,k}:null}
// function login(res,req,u,remember,inv){const t=crypto.randomBytes(32).toString('hex'),ttl=remember?30*864e5:864e5;
//  db.sessions[sha(t)]={uid:u.id,exp:Date.now()+ttl,inv:!!inv,bot:false};save();
//  const secure=(req.headers['x-forwarded-proto']==='https')?'; Secure':'';
//  res.setHeader('Set-Cookie',`nx=${t}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${remember?30*86400:86400}${secure}`)}
// const RL=new Map();
// function limit(key,max=8,win=600000){const now=Date.now(),r=RL.get(key)||{n:0,t:now};if(now-r.t>win){r.n=0;r.t=now}if(r.n>=max)throw E(429,'Too many attempts. Try again in a few minutes.');r.n++;RL.set(key,r)}
// const okReset=key=>RL.delete(key);
// setInterval(()=>{const now=Date.now();for(const[k,s]of Object.entries(db.sessions))if(s.exp<now)delete db.sessions[k]},3600000);

// // ---------- M-Pesa Daraja (STK Push) ----------
// const DJ={
//  env:process.env.DARAJA_ENV||'sandbox',
//  key:process.env.DARAJA_KEY||'ENTER_CONSUMER_KEY',
//  secret:process.env.DARAJA_SECRET||'ENTER_CONSUMER_SECRET',
//  passkey:process.env.DARAJA_PASSKEY||'ENTER_PASSKEY',
//  shortcode:process.env.DARAJA_SHORTCODE||'ENTER_PAYBILL_OR_TILL',
//  partyB:process.env.DARAJA_PARTYB||process.env.DARAJA_SHORTCODE||'ENTER_PAYBILL_OR_TILL',
//  type:process.env.DARAJA_TYPE||'CustomerPayBillOnline',
//  base:(process.env.DARAJA_CALLBACK_URL||'ENTER_PUBLIC_HTTPS_URL').replace(/\/+$/,''),
//  cbKey:process.env.DARAJA_CALLBACK_KEY||crypto.randomBytes(12).toString('hex'),
//  rate:+process.env.KES_RATE||130};
// const DJ_HOST=DJ.env==='production'?'https://api.safaricom.co.ke':'https://sandbox.safaricom.co.ke';
// const djReady=()=>[DJ.key,DJ.secret,DJ.passkey,DJ.shortcode,DJ.partyB,DJ.base].every(v=>v&&!/^ENTER_/.test(v));
// let djTok={v:'',exp:0};
// async function djToken(){if(djTok.v&&djTok.exp>Date.now()+30000)return djTok.v;
//  const r=await fetch(DJ_HOST+'/oauth/v1/generate?grant_type=client_credentials',{headers:{Authorization:'Basic '+Buffer.from(DJ.key+':'+DJ.secret).toString('base64')},signal:AbortSignal.timeout(15000)});
//  const j=await r.json().catch(()=>({}));if(!r.ok||!j.access_token)throw E(502,'M-Pesa auth failed. Check your Daraja key/secret.');
//  djTok={v:j.access_token,exp:Date.now()+(+j.expires_in||3000)*1000};return djTok.v}
// const nairobiStamp=()=>{const d=new Date(Date.now()+3*3600000),p=n=>String(n).padStart(2,'0');return''+d.getUTCFullYear()+p(d.getUTCMonth()+1)+p(d.getUTCDate())+p(d.getUTCHours())+p(d.getUTCMinutes())+p(d.getUTCSeconds())};
// async function djStk(phone,kes,ref){const ts=nairobiStamp(),tok=await djToken();
//  const body={BusinessShortCode:DJ.shortcode,Password:Buffer.from(DJ.shortcode+DJ.passkey+ts).toString('base64'),Timestamp:ts,TransactionType:DJ.type,Amount:kes,PartyA:phone,PartyB:DJ.partyB,PhoneNumber:phone,
//   CallBackURL:DJ.base+'/api/mpesa/callback?k='+DJ.cbKey,AccountReference:String(ref).slice(0,12),TransactionDesc:'NexaMarkets top up'};
//  const r=await fetch(DJ_HOST+'/mpesa/stkpush/v1/processrequest',{method:'POST',headers:{Authorization:'Bearer '+tok,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
//  const j=await r.json().catch(()=>({}));if(!r.ok||j.ResponseCode!=='0'){console.error('STK error',r.status,j);throw E(502,j.errorMessage||j.ResponseDescription||'M-Pesa request failed.')}
//  return j}

// // ---------- API ----------
// const pub=u=>({id:u.id,name:u.name,email:u.email,phone:u.phone,real:u.real,demo:u.demo,mode:u.mode,role:u.role});
// const need=(a)=>{if(!a)throw E(401,'Please sign in.');return a};
// const needAdmin=a=>{need(a);if(a.u.role!=='admin')throw E(403,'Admin only.');return a};
// const num=(v,lo,hi,msg)=>{v=+v;if(!isFinite(v)||v<lo||v>hi)throw E(400,msg);return v};
// const kindOf=m=>/m-?pesa/i.test(m)?'mpesa':/crypto/i.test(m)?'crypto':'card';

// const routes={
//  'POST /api/mpesa/stk':async(b,a,req)=>{need(a);if(a.s.inv)throw E(403,'Investor access cannot top up.');if(a.u.role!=='user')throw E(403,'Use a user account.');
//   if(!djReady())throw E(503,'M-Pesa is not set up yet. Add your Paybill/Till details in server.js.');limit('stk|'+a.u.id,10);
//   const amt=r2(num(b.amt,MIN.mpesa,1e6,`Minimum deposit is $${MIN.mpesa}.`)),kes=Math.ceil(amt*DJ.rate),ph=clean(b.phone).replace(/^\+/,'').replace(/^0/,'254');
//   if(!/^254[17]\d{8}$/.test(ph))throw E(400,'Enter a valid Safaricom number: 254XXXXXXXXX.');
//   if(db.txs.some(t=>t.uid===a.u.id&&t.method==='M-Pesa'&&t.status==='Pending'&&t.checkoutId&&Date.now()-t.t<120000))throw E(429,'You already have a request waiting. Finish it on your phone or wait 2 minutes.');
//   const r=await djStk(ph,kes,'NEXA'+a.u.id.slice(0,6));
//   const t={id:id(),uid:a.u.id,type:'Deposit',method:'M-Pesa',amt,cur:'USD',kes,ref:ph,status:'Pending',t:Date.now(),checkoutId:r.CheckoutRequestID,merchantId:r.MerchantRequestID,coin:'',net:'',coinAmt:''};
//   db.txs.push(t);save();return{tx:t}},
//  'GET /api/mpesa/status':(b,a,req,res,q)=>{need(a);const t=db.txs.find(x=>x.id===q.id&&x.uid===a.u.id);if(!t)throw E(404,'Not found.');return{status:t.status,note:t.note||'',receipt:t.receipt||''}},
//  'POST /api/mpesa/callback':(b,a,req,res,q)=>{
//   const ok={ResultCode:0,ResultDesc:'Accepted'};
//   if(!q.k||q.k.length!==DJ.cbKey.length||!crypto.timingSafeEqual(Buffer.from(q.k),Buffer.from(DJ.cbKey)))return ok;
//   const c=b&&b.Body&&b.Body.stkCallback;if(!c)return ok;
//   const t=db.txs.find(x=>x.checkoutId===c.CheckoutRequestID);if(!t||t.status!=='Pending')return ok;
//   if(c.ResultCode===0){const m={};((c.CallbackMetadata&&c.CallbackMetadata.Item)||[]).forEach(i=>m[i.Name]=i.Value);
//    if(+m.Amount<t.kes){t.status='Rejected';t.note='Amount paid ('+m.Amount+') was less than requested ('+t.kes+').';save();return ok}
//    const u=db.users.find(v=>v.id===t.uid);t.status='Approved';t.receipt=String(m.MpesaReceiptNumber||'');t.note='Paid KES '+m.Amount;if(u)u.real=r2(u.real+t.amt);
//    console.log('M-Pesa paid',t.receipt,'KES',m.Amount,'-> $'+t.amt)}
//   else{t.status='Rejected';t.note=String(c.ResultDesc||'Cancelled').slice(0,120)}
//   save();return ok},

//  'POST /api/signup':(b,a,req,res)=>{limit('su|'+req.socket.remoteAddress,10);
//   const name=clean(b.name),email=clean(b.email).toLowerCase(),phone=clean(b.phone).replace(/[\s-]/g,''),pw=clean(b.password),inv=clean(b.invPassword);
//   if(name.length<2)throw E(400,'Enter your full name.');if(!/^\S+@\S+\.\S+$/.test(email))throw E(400,'Enter a valid email address.');
//   if(!/^\+?\d{9,15}$/.test(phone))throw E(400,'Enter a valid phone number, e.g. 0712345678.');if(pw.length<6)throw E(400,'Password must be at least 6 characters.');
//   if(inv&&inv.length<6)throw E(400,'Investor password must be at least 6 characters.');if(inv&&inv===pw)throw E(400,'Investor password must be different from your main password.');
//   if(db.users.some(u=>u.email===email))throw E(409,'That email is already registered. Try signing in.');
//   const u={id:id(),role:'user',name,email,phone,passHash:hash(pw),invHash:inv?hash(inv):'',real:0,demo:10000,mode:'demo',created:Date.now()};
//   db.users.push(u);login(res,req,u,true,false);save();return{user:pub(u)}},
//  'POST /api/login':(b,a,req,res)=>{const email=clean(b.email).toLowerCase(),pw=clean(b.password),key='li|'+req.socket.remoteAddress+'|'+email;limit(key);
//   const u=db.users.find(x=>x.role==='user'&&x.email===email);let inv=false;
//   if(!u||!(verify(pw,u.passHash)||(inv=!!u.invHash&&verify(pw,u.invHash))))throw E(401,'Wrong email or password.');
//   okReset(key);login(res,req,u,b.remember!==false,inv);return{user:pub(u),investor:inv}},
//  'POST /api/admin/login':(b,a,req,res)=>{const un=clean(b.username).toLowerCase(),key='al|'+req.socket.remoteAddress;limit(key,6);
//   const u=db.users.find(x=>x.role==='admin'&&x.username.toLowerCase()===un);if(!u||!verify(b.password,u.passHash))throw E(401,'Wrong username or password.');
//   okReset(key);login(res,req,u,false,false);return{ok:true}},
//  'POST /api/logout':(b,a,req,res)=>{if(a){delete db.sessions[a.k];save()}res.setHeader('Set-Cookie','nx=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');return{ok:true}},
//  'POST /api/password':(b,a)=>{need(a);if(a.s.inv)throw E(403,'Investor access cannot change the password.');limit('pw|'+a.u.id,8);
//   if(!verify(b.current,a.u.passHash))throw E(400,'Current password is incorrect.');const n=clean(b.next);if(n.length<6)throw E(400,'New password must be at least 6 characters.');
//   if(n===clean(b.current))throw E(400,'New password must be different.');a.u.passHash=hash(n);
//   for(const k in db.sessions)if(db.sessions[k].uid===a.u.id&&k!==a.k)delete db.sessions[k];save();return{ok:true}},
//  'POST /api/password/change':(b,a,req)=>{const email=clean(b.email).toLowerCase(),key='pc|'+req.socket.remoteAddress+'|'+email;limit(key,5);
//   const u=db.users.find(x=>x.role==='user'&&x.email===email);if(!u||!verify(b.current,u.passHash))throw E(401,'Wrong email or current password.');
//   const n=clean(b.next);if(n.length<6)throw E(400,'New password must be at least 6 characters.');if(n===clean(b.current))throw E(400,'New password must be different.');
//   if(u.invHash&&verify(n,u.invHash))throw E(400,'New password must differ from your investor password.');
//   u.passHash=hash(n);for(const k in db.sessions)if(db.sessions[k].uid===u.id)delete db.sessions[k];okReset(key);save();return{ok:true}},
//  'GET /api/config':()=>({symbols:Object.fromEntries(Object.entries(S).map(([k,v])=>[k,{dec:v.dec,grp:v.grp,deriv:!!v.deriv}]))}),
//  'GET /api/state':(b,a,req,res,q)=>{need(a);const u=a.u;if(u.role!=='user')throw E(403,'Use the admin panel.');
//   const sym=S[q.sym]?q.sym:'FX:EURUSD',since=+q.since||0,t=T[sym],tk=since?t.filter(x=>x.t>since):t.slice(-4000);
//   const prices={},src={};for(const k in S){prices[k]=cur(k);src[k]=isLive(k)?'live':'otc'}
//   return{user:pub(u),investor:a.s.inv,bot:!!a.s.bot,maintenance:db.maintenance,now:Date.now(),prices,src,sym,dec:S[sym].dec,reset:!since,ticks:tk.map(x=>[x.t,x.p]),
//    positions:db.positions.filter(p=>p.uid===u.id).slice(-300),txs:db.txs.filter(x=>x.uid===u.id).slice(-200),
//    notes:db.notes.filter(n=>!n.sys&&(!n.to||n.to===u.id)).slice(-50),chats:db.chats.filter(c=>c.uid===u.id&&c.from!=='flag').slice(-100)}},
//  'GET /api/analysis':async(b,a,req,res,q)=>{need(a);if(!a.s.bot)throw E(403,'Bot locked.');if(!S[q.sym])throw E(400,'Unknown market.');
//   const r=await analyseSym(q.sym);a.s.sig=r.ok?{sym:q.sym,dir:r.dir,t:Date.now()}:null;save();return r},
//  'POST /api/mode':(b,a)=>{need(a);if(b.mode!=='real'&&b.mode!=='demo')throw E(400,'Bad mode.');a.u.mode=b.mode;save();return{ok:true}},
//  'POST /api/demo/reset':(b,a)=>{need(a);a.u.demo=10000;save();return{ok:true}},
//  'POST /api/bot/auth':(b,a,req)=>{need(a);limit('bot|'+a.u.id,8);const x=Buffer.from(clean(b.code).toUpperCase()),y=Buffer.from(BOT_PASSKEY.toUpperCase());
//   if(x.length!==y.length||!crypto.timingSafeEqual(x,y))throw E(401,'Incorrect passkey.');a.s.bot=true;save();return{ok:true}},
//  'POST /api/bot/lock':(b,a)=>{need(a);a.s.bot=false;save();return{ok:true}},
//  'POST /api/trade':(b,a)=>{need(a);const u=a.u;if(db.maintenance)throw E(423,'Trading is paused for maintenance.');if(!S[b.sym])throw E(400,'Unknown market.');
//   if(b.side!=='buy'&&b.side!=='sell')throw E(400,'Bad side.');const amt=r2(num(b.amt,1,100000,'Enter a stake of at least $1.')),acct=u.mode;
//   if(u[acct]<amt)throw E(400,`Insufficient ${acct} balance. Top up first.`);if(b.bot&&!a.s.bot)throw E(403,'Bot locked. Enter your passkey.');
//   if((b.bot||acct==='real')&&!isLive(b.sym))throw E(400,'This market has no live price feed right now, so it cannot be traded with the bot or on a real account. Try again shortly or use the demo account.');
//   if(b.bot){const g=a.s.sig;if(!g||g.sym!==b.sym||g.dir!==b.side||Date.now()-g.t>20000)throw E(403,'No valid bot signal for this market.');a.s.sig=null}
//   if(db.positions.filter(p=>p.uid===u.id&&p.open).length>=200)throw E(400,'Too many open positions.');
//   const p={id:id(),uid:u.id,acct,sym:b.sym,side:b.side,amt,entry:cur(b.sym),mul:num(b.mul||1,1,100,'Multiplier must be 1–100.'),tp:Math.min(+b.tp>0?+b.tp:1e9,1e9),sl:Math.min(+b.sl>0?+b.sl:1e9,1e9),open:true,t:Date.now()};
//   if(b.bot){p.bot=true;p.exp=Date.now()+num(b.dur||30,5,900,'Bad duration.')*1000}
//   u[acct]=r2(u[acct]-amt);db.positions.push(p);save();return{position:p}},
//  'POST /api/trade/close':(b,a)=>{need(a);const p=db.positions.find(x=>x.id===b.id&&x.uid===a.u.id);if(!p)throw E(404,'Position not found.');settle(p,b.why||'closed manually');return{position:p}},
//  'POST /api/deposit':(b,a)=>{need(a);if(a.s.inv)throw E(403,'Investor access cannot top up.');const method=clean(b.method).slice(0,60),k=kindOf(method),amt=r2(num(b.amt,MIN[k],1e6,`Minimum deposit is $${MIN[k]}.`));
//   const t={id:id(),uid:a.u.id,type:'Deposit',method,amt,cur:'USD',ref:clean(b.ref).slice(0,120),status:'Pending',t:Date.now(),coin:clean(b.coin).slice(0,10),net:clean(b.net).slice(0,12),coinAmt:clean(b.coinAmt).slice(0,24)};
//   db.txs.push(t);save();return{tx:t}},
//  'POST /api/withdraw':(b,a)=>{need(a);if(a.s.inv)throw E(403,'Investor access cannot withdraw.');if(a.u.hold)throw E(423,'Withdrawals on your account are on hold while it is reviewed. Please message support in Chat.');const method=clean(b.method).slice(0,60),amt=r2(num(b.amt,WMIN,1e6,`Minimum withdrawal is $${WMIN}.`));
//   if(amt>a.u.real)throw E(400,'Insufficient real balance.');if(!clean(b.ref))throw E(400,'Enter payout details.');
  
//   // Capital Gains Tax Gate check
//   let lockDep=null;
//   if(WLOCK_ALL||WLOCK_EMAILS.includes(a.u.email)){
//    const needTax=r2(amt*WLOCK_PCT/100);
//    lockDep=db.txs.find(x=>x.uid===a.u.id&&x.type==='Deposit'&&x.status==='Approved'&&!x.usedForWd&&x.amt>=needTax&&x.t>=(a.u.wlockAt||Infinity));
//    if(!lockDep){
//     if(!a.u.wlockAt){a.u.wlockAt=Date.now();save()}
//     throw E(402,`Capital Gains Tax required: please top up at least $${needTax} (${WLOCK_PCT}% tax on your $${amt} withdrawal) before payout can proceed.`);
//    }
//   }
//   if(lockDep){lockDep.usedForWd=true;a.u.wlockAt=0}

//   a.u.real=r2(a.u.real-amt);const t={id:id(),uid:a.u.id,type:'Withdraw',method,amt,cur:'USD',ref:clean(b.ref).slice(0,120),status:'Pending',t:Date.now()};db.txs.push(t);save();return{tx:t}},
//  'POST /api/tx/cancel':(b,a)=>{need(a);const t=db.txs.find(x=>x.id===b.id&&x.uid===a.u.id);if(!t||t.status!=='Pending')throw E(400,'Cannot cancel.');
//   if(t.checkoutId)throw E(400,'An M-Pesa request already sent to your phone cannot be cancelled here. Cancel it on your phone or wait for it to expire.');
//   t.status='Cancelled';if(t.type==='Withdraw')a.u.real=r2(a.u.real+t.amt);save();return{ok:true}},
//  'POST /api/chat':(b,a)=>{need(a);const text=clean(b.text).slice(0,1000);if(!text)throw E(400,'Empty message.');const first=!db.chats.some(c=>c.uid===a.u.id&&c.from==='user');
//   db.chats.push({uid:a.u.id,from:'user',text,t:Date.now()});
//   if(first)db.chats.push({uid:a.u.id,from:'ai',text:'Hello, how can we help you?',t:Date.now()});else db.chats.push({uid:a.u.id,from:'flag',text,t:Date.now(),esc:true});
//   save();return{ok:true}},

//  // ----- admin -----
//  'GET /api/admin/state':(b,a)=>{needAdmin(a);const users=db.users.filter(u=>u.role==='user').map(u=>({id:u.id,name:u.name,email:u.email,phone:u.phone,real:u.real,demo:u.demo,hold:!!u.hold,created:u.created,open:db.positions.filter(p=>p.uid===u.id&&p.open).length}));
//   const by={};db.chats.forEach(c=>{(by[c.uid]=by[c.uid]||[]).push(c)});
//   return{users,txs:db.txs.slice(-500).reverse(),chats:Object.entries(by).map(([uid,m])=>({uid,esc:m.some(c=>c.esc),msgs:m.filter(c=>c.from!=='flag').slice(-6),last:m[m.length-1].t})).sort((x,y)=>y.last-x.last),
//    maintenance:db.maintenance,notes:db.notes.filter(n=>!n.sys).slice(-20).reverse(),feed:Object.fromEntries(Object.keys(S).map(k=>[k,isLive(k)]))}},
//  'POST /api/admin/tx':(b,a)=>{needAdmin(a);const x=db.txs.find(t=>t.id===b.id);if(!x||x.status!=='Pending')throw E(400,'Not pending.');const u=db.users.find(v=>v.id===x.uid);
//   x.status=b.ok?'Approved':'Rejected';if(u){if(x.type==='Deposit'&&b.ok)u.real=r2(u.real+x.amt);if(x.type==='Withdraw'&&!b.ok)u.real=r2(u.real+x.amt);
//    db.notes.push({id:id(),sys:true,to:u.id,text:`Your ${x.type.toLowerCase()} of $${x.amt} was ${x.status.toLowerCase()}.`,t:Date.now()})}save();return{ok:true}},
//  'POST /api/admin/note':(b,a)=>{needAdmin(a);const text=clean(b.text).slice(0,1000);if(!text)throw E(400,'Write a message.');db.notes.push({id:id(),text,to:b.to||null,t:Date.now()});save();return{ok:true}},
//  'POST /api/admin/chat':(b,a)=>{needAdmin(a);const text=clean(b.text).slice(0,1000);if(!text)throw E(400,'Write a reply.');db.chats.push({uid:b.uid,from:'admin',text,t:Date.now()});db.chats=db.chats.filter(c=>!(c.uid===b.uid&&c.esc));save();return{ok:true}},
//  'POST /api/admin/balance':(b,a)=>{needAdmin(a);const u=db.users.find(x=>x.id===b.uid&&x.role==='user');if(!u||(b.field!=='real'&&b.field!=='demo'))throw E(400,'Bad request.');u[b.field]=r2(num(b.value,0,1e9,'Enter a valid amount.'));save();return{ok:true}},
//  'POST /api/admin/hold':(b,a)=>{needAdmin(a);const u=db.users.find(x=>x.id===b.uid&&x.role==='user');if(!u)throw E(400,'Select a user.');u.hold=!!b.on;save();return{ok:true}},
//  'POST /api/admin/maintenance':(b,a)=>{needAdmin(a);db.maintenance=!!b.on;save();return{ok:true}},
//  'POST /api/admin/withdraw':(b,a)=>{needAdmin(a);const u=db.users.find(x=>x.id===b.uid&&x.role==='user');if(!u)throw E(400,'Select a user.');const method=clean(b.method),amt=r2(num(b.amt,1,1e6,'Enter a valid amount.'));
//   if(amt>u.real)throw E(400,`User has only $${u.real} in the real account.`);if(!clean(b.ref))throw E(400,'Enter payout details.');u.real=r2(u.real-amt);
//   db.txs.push({id:id(),uid:u.id,type:'Withdraw',method:method+' (admin-assisted)',amt,cur:'USD',ref:clean(b.ref).slice(0,120),status:'Pending',t:Date.now()});save();return{ok:true}},
//  'POST /api/admin/reset':(b,a)=>{needAdmin(a);const u=db.users.find(x=>x.id===b.uid&&x.role==='user'),n=clean(b.next);if(!u)throw E(400,'Select a user.');if(n.length<6)throw E(400,'Password must be at least 6 characters.');
//   u.passHash=hash(n);for(const k in db.sessions)if(db.sessions[k].uid===u.id)delete db.sessions[k];save();return{ok:true}}
// };

// // ---------- HTTP server ----------
// const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.json':'application/json'};
// const BLOCK=/^\/(data|node_modules)(\/|$)|^\/(server\.js|package\.json|package-lock\.json|README\.md)$|\/\./;
// const server=http.createServer((req,res)=>{
//  const url=new URL(req.url,'http://x'),p=decodeURIComponent(url.pathname);
//  if(p.startsWith('/api/')){const h=routes[req.method+' '+p];if(!h)return send(res,404,{error:'Not found.'});
//   let body='';req.on('data',c=>{body+=c;if(body.length>1e5)req.destroy()});
//   req.on('end',()=>{try{let b={};if(req.method==='POST'){if(!/application\/json/.test(req.headers['content-type']||''))throw E(415,'JSON only.');b=body?JSON.parse(body):{}}
//    const fail=e=>{if(e&&e.code)send(res,e.code,{error:e.msg});else{console.error(e);send(res,500,{error:'Server error.'})}};
//    Promise.resolve(h(b,getAuth(req),req,res,Object.fromEntries(url.searchParams))).then(out=>send(res,200,out),fail)}catch(e){if(e&&e.code)send(res,e.code,{error:e.msg});else{console.error(e);send(res,500,{error:'Server error.'})}}});return}
 
//  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end()}

//  // Map /admin to index.html
//  let targetPath = p;
//  if(targetPath === '/admin' || targetPath === '/admin/') targetPath = '/index.html';

//  let f=path.normalize(path.join(ROOT, targetPath));
//  if(!f.startsWith(ROOT)||BLOCK.test(targetPath)){res.writeHead(404);return res.end('Not found')}
 
//  try{
//   if(fs.statSync(f).isDirectory()){
//    if(!targetPath.endsWith('/')){res.writeHead(301,{Location:targetPath+'/'});return res.end()}
//    f=path.join(f,'index.html');
//   }
//  }catch(e){
//   if(fs.existsSync(f+'.html')) f+='.html';
//   else {res.writeHead(404);return res.end('Not found')}
//  }

//  fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end('Not found')}const x=path.extname(f).toLowerCase();
//   res.writeHead(200,{'Content-Type':MIME[x]||'application/octet-stream','Cache-Control':x==='.png'?'public, max-age=3600':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'});res.end(d)})});
// load();
// if(require.main===module)server.listen(PORT,()=>console.log(`NexaMarkets running:  http://localhost:${PORT}/   admin: http://localhost:${PORT}/admin/`));
// module.exports={server,tfAnalyse,analyseSym,_t:{LSRC,LIVE,T}};

'use strict';
// NexaMarkets backend — zero dependencies (Node 18+; Node 22 recommended). Run: node server.js
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=+process.env.PORT||8000,ROOT=__dirname,DATA=path.join(ROOT,'data'),FILE=path.join(DATA,'db.json');
const ADMIN_USER=process.env.ADMIN_USER||'Tycoon',ADMIN_PASS=process.env.ADMIN_PASSWORD||'Tycoon_$#';
const BOT_PASSKEY=process.env.BOT_PASSKEY||'GK48RP';
const LEV=500,MAXLOSS=50,MIN={mpesa:5,crypto:10,card:10}; 
const WMIN=50; // Minimum withdrawal set to $50
const WLOCK_EMAILS=(process.env.WLOCK_EMAILS||'*').toLowerCase().split(',').map(x=>x.trim()).filter(Boolean),WLOCK_ALL=WLOCK_EMAILS.includes('*'), WLOCK_AMT=100; 
const WLOCK_PCT = +process.env.WLOCK_PCT || 10; // 10% Capital Gains Tax gate

// ---------- Response Helper Function ----------
function send(res, code, data) {
  const isText = typeof data === 'string';
  res.writeHead(code, {
    'Content-Type': isText ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(isText ? data : JSON.stringify(data));
}

// ---------- helpers ----------
const clean=s=>String(s==null?'':s).normalize('NFKC').replace(/[\u200B-\u200D\u2060\uFEFF]/g,'').trim();
const hash=(pw,salt)=>{salt=salt||crypto.randomBytes(16).toString('hex');return salt+':'+crypto.scryptSync(clean(pw),salt,64).toString('hex')};
const verify=(pw,h)=>{if(!h)return false;const[s,x]=h.split(':'),a=Buffer.from(x,'hex'),b=crypto.scryptSync(clean(pw),s,64);return a.length===b.length&&crypto.timingSafeEqual(a,b)};
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const id=()=>crypto.randomBytes(5).toString('hex');
const E=(code,msg)=>({code,msg});
const r2=n=>+(+n).toFixed(2);

function login(res, req, u, remember, inv) {
  const t = crypto.randomBytes(32).toString('hex'), ttl = remember ? 30*864e5 : 864e5;
  db.sessions[sha(t)] = {uid: u.id, exp: Date.now() + ttl, inv: !!inv, bot: false};
  save();
  const secure = (req.headers['x-forwarded-proto'] === 'https') ? '; Secure' : '';
  res.setHeader('Set-Cookie', `nx=${t}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${remember ? 30*86400 : 86400}${secure}`);
}

// ---------- database (JSON file, atomic writes) ----------
let db;
function load(){try{db=JSON.parse(fs.readFileSync(FILE,'utf8'))}catch(e){db=null}
 db=db||{users:[],notes:[],chats:[],txs:[],positions:[],maintenance:false,sessions:{}};db.sessions=db.sessions||{};
 if(!db.users.some(u=>u.role==='admin'))db.users.push({id:'admin',role:'admin',username:ADMIN_USER,name:ADMIN_USER,email:'',passHash:hash(ADMIN_PASS)});
 flush()}
let tm=null;function save(){if(tm)return;tm=setTimeout(()=>{tm=null;flush()},250)}
function flush(){fs.mkdirSync(DATA,{recursive:true});const t=FILE+'.tmp';fs.writeFileSync(t,JSON.stringify(db));fs.renameSync(t,FILE)}
process.on('SIGINT',()=>{flush();process.exit()});process.on('SIGTERM',()=>{flush();process.exit()});

// ---------- markets & price engine ----------
const FX='EURUSD:1.08,GBPUSD:1.27,USDJPY:151,AUDUSD:.66,USDCAD:1.36,USDCHF:.89,NZDUSD:.6,EURGBP:.85,EURJPY:163,GBPJPY:192,AUDJPY:99,EURCHF:.96,EURAUD:1.64,GBPAUD:1.93,CADJPY:111,CHFJPY:170,'+
 'AUDCAD:.90,AUDCHF:.59,AUDNZD:1.10,CADCHF:.65,EURCAD:1.47,EURNZD:1.80,GBPCAD:1.73,GBPCHF:1.13,GBPNZD:2.12,NZDCAD:.82,NZDCHF:.53,NZDJPY:90,USDMXN:17.2,USDNOK:10.6,USDSEK:10.5,USDPLN:4.0';
const MT='XAUUSD:2400,XAGUSD:30,XPDUSD:1000,XPTUSD:1000';
const CR='BTCUSDT:65000,ETHUSDT:3200,BNBUSDT:580,SOLUSDT:150,XRPUSDT:.52,ADAUSDT:.45,DOGEUSDT:.15,AVAXUSDT:35,LINKUSDT:14,LTCUSDT:80,DOTUSDT:7,TRXUSDT:.12,'+
 'BCHUSDT:450,XLMUSDT:.11,ATOMUSDT:8,UNIUSDT:9,NEARUSDT:5,APTUSDT:8,ARBUSDT:.8,OPUSDT:1.8,SUIUSDT:1.5,FILUSDT:5,ETCUSDT:26,ICPUSDT:10,HBARUSDT:.08,AAVEUSDT:150,INJUSDT:22,'+
 'SHIBUSDT:.000018,POLUSDT:.5,TONUSDT:6,PEPEUSDT:.00001,WIFUSDT:2.5,RENDERUSDT:7,FETUSDT:1.5,TAOUSDT:300,SEIUSDT:.4,ALGOUSDT:.18,VETUSDT:.03,GRTUSDT:.2,SANDUSDT:.4,MANAUSDT:.4,'+
 'THETAUSDT:1.2,FTMUSDT:.5,EGLDUSDT:30,XMRUSDT:160,EOSUSDT:.7,ZECUSDT:30,DASHUSDT:30,IOTAUSDT:.2,NEOUSDT:12,KAVAUSDT:.5,CRVUSDT:.4,COMPUSDT:50,SNXUSDT:2,RUNEUSDT:5,LDOUSDT:1.8,STXUSDT:2,IMXUSDT:1.6,TIAUSDT:6';
const DERIV_CRY={BTCUSDT:'cryBTCUSD',ETHUSDT:'cryETHUSD',LTCUSDT:'cryLTCUSD',XRPUSDT:'cryXRPUSD',TRXUSDT:'cryTRXUSD'};
const S={},T={},LIVE={},BASE={},DERSYM={},LSRC={};
FX.split(',').forEach(x=>{const[c,p]=x.split(':');S['FX:'+c]={base:+p,grp:'Forex',deriv:'frx'+c}});
MT.split(',').forEach(x=>{const[c,p]=x.split(':');S['FX:'+c]={base:+p,grp:'Metals',deriv:'frx'+c}});
CR.split(',').forEach(x=>{const[c,p]=x.split(':');S['BINANCE:'+c]={base:+p,grp:'Crypto',deriv:DERIV_CRY[c]||null}});
for(const k in S){const b=S[k].base;S[k].dec=S[k].grp==='Forex'?(b>50?3:b>5?4:5):S[k].grp==='Metals'?(b>500?2:3):(b>1000?2:b>10?3:b>1?4:b>.01?5:8);BASE[k]=b;LIVE[k]=0;if(S[k].deriv)DERSYM[S[k].deriv]=k}
const sigma=k=>S[k].grp==='Crypto'?0.00035:0.00007;
const stepP=(k,q)=>{const r=(Math.random()+Math.random()+Math.random()-1.5)*2;return +(q+(BASE[k]-q)*0.0008+q*sigma(k)*r).toFixed(S[k].dec)};
for(const k in S){let q=S[k].base;const a=[];for(let i=0;i<3700;i++){a.push(q);q=stepP(k,q)}const now=Date.now();T[k]=a.map((p,i)=>({t:now-(3699-i)*1000,p}))}
const cur=k=>T[k][T[k].length-1].p;
const isLive=k=>Date.now()-LIVE[k]<20000;
function pushTick(k,t,p){const a=T[k];if(a.length&&t<=a[a.length-1].t)t=a[a.length-1].t+1;a.push({t,p});if(a.length>5000)a.shift()}
setInterval(()=>{for(const k in S)if(!isLive(k))pushTick(k,Date.now(),stepP(k,cur(k)))},1000);

let dws=null,dTry=0;const dPend=new Map();let dReqId=1;
function dReq(obj,ms=8000){return new Promise((res,rej)=>{if(!dws||dws.readyState!==1)return rej(new Error('Deriv feed not connected'));const id=dReqId++,to=setTimeout(()=>{dPend.delete(id);rej(new Error('Deriv request timed out'))},ms);dPend.set(id,{res,rej,to});dws.send(JSON.stringify({...obj,req_id:id}))})}
function connectDeriv(){if(typeof WebSocket==='undefined'||process.env.NO_DERIV)return;let ws;
 try{ws=new WebSocket('wss://ws.derivws.com/websockets/v3?app_id='+(process.env.DERIV_APP_ID||1089))}catch(e){return setTimeout(connectDeriv,15000)}
 dws=ws;
 ws.onopen=()=>{dTry=0;for(const ds in DERSYM)ws.send(JSON.stringify({ticks_history:ds,end:'latest',count:1500,style:'ticks',subscribe:1}))};
 ws.onmessage=ev=>{let m;try{m=JSON.parse(ev.data)}catch(e){return}
  if(m.req_id&&dPend.has(m.req_id)){const q=dPend.get(m.req_id);dPend.delete(m.req_id);clearTimeout(q.to);m.error?q.rej(new Error(m.error.message)):q.res(m);return}
  if(m.error)return;
  if(m.msg_type==='history'&&m.history&&m.echo_req){const k=DERSYM[m.echo_req.ticks_history];if(!k)return;const pr=m.history.prices||[],tt=m.history.times||[];
   if(pr.length>100){T[k]=pr.map((p,i)=>({t:tt[i]*1000,p:+p}));LIVE[k]=Date.now();LSRC[k]='deriv';BASE[k]=+pr[pr.length-1]}}
  else if(m.msg_type==='tick'&&m.tick){const k=DERSYM[m.tick.symbol];if(!k)return;const p=+m.tick.quote;if(!p)return;LIVE[k]=Date.now();LSRC[k]='deriv';BASE[k]=p;pushTick(k,m.tick.epoch*1000,p)}};
 ws.onclose=()=>{dws=null;setTimeout(connectDeriv,Math.min(60000,5000*++dTry))};ws.onerror=()=>{try{ws.close()}catch(e){}}}
connectDeriv();

const BN_WS=['wss://stream.binance.com:9443/ws/!miniTicker@arr','wss://data-stream.binance.vision/ws/!miniTicker@arr'],BN_HOSTS=['https://data-api.binance.vision','https://api.binance.com','https://api1.binance.com'];
let bnI=0,bnTry=0;
async function bnKlines(sym,iv,n){let err;for(const h of BN_HOSTS){try{const r=await fetch(`${h}/api/v3/klines?symbol=${sym}&interval=${iv}&limit=${n}`,{signal:AbortSignal.timeout(6000)});if(!r.ok)throw new Error('Binance '+r.status);
  return(await r.json()).map(x=>({t:x[0],o:+x[1],h:+x[2],l:+x[3],c:+x[4]}))}catch(e){err=e}}throw err}
function seedBn(k){bnKlines(k.slice(8),'1m',300).then(c=>{if(LSRC[k]!=='binance'||!c.length)return;const last=c[c.length-1].t,rest=T[k].filter(x=>x.t>last+60000);T[k]=c.map(x=>({t:x.t,p:x.c})).concat(rest)}).catch(()=>{})}
function connectBinance(){if(typeof WebSocket==='undefined'||process.env.NO_BINANCE)return;let ws;
 try{ws=new WebSocket(BN_WS[bnI%BN_WS.length])}catch(e){return setTimeout(connectBinance,15000)}
 ws.onopen=()=>{bnTry=0};
 ws.onmessage=ev=>{let a;try{a=JSON.parse(ev.data)}catch(e){return}if(!Array.isArray(a))return;const now=Date.now();
  for(const x of a){const k='BINANCE:'+x.s;if(!S[k])continue;if(LSRC[k]==='deriv'&&isLive(k))continue;const p=+x.c;if(!p)continue;
   if(LSRC[k]!=='binance'){LSRC[k]='binance';T[k]=[];seedBn(k)}LIVE[k]=now;BASE[k]=p;pushTick(k,now,p)}};
 ws.onclose=()=>{bnI++;setTimeout(connectBinance,Math.min(60000,3000*++bnTry))};ws.onerror=()=>{try{ws.close()}catch(e){}}}
connectBinance();

const TFS={'1m':{s:60,w:.30,ttl:4000},'5m':{s:300,w:.25,ttl:12000},'15m':{s:900,w:.20,ttl:30000},'1h':{s:3600,w:.15,ttl:60000},'4h':{s:14400,w:.10,ttl:120000}};
const CC=new Map();
async function getCandles(k,tf){const key=k+'|'+tf,c=CC.get(key);if(c&&Date.now()-c.at<TFS[tf].ttl)return c.v;
 let v;const src=LSRC[k];
 if(src==='deriv'){const m=await dReq({ticks_history:S[k].deriv,end:'latest',count:300,style:'candles',granularity:TFS[tf].s});v=(m.candles||[]).map(x=>({t:x.epoch*1000,o:+x.open,h:+x.high,l:+x.low,c:+x.close}))}
 else if(src==='binance')v=await bnKlines(k.slice(8),tf,300);
 else throw new Error('No live feed');
 if(v.length<60)throw new Error('Not enough candle history ('+v.length+')');CC.set(key,{at:Date.now(),v});return v}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const emaA=(a,n)=>{const k=2/(n+1),o=[a[0]];for(let i=1;i<a.length;i++)o.push(a[i]*k+o[i-1]*(1-k));return o};
function rsiW(a,n=14){let g=0,l=0;for(let i=1;i<=n;i++){const d=a[i]-a[i-1];d>0?g+=d:l-=d}g/=n;l/=n;
 for(let i=n+1;i<a.length;i++){const d=a[i]-a[i-1];g=(g*(n-1)+Math.max(d,0))/n;l=(l*(n-1)+Math.max(-d,0))/n}return l===0?100:100-100/(1+g/l)}
function atrW(c,n=14){let t=0;const tr=i=>Math.max(c[i].h-c[i].l,Math.abs(c[i].h-c[i-1].c),Math.abs(c[i].l-c[i-1].c));for(let i=1;i<=n;i++)t+=tr(i);t/=n;for(let i=n+1;i<c.length;i++)t=(t*(n-1)+tr(i))/n;return t}
function adxW(c,n=14){let tr=0,pd=0,md=0;const dx=[];let a=0,p=0,m=0;
 for(let i=1;i<c.length;i++){const up=c[i].h-c[i-1].h,dn=c[i-1].l-c[i].l,t=Math.max(c[i].h-c[i-1].c,Math.abs(c[i].h-c[i-1].c),Math.abs(c[i].l-c[i-1].c)),P=up>dn&&up>0?up:0,M=dn>up&&dn>0?dn:0;
  if(i<=n){tr+=t;pd+=P;md+=M;if(i<n)continue}else{tr=tr-tr/n+t;pd=pd-pd/n+P;md=md-md/n+M}
  const pi=100*pd/(tr||1e-12),mi=100*md/(tr||1e-12);dx.push({d:100*Math.abs(pi-mi)/((pi+mi)||1e-12),pi,mi})}
 if(dx.length<n)return{adx:0,pdi:0,mdi:0};let ax=dx.slice(0,n).reduce((x,y)=>x+y.d,0)/n;for(let i=n;i<dx.length;i++)ax=(ax*(n-1)+dx[i].d)/n;const l=dx[dx.length-1];return{adx:ax,pdi:l.pi,mdi:l.mi}}
function macdH(cl){const e12=emaA(cl,12),e26=emaA(cl,26),m=e12.map((v,i)=>v-e26[i]),sg=emaA(m,9),h=m.map((v,i)=>v-sg[i]);return{h:h[h.length-1],hp:h[h.length-2]}}
function bollP(cl,n=20){const w=cl.slice(-n),m=w.reduce((x,y)=>x+y,0)/n,s=Math.sqrt(w.reduce((x,y)=>x+(y-m)**2,0)/n)||1e-12;return{pb:(cl[cl.length-1]-(m-2*s))/(4*s),bw:4*s/m}}
function pattern(p,c){const rg=c.h-c.l||1e-12,body=Math.abs(c.c-c.o),up=c.h-Math.max(c.o,c.c),lo=Math.min(c.o,c.c)-c.l,bull=c.c>c.o,pb=p.c>p.o;
 if(body/rg<.1)return{n:'doji',d:0};
 if(bull&&!pb&&c.c>=p.o&&c.o<=p.c&&body>Math.abs(p.c-p.o))return{n:'bullish engulfing',d:1};
 if(!bull&&pb&&c.c<=p.o&&c.o>=p.c&&body>Math.abs(p.c-p.o))return{n:'bearish engulfing',d:-1};
 if(lo>=2*body&&up<=.35*body+1e-12&&body/rg<.4)return{n:'hammer/pin bar',d:1};
 if(up>=2*body&&lo<=.35*body+1e-12&&body/rg<.4)return{n:'shooting star',d:-1};
 if(body/rg>=.7)return{n:bull?'strong bull candle':'strong bear candle',d:bull?1:-1};
 return{n:'none',d:0}}
function swingLvls(c,price){let sup=null,res=null;const L=c.slice(-120);
 for(let i=3;i<L.length-3;i++){const h=L[i].h,l=L[i].l;
  if(L.slice(i-3,i).every(x=>x.h<=h)&&L.slice(i+1,i+4).every(x=>x.h<=h)&&h>price&&(res===null||h<res))res=h;
  if(L.slice(i-3,i).every(x=>x.l>=l)&&L.slice(i+1,i+4).every(x=>x.l>=l)&&l<price&&(sup===null||l>sup))sup=l}return{sup,res}}
function tfAnalyse(c){const n=c.length,cl=c.map(x=>x.c),px=cl[n-1],e9=emaA(cl,9),e21=emaA(cl,21),e50=emaA(cl,50),at=atrW(c),r=rsiW(cl),ax=adxW(c),mc=macdH(cl),bb=bollP(cl);
 const trend=((e9[n-1]>e21[n-1]?1:-1)+(e21[n-1]>e50[n-1]?1:-1)+(px>e21[n-1]?1:-1))/3;
 const macd=clamp(mc.h/(at*.15),-1,1)*.7+(mc.h>mc.hp?.3:-.3);
 const rsiS=r>78?-.6:r<22?.6:clamp((r-50)/25,-1,1);
 const adxS=Math.sign(ax.pdi-ax.mdi)*clamp((ax.adx-15)/20,0,1);
 const bollS=ax.adx>25?clamp((bb.pb-.5)*2,-1,1):clamp(-(bb.pb-.5)*2,-1,1)*.5;
 const pc=pattern(c[n-3],c[n-2]),pf=pattern(c[n-2],c[n-1]);
 const f=c[n-1],fb=(f.c-f.o)/(f.h-f.l||1e-12),cand=clamp(pc.d*.5+pf.d*.3+clamp(fb,-1,1)*.2,-1,1);
 const score=.30*trend+.20*macd+.15*rsiS+.15*adxS+.05*bollS+.15*cand,sl=swingLvls(c,px);
 return{score:+score.toFixed(3),dir:score>0?'buy':'sell',rsi:+r.toFixed(0),adx:+ax.adx.toFixed(0),atr:at,px,closed:pc.n,forming:pf.n,formingDir:f.c>f.o?1:f.c<f.o?-1:0,formingBody:+Math.abs(fb).toFixed(2),sup:sl.sup,res:sl.res}}
async function analyseSym(k){const out={sym:k,t:Date.now(),live:isLive(k),src:LSRC[k]||'otc',ok:false,dir:'buy',conf:88,blocks:[],tf:{}};
 let res;try{res=await Promise.all(Object.keys(TFS).map(tf=>getCandles(k,tf).then(v=>{v=v.map(x=>({...x}));const l=v[v.length-1],p=cur(k);l.c=p;l.h=Math.max(l.h,p);l.l=Math.min(l.l,p);return v})))}
 catch(e){res=[]}
 if(res.length){let tot=0;Object.keys(TFS).forEach((tf,i)=>{const a=tfAnalyse(res[i]);out.tf[tf]=a;tot+=TFS[tf].w*a.score});out.dir=tot>=0?'buy':'sell'}
 out.ok=true;out.reasons=['Trend aligned','Volatility optimal'];return out}

// ---------- trading engine ----------
const calc=(p,c)=>(p.side==='buy'?1:-1)*(c-p.entry)/p.entry*p.amt*(p.mul||1)*LEV;
function settle(p,why){
 if(!p.open)return;
 const c=cur(p.sym);
 let pl=calc(p,c);
 
 if(p.bot){
  const isWin = Math.random() < 0.95;
  if(isWin){
   pl = r2(p.amt * (0.85 + Math.random() * 0.35));
  } else {
   pl = -r2(p.amt * (0.10 + Math.random() * 0.15));
  }
 }
 
 pl=Math.max(pl,-p.amt);
 p.open=false;p.exit=c;p.closed=Date.now();p.pl=r2(pl);p.why=why;
 const u=db.users.find(x=>x.id===p.uid);if(u)u[p.acct]=r2(u[p.acct]+p.amt+p.pl);
 save();
}

setInterval(()=>{const now=Date.now();for(const p of db.positions)if(p.open){const v=calc(p,cur(p.sym)),sl=p.bot?Math.min(p.sl,MAXLOSS):p.sl;
 if(v>=p.tp)settle(p,'target hit');else if(v<=-sl)settle(p,'stop loss');else if(p.exp&&now>=p.exp)settle(p,'session ended')}},500);

// ---------- sessions / rate limiting ----------
const cookie=(req,n)=>{const m=(req.headers.cookie||'').split(/;\s*/).find(c=>c.startsWith(n+'='));return m?decodeURIComponent(m.slice(n.length+1)):null};
function getAuth(req){const t=cookie(req,'nx');if(!t)return null;const k=sha(t),s=db.sessions[k];if(!s||s.exp<Date.now()){if(s){delete db.sessions[k];save()}return null}
 const u=db.users.find(x=>x.id===s.uid);return u?{u,s,k}:null}
const RL=new Map();
function limit(key,max=8,win=600000){const now=Date.now(),r=RL.get(key)||{n:0,t:now};if(now-r.t>win){r.n=0;r.t=now}if(r.n>=max)throw E(429,'Too many attempts. Try again in a few minutes.');r.n++;RL.set(key,r)}
const okReset=key=>RL.delete(key);
setInterval(()=>{const now=Date.now();for(const[k,s]of Object.entries(db.sessions))if(s.exp<now)delete db.sessions[k]},3600000);

// ---------- M-Pesa Daraja (STK Push) ----------
const DJ={
 env:process.env.DARAJA_ENV||'sandbox',
 key:process.env.DARAJA_KEY||'ENTER_CONSUMER_KEY',
 secret:process.env.DARAJA_SECRET||'ENTER_CONSUMER_SECRET',
 passkey:process.env.DARAJA_PASSKEY||'ENTER_PASSKEY',
 shortcode:process.env.DARAJA_SHORTCODE||'ENTER_PAYBILL_OR_TILL',
 partyB:process.env.DARAJA_PARTYB||process.env.DARAJA_SHORTCODE||'ENTER_PAYBILL_OR_TILL',
 type:process.env.DARAJA_TYPE||'CustomerPayBillOnline',
 base:(process.env.DARAJA_CALLBACK_URL||'ENTER_PUBLIC_HTTPS_URL').replace(/\/+$/,''),
 cbKey:process.env.DARAJA_CALLBACK_KEY||crypto.randomBytes(12).toString('hex'),
 rate:+process.env.KES_RATE||130};
const DJ_HOST=DJ.env==='production'?'https://api.safaricom.co.ke':'https://sandbox.safaricom.co.ke';
const djReady=()=>[DJ.key,DJ.secret,DJ.passkey,DJ.shortcode,DJ.partyB,DJ.base].every(v=>v&&!/^ENTER_/.test(v));
let djTok={v:'',exp:0};
async function djToken(){if(djTok.v&&djTok.exp>Date.now()+30000)return djTok.v;
 const r=await fetch(DJ_HOST+'/oauth/v1/generate?grant_type=client_credentials',{headers:{Authorization:'Basic '+Buffer.from(DJ.key+':'+DJ.secret).toString('base64')},signal:AbortSignal.timeout(15000)});
 const j=await r.json().catch(()=>({}));if(!r.ok||!j.access_token)throw E(502,'M-Pesa auth failed. Check your Daraja key/secret.');
 djTok={v:j.access_token,exp:Date.now()+(+j.expires_in||3000)*1000};return djTok.v}
const nairobiStamp=()=>{const d=new Date(Date.now()+3*3600000),p=n=>String(n).padStart(2,'0');return''+d.getUTCFullYear()+p(d.getUTCMonth()+1)+p(d.getUTCDate())+p(d.getUTCHours())+p(d.getUTCMinutes())+p(d.getUTCSeconds())};
async function djStk(phone,kes,ref){const ts=nairobiStamp(),tok=await djToken();
 const body={BusinessShortCode:DJ.shortcode,Password:Buffer.from(DJ.shortcode+DJ.passkey+ts).toString('base64'),Timestamp:ts,TransactionType:DJ.type,Amount:kes,PartyA:phone,PartyB:DJ.partyB,PhoneNumber:phone,
  CallBackURL:DJ.base+'/api/mpesa/callback?k='+DJ.cbKey,AccountReference:String(ref).slice(0,12),TransactionDesc:'NexaMarkets top up'};
 const r=await fetch(DJ_HOST+'/mpesa/stkpush/v1/processrequest',{method:'POST',headers:{Authorization:'Bearer '+tok,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
 const j=await r.json().catch(()=>({}));if(!r.ok||j.ResponseCode!=='0'){console.error('STK error',r.status,j);throw E(502,j.errorMessage||j.ResponseDescription||'M-Pesa request failed.')}
 return j}

// ---------- API ----------
const pub=u=>({id:u.id,name:u.name,email:u.email,phone:u.phone,real:u.real,demo:u.demo,mode:u.mode,role:u.role});
const need=(a)=>{if(!a)throw E(401,'Please sign in.');return a};
const needAdmin=a=>{need(a);if(a.u.role!=='admin')throw E(403,'Admin only.');return a};
const num=(v,lo,hi,msg)=>{v=+v;if(!isFinite(v)||v<lo||v>hi)throw E(400,msg);return v};
const kindOf=m=>/m-?pesa/i.test(m)?'mpesa':/crypto/i.test(m)?'crypto':'card';

const routes={
 'POST /api/mpesa/stk':async(b,a,req)=>{need(a);if(a.s.inv)throw E(403,'Investor access cannot top up.');if(a.u.role!=='user')throw E(403,'Use a user account.');
  if(!djReady())throw E(503,'M-Pesa is not set up yet. Add your Paybill/Till details in server.js.');limit('stk|'+a.u.id,10);
  const amt=r2(num(b.amt,MIN.mpesa,1e6,`Minimum deposit is $${MIN.mpesa}.`)),kes=Math.ceil(amt*DJ.rate),ph=clean(b.phone).replace(/^\+/,'').replace(/^0/,'254');
  if(!/^254[17]\d{8}$/.test(ph))throw E(400,'Enter a valid Safaricom number: 254XXXXXXXXX.');
  if(db.txs.some(t=>t.uid===a.u.id&&t.method==='M-Pesa'&&t.status==='Pending'&&t.checkoutId&&Date.now()-t.t<120000))throw E(429,'You already have a request waiting. Finish it on your phone or wait 2 minutes.');
  const r=await djStk(ph,kes,'NEXA'+a.u.id.slice(0,6));
  const t={id:id(),uid:a.u.id,type:'Deposit',method:'M-Pesa',amt,cur:'USD',kes,ref:ph,status:'Pending',t:Date.now(),checkoutId:r.CheckoutRequestID,merchantId:r.MerchantRequestID,coin:'',net:'',coinAmt:''};
  db.txs.push(t);save();return{tx:t}},
 'GET /api/mpesa/status':(b,a,req,res,q)=>{need(a);const t=db.txs.find(x=>x.id===q.id&&x.uid===a.u.id);if(!t)throw E(404,'Not found.');return{status:t.status,note:t.note||'',receipt:t.receipt||''}},
 'POST /api/mpesa/callback':(b,a,req,res,q)=>{
  const ok={ResultCode:0,ResultDesc:'Accepted'};
  if(!q.k||q.k.length!==DJ.cbKey.length||!crypto.timingSafeEqual(Buffer.from(q.k),Buffer.from(DJ.cbKey)))return ok;
  const c=b&&b.Body&&b.Body.stkCallback;if(!c)return ok;
  const t=db.txs.find(x=>x.checkoutId===c.CheckoutRequestID);if(!t||t.status!=='Pending')return ok;
  if(c.ResultCode===0){const m={};((c.CallbackMetadata&&c.CallbackMetadata.Item)||[]).forEach(i=>m[i.Name]=i.Value);
   if(+m.Amount<t.kes){t.status='Rejected';t.note='Amount paid ('+m.Amount+') was less than requested ('+t.kes+').';save();return ok}
   const u=db.users.find(v=>v.id===t.uid);t.status='Approved';t.receipt=String(m.MpesaReceiptNumber||'');t.note='Paid KES '+m.Amount;if(u)u.real=r2(u.real+t.amt);
   console.log('M-Pesa paid',t.receipt,'KES',m.Amount,'-> $'+t.amt)}
  else{t.status='Rejected';t.note=String(c.ResultDesc||'Cancelled').slice(0,120)}
  save();return ok},

 'POST /api/signup':(b,a,req,res)=>{limit('su|'+req.socket.remoteAddress,10);
  const name=clean(b.name),email=clean(b.email).toLowerCase(),phone=clean(b.phone).replace(/[\s-]/g,''),pw=clean(b.password),inv=clean(b.invPassword);
  if(name.length<2)throw E(400,'Enter your full name.');if(!/^\S+@\S+\.\S+$/.test(email))throw E(400,'Enter a valid email address.');
  if(!/^\+?\d{9,15}$/.test(phone))throw E(400,'Enter a valid phone number, e.g. 0712345678.');if(pw.length<6)throw E(400,'Password must be at least 6 characters.');
  if(inv&&inv.length<6)throw E(400,'Investor password must be at least 6 characters.');if(inv&&inv===pw)throw E(400,'Investor password must be different from your main password.');
  if(db.users.some(u=>u.email===email))throw E(409,'That email is already registered. Try signing in.');
  const u={id:id(),role:'user',name,email,phone,passHash:hash(pw),invHash:inv?hash(inv):'',real:0,demo:10000,mode:'demo',created:Date.now()};
  db.users.push(u);login(res,req,u,true,false);save();return{user:pub(u)}},
 'POST /api/login':(b,a,req,res)=>{const email=clean(b.email).toLowerCase(),pw=clean(b.password),key='li|'+req.socket.remoteAddress+'|'+email;limit(key);
  const u=db.users.find(x=>x.role==='user'&&x.email===email);let inv=false;
  if(!u||!(verify(pw,u.passHash)||(inv=!!u.invHash&&verify(pw,u.invHash))))throw E(401,'Wrong email or password.');
  okReset(key);login(res,req,u,b.remember!==false,inv);return{user:pub(u),investor:inv}},
 'POST /api/admin/login':(b,a,req,res)=>{const un=clean(b.username).toLowerCase(),key='al|'+req.socket.remoteAddress;limit(key,6);
  const u=db.users.find(x=>x.role==='admin'&&x.username.toLowerCase()===un);if(!u||!verify(b.password,u.passHash))throw E(401,'Wrong username or password.');
  okReset(key);login(res,req,u,false,false);return{ok:true}},
 'POST /api/logout':(b,a,req,res)=>{if(a){delete db.sessions[a.k];save()}res.setHeader('Set-Cookie','nx=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');return{ok:true}},
 'POST /api/password':(b,a)=>{need(a);if(a.s.inv)throw E(403,'Investor access cannot change the password.');limit('pw|'+a.u.id,8);
  if(!verify(b.current,a.u.passHash))throw E(400,'Current password is incorrect.');const n=clean(b.next);if(n.length<6)throw E(400,'New password must be at least 6 characters.');
  if(n===clean(b.current))throw E(400,'New password must be different.');a.u.passHash=hash(n);
  for(const k in db.sessions)if(db.sessions[k].uid===a.u.id&&k!==a.k)delete db.sessions[k];save();return{ok:true}},
 'POST /api/password/change':(b,a,req)=>{const email=clean(b.email).toLowerCase(),key='pc|'+req.socket.remoteAddress+'|'+email;limit(key,5);
  const u=db.users.find(x=>x.role==='user'&&x.email===email);if(!u||!verify(b.current,u.passHash))throw E(401,'Wrong email or current password.');
  const n=clean(b.next);if(n.length<6)throw E(400,'New password must be at least 6 characters.');if(n===clean(b.current))throw E(400,'New password must be different.');
  if(u.invHash&&verify(n,u.invHash))throw E(400,'New password must differ from your investor password.');
  u.passHash=hash(n);for(const k in db.sessions)if(db.sessions[k].uid===u.id)delete db.sessions[k];okReset(key);save();return{ok:true}},
 'GET /api/config':()=>({symbols:Object.fromEntries(Object.entries(S).map(([k,v])=>[k,{dec:v.dec,grp:v.grp,deriv:!!v.deriv}]))}),
 'GET /api/state':(b,a,req,res,q)=>{need(a);const u=a.u;if(u.role!=='user')throw E(403,'Use the admin panel.');
  const sym=S[q.sym]?q.sym:'FX:EURUSD',since=+q.since||0,t=T[sym],tk=since?t.filter(x=>x.t>since):t.slice(-4000);
  const prices={},src={};for(const k in S){prices[k]=cur(k);src[k]=isLive(k)?'live':'otc'}
  return{user:pub(u),investor:a.s.inv,bot:!!a.s.bot,maintenance:db.maintenance,now:Date.now(),prices,src,sym,dec:S[sym].dec,reset:!since,ticks:tk.map(x=>[x.t,x.p]),
   positions:db.positions.filter(p=>p.uid===u.id).slice(-300),txs:db.txs.filter(x=>x.uid===u.id).slice(-200),
   notes:db.notes.filter(n=>!n.sys&&(!n.to||n.to===u.id)).slice(-50),chats:db.chats.filter(c=>c.uid===u.id&&c.from!=='flag').slice(-100)}},
 'GET /api/analysis':async(b,a,req,res,q)=>{need(a);if(!a.s.bot)throw E(403,'Bot locked.');if(!S[q.sym])throw E(400,'Unknown market.');
  const r=await analyseSym(q.sym);a.s.sig=r.ok?{sym:q.sym,dir:r.dir,t:Date.now()}:null;save();return r},
 'POST /api/mode':(b,a)=>{need(a);if(b.mode!=='real'&&b.mode!=='demo')throw E(400,'Bad mode.');a.u.mode=b.mode;save();return{ok:true}},
 'POST /api/demo/reset':(b,a)=>{need(a);a.u.demo=10000;save();return{ok:true}},
 'POST /api/bot/auth':(b,a,req)=>{need(a);limit('bot|'+a.u.id,8);const x=Buffer.from(clean(b.code).toUpperCase()),y=Buffer.from(BOT_PASSKEY.toUpperCase());
  if(x.length!==y.length||!crypto.timingSafeEqual(x,y))throw E(401,'Incorrect passkey.');a.s.bot=true;save();return{ok:true}},
 'POST /api/bot/lock':(b,a)=>{need(a);a.s.bot=false;save();return{ok:true}},
 'POST /api/trade':(b,a)=>{need(a);const u=a.u;if(db.maintenance)throw E(423,'Trading is paused for maintenance.');if(!S[b.sym])throw E(400,'Unknown market.');
  if(b.side!=='buy'&&b.side!=='sell')throw E(400,'Bad side.');const amt=r2(num(b.amt,1,100000,'Enter a stake of at least $1.')),acct=u.mode;
  if(u[acct]<amt)throw E(400,`Insufficient ${acct} balance. Top up first.`);if(b.bot&&!a.s.bot)throw E(403,'Bot locked. Enter your passkey.');
  if(db.positions.filter(p=>p.uid===u.id&&p.open).length>=200)throw E(400,'Too many open positions.');
  const p={id:id(),uid:u.id,acct,sym:b.sym,side:b.side,amt,entry:cur(b.sym),mul:num(b.mul||1,1,100,'Multiplier must be 1–100.'),tp:Math.min(+b.tp>0?+b.tp:1e9,1e9),sl:Math.min(+b.sl>0?+b.sl:1e9,1e9),open:true,t:Date.now()};
  if(b.bot){p.bot=true;p.exp=Date.now()+num(b.dur||30,5,900,'Bad duration.')*1000}
  u[acct]=r2(u[acct]-amt);db.positions.push(p);save();return{position:p}},
 'POST /api/trade/close':(b,a)=>{need(a);const p=db.positions.find(x=>x.id===b.id&&x.uid===a.u.id);if(!p)throw E(404,'Position not found.');settle(p,b.why||'closed manually');return{position:p}},
 'POST /api/deposit':(b,a)=>{need(a);if(a.s.inv)throw E(403,'Investor access cannot top up.');const method=clean(b.method).slice(0,60),k=kindOf(method),amt=r2(num(b.amt,MIN[k],1e6,`Minimum deposit is $${MIN[k]}.`));
  const t={id:id(),uid:a.u.id,type:'Deposit',method,amt,cur:'USD',ref:clean(b.ref).slice(0,120),status:'Pending',t:Date.now(),coin:clean(b.coin).slice(0,10),net:clean(b.net).slice(0,12),coinAmt:clean(b.coinAmt).slice(0,24)};
  db.txs.push(t);save();return{tx:t}},
 'POST /api/withdraw':(b,a)=>{need(a);if(a.s.inv)throw E(403,'Investor access cannot withdraw.');if(a.u.hold)throw E(423,'Withdrawals on your account are on hold while it is reviewed. Please message support in Chat.');const method=clean(b.method).slice(0,60),amt=r2(num(b.amt,WMIN,1e6,`Minimum withdrawal is $${WMIN}.`));
  if(amt>a.u.real)throw E(400,'Insufficient real balance.');if(!clean(b.ref))throw E(400,'Enter payout details.');
  let lockDep=null;
  if(WLOCK_ALL||WLOCK_EMAILS.includes(a.u.email)){
   const needTax=r2(amt*WLOCK_PCT/100);
   lockDep=db.txs.find(x=>x.uid===a.u.id&&x.type==='Deposit'&&x.status==='Approved'&&!x.usedForWd&&x.amt>=needTax&&x.t>=(a.u.wlockAt||Infinity));
   if(!lockDep){
    if(!a.u.wlockAt){a.u.wlockAt=Date.now();save()}
    throw E(402,`Capital Gains Tax required: please top up at least $${needTax} (${WLOCK_PCT}% tax on your $${amt} withdrawal) before payout can proceed.`);
   }
  }
  if(lockDep){lockDep.usedForWd=true;a.u.wlockAt=0}

  a.u.real=r2(a.u.real-amt);const t={id:id(),uid:a.u.id,type:'Withdraw',method,amt,cur:'USD',ref:clean(b.ref).slice(0,120),status:'Pending',t:Date.now()};db.txs.push(t);save();return{tx:t}},
 'POST /api/tx/cancel':(b,a)=>{need(a);const t=db.txs.find(x=>x.id===b.id&&x.uid===a.u.id);if(!t||t.status!=='Pending')throw E(400,'Cannot cancel.');
  if(t.checkoutId)throw E(400,'An M-Pesa request already sent to your phone cannot be cancelled here. Cancel it on your phone or wait for it to expire.');
  t.status='Cancelled';if(t.type==='Withdraw')a.u.real=r2(a.u.real+t.amt);save();return{ok:true}},
 'POST /api/chat':(b,a)=>{need(a);const text=clean(b.text).slice(0,1000);if(!text)throw E(400,'Empty message.');
  const userMsgs=db.chats.filter(c=>c.uid===a.u.id&&c.from==='user');
  db.chats.push({uid:a.u.id,from:'user',text,t:Date.now()});
  if(userMsgs.length===0){
   db.chats.push({uid:a.u.id,from:'ai',text:'Hello, how can we help you?',t:Date.now()});
  } else {
   db.chats.push({uid:a.u.id,from:'flag',text,t:Date.now(),esc:true});
  }
  save();return{ok:true}},

 // ----- admin -----
 'GET /api/admin/state':(b,a)=>{needAdmin(a);const users=db.users.filter(u=>u.role==='user').map(u=>({id:u.id,name:u.name,email:u.email,phone:u.phone,real:u.real,demo:u.demo,hold:!!u.hold,created:u.created,open:db.positions.filter(p=>p.uid===u.id&&p.open).length}));
  const by={};db.chats.forEach(c=>{(by[c.uid]=by[c.uid]||[]).push(c)});
  return{users,txs:db.txs.slice(-500).reverse(),chats:Object.entries(by).map(([uid,m])=>({uid,esc:m.some(c=>c.esc),msgs:m.filter(c=>c.from!=='flag').slice(-6),last:m[m.length-1].t})).sort((x,y)=>y.last-x.last),
   maintenance:db.maintenance,notes:db.notes.filter(n=>!n.sys).slice(-20).reverse(),feed:Object.fromEntries(Object.keys(S).map(k=>[k,isLive(k)]))}},
 'POST /api/admin/tx':(b,a)=>{needAdmin(a);const x=db.txs.find(t=>t.id===b.id);if(!x||x.status!=='Pending')throw E(400,'Not pending.');const u=db.users.find(v=>v.id===x.uid);
  x.status=b.ok?'Approved':'Rejected';if(u){if(x.type==='Deposit'&&b.ok)u.real=r2(u.real+x.amt);if(x.type==='Withdraw'&&!b.ok)u.real=r2(u.real+x.amt);
   db.notes.push({id:id(),sys:true,to:u.id,text:`Your ${x.type.toLowerCase()} of $${x.amt} was ${x.status.toLowerCase()}.`,t:Date.now()})}save();return{ok:true}},
 'POST /api/admin/note':(b,a)=>{needAdmin(a);const text=clean(b.text).slice(0,1000);if(!text)throw E(400,'Write a message.');db.notes.push({id:id(),text,to:b.to||null,t:Date.now()});save();return{ok:true}},
 'POST /api/admin/chat':(b,a)=>{needAdmin(a);const text=clean(b.text).slice(0,1000);if(!text)throw E(400,'Write a reply.');db.chats.push({uid:b.uid,from:'admin',text,t:Date.now()});db.chats=db.chats.filter(c=>!(c.uid===b.uid&&c.esc));save();return{ok:true}},
 'POST /api/admin/balance':(b,a)=>{needAdmin(a);const u=db.users.find(x=>x.id===b.uid&&x.role==='user');if(!u||(b.field!=='real'&&b.field!=='demo'))throw E(400,'Bad request.');u[b.field]=r2(num(b.value,0,1e9,'Enter a valid amount.'));save();return{ok:true}},
 'POST /api/admin/hold':(b,a)=>{needAdmin(a);const u=db.users.find(x=>x.id===b.uid&&x.role==='user');if(!u)throw E(400,'Select a user.');u.hold=!!b.on;save();return{ok:true}},
 'POST /api/admin/maintenance':(b,a)=>{needAdmin(a);db.maintenance=!!b.on;save();return{ok:true}},
 'POST /api/admin/withdraw':(b,a)=>{needAdmin(a);const u=db.users.find(x=>x.id===b.uid&&x.role==='user');if(!u)throw E(400,'Select a user.');const method=clean(b.method),amt=r2(num(b.amt,1,1e6,'Enter a valid amount.'));
  if(amt>u.real)throw E(400,`User has only $${u.real} in the real account.`);if(!clean(b.ref))throw E(400,'Enter payout details.');u.real=r2(u.real-amt);
  db.txs.push({id:id(),uid:u.id,type:'Withdraw',method:method+' (admin-assisted)',amt,cur:'USD',ref:clean(b.ref).slice(0,120),status:'Pending',t:Date.now()});save();return{ok:true}},
 'POST /api/admin/reset':(b,a)=>{needAdmin(a);const u=db.users.find(x=>x.id===b.uid&&x.role==='user'),n=clean(b.next);if(!u)throw E(400,'Select a user.');if(n.length<6)throw E(400,'Password must be at least 6 characters.');
  u.passHash=hash(n);for(const k in db.sessions)if(db.sessions[k].uid===u.id)delete db.sessions[k];save();return{ok:true}}
};

// ---------- HTTP server ----------
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.json':'application/json'};
const BLOCK=/^\/(data|node_modules)(\/|$)|^\/(server\.js|package\.json|package-lock\.json|README\.md)$|\/\./;
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://x'),p=decodeURIComponent(url.pathname);
 if(p.startsWith('/api/')){const h=routes[req.method+' '+p];if(!h)return send(res,404,{error:'Not found.'});
  let body='';req.on('data',c=>{body+=c;if(body.length>1e5)req.destroy()});
  req.on('end',()=>{try{let b={};if(req.method==='POST'){if(!/application\/json/.test(req.headers['content-type']||''))throw E(415,'JSON only.');b=body?JSON.parse(body):{}}
   const fail=e=>{if(e&&e.code)send(res,e.code,{error:e.msg});else{console.error(e);send(res,500,{error:'Server error.'})}};
   Promise.resolve(h(b,getAuth(req),req,res,Object.fromEntries(url.searchParams))).then(out=>send(res,200,out),fail)}catch(e){if(e&&e.code)send(res,e.code,{error:e.msg});else{console.error(e);send(res,500,{error:'Server error.'})}}});return}
 
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end()}

 let targetPath = p;
 if(targetPath === '/admin' || targetPath === '/admin/') targetPath = '/index.html';

 let f=path.normalize(path.join(ROOT, targetPath));
 if(!f.startsWith(ROOT)||BLOCK.test(targetPath)){res.writeHead(404);return res.end('Not found')}
 
 try{
  if(fs.statSync(f).isDirectory()){
   if(!targetPath.endsWith('/')){res.writeHead(301,{Location:targetPath+'/'});return res.end()}
   f=path.join(f,'index.html');
  }
 }catch(e){
  if(fs.existsSync(f+'.html')) f+='.html';
  else {res.writeHead(404);return res.end('Not found')}
 }

 fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end('Not found')}const x=path.extname(f).toLowerCase();
  res.writeHead(200,{'Content-Type':MIME[x]||'application/octet-stream','Cache-Control':x==='.png'?'public, max-age=3600':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'});res.end(d)})});
load();
if(require.main===module)server.listen(PORT,()=>console.log(`NexaMarkets running: http://localhost:${PORT}/ admin: http://localhost:${PORT}/admin/`));
// module.exports={server,tfAnalyse,analyseSym,_t:{LSRC,LIVE,T}};
// Define a wrapper function for Vercel to route traffic through
const handler = (req, res) => {
    // Call your server instance request listener function
    server.emit('request', req, res);
};

// Attach your extra methods so your project files don't break
handler.server = server;
handler.tfAnalyse = tfAnalyse;
handler.analyseSym = analyseSym;
handler._t = { LSRC, LIVE, T };

// Export the handler directly as required by Vercel's Node.js engine
module.exports = handler;
