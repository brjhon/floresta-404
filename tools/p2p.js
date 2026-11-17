// =====================================================================
// MULTIPLAYER P2P (versão independente): salas com código, um anfitrião
// repassa os dados; se o anfitrião sair, outro jogador assume a sala.
// =====================================================================
const P2P={peer:null,host:false,code:'',conns:new Map(),hostConn:null,mine:{},sent:{},others:new Map(),status:'off',snap:Object.freeze([]),myId:null,dirty:false,gen:0};
const PEER_OPTS={debug:0,config:{iceServers:[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302']},{urls:'turn:openrelay.metered.ca:80',username:'openrelayproject',credential:'openrelayproject'},{urls:'turn:openrelay.metered.ca:443?transport=tcp',username:'openrelayproject',credential:'openrelayproject'}]}};
const hostId=c=>'floresta404-v1-'+String(c).toLowerCase();
function genCode(){const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<5;i++)s+=A[Math.floor(Math.random()*A.length)];return s;}
const cleanCode=c=>String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);
function p2pRebuild(){const me={peer:P2P.myId||'eu',by:null,isMe:true,sameTab:true,kind:'viewer',guest:false,presence:P2P.mine,updatedAt:Date.now()};
  P2P.snap=Object.freeze([me,...[...P2P.others].map(([id,pr])=>({peer:id,by:null,isMe:false,sameTab:false,kind:'viewer',guest:false,presence:pr,updatedAt:Date.now()}))]);}
const p2pRoom={presence(patch){const m=Object.assign({},P2P.mine);for(const k in patch){if(patch[k]===null)delete m[k];else m[k]=patch[k];}P2P.mine=m;P2P.dirty=true;p2pRebuild();return Promise.resolve();},peers:()=>P2P.snap,connected:()=>P2P.status==='on'};
function applyDiff(id,d,full){if(!id||id===P2P.myId)return;const o=full?{}:Object.assign({},P2P.others.get(id)||{});for(const k in d){if(d[k]===null)delete o[k];else o[k]=d[k];}P2P.others.set(id,o);p2pRebuild();}
function sendAll(msg,except){const s=JSON.stringify(msg);for(const[id,c]of P2P.conns)if(id!==except&&c.open)try{c.send(s);}catch(e){}}
function p2pSendTick(){if(P2P.status!=='on'||!P2P.dirty)return;P2P.dirty=false;const d={};let n=0;
  for(const k in P2P.mine){const js=JSON.stringify(P2P.mine[k]);if(P2P.sent[k]!==js){d[k]=P2P.mine[k];P2P.sent[k]=js;n++;}}for(const k in P2P.sent)if(!(k in P2P.mine)){d[k]=null;delete P2P.sent[k];n++;}
  if(!n)return;const msg={t:'p',id:P2P.myId,d};if(P2P.host)sendAll(msg);else if(P2P.hostConn&&P2P.hostConn.open)try{P2P.hostConn.send(JSON.stringify(msg));}catch(e){}}
setInterval(p2pSendTick,60);
function parseMsg(raw){if(typeof raw!=='string'||raw.length>60000)return null;try{const m=JSON.parse(raw);return m&&typeof m==='object'?m:null;}catch(e){return null;}}
function setupHostConn(c){c.on('open',()=>{P2P.conns.set(c.peer,c);const all={};all[P2P.myId]=P2P.mine;for(const[id,p]of P2P.others)all[id]=p;try{c.send(JSON.stringify({t:'all',peers:all}));}catch(e){}p2pStatus();});
  c.on('data',raw=>{const m=parseMsg(raw);if(!m)return;const id=c.peer;if(m.t==='p'&&m.d&&typeof m.d==='object'){applyDiff(id,m.d,false);sendAll({t:'p',id,d:m.d},id);}else if(m.t==='f'&&m.p&&typeof m.p==='object'){applyDiff(id,m.p,true);sendAll({t:'f',id,p:m.p},id);}});
  const bye=()=>{if(!P2P.conns.has(c.peer))return;P2P.conns.delete(c.peer);P2P.others.delete(c.peer);p2pRebuild();sendAll({t:'bye',id:c.peer});p2pStatus();};c.on('close',bye);c.on('error',bye);}
function onHostMsg(raw){const m=parseMsg(raw);if(!m)return;
  if(m.t==='all'&&m.peers&&typeof m.peers==='object'){P2P.others.clear();for(const id in m.peers)if(id!==P2P.myId&&m.peers[id]&&typeof m.peers[id]==='object')P2P.others.set(id,Object.assign({},m.peers[id]));p2pRebuild();}
  else if(m.t==='p'&&m.d&&typeof m.d==='object')applyDiff(String(m.id),m.d,false);else if(m.t==='f'&&m.p&&typeof m.p==='object')applyDiff(String(m.id),m.p,true);
  else if(m.t==='bye'){P2P.others.delete(String(m.id));p2pRebuild();}}
function resetSent(){P2P.sent={};P2P.dirty=true;}
function p2pLeave(){P2P.gen++;try{P2P.peer&&P2P.peer.destroy();}catch(e){}P2P.peer=null;P2P.host=false;P2P.conns.clear();P2P.hostConn=null;P2P.others.clear();P2P.status='off';P2P.code='';p2pRebuild();NET.ready=false;history.replaceState(null,'',location.pathname);p2pStatus();}
function becomeHost(code,quiet){const g=++P2P.gen;P2P.code=code;P2P.status='connecting';p2pStatus();let pr;try{pr=new Peer(hostId(code),PEER_OPTS);}catch(e){P2P.status='error';p2pStatus('Não deu pra criar a sala neste navegador');return;}
  pr.on('open',id=>{if(g!==P2P.gen){pr.destroy();return;}if(P2P.peer&&P2P.peer!==pr)try{P2P.peer.destroy();}catch(e){}P2P.peer=pr;P2P.myId=id;P2P.host=true;P2P.hostConn=null;P2P.status='on';resetSent();p2pRebuild();attachNet();if(!quiet)toast(`🌐 Sala ${code} criada! Mande o link pros amigos`,'#8ce99a');p2pStatus();});
  pr.on('connection',c=>setupHostConn(c));
  pr.on('error',e=>{if(g!==P2P.gen)return;if(e&&e.type==='unavailable-id'){try{pr.destroy();}catch(_){}joinRoom(code,true);}else if(e&&e.type==='network'||e&&e.type==='server-error'||e&&e.type==='socket-error'){P2P.status='error';p2pStatus('Sem conexão com o servidor de salas. Tente de novo.');}});
  pr.on('disconnected',()=>{if(g===P2P.gen&&P2P.host)try{pr.reconnect();}catch(e){}});}
function joinRoom(code,fromHost){code=cleanCode(code);if(!code)return;const g=++P2P.gen;P2P.code=code;P2P.status='connecting';p2pStatus();
  const go=pr=>{const c=pr.connect(hostId(code),{reliable:true});P2P.hostConn=c;let opened=false;
    c.on('open',()=>{if(g!==P2P.gen)return;opened=true;P2P.host=false;P2P.status='on';resetSent();try{c.send(JSON.stringify({t:'f',id:P2P.myId,p:P2P.mine}));}catch(e){}P2P.sent={};for(const k in P2P.mine)P2P.sent[k]=JSON.stringify(P2P.mine[k]);attachNet();toast(`🌐 Você entrou na sala ${code}`,'#8ce99a');p2pStatus();});
    c.on('data',onHostMsg);c.on('close',()=>{if(g!==P2P.gen)return;if(opened)hostLost(code);});c.on('error',()=>{});};
  if(P2P.peer&&!P2P.peer.destroyed&&P2P.peer.open&&!P2P.host){go(P2P.peer);return;}
  try{if(P2P.peer)P2P.peer.destroy();}catch(e){}let pr;try{pr=new Peer(PEER_OPTS);}catch(e){P2P.status='error';p2pStatus('Não deu pra conectar neste navegador');return;}P2P.peer=pr;
  pr.on('open',id=>{if(g!==P2P.gen)return;P2P.myId=id;p2pRebuild();go(pr);});
  pr.on('error',e=>{if(g!==P2P.gen)return;if(e&&e.type==='peer-unavailable'){if(fromHost){setTimeout(()=>{if(g===P2P.gen)becomeHost(code,true);},400+Math.random()*900);}else becomeHost(code);}else if(e&&(e.type==='network'||e.type==='server-error'||e.type==='socket-error')){P2P.status='error';p2pStatus('Sem conexão com o servidor de salas. Tente de novo.');}});}
function hostLost(code){if(P2P.host)return;P2P.others.clear();p2pRebuild();P2P.status='connecting';p2pStatus('O anfitrião saiu… reconectando');toast('🌐 O anfitrião saiu — mantendo a sala…','#ffd43b');
  setTimeout(()=>becomeHost(code,true),300+Math.random()*1500);}
function attachNet(){NET.room=p2pRoom;NET.fake=false;NET.ready=true;renderNetPanel();const url=shareUrl();if(url)try{history.replaceState(null,'',url);}catch(e){}}
function shareUrl(){if(!P2P.code)return '';return location.origin+location.pathname+'?sala='+P2P.code;}
function copyShare(){const u=shareUrl();if(!u)return;const ok=()=>toast('🔗 Link copiado! Cola no WhatsApp pros amigos','#8ce99a');if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(u).then(ok,()=>prompt('Copie o link da sala:',u));else prompt('Copie o link da sala:',u);}
function p2pStatus(extra){const el=$('mpStatus');const s=P2P.status==='on'?`🟢 Sala <b>${P2P.code}</b> ${P2P.host?'(você é o anfitrião)':''} · ${P2P.others.size+1} jogador${P2P.others.size?'es':''}`:P2P.status==='connecting'?`🟡 Conectando na sala <b>${P2P.code}</b>…`:P2P.status==='error'?`🔴 ${extra||'Erro de conexão'}`:'Sem sala: você joga sozinho. Crie uma sala e mande o link!';
  if(el)el.innerHTML=s+(extra&&P2P.status!=='error'?`<br><small>${extra}</small>`:'');const lv=$('mpLeave'),cp=$('mpCopy');if(lv)lv.style.display=P2P.status==='off'?'none':'';if(cp)cp.style.display=P2P.status==='on'?'':'none';renderNetPanel();}
function p2pInit(){const q=new URLSearchParams(location.search).get('sala');p2pStatus();if(q){const c=cleanCode(q);$('mpCode').value=c;joinRoom(c);}
  $('mpCreate').onclick=()=>{setNick($('nickIn').value);p2pLeave();becomeHost(genCode());};
  $('mpJoin').onclick=()=>{const c=cleanCode($('mpCode').value);if(!c){toast('Digite o código da sala','#ffd43b');return;}setNick($('nickIn').value);p2pLeave();joinRoom(c);};
  $('mpCode').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')$('mpJoin').click();});
  $('mpCopy').onclick=copyShare;$('mpLeave').onclick=()=>{p2pLeave();toast('Você saiu da sala','#ffd43b');};
  $('netPanel').addEventListener('click',e=>{if(e.target.closest('[data-copy]'))copyShare();});
  addEventListener('beforeunload',()=>{try{P2P.peer&&P2P.peer.destroy();}catch(e){}});}
