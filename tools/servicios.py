#!/usr/bin/env python3
"""Genera las páginas de servicios de ¡Miiish! en español, inglés y portugués.

Lee _contenido/servicios/*.json y crea:
  /servicios/ y /servicios/<slug>/          (español)
  /en/services/ y /en/services/<slug>/      (inglés)
  /pt/servicos/ y /pt/servicos/<slug>/      (portugués)
Además agrega en las portadas (index, en, pt) un enlace "Ver todo sobre…" dentro de cada servicio.

Texto con glosario: {{clave|texto}} se convierte en una palabra subrayada que se explica al tocarla
(las definiciones viven en assets/glosario.js). Solo usa la librería estándar de Python 3.
"""
import glob
import hashlib
import html
import json
import os
import re

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOMINIO = 'https://miiish.com'
FUENTES = ('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
           '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@300;600;800;900&amp;'
           'family=Instrument+Sans:wght@400;500;600&amp;family=Jost:wght@900&amp;family=Instrument+Serif:ital@1&amp;'
           'family=DM+Mono:wght@500&amp;display=swap">')

# Valor de la casilla del formulario de contacto que corresponde a cada servicio
FORMULARIO = {'branding': 'Branding', 'contenido': 'Redes sociales', 'web': 'Web y e-commerce', 'publicidad': 'Paid media',
              'video': 'Video', 'animacion': 'Animación', 'modelado': '3D', 'sistemas': 'Sistemas a medida',
              'merch': 'Merchandising y POP'}

EQUIPO = {
    'eduardo': ('Eduardo Cares', 'equipo-eduardo-cares', {'es': 'Full Stack Developer & Paid Media Manager'}),
    'joaquin': ('Joaquín Holl', 'equipo-joaquin-holl', {'es': 'Digital Designer, Content Manager & Brand Designer'}),
    'javiera': ('Javiera Torres', None, {'es': 'Project Manager · Motion Graphics, 2D Animation & Character Design for Branding'}),
    'camila': ('Camila Piña', 'equipo-camila-pina', {'es': '3D Artist, Illustrator & Art Director'}),
    'diego': ('Diego Morales', 'equipo-diego-morales', {'es': 'Diseño 3D y Render · Estrategia de Diseño y UX · Merchandising y POP',
                                                         'en': '3D Design & Rendering · Design Strategy & UX · Merchandising & POP',
                                                         'pt': 'Design 3D e Render · Estratégia de Design e UX · Merchandising e PDV'}),
    'matias': ('Matías Fuentes', 'equipo-matias-fuentes', {'es': 'Filmmaker & Editor de Video / Postproducción',
                                                           'en': 'Filmmaker & Video Editor / Post-production',
                                                           'pt': 'Filmmaker & Editor de Vídeo / Pós-produção'}),
}

