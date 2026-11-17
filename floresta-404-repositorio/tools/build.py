#!/usr/bin/env python3
"""Gera o index.html independente (site) a partir de src/jogo.html.
Uso: npm install  &&  npm run build
Embute three.js r128 e PeerJS no arquivo e troca o multiplayer do Claude
por salas P2P com código (tools/p2p.js)."""
import os,re,sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p=lambda *a:os.path.join(ROOT,*a)
s=open(p('src','jogo.html'),encoding='utf-8').read()
def R(a,b,n=1):
    global s
    c=s.count(a)
    if c!=n:sys.exit(f'Trecho esperado {n}x e achado {c}x: {a[:80]!r}')
    s=s.replace(a,b)
THREE=open(p('node_modules','three','build','three.min.js'),encoding='utf-8').read()
PEER=open(p('node_modules','peerjs','dist','peerjs.min.js'),encoding='utf-8').read()
P2PJS=open(p('tools','p2p.js'),encoding='utf-8').read()
R('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>',
  '<script>/* three.js r128 — MIT License — threejs.org */\n'+THREE+'\n</script>\n<script>/* PeerJS 1.5.4 — MIT License — peerjs.com */\n'+PEER+'\n</script>\n<script>window.STANDALONE=true;</script>')
R("  else{NET.room=fakeRoom();NET.fake=!!NET.room;}","  else if(window.STANDALONE){}\n  else{NET.room=fakeRoom();NET.fake=!!NET.room;}")
R("  NET.ready=!!NET.room;renderNetPanel();const ni=$('nickIn');if(ni&&!ni.value)ni.value=NET.myName;\n}",
  "  NET.ready=!!NET.room;renderNetPanel();const ni=$('nickIn');if(ni&&!ni.value)ni.value=NET.myName;\n  if(window.STANDALONE)p2pInit();\n}")
R("// =====================================================================\n// TELAS / FLUXO",P2PJS+"\n// =====================================================================\n// TELAS / FLUXO")
R("function renderNetPanel(){const el=$('netPanel');if(!el)return;if(!NET.ready){el.innerHTML='<div class=\"nh\">🌐 Sozinho</div>';return;}",
  "function renderNetPanel(){const el=$('netPanel');if(!el)return;if(!NET.ready){const h='<div class=\"nh\">🌐 Sozinho</div><div class=\"nt\">'+(P2P.status==='connecting'?'Conectando na sala '+P2P.code+'…':'Pra jogar com amigos: crie uma sala no menu inicial (M → sair)')+'</div>';if(el.innerHTML!==h)el.innerHTML=h;return;}")
R("  const html=`<div class=\"nh\">🌐 Online · ${rs.length+1}</div>`+me",
  "  const html=`<div class=\"nh\">🌐 Sala ${P2P.code} · ${rs.length+1}</div><div class=\"nt\" data-copy style=\"cursor:pointer;color:#8ce99a\">🔗 copiar link da sala</div>`+me")
R("(rs.length?`<div class=\"nt\">P · permissões da sua base</div>`:`<div class=\"nt\">Chame amigos: compartilhe o jogo com eles!</div>`);",
  "(rs.length?`<div class=\"nt\">P · permissões da sua base</div>`:`<div class=\"nt\">Mande o link da sala pros amigos!</div>`);")
R('  <button class="bigbtn pulse" id="play">JOGAR</button>',
  '''  <div class="mpbox"><div class="mph">🌐 Jogar com amigos</div>
    <div class="mprow"><button class="btn" id="mpCreate">Criar sala</button><span class="mpor">ou</span><input id="mpCode" maxlength="8" autocomplete="off" spellcheck="false" placeholder="CÓDIGO"><button class="btn sec" id="mpJoin">Entrar</button></div>
    <div id="mpStatus"></div><div class="mprow2"><button class="btn" id="mpCopy" style="display:none">🔗 Copiar link da sala</button><button class="btn sec" id="mpLeave" style="display:none">Sair da sala</button></div></div>
  <button class="bigbtn pulse" id="play">JOGAR</button>''')
R("  .nickrow{","""  .mpbox{margin:4px auto 10px;background:rgba(20,24,28,.55);padding:10px 14px;border-radius:14px;border:2px solid rgba(255,255,255,.12);max-width:520px;text-align:center}
  .mph{font:17px 'Lilita One';letter-spacing:.5px;color:#8ce99a;margin-bottom:6px}.mprow,.mprow2{display:flex;gap:8px;justify-content:center;align-items:center;flex-wrap:wrap}.mprow2{margin-top:6px}
  .mpor{font-weight:800;opacity:.7}#mpCode{font:800 17px Nunito,sans-serif;letter-spacing:2px;text-transform:uppercase;width:110px;text-align:center;padding:7px 8px;border-radius:10px;border:2px solid rgba(140,233,154,.55);background:rgba(0,0,0,.35);color:#fff;outline:none}
  #mpStatus{font-weight:700;font-size:13.5px;margin-top:7px;opacity:.92}#mpStatus small{opacity:.8}
  .nickrow{""")
s=re.sub(r"<title>[^<]*</title>","<title>Floresta 404 — Erro: floresta não encontrada</title>",s,count=1)
open(p('index.html'),'w',encoding='utf-8').write(s)
print(f'index.html gerado ({len(s)//1024} KB)')
