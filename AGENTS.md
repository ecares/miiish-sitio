# Agente de noticias ¡Miiish!

Este repositorio es el sitio miiish.com. Cada ejecución del agente publica **una** noticia nueva en la sección Noticias.

## Qué hacer en cada ejecución

1. **Revisa lo publicado.** Lee los archivos de `_contenido/noticias/` para conocer los temas y categorías de las últimas 10 notas. No repitas un tema ya cubierto en los últimos 30 días y rota la categoría: no uses la misma categoría que la nota anterior.
2. **Busca qué está pasando.** Usa búsqueda web para encontrar noticias de los **últimos 7 días** en alguna de estas áreas, que son los servicios de ¡Miiish!:
   - Diseño (tendencias, herramientas como Figma o Adobe, tipografía, identidad)
   - Branding
   - Desarrollo web (frameworks, WordPress, rendimiento, accesibilidad)
   - E-commerce (Shopify, Jumpseller, WooCommerce, pagos en Chile)
   - SEO (Google, AI Mode, actualizaciones del algoritmo)
   - Paid media (Meta Ads, Google Ads, TikTok Ads)
   - Redes sociales (Instagram, TikTok, LinkedIn, WhatsApp Business)
   - Video y animación (CapCut, Premiere, motion, formatos)
   - Inteligencia artificial (herramientas para marketing, diseño y desarrollo)
   - Marketing digital en Chile (estudios, regulación, comercio electrónico local)
   Prefiere fuentes confiables: blogs oficiales (Google, Meta, Shopify, Figma, Adobe), medios especializados (Search Engine Journal, Search Engine Land, The Verge, TechCrunch, Smashing Magazine, Social Media Today) y medios chilenos (Diario Financiero, La Tercera, CCS, El Mostrador).
3. **Abre y lee** al menos 2 fuentes (nunca te bases solo en el resumen del buscador). Todo dato, cifra o fecha de la nota debe salir de una fuente abierta y quedar enlazado.
4. **Escribe la nota** como un archivo JSON nuevo en `_contenido/noticias/AAAA-MM-DD-slug.json` (formato abajo).
5. **Genera el sitio:** `python3 tools/build.py`. Si falla, corrige el JSON hasta que diga `OK`.
6. **Publica:** `git add -A && git commit -m "Noticia: <título>" && git push origin main`.
7. Termina con un resumen de una línea: título, categoría y enlace `https://miiish.com/noticias/<slug>/`.

## Cómo escribir

- **Tono jovial y cercano**, como una amiga que sabe del tema y te lo cuenta en un café: tutea al lector, usa humor liviano, preguntas y frases cortas. Español de Chile con algún giro local suave ("harto", "de yapa", "ojo con esto"), sin abusar ni caer en garabatos. Divertido pero claro: el lector tiene que terminar sabiendo qué pasó y qué hacer.
- Títulos con gancho y simpáticos, pero honestos (que la nota cumpla lo que promete).
- Entre **600 y 900 palabras** en `cuerpo`.
- Primer párrafo: la noticia en dos o tres frases (qué pasó, quién, cuándo).
- Luego secciones con `## subtítulo`: qué cambió, **qué significa para una marca o pyme en Chile**, y qué recomendamos hacer.
- Escribe con tus propias palabras: no copies párrafos de las fuentes. Máximo una cita textual corta (menos de 15 palabras), entre comillas y atribuida.
- No inventes cifras, fechas, nombres ni declaraciones. Si un dato no está en una fuente abierta, no va.
- Si la cifra es de la propia empresa (Google, Meta), dilo.
- Puedes cerrar con una recomendación que mencione cómo ¡Miiish! ayuda, en una sola frase y sin exagerar. Si invitas a contactarnos, usa el formulario: [cuéntanos tu proyecto](/#contacto). No menciones WhatsApp.
- Sin emojis. Sin títulos clickbait.

## Formato del archivo

```json
{
  "slug": "minusculas-con-guiones-sin-tildes",
  "titulo": "Título claro de máximo 90 caracteres",
  "bajada": "Resumen de 1 a 2 frases, máximo 180 caracteres, que funcione como meta description",
  "categoria": "Una de: Diseño, Desarrollo web, Marketing digital, Paid media, SEO, Inteligencia artificial, Video y animación, E-commerce, Branding, Redes sociales",
  "fecha": "AAAA-MM-DD (hoy, hora de Chile)",
  "palabras_clave": ["4 a 8 búsquedas que haría alguien en Chile"],
  "claves": ["3 o 4 puntos de una frase con lo esencial; se muestran en el recuadro 'En 30 segundos'"],
  "cuerpo": "Markdown simple: párrafos, ## subtítulos, listas con -, **negrita**, *cursiva* y [enlaces](https://...)",
  "faq": [{"pregunta": "Pregunta que la gente buscaría", "respuesta": "Respuesta directa de 1 a 3 frases"}],
  "fuentes": [{"titulo": "Título del artículo", "medio": "Medio, fecha", "url": "https://..."}]
}
```

`faq` lleva 2 o 3 preguntas. `fuentes` lleva al menos 2 enlaces que hayas abierto.

## No tocar

- `index.html`, `en/`, `pt/`, `contacto.php`, `equipo/`, `img/`, `assets/` y `.htaccess` (los genera o mantiene el equipo). `tools/build.py` actualiza solo el bloque de noticias de la portada.
- No borres ni edites notas anteriores salvo para corregir un error de hecho; en ese caso agrega `"actualizado": "AAAA-MM-DD"`.