IDIOMAS = {
    'es': dict(html='es-CL', og='es_CL', pre='', base='servicios', inicio='/', nombre_idioma='Español', corto='ES',
               nav=('Inicio', 'Servicios', 'Noticias', 'Hablemos'), migas='Inicio', servicios='Servicios',
               indice_t='Servicios | ¡Miiish! Agencia creativa en Santiago',
               indice_d='Branding, redes sociales, páginas web, publicidad digital, video, animación, 3D, sistemas a medida y merchandising. Te explicamos en simple en qué te podemos ayudar.',
               indice_pill='Nuestros servicios', indice_h1=('Todo lo que tu marca necesita,', 'explicado en simple'),
               indice_bajada='Somos un equipo de diseño, tecnología, video y publicidad. Elige un área para ver qué incluye, cómo trabajamos y en qué te podemos ayudar.',
               ver='Ver servicio', cotiza='Cotiza este servicio', ver_incluye='Ver qué incluye', servicio='Servicio',
               que_es='¿De qué se trata?', tip='Toca las palabras subrayadas y te las explicamos en simple.',
               senales='¿Te suena alguna de estas?', ayuda='Cómo te ayudamos', pasos='Cómo trabajamos', recibes='Lo que recibes',
               herramientas='Herramientas que usamos', ejemplos='Por ejemplo', equipo='Quiénes lo hacen',
               equipo_txt='Trabajamos en conjunto como un solo equipo; nuestra project manager coordina cada proyecto.',
               faq='Preguntas frecuentes', cta_t='¿Hablamos de tu proyecto?', cta_b='Cuéntanos qué necesitas y te respondemos en menos de un día hábil.',
               cta_btn='Cuéntanos tu proyecto →', otros='Otros servicios', pie='Agencia creativa y de marketing digital · Santiago, Chile',
               preguntas='Preguntas frecuentes', contacto='Contacto', noticias_hreflang=''),
    'en': dict(html='en', og='en_US', pre='/en', base='services', inicio='/en/', nombre_idioma='English', corto='EN',
               nav=('Home', 'Services', 'News', "Let's talk"), migas='Home', servicios='Services',
               indice_t='Services | ¡Miiish! Creative agency in Santiago, Chile',
               indice_d='Branding, social media, websites, digital advertising, video, animation, 3D, custom systems and merchandise. We explain in plain terms how we can help you.',
               indice_pill='Our services', indice_h1=('Everything your brand needs,', 'explained simply'),
               indice_bajada='We are a team of design, technology, video and advertising. Pick an area to see what it includes, how we work and how we can help you.',
               ver='See service', cotiza='Get a quote for this', ver_incluye='See what it includes', servicio='Service',
               que_es='What is it about?', tip='Tap the underlined words and we will explain them simply.',
               senales='Does any of this sound familiar?', ayuda='How we help you', pasos='How we work', recibes='What you get',
               herramientas='Tools we use', ejemplos='For example', equipo='Who does it',
               equipo_txt='We work together as one team; our project manager coordinates every project.',
               faq='Frequently asked questions', cta_t='Shall we talk about your project?', cta_b='Tell us what you need and we will reply within one business day.',
               cta_btn='Tell us about your project →', otros='Other services', pie='Creative and digital marketing agency · Santiago, Chile',
               preguntas='FAQ', contacto='Contact', noticias_hreflang=' hreflang="es"'),
    'pt': dict(html='pt-BR', og='pt_BR', pre='/pt', base='servicos', inicio='/pt/', nombre_idioma='Português', corto='PT',
               nav=('Início', 'Serviços', 'Notícias', 'Vamos conversar'), migas='Início', servicios='Serviços',
               indice_t='Serviços | ¡Miiish! Agência criativa em Santiago do Chile',
               indice_d='Branding, redes sociais, sites, publicidade digital, vídeo, animação, 3D, sistemas sob medida e merchandising. Explicamos de forma simples como podemos ajudar.',
               indice_pill='Nossos serviços', indice_h1=('Tudo o que sua marca precisa,', 'explicado de forma simples'),
               indice_bajada='Somos uma equipe de design, tecnologia, vídeo e publicidade. Escolha uma área para ver o que inclui, como trabalhamos e como podemos ajudar.',
               ver='Ver serviço', cotiza='Peça um orçamento', ver_incluye='Ver o que inclui', servicio='Serviço',
               que_es='Do que se trata?', tip='Toque nas palavras sublinhadas e explicamos de um jeito simples.',
               senales='Alguma destas soa familiar?', ayuda='Como ajudamos você', pasos='Como trabalhamos', recibes='O que você recebe',
               herramientas='Ferramentas que usamos', ejemplos='Por exemplo', equipo='Quem faz',
               equipo_txt='Trabalhamos juntos como uma só equipe; nossa project manager coordena cada projeto.',
               faq='Perguntas frequentes', cta_t='Vamos falar do seu projeto?', cta_b='Conte o que você precisa e respondemos em menos de um dia útil.',
               cta_btn='Conte sobre seu projeto →', otros='Outros serviços', pie='Agência criativa e de marketing digital · Santiago, Chile',
               preguntas='Perguntas frequentes', contacto='Contato', noticias_hreflang=' hreflang="es"'),
}

esc = lambda t: html.escape(str(t), quote=True)


def gl(t):
    """Escapa el texto y convierte {{clave|texto}} en término del glosario."""
    return re.sub(r'\{\{([a-z0-9-]+)\|([^}]+)\}\}',
                  lambda m: f'<span class="gl" role="button" tabindex="0" data-g="{m.group(1)}">{m.group(2)}</span>', esc(t))


