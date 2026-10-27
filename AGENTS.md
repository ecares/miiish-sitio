# Agente de notas ¡Miiish!

Este repositorio es el sitio miiish.com. Cada ejecución del agente prepara **una** nota nueva para la sección Noticias y la deja **como borrador para revisión humana**. El agente nunca publica directo en `main`.

## Por qué trabajamos así (desde el 27-oct-2026)

Google no castiga que un texto esté hecho con IA, pero sí el contenido publicado en cantidad, sin aporte propio y hecho para posicionar (*scaled content abuse*), y recomienda que una persona verifique todo contenido generado con IA antes de publicarlo. Por eso:

- **Pocas notas y buenas:** como máximo **2 por semana**.
- **Primero guías, después noticias:** las guías responden lo que busca un posible cliente en Chile y siguen sirviendo meses después. Una noticia solo vale la pena si cambia algo concreto para una pyme chilena.
- **Siempre pasa por una persona:** el agente abre un pull request; la nota sale al sitio solo cuando alguien del equipo la revisa, le agrega su mirada y la aprueba.

## Qué hacer en cada ejecución

1. **Revisa lo publicado.** Lee `_contenido/noticias/` (temas, categorías y tipo de las últimas 15 notas) y `_contenido/temas-guias.md`. Revisa también si hay pull requests abiertos con borradores (`nota/*`): si ya hay **2 o más sin revisar**, no escribas otra; termina avisando que hay borradores esperando.
2. **Elige el tipo de nota.** Si la última nota publicada fue una `noticia`, esta toca `guia`. Para una noticia, la vara es alta: tiene que haber pasado en los **últimos 7 días** y cambiar algo concreto para una marca o pyme en Chile (una fecha límite, un costo, una regla nueva, una función que conviene activar o desactivar). Si no encuentras una así, escribe una guía.
3. **Elige el tema.**
   - Guía: toma el primer tema pendiente (`- [ ]`) de `_contenido/temas-guias.md` que no repita la categoría de la nota anterior, y márcalo como `- [x]` con la fecha en el mismo commit.
   - Noticia: busca en las áreas de servicio (abajo). No repitas un tema de los últimos 60 días ni la categoría de la nota anterior.
4. **Investiga en fuentes de primera mano.** Abre y lee al menos 2 fuentes (nunca te bases solo en el resumen del buscador).
   - Prioridad: el anuncio o la documentación oficial (blogs de Google, Meta, Shopify, Figma, Adobe, Canva, etc.), organismos y medios chilenos (CCS, SII, Sernac, Diario Financiero, La Tercera, El Mostrador) y medios especializados reconocidos (Search Engine Land, Search Engine Journal, Search Engine Roundtable, Social Media Today, TechCrunch, The Verge, Smashing Magazine).
   - **No uses** como fuente sitios que resumen o reescriben noticias de otros, blogs de herramientas que venden servicios relacionados ni páginas de "release notes" de terceros. `tools/build.py` avisa si detecta alguno.
   - Si no puedes abrir la fuente oficial, dilo en el pull request.
   - Todo dato, cifra o fecha de la nota debe salir de una fuente abierta y quedar enlazado.
5. **Escribe la nota** como un archivo JSON nuevo en `_contenido/noticias/AAAA-MM-DD-slug.json` (formato abajo).
6. **Genera el sitio:** `python3 tools/build.py`. Si falla o muestra un AVISO sobre tu nota, corrige el JSON hasta que diga `OK` sin avisos.
7. **Deja el borrador en una rama y abre un pull request** (no toques `main`):
   - `git checkout -b nota/<slug>` desde `main` actualizado.
   - `git add -A && git commit -m "Nota: <título>" && git push origin nota/<slug>`.
   - Abre un pull request hacia `main` con las herramientas de GitHub (título `Nota: <título>`), usando la plantilla de `.github/pull_request_template.md`. En la descripción incluye: tipo y categoría, las fuentes que abriste, cualquier dato que no pudiste confirmar en la fuente oficial, 2 o 3 preguntas para que el revisor agregue la mirada del equipo, y la persona sugerida en `revisado_por`.
   - Si no puedes crear el pull request, deja la rama subida y entrega el enlace `https://github.com/ecares/miiish-sitio/compare/main...nota/<slug>`.
