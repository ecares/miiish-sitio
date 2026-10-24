#!/usr/bin/env python3
"""Sección "A quién ayudamos" (rubros) de la portada de ¡Miiish!, en español, inglés y portugués.

Lee _contenido/rubros.json y escribe la sección en index.html, en/index.html y pt/index.html,
entre <!--RUBROS:INICIO--> y <!--RUBROS:FIN--> (justo antes de la sección Plataformas).
También enlaza assets/rubros.css y assets/rubros.js con huella de versión y agrega "Rubros" al menú.
Se puede correr muchas veces. Solo usa la librería estándar de Python 3.
"""
import hashlib
import html
import json
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import servicios  # noqa: E402  (rutas y nombres de las páginas de servicios)

esc = lambda t: html.escape(str(t), quote=True)

UI = {
    'es': dict(pill='A quién ayudamos', t1='Hacemos crecer negocios de', t2='rubros', menu='Rubros',
               bajada='Cada rubro tiene sus propios desafíos. Busca el tuyo y mira, en simple, cómo te podemos ayudar.',
               buscar='¿A qué se dedica tu negocio?', ph='Ej: inmobiliaria, café, clínica, ropa…', todos='Todos', dado='Sorpréndeme',
               desafio='El desafío', ayuda='Cómo te ayudamos', idea='Una idea para partir', recomendados='Servicios recomendados',
               cta='Quiero esto para mi negocio', vacio='No encontramos ese rubro, pero seguro te podemos ayudar.', vacio_cta='Cuéntanos de tu negocio →',
               msg='Hola, tengo un negocio del rubro {}. Me gustaría saber cómo me pueden ayudar.', lista='Rubros', auto='Pausar recorrido', de='de',
               resultados='{} rubros encontrados', uno='1 rubro encontrado'),
    'en': dict(pill='Who we help', t1='We grow businesses in', t2='industries', menu='Industries',
               bajada='Every industry has its own challenges. Find yours and see, in plain terms, how we can help.',
               buscar='What does your business do?', ph='E.g. real estate, café, clinic, fashion…', todos='All', dado='Surprise me',
               desafio='The challenge', ayuda='How we help', idea='An idea to start', recomendados='Recommended services',
               cta='I want this for my business', vacio="We couldn't find that industry, but we can surely help you.", vacio_cta='Tell us about your business →',
               msg='Hi, I have a business in {}. I would like to know how you can help me.', lista='Industries', auto='Pause tour', de='of',
               resultados='{} industries found', uno='1 industry found'),
    'pt': dict(pill='Quem ajudamos', t1='Fazemos crescer negócios de', t2='setores', menu='Setores',
               bajada='Cada setor tem seus próprios desafios. Procure o seu e veja, de forma simples, como podemos ajudar.',
               buscar='Com o que o seu negócio trabalha?', ph='Ex: imobiliária, café, clínica, moda…', todos='Todos', dado='Me surpreenda',
               desafio='O desafio', ayuda='Como ajudamos', idea='Uma ideia para começar', recomendados='Serviços recomendados',
               cta='Quero isso para o meu negócio', vacio='Não encontramos esse setor, mas com certeza podemos ajudar.', vacio_cta='Conte sobre o seu negócio →',
               msg='Olá, tenho um negócio do setor de {}. Gostaria de saber como vocês podem me ajudar.', lista='Setores', auto='Pausar tour', de='de',
               resultados='{} setores encontrados', uno='1 setor encontrado'),
}
ARCHIVOS = {'es': 'index.html', 'en': 'en/index.html', 'pt': 'pt/index.html'}
COLOR = {'#D7FF3A': 'lima', '#FF4FD8': 'fucsia'}


def version(nombre):
    p = os.path.join(RAIZ, 'assets', nombre)
    return f'/assets/{nombre}?v=' + hashlib.sha1(open(p, 'rb').read()).hexdigest()[:10]