def plano(t):
    return re.sub(r'\{\{[a-z0-9-]+\|([^}]+)\}\}', r'\1', t)


def ruta_indice(l):
    return f'{IDIOMAS[l]["pre"]}/{IDIOMAS[l]["base"]}/'


def ruta(s, l):
    return ruta_indice(l) + s[l]['slug'] + '/'


def version(rel):
    p = os.path.join(RAIZ, rel.lstrip('/'))
    return rel + '?v=' + hashlib.sha1(open(p, 'rb').read()).hexdigest()[:10] if os.path.exists(p) else rel


def glosario_url():
    # Usa la misma versión del glosario que la portada, así el navegador lo reutiliza
    try:
        m = re.search(r'src="(/assets/glosario\.js\?v=[0-9a-f]+)"', open(os.path.join(RAIZ, 'index.html'), encoding='utf-8').read())
        if m:
            return m.group(1)
    except OSError:
        pass
    return version('/assets/glosario.js')


def logo():
    return '<span class="lj">¡mii</span><span class="ls">ish!</span>'


def cabecera(l, alternas, actual):
    t = IDIOMAS[l]
    idiomas = ''.join(
        f'<a href="{alternas[k]}" hreflang="{IDIOMAS[k]["html"]}" lang="{IDIOMAS[k]["html"]}" data-lang="{k}"'
        f'{" aria-current=\"true\"" if k == l else ""}>{IDIOMAS[k]["corto"]}</a>' for k in IDIOMAS)
    return (f'<header class="s-hdr"><div class="s-wrap s-hdr-in"><a class="s-logo" href="{t["inicio"]}" aria-label="¡Miiish!">{logo()}</a>'
            f'<nav class="s-nav" aria-label="{esc(t["nav"][1])}"><a href="{t["inicio"]}">{t["nav"][0]}</a>'
            f'<a href="{ruta_indice(l)}"{" aria-current=\"page\"" if actual == "indice" else ""}>{t["nav"][1]}</a>'
            f'<a href="/noticias/"{t["noticias_hreflang"]}>{t["nav"][2]}</a></nav>'
            f'<div class="s-langs" aria-label="Idioma / Language">{idiomas}</div>'
            f'<a class="s-btn" href="{t["inicio"]}#contacto" data-event="cta_contacto">{esc(t["nav"][3])}</a></div></header>')


def pie(l):
    t = IDIOMAS[l]
    return (f'<footer class="s-foot"><div class="s-wrap s-foot-in"><a class="s-logo s-logo-big" href="{t["inicio"]}" aria-label="¡Miiish!">{logo()}</a>'
            f'<p>{t["pie"]}</p><p><a href="{t["inicio"]}">{t["nav"][0]}</a> · <a href="{ruta_indice(l)}">{t["servicios"]}</a> · '
            f'<a href="/noticias/"{t["noticias_hreflang"]}>{t["nav"][2]}</a> · <a href="{t["inicio"]}#preguntas">{t["preguntas"]}</a> · '
            f'<a href="{t["inicio"]}#contacto">{t["contacto"]}</a> · <a href="mailto:hola@miiish.com">hola@miiish.com</a></p></div></footer>')


def documento(l, titulo, desc, url, alternas, cuerpo, ld, actual):
    t = IDIOMAS[l]
    alt = ''.join(f'<link rel="alternate" hreflang="{IDIOMAS[k]["html"]}" href="{DOMINIO}{alternas[k]}">\n' for k in IDIOMAS)
    alt += f'<link rel="alternate" hreflang="x-default" href="{DOMINIO}{alternas["es"]}">\n'
    return f'''<!doctype html>
<html lang="{t["html"]}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{esc(titulo)}</title>
<meta name="description" content="{esc(desc)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<link rel="canonical" href="{DOMINIO}{url}">
{alt}<meta name="theme-color" content="#D7FF3A">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="website">
<meta property="og:locale" content="{t["og"]}">
<meta property="og:site_name" content="¡Miiish!">
<meta property="og:title" content="{esc(titulo)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{DOMINIO}{url}">
<meta property="og:image" content="{DOMINIO}/og-image.jpg">
<meta name="twitter:card" content="summary_large_image">
{FUENTES}
<link rel="stylesheet" href="{version('/assets/servicios.css')}">
<script type="application/ld+json">
{json.dumps(ld, ensure_ascii=False, indent=1)}
</script>
<script src="{glosario_url()}" defer></script>
<script src="{version('/assets/servicios.js')}" defer></script>
</head>
<body>
<a class="s-skip" href="#contenido">{"Saltar al contenido" if l == "es" else "Skip to content" if l == "en" else "Pular para o conteúdo"}</a>
{cabecera(l, alternas, actual)}
<main id="contenido">
{cuerpo}
</main>
{pie(l)}
</body>
</html>
'''


