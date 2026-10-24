#!/usr/bin/env python3
"""Genera la sección Noticias de ¡Miiish! a partir de _contenido/noticias/*.json.

Crea: noticias/index.html, noticias/<slug>/index.html, rss.xml, sitemap.xml, llms.txt
y actualiza las últimas notas en index.html (entre <!--NOTICIAS:INICIO--> y <!--NOTICIAS:FIN-->).
Solo usa la librería estándar de Python 3.
"""
import datetime
import html
import json
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOMINIO = 'https://miiish.com'
CONTACTO = '/#contacto'
CATEGORIAS = {
    'Diseño': '#FF4FD8', 'Desarrollo web': '#D7FF3A', 'Marketing digital': '#FFFFFF', 'Paid media': '#D7FF3A',
    'SEO': '#D7FF3A', 'Inteligencia artificial': '#FF4FD8', 'Video y animación': '#FFFFFF', 'E-commerce': '#FF4FD8',
    'Branding': '#FFFFFF', 'Redes sociales': '#FF4FD8',
}
MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
CAMPOS = ['slug', 'titulo', 'bajada', 'categoria', 'fecha', 'cuerpo', 'claves', 'fuentes']

esc = lambda t: html.escape(str(t), quote=True)


def fecha_larga(f):
    d = datetime.date.fromisoformat(f[:10])
    return f'{d.day} de {MESES[d.month - 1]} de {d.year}'


def fecha_corta(f):
    d = datetime.date.fromisoformat(f[:10])
    return f'{d.day} {MESES[d.month - 1][:3]} {d.year}'


def inline(t):
    t = esc(t)
    t = re.sub(r'\[([^\]]+)\]\((https?://[^)\s]+)\)', lambda m: f'<a href="{m.group(2)}" target="_blank" rel="noopener">{m.group(1)}</a>', t)
    t = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'(?<![\w*])\*([^*\n]+)\*(?!\w)', r'<em>\1</em>', t)
    t = re.sub(r'`([^`]+)`', r'<code>\1</code>', t)
    return t


def markdown(md):
    """Markdown mínimo: ##/### títulos, párrafos, listas -, 1., citas >, enlaces, negrita, cursiva."""
    out, lista, parrafo = [], None, []

    def cerrar_parrafo():
        if parrafo:
            out.append('<p>' + inline(' '.join(parrafo)) + '</p>')
            parrafo.clear()

    def cerrar_lista():
        nonlocal lista
        if lista:
            out.append(f'</{lista}>')
            lista = None

    for linea in md.replace('\r', '').split('\n'):
        l = linea.strip()
        if not l:
            cerrar_parrafo(); cerrar_lista(); continue
        m = re.match(r'^(#{2,3})\s+(.*)$', l)
        if m:
            cerrar_parrafo(); cerrar_lista()
            n = len(m.group(1))
            out.append(f'<h{n}>{inline(m.group(2))}</h{n}>'); continue
        m = re.match(r'^(-|\*|\d+\.)\s+(.*)$', l)
        if m:
            cerrar_parrafo()
            tipo = 'ol' if m.group(1)[0].isdigit() else 'ul'
            if lista != tipo:
                cerrar_lista(); out.append(f'<{tipo}>'); lista = tipo
            out.append(f'<li>{inline(m.group(2))}</li>'); continue
        if l.startswith('>'):
            cerrar_parrafo(); cerrar_lista()
            out.append(f'<blockquote>{inline(l.lstrip("> "))}</blockquote>'); continue
        cerrar_lista(); parrafo.append(l)
    cerrar_parrafo(); cerrar_lista()
    return '\n'.join(out)


def minutos(p):
    palabras = len(re.findall(r'\w+', p['cuerpo'] + ' ' + p['bajada']))
    return max(2, round(palabras / 200))


LOGO = '<a class="n-logo" href="/" aria-label="¡Miiish! inicio"><span class="lj">¡mii</span><span class="ls">ish!</span></a>'


