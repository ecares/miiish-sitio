/* Páginas de servicios ¡Miiish!: glosario, idioma recordado y medición de clics. Se edita a mano. */
(function(){
  window.dataLayer=window.dataLayer||[];
  var L=(document.documentElement.lang||'es').slice(0,2);

  // Clics en botones de contacto (para Google Tag Manager / Meta)
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('[data-event]');
    if(a){dataLayer.push({event:a.getAttribute('data-event')});if(window.fbq)fbq('track','Lead',{content_name:a.getAttribute('data-event')})}
    var l=e.target.closest&&e.target.closest('[data-lang]');
    if(l){try{localStorage.setItem('miiish_lang',l.getAttribute('data-lang'))}catch(x){}}
  },true);

  // Glosario: palabras subrayadas que se explican al tocarlas
  var pop=null;
  function cerrar(){if(pop){pop.remove();pop=null}document.querySelectorAll('.gl[aria-expanded="true"]').forEach(function(b){b.setAttribute('aria-expanded','false')})}
  document.querySelectorAll('.gl').forEach(function(b){b.setAttribute('aria-expanded','false')});
  document.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('.gl');
    if(!b){if(pop&&!(e.target.closest&&e.target.closest('.gl-pop')))cerrar();return}
    e.preventDefault();
    var abierto=b.getAttribute('aria-expanded')==='true';cerrar();if(abierto)return;
    var d=(window.GLOSARIO||{})[b.getAttribute('data-g')];if(!d)return;
    pop=document.createElement('div');pop.className='gl-pop';pop.id='gl-pop';pop.setAttribute('role','dialog');
    var x=document.createElement('button');x.type='button';x.setAttribute('aria-label',L==='en'?'Close':L==='pt'?'Fechar':'Cerrar');x.textContent='×';x.onclick=cerrar;
    var t=document.createElement('b');t.textContent=(d.t&&d.t[L])||(d.t&&d.t.es)||b.textContent;
    var p=document.createElement('div');p.textContent=d[L]||d.es;
    pop.appendChild(x);pop.appendChild(t);pop.appendChild(p);pop.setAttribute('aria-label',t.textContent);document.body.appendChild(pop);
    b.setAttribute('aria-expanded','true');b.setAttribute('aria-controls','gl-pop');
    if(innerWidth>640){var r=b.getBoundingClientRect(),w=pop.offsetWidth,h=pop.offsetHeight;
      var left=Math.min(Math.max(16,r.left+r.width/2-w/2),innerWidth-w-16),top=r.bottom+10;if(top+h>innerHeight-16)top=r.top-h-10;
      pop.style.left=left+'px';pop.style.top=top+'px'}
  });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape')cerrar();
    var b=e.target.closest&&e.target.closest('.gl');if(b&&(e.key==='Enter'||e.key===' ')){e.preventDefault();b.click()}
  });
  window.addEventListener('scroll',function(){if(pop&&innerWidth>640)cerrar()},{passive:true});
})();
