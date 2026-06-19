import json, html, os

base = os.path.dirname(__file__)
thumbs = json.load(open(os.path.join(base, "_thumbs.json")))

SCREENS = {
 "auth":[
   ("01-auth-login.png","Autenticación","/auth","bug","Login OK · pestaña Registro→Admin siempre 403"),
   ("15-claim-page.png","Invitación / Claim","/claim/:token","ok","Mensaje claro: «te invitan como Pedro»"),
 ],
 "admin":[
   ("02-admin-overview.png","Resumen","/app/admin/overview","ok",""),
   ("03-seasons-empty.png","Temporadas (vacío)","/app/admin/seasons","nit","Checkbox importar: marcado+disabled"),
   ("04-season-created.png","Temporada activa","/app/admin/seasons","ok","Alert estático (sin toast)"),
   ("05-players-empty.png","Jugadores (vacío)","/app/admin/players","ok",""),
   ("06-players-roster.png","Plantilla","/app/admin/players","ok","8 jugadores + miembros"),
   ("07-matches-empty.png","Partidos (vacío)","/app/admin/matches","ok",""),
   ("08-match-lineup-wizard.png","Asistente alineación","/app/admin/matches","ux","GUID crudo bajo cada nombre"),
   ("09-match-created.png","Partido creado","/app/admin/matches","bug","El formulario no se resetea"),
   ("10-match-editor.png","Editor de partido","/app/admin/matches","ux","GUID · pestañas"),
   ("11-match-live-running.png","En vivo · corriendo","/app/admin/matches","bug","FE-6 evento sin minuto · UX-5 a11y"),
   ("12-match-paused.png","En vivo · pausado","/app/admin/matches","ux","Reloj idéntico a corriendo"),
   ("13-standings.png","Clasificación","/app/admin/standings","ok","Rojos 2–0"),
   ("14-accountability.png","Contabilidad","/app/admin/accountability","ux","Botón gasto a altura completa"),
 ],
 "user":[
   ("16-user-membership.png","Mis peñas","/app/user/membership","bug","«No apareces» pero es #7"),
   ("17-user-matches.png","Partidos","/app/user/matches","ux","Estado en texto plano (sin chip)"),
   ("18-user-standings.png","Clasificación","/app/user/standings","ok",""),
 ],
 "mobile":[
   ("20-mobile-auth.png","Auth · 390px","/auth","ok","Responsive correcto"),
   ("19-mobile-user-standings.png","Clasif. usuario · 390px","/app/user/standings","ux","UX-11 overflow · UX-8 azul fijo"),
   ("21-mobile-admin-matches.png","Partidos admin · 390px","/app/admin/matches","ux","UX-11 tabla/tabs se cortan"),
 ],
}
LANES=[("auth","Público · Entrada","Sin sesión. Login, alta por invitación."),
       ("admin","Espacio Admin","/app/admin/* — requiere peña seleccionada."),
       ("user","Espacio Jugador","/app/user/* — requiere membresía activa."),
       ("mobile","Móvil · 390px","Mismas rutas, viewport de teléfono.")]
ST={"ok":("#3ddc91","OK"),"ux":("#f4b740","UX"),"bug":("#ff5d5d","Bug"),"nit":("#9aa7b0","Menor"),"fix":("#5ab2ff","Fix")}

def card(f,t,r,s,n):
    col,lab=ST[s]
    img=thumbs.get(f,"")
    note='<p class="note">%s</p>' % html.escape(n) if n else ""
    return ('<figure class="card s-%s">'
      '<div class="thumb"><img loading="lazy" src="%s" alt="%s"></div>'
      '<figcaption><span class="badge" style="--c:%s">%s</span>'
      '<h3>%s</h3><code>%s</code>%s</figcaption></figure>') % (
      s, img, html.escape(t), col, lab, html.escape(t), html.escape(r), note)

ARR = "<span class='arr'>&rarr;</span>"
lanes_html=""
for key,title,sub in LANES:
    cards=ARR.join(card(*c) for c in SCREENS[key])
    lanes_html+=('<section class="lane"><div class="lane-head"><h2>%s</h2><p>%s</p></div>'
                 '<div class="flow">%s</div></section>') % (html.escape(title), html.escape(sub), cards)

legend="".join('<span class="lg"><i style="background:%s"></i>%s</span>'%(ST[k][0],ST[k][1])
               for k in ["ok","ux","bug","nit","fix"])