def cabecera():
    return f'''<header class="n-hdr"><div class="n-wrap n-hdr-in">{LOGO}<nav aria-label="Principal" class="n-nav"><a href="/">Inicio</a><a href="/#hacemos">Servicios</a><a href="/noticias/" aria-current="page">Noticias</a><a class="n-btn" href="{CONTACTO}" data-event="cta_contacto">Hablemos</a></nav></div></header>'''


def pie():
    return f'''<footer class="n-foot"><div class="n-wrap n-foot-in"><a class="n-logo n-logo-big" href="/" aria-label="¡Miiish! inicio"><span class="lj">¡mii</span><span class="ls">ish!</span></a><p>Agencia creativa y de marketing digital · Santiago, Chile</p><p><a href="/">Inicio</a> · <a href="/noticias/">Noticias</a> · <a href="/#preguntas">Preguntas frecuentes</a> · <a href="{CONTACTO}">Contacto</a> · <a href="mailto:hola@miiish.com">hola@miiish.com</a></p></div></footer>'''


def pagina(titulo, descripcion, ruta, cuerpo, jsonld, tipo='website', imagen='/og-image.jpg', extra_head=''):
    url = DOMINIO + ruta
    return f'''<!doctype html>
<html lang="es-CL">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{esc(titulo)}</title>
<meta name="description" content="{esc(descripcion)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<link rel="canonical" href="{url}">
<meta name="theme-color" content="#D7FF3A">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/rss+xml" title="Noticias ¡Miiish!" href="/rss.xml">
<meta property="og:type" content="{tipo}">
<meta property="og:locale" content="es_CL">
<meta property="og:site_name" content="¡Miiish!">
<meta property="og:title" content="{esc(titulo)}">
<meta property="og:description" content="{esc(descripcion)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{DOMINIO}{imagen}">
<meta name="twitter:card" content="summary_large_image">
{extra_head}<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@300;600;800;900&amp;family=Instrument+Sans:wght@400;500;600&amp;family=Jost:wght@900&amp;family=Instrument+Serif:ital@1&amp;family=DM+Mono:wght@500&amp;display=swap">
<link rel="stylesheet" href="/assets/noticias.css">
<script type="application/ld+json">
{json.dumps(jsonld, ensure_ascii=False, indent=1)}
</script>
</head>
<body>
{cabecera()}
<main id="contenido">
{cuerpo}
</main>
{pie()}
<script>document.addEventListener('click',function(e){{var a=e.target.closest&&e.target.closest('[data-event]');if(a){{window.dataLayer=window.dataLayer||[];dataLayer.push({{event:a.getAttribute('data-event')}});if(window.fbq)fbq('track','Lead')}}}});</script>
</body>
</html>
'''


ORG = {'@type': 'Organization', '@id': DOMINIO + '/#organizacion', 'name': '¡Miiish!', 'url': DOMINIO + '/', 'logo': DOMINIO + '/favicon.svg'}


def tarjeta(p, raiz='/noticias/'):
    return (f'<a class="n-card" href="{raiz}{p["slug"]}/" data-cat="{esc(p["categoria"])}">'
            f'<span class="n-cat" style="--c:{CATEGORIAS.get(p["categoria"], "#D7FF3A")}">{esc(p["categoria"])}</span>'
            f'<span class="n-card-t">{esc(p["titulo"])}</span><span class="n-card-b">{esc(p["bajada"])}</span>'
            f'<span class="n-card-d">{fecha_corta(p["fecha"])} · {minutos(p)} min</span></a>')