def seccion(datos, l):
    u = UI[l]
    rubros = datos['rubros']
    total = len(rubros)
    svc = {s['id']: s for s in servicios.cargar()}
    banda = ' ✺ '.join(esc(r[l]['c']) for r in rubros) + ' ✺ '
    filtros = f'<button type="button" class="rb-f" aria-pressed="true" data-g="">{u["todos"]}</button>' + ''.join(
        f'<button type="button" class="rb-f" aria-pressed="false" data-g="{g}">{esc(v[l])}</button>' for g, v in datos['grupos'].items())
    tabs, paneles = [], []
    for i, r in enumerate(rubros):
        d = r[l]
        n = f'{i + 1:02d}'
        sel = i == 0
        color = COLOR.get(r.get('color', '').upper(), 'blanco')
        tabs.append(f'<button type="button" role="tab" class="rb-tab" id="rb-tab-{r["id"]}" aria-controls="rb-p-{r["id"]}" aria-selected="{"true" if sel else "false"}"'
                    f' tabindex="{0 if sel else -1}" data-g="{r["grupo"]}" data-c="{color}" data-k="{esc((d["n"] + " " + d["c"] + " " + d["k"]).lower())}"'
                    f' data-cursor="{"Ver" if l != "en" else "See"}"><span class="rb-tn">{n}</span>{esc(d["c"])}</button>')
        chips = ''.join(f'<a class="rb-chip" href="{servicios.ruta(svc[s], l)}" data-cursor="{"Ver" if l != "en" else "See"}">{esc(svc[s][l]["nombre"])} <span aria-hidden="true">↗</span></a>'
                        for s in r['servicios'] if s in svc)
        form = ','.join(servicios.FORMULARIO[s] for s in r['servicios'] if s in servicios.FORMULARIO)
        ayuda = ''.join(f'<li>{esc(a)}</li>' for a in d['a'])
        paneles.append(f'''<article class="rb-p rb-{color}" role="tabpanel" id="rb-p-{r["id"]}" aria-labelledby="rb-tab-{r["id"]}" tabindex="0"{"" if sel else " hidden"}>
        <span class="rb-ghost" aria-hidden="true">{esc(d["c"])}</span>
        <div class="rb-p-top"><span class="rb-num">{n}<small>/{total}</small></span><h3>{esc(d["n"])}</h3></div>
        <div class="rb-p-body">
          <div class="rb-col"><p class="rb-k">{u["desafio"]}</p><p class="rb-d">{esc(d["d"])}</p>
            <p class="rb-k">{u["idea"]}</p><p class="rb-x">{esc(d["x"])}</p></div>
          <div class="rb-col"><p class="rb-k">{u["ayuda"]}</p><ol class="rb-a">{ayuda}</ol></div>
        </div>
        <div class="rb-p-foot"><div><p class="rb-k">{u["recomendados"]}</p><div class="rb-chips">{chips}</div></div>
          <a class="rb-cta" href="#contacto" data-event="cta_rubro_{r["id"]}" data-msg="{esc(u["msg"].format(d["n"].lower() if l != "en" else d["n"]))}" data-s="{esc(form)}" data-cursor="¡Dale!">{u["cta"]} →</a></div>
      </article>''')
    return f'''<!--RUBROS:INICIO-->
<section id="rubros" class="rb" aria-labelledby="rb-t" data-total="{total}" data-res="{esc(u["resultados"])}" data-uno="{esc(u["uno"])}">
  <div class="rb-band" aria-hidden="true"><div class="rb-band-in"><span>{banda}</span><span>{banda}</span></div></div>
  <div class="rb-wrap">
    <header class="rb-head">
      <span class="rb-pill">{u["pill"]}</span>
      <h2 id="rb-t" class="rb-h2">{u["t1"]} <span class="rb-count" data-n="{total}">{total}</span> <em>{u["t2"]}</em></h2>
      <p class="rb-bajada">{u["bajada"]}</p>
    </header>
    <div class="rb-tools">
      <label class="rb-search"><span class="rb-k">{u["buscar"]}</span>
        <span class="rb-search-in"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M15.5 15.5 21 21" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
        <input type="search" class="rb-q" placeholder="{esc(u["ph"])}" autocomplete="off" aria-controls="rb-lista"></span></label>
      <div class="rb-filtros" role="group" aria-label="{esc(u["lista"])}">{filtros}</div>
      <button type="button" class="rb-dado" data-cursor="¡Va!"><span class="rb-dado-i" aria-hidden="true">✺</span>{u["dado"]}</button>
    </div>
    <p class="rb-estado" role="status" aria-live="polite"></p>
    <div class="rb-grid">
      <div class="rb-lista" id="rb-lista" role="tablist" aria-label="{esc(u["lista"])}">{"".join(tabs)}</div>
      <div class="rb-paneles">
        <div class="rb-prog" aria-hidden="true"><span></span></div>
        {"".join(paneles)}
        <div class="rb-vacio" hidden><p>{u["vacio"]}</p><a class="rb-cta" href="#contacto" data-cursor="¡Dale!">{u["vacio_cta"]}</a></div>
      </div>
    </div>
  </div>
</section>
<!--RUBROS:FIN-->'''