ORG = {'@type': 'Organization', '@id': DOMINIO + '/#organizacion', 'name': '¡Miiish!', 'url': DOMINIO + '/', 'logo': DOMINIO + '/favicon.svg'}


def contacto(s, l):
    return f'{IDIOMAS[l]["inicio"]}?s={FORMULARIO[s["id"]].replace(" ", "+")}#contacto'


def persona(k, l):
    nombre, foto, cargos = EQUIPO[k]
    cargo = cargos.get(l, cargos['es'])
    img = (f'<img src="/img/{foto}.webp" alt="{esc(nombre)}" width="120" height="120" loading="lazy">' if foto
           else f'<span class="s-ini" aria-hidden="true">{"".join(p[0] for p in nombre.split()[:2])}</span>')
    return f'<li class="s-per">{img}<span><b>{esc(nombre)}</b><small>{esc(cargo)}</small></span></li>'


def pagina_servicio(s, todos, l):
    t, d = IDIOMAS[l], s[l]
    url = ruta(s, l)
    alternas = {k: ruta(s, k) for k in IDIOMAS}
    num = f'{s["orden"]:02d}'
    p = lambda lista: ''.join(f'<p>{gl(x)}</p>' for x in lista)
    senales = ''.join(f'<li>{gl(x)}</li>' for x in d['senales'])
    ayuda = ''.join(f'<li><span class="s-n">{i + 1:02d}</span><h3>{gl(a["t"])}</h3><p>{gl(a["d"])}</p></li>' for i, a in enumerate(d['ayuda']))
    pasos = ''.join(f'<li><span class="s-paso">{i + 1}</span><h3>{gl(a["t"])}</h3><p>{gl(a["d"])}</p></li>' for i, a in enumerate(d['pasos']))
    recibes = ''.join(f'<li>{gl(x)}</li>' for x in d['recibes'])
    herr = ''.join(f'<li>{esc(h)}</li>' for h in s.get('herramientas', []))
    ejemplos = ''.join(f'<li><h3>{gl(e["t"])}</h3><p>{gl(e["d"])}</p></li>' for e in d['ejemplos'])
    equipo = ''.join(persona(k, l) for k in s['equipo'])
    faq = ''.join(f'<details><summary>{gl(q["q"])}</summary><p>{gl(q["a"])}</p></details>' for q in d['faq'])
    rel_ids = s.get('relacionados', [])
    orden = [o for o in todos if o['id'] in rel_ids] + [o for o in todos if o['id'] not in rel_ids and o['id'] != s['id']]
    otros = ''.join(tarjeta(o, l) for o in orden)
    cuerpo = f'''<article class="s-art {color(s)}">
  <section class="s-hero"><div class="s-wrap s-hero-in">
    <nav class="s-bc" aria-label="Ruta"><a href="{t["inicio"]}">{t["migas"]}</a> / <a href="{ruta_indice(l)}">{t["servicios"]}</a> / <span aria-current="page">{esc(d["nombre"])}</span></nav>
    <span class="s-pill">{t["servicio"]} {num} · {esc(d["nombre"])}</span>
    <h1>{gl(d["h1"])}</h1>
    <p class="s-bajada">{gl(d["bajada"])}</p>
    <div class="s-acciones"><a class="s-btn s-btn-big" href="{contacto(s, l)}" data-event="cta_servicio_{s["id"]}">{t["cotiza"]} →</a><a class="s-link" href="#incluye">{t["ver_incluye"]} ↓</a></div>
    <span class="s-num" aria-hidden="true">{num}</span>
  </div></section>
  <section class="s-wrap s-sec s-intro">
    <div><h2>{t["que_es"]}</h2>{p(d["que_es"])}<p class="gl-tip">{t["tip"]}</p></div>
    <aside class="s-senales"><h2>{t["senales"]}</h2><ul>{senales}</ul></aside>
  </section>
  <section class="s-wrap s-sec" id="incluye"><h2 class="s-h2">{t["ayuda"]}</h2><ol class="s-ayuda">{ayuda}</ol></section>
  <section class="s-oscuro"><div class="s-wrap s-sec"><h2 class="s-h2">{t["pasos"]}</h2><ol class="s-pasos">{pasos}</ol></div></section>
  <section class="s-wrap s-sec s-dos">
    <div class="s-recibes"><h2>{t["recibes"]}</h2><ul>{recibes}</ul></div>
    <div><h2>{t["herramientas"]}</h2><ul class="s-herr">{herr}</ul>
      <h2 class="s-mt">{t["equipo"]}</h2><ul class="s-equipo">{equipo}</ul><p class="s-nota">{t["equipo_txt"]}</p></div>
  </section>
  <section class="s-wrap s-sec"><h2 class="s-h2">{t["ejemplos"]}</h2><ul class="s-ejemplos">{ejemplos}</ul></section>
  <section class="s-wrap s-sec s-faq"><h2 class="s-h2">{t["faq"]}</h2>{faq}</section>
  <section class="s-cta"><div class="s-wrap s-cta-in"><div><p class="s-cta-t">{t["cta_t"]}</p><p>{t["cta_b"]}</p></div><a class="s-btn s-btn-big" href="{contacto(s, l)}" data-event="cta_servicio_{s["id"]}">{t["cta_btn"]}</a></div></section>
  <section class="s-wrap s-sec"><h2 class="s-h2">{t["otros"]}</h2><div class="s-grid">{otros}</div></section>
</article>'''
    ld = {'@context': 'https://schema.org', '@graph': [
        {'@type': 'Service', '@id': DOMINIO + url + '#servicio', 'name': d['nombre'], 'description': plano(d['seo_desc']),
         'serviceType': d['nombre'], 'url': DOMINIO + url, 'inLanguage': t['html'], 'provider': ORG,
         'areaServed': [{'@type': 'Country', 'name': 'Chile'}, 'Latin America'],
         'hasOfferCatalog': {'@type': 'OfferCatalog', 'name': d['nombre'],
                             'itemListElement': [{'@type': 'Offer', 'itemOffered': {'@type': 'Service', 'name': plano(a['t']), 'description': plano(a['d'])}} for a in d['ayuda']]}},
        {'@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': t['migas'], 'item': DOMINIO + t['inicio']},
            {'@type': 'ListItem', 'position': 2, 'name': t['servicios'], 'item': DOMINIO + ruta_indice(l)},
            {'@type': 'ListItem', 'position': 3, 'name': d['nombre'], 'item': DOMINIO + url}]},
        {'@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': plano(q['q']),
                                             'acceptedAnswer': {'@type': 'Answer', 'text': plano(q['a'])}} for q in d['faq']]}]}
    return url, documento(l, d['seo_titulo'], d['seo_desc'], url, alternas, cuerpo, ld, 'servicio')