def articulo(p, otros):
    ruta = f'/noticias/{p["slug"]}/'
    claves = ''.join(f'<li>{inline(c)}</li>' for c in p['claves'])
    fuentes = ''.join(f'<li><a href="{esc(f["url"])}" target="_blank" rel="noopener">{esc(f["titulo"])}</a> · {esc(f.get("medio", ""))}</li>' for f in p['fuentes'])
    faq = p.get('faq') or []
    faq_html = ''
    if faq:
        faq_html = '<section class="n-faq"><h2>Preguntas frecuentes</h2>' + ''.join(
            f'<details><summary>{esc(q["pregunta"])}</summary><p>{inline(q["respuesta"])}</p></details>' for q in faq) + '</section>'
    relacionados = ''.join(tarjeta(o) for o in otros[:3])
    cuerpo = f'''<article class="n-art">
  <div class="n-wrap n-art-head">
    <nav class="n-bc" aria-label="Ruta"><a href="/">Inicio</a> / <a href="/noticias/">Noticias</a> / <span>{esc(p["categoria"])}</span></nav>
    <span class="n-cat" style="--c:{CATEGORIAS.get(p["categoria"], "#D7FF3A")}">{esc(p["categoria"])}</span>
    <h1>{esc(p["titulo"])}</h1>
    <p class="n-bajada">{esc(p["bajada"])}</p>
    <p class="n-meta"><time datetime="{p["fecha"][:10]}">{fecha_larga(p["fecha"])}</time> · {minutos(p)} min de lectura · Equipo ¡Miiish!</p>
  </div>
  <div class="n-wrap n-art-body">
    <aside class="n-claves"><h2>En 30 segundos</h2><ul>{claves}</ul></aside>
    <div class="n-texto">
{markdown(p["cuerpo"])}
    </div>
    {faq_html}
    <section class="n-fuentes"><h2>Fuentes</h2><ul>{fuentes}</ul></section>
  </div>
  <section class="n-cta"><div class="n-wrap n-cta-in"><p class="n-cta-t">¿Quieres aplicar esto en tu marca?</p><a class="n-btn n-btn-big" href="{CONTACTO}" data-event="cta_contacto">Cuéntanos tu proyecto →</a></div></section>
  {f'<section class="n-wrap n-rel"><h2>Sigue leyendo</h2><div class="n-grid">{relacionados}</div></section>' if relacionados else ''}
</article>'''
    ld = {'@context': 'https://schema.org', '@graph': [
        {'@type': 'BlogPosting', '@id': DOMINIO + ruta + '#nota', 'headline': p['titulo'], 'description': p['bajada'],
         'datePublished': p['fecha'], 'dateModified': p.get('actualizado', p['fecha']), 'inLanguage': 'es-CL',
         'articleSection': p['categoria'], 'keywords': ', '.join(p.get('palabras_clave', [])),
         'mainEntityOfPage': DOMINIO + ruta, 'image': DOMINIO + '/og-image.jpg', 'author': ORG, 'publisher': ORG,
         'citation': [f['url'] for f in p['fuentes']], 'wordCount': len(re.findall(r'\w+', p['cuerpo']))},
        {'@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'Inicio', 'item': DOMINIO + '/'},
            {'@type': 'ListItem', 'position': 2, 'name': 'Noticias', 'item': DOMINIO + '/noticias/'},
            {'@type': 'ListItem', 'position': 3, 'name': p['titulo'], 'item': DOMINIO + ruta}]}]}
    if faq:
        ld['@graph'].append({'@type': 'FAQPage', 'mainEntity': [
            {'@type': 'Question', 'name': q['pregunta'], 'acceptedAnswer': {'@type': 'Answer', 'text': q['respuesta']}} for q in faq]})
    extra = f'<meta property="article:published_time" content="{p["fecha"]}">\n<meta property="article:section" content="{esc(p["categoria"])}">\n'
    return pagina(f'{p["titulo"]} | Noticias ¡Miiish!', p['bajada'], ruta, cuerpo, ld, 'article', extra_head=extra)