def aplicar(datos):
    css, js = version('rubros.css'), version('rubros.js')
    for l, archivo in ARCHIVOS.items():
        p = os.path.join(RAIZ, archivo)
        if not os.path.exists(p):
            continue
        h = open(p, encoding='utf-8').read()
        bloque = seccion(datos, l)
        if '<!--RUBROS:INICIO-->' in h:
            h = re.sub(r'<!--RUBROS:INICIO-->.*?<!--RUBROS:FIN-->', lambda m: bloque, h, flags=re.S)
        else:
            i = h.find('<section id="plataformas"')
            if i < 0:
                raise SystemExit(f'{archivo}: no encontré la sección Plataformas')
            h = h[:i] + bloque + '\n' + h[i:]
        # Estilos y script propios de la sección
        h = re.sub(r'\s*<link rel="stylesheet" href="/assets/rubros\.css[^"]*">', '', h)
        h = re.sub(r'\s*<script src="/assets/rubros\.js[^"]*" defer></script>', '', h)
        h = h.replace('</head>', f'<link rel="stylesheet" href="{css}">\n</head>', 1)
        h = h.replace('</body>', f'<script src="{js}" defer></script>\n</body>', 1)
        # "Rubros" en el menú, después de "Qué hacemos", y se renumera la lista
        h = re.sub(r'<li><a href="#rubros".*?</a></li>', '', h, flags=re.S)
        m = re.search(r'<li><a href="#hacemos" data-cursor="[^"]*">.*?</a></li>', h, flags=re.S)
        if m:
            item = (f'<li><a href="#rubros" data-cursor="Ir"><span class="mn">00</span><span class="ml">{UI[l]["menu"]}</span>'
                    '<span class="ma" aria-hidden="true">→</span></a></li>')
            h = h[:m.end()] + item + h[m.end():]
            i = h.find('<ol class="menu-list">'); j = h.find('</ol>', i)
            if i >= 0:
                n = iter(range(1, 100))
                lista = re.sub(r'<span class="mn">\d+</span>', lambda x: f'<span class="mn">{next(n):02d}</span>', h[i:j])
                h = h[:i] + lista + h[j:]
        open(p, 'w', encoding='utf-8').write(h)


def main():
    datos = json.load(open(os.path.join(RAIZ, '_contenido', 'rubros.json'), encoding='utf-8'))
    for r in datos['rubros']:
        for l in UI:
            for c in ('n', 'c', 'k', 'd', 'a', 'x'):
                if not r[l].get(c):
                    raise SystemExit(f'{r["id"]}/{l}: falta "{c}"')
    aplicar(datos)
    print(f'OK: sección de rubros con {len(datos["rubros"])} rubros en 3 idiomas')


if __name__ == '__main__':
    main()