def color(s):
    return {'#D7FF3A': 'c-lima', '#FF4FD8': 'c-fucsia'}.get(s.get('color', '').upper(), 'c-blanco')


def tarjeta(s, l):
    d = s[l]
    return (f'<a class="s-card {color(s)}" href="{ruta(s, l)}"><span class="s-card-n">{s["orden"]:02d}</span>'
            f'<span class="s-card-t">{esc(d["nombre"])}</span><span class="s-card-b">{esc(plano(d["bajada"]))}</span>'
            f'<span class="s-card-v">{IDIOMAS[l]["ver"]} →</span></a>')


def pagina_indice(todos, l):
    t = IDIOMAS[l]
    url = ruta_indice(l)
    alternas = {k: ruta_indice(k) for k in IDIOMAS}
    cuerpo = f'''<section class="s-wrap s-list-head">
  <nav class="s-bc" aria-label="Ruta"><a href="{t["inicio"]}">{t["migas"]}</a> / <span aria-current="page">{t["servicios"]}</span></nav>
  <span class="s-pill">{t["indice_pill"]}</span>
  <h1>{t["indice_h1"][0]} <em>{t["indice_h1"][1]}</em></h1>
  <p class="s-bajada">{t["indice_bajada"]}</p>
</section>
<section class="s-wrap"><div class="s-grid s-grid-big">{"".join(tarjeta(s, l) for s in todos)}</div></section>
<section class="s-cta"><div class="s-wrap s-cta-in"><div><p class="s-cta-t">{t["cta_t"]}</p><p>{t["cta_b"]}</p></div><a class="s-btn s-btn-big" href="{t["inicio"]}#contacto" data-event="cta_contacto">{t["cta_btn"]}</a></div></section>'''
    ld = {'@context': 'https://schema.org', '@graph': [
        {'@type': 'CollectionPage', '@id': DOMINIO + url + '#pagina', 'url': DOMINIO + url, 'name': t['indice_t'],
         'description': t['indice_d'], 'inLanguage': t['html'], 'publisher': ORG,
         'mainEntity': {'@type': 'ItemList', 'itemListElement': [
             {'@type': 'ListItem', 'position': i + 1, 'url': DOMINIO + ruta(s, l), 'name': s[l]['nombre']} for i, s in enumerate(todos)]}}]}
    return url, documento(l, t['indice_t'], t['indice_d'], url, alternas, cuerpo, ld, 'indice')