def listado(posts):
    cats = sorted({p['categoria'] for p in posts})
    chips = '<button type="button" class="n-chip" aria-pressed="true" data-f="">Todas</button>' + ''.join(
        f'<button type="button" class="n-chip" aria-pressed="false" data-f="{esc(c)}">{esc(c)}</button>' for c in cats)
    grid = ''.join(tarjeta(p) for p in posts) or '<p>Pronto publicaremos la primera noticia.</p>'
    cuerpo = f'''<section class="n-wrap n-list-head">
  <span class="n-cat" style="--c:#D7FF3A">Noticias</span>
  <h1>Diseño, web, marketing e IA, <em>explicado para tu negocio</em></h1>
  <p class="n-bajada">Cada dos días revisamos lo que está pasando en tecnología, desarrollo web, diseño, redes y publicidad digital, y te contamos qué significa para una marca en Chile.</p>
  <div class="n-chips" role="group" aria-label="Filtrar por tema">{chips}</div>
</section>
<section class="n-wrap"><div class="n-grid" id="n-grid">{grid}</div></section>
<script>(function(){{var cs=document.querySelectorAll('.n-chip');cs.forEach(function(b){{b.addEventListener('click',function(){{var f=b.getAttribute('data-f');cs.forEach(function(x){{x.setAttribute('aria-pressed',x===b?'true':'false')}});document.querySelectorAll('#n-grid .n-card').forEach(function(c){{c.hidden=!!f&&c.getAttribute('data-cat')!==f}})}})}})}})();</script>'''
    ld = {'@context': 'https://schema.org', '@graph': [
        {'@type': 'CollectionPage', '@id': DOMINIO + '/noticias/#pagina', 'url': DOMINIO + '/noticias/', 'name': 'Noticias ¡Miiish!',
         'description': 'Noticias de diseño, desarrollo web, marketing digital, publicidad e inteligencia artificial para marcas en Chile.',
         'inLanguage': 'es-CL', 'publisher': ORG,
         'mainEntity': {'@type': 'ItemList', 'itemListElement': [
             {'@type': 'ListItem', 'position': i + 1, 'url': f'{DOMINIO}/noticias/{p["slug"]}/', 'name': p['titulo']} for i, p in enumerate(posts)]}}]}
    return pagina('Noticias de diseño, web y marketing digital | ¡Miiish!',
                  'Noticias y tendencias de diseño, desarrollo web, marketing digital, Meta y Google Ads e inteligencia artificial, explicadas para marcas y pymes en Chile.',
                  '/noticias/', cuerpo, ld)