8. Termina con un resumen de una línea: título, tipo, categoría y enlace al pull request.

El sitio se publica solo desde `main`: al hacer *merge* del pull request, el servidor lo sube en unos 15 minutos.

## Áreas de servicio

- Diseño (tendencias, herramientas como Figma, Adobe o Canva, tipografía, identidad)
- Branding
- Desarrollo web (WordPress, rendimiento, accesibilidad, seguridad)
- E-commerce (Shopify, Jumpseller, WooCommerce, pagos en Chile)
- SEO (Google, AI Mode, actualizaciones del algoritmo, perfil de negocio)
- Paid media (Meta Ads, Google Ads, TikTok Ads)
- Redes sociales (Instagram, TikTok, LinkedIn)
- Video y animación (CapCut, Premiere, motion, formatos)
- Inteligencia artificial (herramientas para marketing, diseño y desarrollo)
- Marketing digital en Chile (estudios, regulación, comercio electrónico local)

## Cómo escribir

- **Tono jovial y cercano**, como una amiga que sabe del tema y te lo cuenta en un café: tutea al lector, usa humor liviano, preguntas y frases cortas. Español de Chile con algún giro local suave ("harto", "de yapa", "ojo con esto"), sin abusar ni caer en garabatos. Divertido pero claro: el lector tiene que terminar sabiendo qué pasó y qué hacer.
- Títulos con gancho y simpáticos, pero honestos (que la nota cumpla lo que promete). Sin clickbait.
- Escribe para personas que no son especialistas ("el tío de la esquina" que tiene un negocio): cada término técnico (SEO, CTR, landing page, paid media, etc.) se explica en palabras simples la primera vez que aparece.
- **Largo:** noticias entre 600 y 900 palabras en `cuerpo`; guías entre 900 y 1.500.
- **Noticia:** primer párrafo con la noticia en dos o tres frases (qué pasó, quién, cuándo); luego `## subtítulos`: qué cambió, **qué significa para una marca o pyme en Chile** y qué recomendamos hacer.
- **Guía:** primer párrafo que responda directo la pregunta del título; luego pasos, opciones o criterios concretos, con precios, plazos o reglas chilenas solo si salen de una fuente abierta. Cierra con errores comunes y un resumen de qué hacer.
- **Aporta algo que no esté en otro lado:** compara opciones, aterriza a Chile (pesos, SII, Sernac, medios de pago locales, Jumpseller, temporadas como CyberDay o Black Friday) y da recomendaciones accionables. Una nota que solo traduce o resume otra no sirve.
- Escribe con tus propias palabras: no copies párrafos de las fuentes. Máximo una cita textual corta (menos de 15 palabras), entre comillas y atribuida.
- No inventes cifras, fechas, nombres, declaraciones **ni experiencias del equipo**. El agente nunca escribe "en ¡Miiish! probamos…" ni casos de clientes: eso lo agrega una persona en `aporte_equipo` durante la revisión.
- Si la cifra es de la propia empresa (Google, Meta), dilo.
- Enlaza la página del servicio relacionado (campo `servicio`) y, si aplica, otras notas del sitio sobre el mismo tema.
- Puedes cerrar con una recomendación que mencione cómo ¡Miiish! ayuda, en una sola frase y sin exagerar. Si invitas a contactarnos, usa el formulario: [cuéntanos tu proyecto](/#contacto). No menciones WhatsApp.
- No uses "en casa" (di "hecho por su propio equipo"). Sin emojis.

## Formato del archivo

```json
{
  "slug": "minusculas-con-guiones-sin-tildes",
  "tipo": "guia o noticia",
  "titulo": "Título claro de máximo 90 caracteres",
  "bajada": "Resumen de 1 a 2 frases, máximo 180 caracteres, que funcione como meta description",
  "categoria": "Una de: Diseño, Desarrollo web, Marketing digital, Paid media, SEO, Inteligencia artificial, Video y animación, E-commerce, Branding, Redes sociales",
  "fecha": "AAAA-MM-DD (hoy, hora de Chile)",
  "servicio": "slug de la página de servicio relacionada: branding, contenido-y-redes-sociales, paginas-web-y-tiendas-online, publicidad-digital, video, animacion-y-personajes, modelado-y-render-3d, sistemas-a-medida o merchandising-y-material-pop",
  "revisado_por": "Sugerencia de revisor: eduardo (web, SEO, paid media, e-commerce), joaquin (diseño, branding, contenido), javiera (animación), camila o diego (3D, UX, POP), matias (video)",
  "aporte_equipo": "Déjalo vacío (\"\"). Lo escribe la persona que revisa: su experiencia, un caso o una opinión del equipo.",
  "palabras_clave": ["4 a 8 búsquedas que haría alguien en Chile"],
  "claves": ["3 o 4 puntos de una frase con lo esencial; se muestran en el recuadro 'En 30 segundos'"],
  "cuerpo": "Markdown simple: párrafos, ## subtítulos, listas con -, **negrita**, *cursiva* y [enlaces](https://...)",
  "faq": [{"pregunta": "Pregunta que la gente buscaría", "respuesta": "Respuesta directa de 1 a 3 frases"}],
  "fuentes": [{"titulo": "Título del artículo", "medio": "Medio, fecha", "url": "https://..."}]
}
```

`faq` lleva 2 o 3 preguntas. `fuentes` lleva al menos 2 enlaces que hayas abierto.

Campos que agrega el equipo, no el agente: `aporte_equipo` (se muestra como "La mirada de ¡Miiish!"), `revisado_por` definitivo (aparece en la firma y en los datos estructurados), `actualizado` (cuando se corrige una nota) e `"indexar": false` (saca una nota de Google, del listado, del sitemap y del RSS sin borrarla).

## No tocar

- `index.html`, `en/`, `pt/`, `contacto.php`, `equipo/`, `img/`, `assets/` y `.htaccess` (los genera o mantiene el equipo). `tools/build.py` actualiza solo el bloque de noticias de la portada.
- No borres ni edites notas anteriores salvo para corregir un error de hecho; en ese caso agrega `"actualizado": "AAAA-MM-DD"`.

## Estilos y scripts (desde el 24-oct-2026)
- Todo el CSS del sitio vive en archivos aparte dentro de `assets/`: `miiish.css` (landing en los 3 idiomas), `noticias.css` (noticias) y `gracias.css` (páginas de gracias). El JS está en `assets/miiish.js` y `assets/glosario.js`.
- No agregues `<style>` ni atributos `style="..."` en las páginas. Si una noticia necesita un estilo nuevo, agrégalo a `assets/noticias.css`.
- `miiish.css`, `miiish.js` y `glosario.js` se generan desde el diseño: no los edites a mano. Los enlaces llevan `?v=` con una huella del contenido, así el navegador baja la versión nueva apenas cambia.

## Páginas de servicios (desde el 24-oct-2026)
- Hay una página por servicio en 3 idiomas: `/servicios/<slug>/`, `/en/services/<slug>/` y `/pt/servicos/<slug>/`, más un índice en cada idioma.
- El contenido vive en `_contenido/servicios/NN-<id>.json` (es, en y pt en el mismo archivo). Las palabras técnicas se escriben `{{clave|texto}}` con una clave de `assets/glosario.js`.
- Para regenerarlas: `python3 tools/servicios.py`. También agrega en la portada el botón "Ver todo sobre…" de cada servicio. No edites a mano los `index.html` de esas carpetas.
- Estilos en `assets/servicios.css` y script en `assets/servicios.js` (se editan a mano). `tools/build.py` ya incluye estas páginas en `sitemap.xml` y `llms.txt`.
- Si una noticia trata de un tema de un servicio, puedes enlazar a su página de servicio en español.

## Sección de rubros "A quién ayudamos" (desde el 24-oct-2026)
- Está en la portada (3 idiomas), antes de Plataformas, entre `<!--RUBROS:INICIO-->` y `<!--RUBROS:FIN-->`.
- Contenido en `_contenido/rubros.json`; se regenera con `python3 tools/rubros.py`. Estilos en `assets/rubros.css` y comportamiento en `assets/rubros.js`.
- Si una noticia es sobre un rubro (por ejemplo, inmobiliarias), puedes enlazar a la portada con `/#rubros`.