CSS = """
*{box-sizing:border-box}
body{margin:0;background:#0c2620;color:#eaf2ee;font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
.board{max-width:1280px;margin:0 auto;padding:40px 24px 80px;position:relative}
.board:before{content:"";position:absolute;inset:0;background:
 radial-gradient(circle at 50% 0,rgba(255,255,255,.05),transparent 60%),
 repeating-linear-gradient(90deg,transparent 0 119px,rgba(255,255,255,.025) 119px 120px);pointer-events:none}
header.hero{position:relative;border-bottom:1px solid rgba(255,255,255,.14);padding-bottom:22px;margin-bottom:30px}
.eyebrow{font:600 12px/1 ui-monospace,monospace;letter-spacing:.22em;text-transform:uppercase;color:#7fd6b3}
h1{font:700 clamp(28px,4vw,46px)/1.05 "Arial Narrow",system-ui,sans-serif;letter-spacing:-.5px;margin:.3em 0 .15em}
.hero p{margin:0;max-width:70ch;color:#bcd2c9}
.meta{display:flex;gap:18px;flex-wrap:wrap;margin-top:16px;font-size:13px;color:#9fbdb1}
.meta b{color:#eaf2ee;font-weight:600}
.legend{display:flex;gap:18px;flex-wrap:wrap;margin:14px 0 0;font-size:13px}
.lg{display:inline-flex;align-items:center;gap:7px;color:#cfe0d8}
.lg i{width:11px;height:11px;border-radius:3px;display:inline-block}
.lane{position:relative;margin:34px 0}
.lane-head{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin-bottom:14px}
.lane-head h2{font:700 19px/1 "Arial Narrow",system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase;margin:0;color:#fff}
.lane-head h2:before{content:"";display:inline-block;width:10px;height:10px;border:2px solid #7fd6b3;border-radius:50%;margin-right:9px;vertical-align:middle}
.lane-head p{margin:0;font:500 13px/1 ui-monospace,monospace;color:#84a99c}
.flow{display:flex;flex-wrap:wrap;align-items:stretch;gap:6px}
.arr{align-self:center;color:#4f7c6e;font-size:20px;padding:0 2px}
.card{margin:0;width:212px;background:#10342b;border:1px solid rgba(255,255,255,.1);border-radius:12px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 8px 22px rgba(0,0,0,.3);transition:transform .15s,box-shadow .15s}
.card:hover{transform:translateY(-4px);box-shadow:0 14px 30px rgba(0,0,0,.45)}
.thumb{background:#06140f;max-height:240px;overflow:hidden;border-bottom:1px solid rgba(255,255,255,.08)}
.thumb img{display:block;width:100%;height:auto}
figcaption{padding:11px 12px 13px;display:flex;flex-direction:column;gap:4px;flex:1}
.badge{align-self:flex-start;font:700 10px/1 ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:#06140f;background:var(--c);padding:3px 7px;border-radius:5px}
figcaption h3{margin:2px 0 0;font-size:14.5px;font-weight:650;color:#fff}
figcaption code{font:600 11px/1.3 ui-monospace,monospace;color:#7fd6b3;word-break:break-all}
.note{margin:3px 0 0;font-size:12px;color:#a9c2b8}
.card.s-bug{border-color:rgba(255,93,93,.5)}
.card.s-ux{border-color:rgba(244,183,64,.45)}
footer{position:relative;margin-top:40px;padding-top:18px;border-top:1px solid rgba(255,255,255,.12);font-size:12.5px;color:#8aa99d}
@media(max-width:520px){.card{width:100%}.arr{display:none}}
"""

HERO = ('<div class="board"><header class="hero">'
  '<div class="eyebrow">Auditoría UI · estado actual</div>'
  '<h1>Mapa de navegación — footballhubmanager</h1>'
  '<p>Recorrido E2E real (Playwright) sobre la app en local. Cada nodo es una pantalla capturada; '
  'el color marca su estado. Las flechas indican el flujo natural dentro de cada zona.</p>'
  '<div class="meta"><span><b>21</b> pantallas</span><span><b>4</b> zonas</span>'
  '<span>Peña <b>Pena Audit FC</b></span><span>Partido <b>Rojos 2–0 Azules</b></span>'
  '<span>Viewport <b>1440px</b> + <b>390px</b></span></div>'
  '<div class="legend">%s</div></header>') % legend

FOOT = ('<footer>Generado desde <code>audit-screenshots/</code> · detalle en <code>AUDIT-UI.md</code>. '
  'Estados: <b>Bug</b> reproducido en vivo · <b>UX</b> usabilidad/a11y · <b>OK</b> funciona · <b>Menor</b> pulido.</footer></div>')

page = ("<title>Mapa de navegación · footballhubmanager</title><style>%s</style>%s%s%s") % (
    CSS, HERO, lanes_html, FOOT)

open(os.path.join(base,"nav-map.html"),"w",encoding="utf-8").write(page)
print("wrote nav-map.html", round(len(page)/1024), "KB")
