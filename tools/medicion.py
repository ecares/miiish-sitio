#!/usr/bin/env python3
"""Instala Google Tag Manager (GTM-MVVN7W5X) en todas las páginas públicas de miiish.com.

Agrega el código de GTM al principio del <head> y el respaldo <noscript> justo después de <body>,
entre comentarios <!--GTM:INICIO--> / <!--GTM:FIN-->, así se puede correr muchas veces sin duplicarlo.
Desde GTM se cargan Google Analytics 4 (G-Q4Z4E9244R) y la conversión del formulario (generate_lead).
Lo llaman export_site.py y tools/build.py; también se puede correr solo: python3 tools/medicion.py
"""
import os
import re

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GTM = 'GTM-MVVN7W5X'
OMITIR = ('.git', '.claude', '_contenido', 'tools', 'equipo')  # equipo es el sistema interno: no se mide

HEAD = ("<!--GTM:INICIO--><script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});"
        "var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;"
        "j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','"
        + GTM + "');</script><!--GTM:FIN-->")
BODY = ('<!--GTM:INICIO--><noscript><iframe src="https://www.googletagmanager.com/ns.html?id=' + GTM +
        '" height="0" width="0" title="Google Tag Manager" hidden></iframe></noscript><!--GTM:FIN-->')


def instalar(ruta):
    h = open(ruta, encoding='utf-8').read()
    if '<head' not in h or '<body' not in h:
        return False
    nuevo = re.sub(r'<!--GTM:INICIO-->.*?<!--GTM:FIN-->\n?', '', h, flags=re.S)
    nuevo = re.sub(r'(<head[^>]*>)', lambda m: m.group(1) + '\n' + HEAD, nuevo, count=1)
    nuevo = re.sub(r'(<body[^>]*>)', lambda m: m.group(1) + '\n' + BODY, nuevo, count=1)
    if nuevo != h:
        open(ruta, 'w', encoding='utf-8').write(nuevo)
    return True


def main():
    n = 0
    for base, dirs, archivos in os.walk(RAIZ):
        rel = os.path.relpath(base, RAIZ)
        if rel.split(os.sep)[0] in OMITIR:
            dirs[:] = []
            continue
        for a in archivos:
            if a.endswith('.html') and instalar(os.path.join(base, a)):
                n += 1
    print(f'OK: Tag Manager {GTM} en {n} páginas')


if __name__ == '__main__':
    main()