def rss(posts):
    items = ''.join(f'''<item><title>{esc(p["titulo"])}</title><link>{DOMINIO}/noticias/{p["slug"]}/</link><guid>{DOMINIO}/noticias/{p["slug"]}/</guid><pubDate>{datetime.datetime.fromisoformat(p["fecha"][:10]).strftime("%a, %d %b %Y 09:00:00 -0300")}</pubDate><category>{esc(p["categoria"])}</category><description>{esc(p["bajada"])}</description></item>''' for p in posts[:30])
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Noticias ¡Miiish!</title><link>{DOMINIO}/noticias/</link><description>Diseño, web, marketing e IA para marcas en Chile.</description><language>es-cl</language>{items}</channel></rss>
'''


def sitemap(posts):
    hoy = datetime.date.today().isoformat()
    urls = [(DOMINIO + '/', hoy, '1.0'), (DOMINIO + '/en/', hoy, '0.9'), (DOMINIO + '/pt/', hoy, '0.9'), (DOMINIO + '/noticias/', posts[0]['fecha'][:10] if posts else hoy, '0.8')]
    urls += [(f'{DOMINIO}/noticias/{p["slug"]}/', p.get('actualizado', p['fecha'])[:10], '0.7') for p in posts]
    try:  # páginas de servicios (tools/servicios.py)
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import servicios
        urls += [(DOMINIO + u, hoy, pr) for u, pr in servicios.urls()]
    except Exception as e:
        print('Aviso: no se agregaron los servicios al sitemap:', e)
    filas = ''.join(f'  <url><loc>{u}</loc><lastmod>{m}</lastmod><priority>{pr}</priority></url>\n' for u, m, pr in urls)
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{filas}</urlset>\n'


def portada(posts):
    # Portadas en español, inglés y portugués: las tarjetas apuntan a las notas (en español).
    for archivo, cursor in (('index.html', 'Leer'), ('en/index.html', 'Read'), ('pt/index.html', 'Ler'), ('gracias/index.html', 'Leer'), ('en/gracias/index.html', 'Read'), ('pt/gracias/index.html', 'Ler')):
        ruta = os.path.join(RAIZ, archivo)
        if not os.path.exists(ruta):
            continue
        s = open(ruta, encoding='utf-8').read()
        tarjetas = ''.join(
            f'\n        <a class="news-card rise" href="/noticias/{p["slug"]}/" hreflang="es" data-cursor="{cursor}"><span class="news-cat">{esc(p["categoria"])}</span>'
            f'<span class="news-t">{esc(p["titulo"])}</span><span class="news-d">{fecha_corta(p["fecha"])} · {minutos(p)} min</span></a>' for p in posts[:3])
        s2, n = re.subn(r'<!--NOTICIAS:INICIO-->.*?<!--NOTICIAS:FIN-->', lambda m: '<!--NOTICIAS:INICIO-->' + tarjetas + '\n<!--NOTICIAS:FIN-->', s, flags=re.S)
        if n:
            open(ruta, 'w', encoding='utf-8').write(s2)


def validar(p, archivo):
    faltan = [c for c in CAMPOS if not p.get(c)]
    if faltan:
        sys.exit(f'{archivo}: faltan campos {faltan}')
    if not re.fullmatch(r'[a-z0-9]+(-[a-z0-9]+)*', p['slug']):
        sys.exit(f'{archivo}: slug inválido "{p["slug"]}" (solo minúsculas, números y guiones)')
    if p['categoria'] not in CATEGORIAS:
        sys.exit(f'{archivo}: categoría "{p["categoria"]}" no está en {list(CATEGORIAS)}')
    datetime.date.fromisoformat(p['fecha'][:10])
    if len(p['fuentes']) < 2:
        sys.exit(f'{archivo}: necesita al menos 2 fuentes')


def main():
    carpeta = os.path.join(RAIZ, '_contenido', 'noticias')
    os.makedirs(carpeta, exist_ok=True)
    posts = []
    for f in sorted(os.listdir(carpeta)):
        if f.endswith('.json'):
            p = json.load(open(os.path.join(carpeta, f), encoding='utf-8'))
            validar(p, f)
            posts.append(p)
    slugs = [p['slug'] for p in posts]
    if len(slugs) != len(set(slugs)):
        sys.exit('Hay slugs repetidos')
    posts.sort(key=lambda p: p['fecha'], reverse=True)
    for p in posts:
        d = os.path.join(RAIZ, 'noticias', p['slug'])
        os.makedirs(d, exist_ok=True)
        otros = [o for o in posts if o['slug'] != p['slug']]
        mismas = [o for o in otros if o['categoria'] == p['categoria']] + [o for o in otros if o['categoria'] != p['categoria']]
        open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(articulo(p, mismas))
    open(os.path.join(RAIZ, 'noticias', 'index.html'), 'w', encoding='utf-8').write(listado(posts))
    open(os.path.join(RAIZ, 'rss.xml'), 'w', encoding='utf-8').write(rss(posts))
    open(os.path.join(RAIZ, 'sitemap.xml'), 'w', encoding='utf-8').write(sitemap(posts))
    base_llms = os.path.join(RAIZ, '_contenido', 'llms-base.md')
    base = open(base_llms, encoding='utf-8').read().rstrip() if os.path.exists(base_llms) else '# ¡Miiish!'
    lista = '\n'.join(f'- [{p["titulo"]}]({DOMINIO}/noticias/{p["slug"]}/) ({p["fecha"][:10]}, {p["categoria"]}): {p["bajada"]}' for p in posts[:40])
    try:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import servicios
        base += '\n\n## Páginas de servicios\n' + '\n'.join(
            f'- [{x["es"]["nombre"]}]({DOMINIO}{servicios.ruta(x, "es")}): {x["es"]["seo_desc"]} (EN: {DOMINIO}{servicios.ruta(x, "en")} · PT: {DOMINIO}{servicios.ruta(x, "pt")})'
            for x in servicios.cargar())
    except Exception as e:
        print('Aviso: no se agregaron los servicios a llms.txt:', e)
    open(os.path.join(RAIZ, 'llms.txt'), 'w', encoding='utf-8').write(base + '\n\n## Noticias recientes\n' + lista + '\n')
    portada(posts)
    print(f'OK: {len(posts)} noticias generadas')


if __name__ == '__main__':
    main()
