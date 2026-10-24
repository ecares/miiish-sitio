/* Sección "A quién ayudamos": buscador, filtros, recorrido automático y botón al formulario. Se edita a mano. */
(function(){
  var sec=document.getElementById('rubros');if(!sec)return;
  var tabs=[].slice.call(sec.querySelectorAll('.rb-tab')),q=sec.querySelector('.rb-q'),filtros=[].slice.call(sec.querySelectorAll('.rb-f'));
  var vacio=sec.querySelector('.rb-vacio'),estado=sec.querySelector('.rb-estado'),prog=sec.querySelector('.rb-prog span');
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  var grupo='',auto=!reduce&&!(window.matchMedia&&matchMedia('(max-width: 1000px)').matches),timer=null,visible=false,DUR=6500;
  window.dataLayer=window.dataLayer||[];

  function norm(t){return(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')}
  function panel(t){return document.getElementById(t.getAttribute('aria-controls'))}
  function visibles(){return tabs.filter(function(t){return!t.hidden})}

  function elegir(t,foco,desdeUsuario){
    if(!t)return;
    tabs.forEach(function(x){var on=x===t;x.setAttribute('aria-selected',on?'true':'false');x.tabIndex=on?0:-1;var p=panel(x);if(p)p.hidden=!on});
    var p=panel(t);vacio.hidden=true;
    if(p&&!reduce){p.classList.remove('rb-in');void p.offsetWidth;p.classList.add('rb-in')}
    if(foco)t.focus();
    // en celular, la ficha elegida queda visible en la tira
    var l=t.parentNode;if(l.scrollWidth>l.clientWidth){l.scrollTo({left:t.offsetLeft-20,behavior:reduce?'auto':'smooth'})}
    if(desdeUsuario){parar();dataLayer.push({event:'rubro_visto',rubro:t.id.replace('rb-tab-','')})}
    reiniciarProg();
  }

  function filtrar(){
    var txt=norm(q.value.trim()),palabras=txt.split(/\s+/).filter(Boolean);
    var n=0;
    tabs.forEach(function(t){
      var k=norm(t.getAttribute('data-k')),okG=!grupo||t.getAttribute('data-g')===grupo;
      var okT=!palabras.length||palabras.every(function(w){return k.indexOf(w)>=0})||(palabras.length&&palabras.some(function(w){return w.length>3&&k.indexOf(w.slice(0,Math.max(4,w.length-2)))>=0}));
      var ver=okG&&okT;
      if(ver&&t.hidden){t.classList.remove('rb-entra');void t.offsetWidth;t.classList.add('rb-entra')}
      t.hidden=!ver;if(ver)n++;
    });
    estado.textContent=(txt||grupo)?(n===1?sec.getAttribute('data-uno'):sec.getAttribute('data-res').replace('{}',n)):'';
    var actual=tabs.filter(function(t){return t.getAttribute('aria-selected')==='true'})[0];
    if(!n){tabs.forEach(function(t){var p=panel(t);if(p)p.hidden=true});vacio.hidden=false;return}
    if(!actual||actual.hidden)elegir(visibles()[0]);
  }

  // Recorrido automático mientras la sección está a la vista y nadie la ha tocado
  function reiniciarProg(){if(!prog)return;prog.style.animation='none';void prog.offsetWidth;prog.style.animation=''}
  function siguiente(){var v=visibles();if(!v.length)return;var i=v.indexOf(tabs.filter(function(t){return t.getAttribute('aria-selected')==='true'})[0]);elegir(v[(i+1)%v.length])}
  function correr(){clearInterval(timer);if(auto&&visible){sec.classList.add('auto');sec.style.setProperty('--dur',DUR+'ms');reiniciarProg();timer=setInterval(siguiente,DUR)}else{sec.classList.remove('auto')}}
  function parar(){if(!auto)return;auto=false;clearInterval(timer);sec.classList.remove('auto')}
  if('IntersectionObserver' in window){
    new IntersectionObserver(function(es){es.forEach(function(e){visible=e.isIntersecting&&e.intersectionRatio>.35;correr()})},{threshold:[0,.35,.6]}).observe(sec.querySelector('.rb-grid'));
  }
  sec.addEventListener('pointerdown',parar);sec.addEventListener('keydown',parar);

  tabs.forEach(function(t){
    t.addEventListener('click',function(){elegir(t,false,true)});
    t.addEventListener('keydown',function(e){
      var v=visibles(),i=v.indexOf(t),n=null;
      if(e.key==='ArrowRight'||e.key==='ArrowDown')n=v[(i+1)%v.length];
      else if(e.key==='ArrowLeft'||e.key==='ArrowUp')n=v[(i-1+v.length)%v.length];
      else if(e.key==='Home')n=v[0];else if(e.key==='End')n=v[v.length-1];
      if(n){e.preventDefault();elegir(n,true,true)}
    });
  });
  filtros.forEach(function(b){b.addEventListener('click',function(){
    grupo=b.getAttribute('data-g');filtros.forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});parar();filtrar();
  })});
  var tq=null;
  q.addEventListener('input',function(){parar();clearTimeout(tq);tq=setTimeout(filtrar,120)});
  q.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();var v=visibles();if(v[0]){elegir(v[0],false,true);var p=panel(v[0]);if(p)p.focus({preventScroll:true})}}});

  sec.querySelector('.rb-dado').addEventListener('click',function(){
    var b=this;parar();b.classList.remove('gira');void b.offsetWidth;b.classList.add('gira');
    q.value='';grupo='';filtros.forEach(function(x){x.setAttribute('aria-pressed',x.getAttribute('data-g')===''?'true':'false')});filtrar();
    var actual=tabs.filter(function(t){return t.getAttribute('aria-selected')==='true'})[0],otros=tabs.filter(function(t){return t!==actual});
    var i=0,vueltas=reduce?1:9;
    (function paso(){var t=otros[Math.floor(Math.random()*otros.length)];elegir(t);i++;if(i<vueltas)setTimeout(paso,60+i*22);else dataLayer.push({event:'rubro_sorpresa',rubro:t.id.replace('rb-tab-','')})})();
  });

  // Luz que sigue al mouse y leve inclinación 3D del panel (solo escritorio)
  if(!reduce&&window.matchMedia&&matchMedia('(hover:hover) and (pointer:fine)').matches){
    sec.querySelectorAll('.rb-p').forEach(function(p){
      p.addEventListener('pointermove',function(e){var r=p.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
        p.style.setProperty('--mx',(x*100).toFixed(1)+'%');p.style.setProperty('--my',(y*100).toFixed(1)+'%');
        p.style.transform='rotateY('+((x-.5)*5).toFixed(2)+'deg) rotateX('+((.5-y)*4).toFixed(2)+'deg)'});
      p.addEventListener('pointerleave',function(){p.style.transform=''});
    });
  }

  // Contador que sube cuando aparece el título
  var c=sec.querySelector('.rb-count');
  if(c&&!reduce&&'IntersectionObserver' in window){
    var fin=+c.getAttribute('data-n');c.textContent='0';
    var io=new IntersectionObserver(function(es){if(!es[0].isIntersecting)return;io.disconnect();var t0=performance.now();
      (function f(now){var k=Math.min(1,(now-t0)/1200),e=1-Math.pow(1-k,3);c.textContent=Math.round(fin*e);if(k<1)requestAnimationFrame(f)})(t0)},{threshold:.6});
    io.observe(c);
  }

  // "Quiero esto para mi negocio": deja el formulario listo con el rubro y los servicios
  sec.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('.rb-cta');if(!a)return;
    var f=document.getElementById('cf');if(!f)return;
    var msg=a.getAttribute('data-msg'),s=(a.getAttribute('data-s')||'').split(',').filter(Boolean);
    var m=f.elements.mensaje;if(m&&msg&&!m.value.trim()){m.value=msg;m.dispatchEvent(new Event('input',{bubbles:true}))}
    if(s.length)f.querySelectorAll('input[name="servicios[]"]').forEach(function(c){if(s.indexOf(c.value)>=0)c.checked=true});
  },true);
})();