VER_MAS = {'es': 'Ver todo sobre {} →', 'en': 'All about {} →', 'pt': 'Tudo sobre {} →'}


def enlazar_portadas(todos):
    """Agrega dentro de cada servicio de la portada un enlace a su página (se puede correr muchas veces)."""
    for l, archivo in (('es', 'index.html'), ('en', 'en/index.html'), ('pt', 'pt/index.html')):
        p = os.path.join(RAIZ, archivo)
        if not os.path.exists(p):
            continue
        h = open(p, encoding='utf-8').read()
        h = re.sub(r'<a class="sv-more"[^>]*>.*?</a>', '', h)
        for s in todos:
            num = f'{s["orden"]:02d}'
            i = h.find(f'<span class="sv-n">{num}</span>')
            if i < 0:
                continue
            j = h.find('</ul>', i)
            enlace = (f'<a class="sv-more" href="{ruta(s, l)}" data-cursor="{"Ver" if l == "es" else "See" if l == "en" else "Ver"}">'
                      f'{esc(VER_MAS[l].format(s[l]["nombre"]))}</a>')
            h = h[:j + 5] + enlace + h[j + 5:]
        open(p, 'w', encoding='utf-8').write(h)


def cargar():
    todos = [json.load(open(f, encoding='utf-8')) for f in sorted(glob.glob(os.path.join(RAIZ, '_contenido', 'servicios', '*.json')))]
    todos.sort(key=lambda s: s['orden'])
    for s in todos:
        for l in IDIOMAS:
            for c in ('slug', 'nombre', 'seo_titulo', 'seo_desc', 'h1', 'bajada', 'que_es', 'senales', 'ayuda', 'pasos', 'recibes', 'ejemplos', 'faq'):
                if not s[l].get(c):
                    raise SystemExit(f'{s["id"]}/{l}: falta "{c}"')
    return todos


def urls():
    """Lista (url, prioridad) de todas las páginas de servicios, para el sitemap."""
    out = []
    for l in IDIOMAS:
        out.append((ruta_indice(l), '0.8'))
    for s in cargar():
        for l in IDIOMAS:
            out.append((ruta(s, l), '0.8'))
    return out


def main():
    todos = cargar()
    n = 0
    for l in IDIOMAS:
        for url, doc in [pagina_indice(todos, l)] + [pagina_servicio(s, todos, l) for s in todos]:
            d = os.path.join(RAIZ, url.strip('/'))
            os.makedirs(d, exist_ok=True)
            open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(doc)
            n += 1
    enlazar_portadas(todos)
    print(f'OK: {n} páginas de servicios')


if __name__ == '__main__':
    main()
