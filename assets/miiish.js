(function(){
  var root=document.getElementById('root'), se=document.scrollingElement||document.documentElement;
  var ring=document.querySelector('.cur-ring'), dot=document.querySelector('.cur-dot'), xy=document.querySelector('.cur-xy'), label=document.querySelector('.cur-label'), hdr=document.querySelector('.hdr'), burger=document.querySelector('.burger');
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mx=-100,my=-100,rx=-100,ry=-100,px=0,py=0,tpx=0,tpy=0,cur=se.scrollTop,target=cur,wheeling=false,last=cur,vel=0,anim=null,hy=null,menu=false;
  window.dataLayer=window.dataLayer||[];
  function maxScroll(){return se.scrollHeight-window.innerHeight}
  function setMenu(v){menu=v;root.classList.toggle('menu-open',v);document.documentElement.style.overflow=v?'hidden':'';if(burger)burger.setAttribute('aria-expanded',v?'true':'false')}
  if(burger)burger.addEventListener('click',function(){setMenu(!menu)});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&menu)setMenu(false)});
  window.addEventListener('wheel',function(e){
    if(menu||reduce||e.ctrlKey||maxScroll()<40)return;
    e.preventDefault();
    if(!wheeling){cur=se.scrollTop;target=cur}
    var d=e.deltaMode===1?e.deltaY*40:e.deltaY;
    target=Math.max(0,Math.min(maxScroll(),target+d));wheeling=true;anim=null;
  },{passive:false});
  function ease(t){return t<.5?8*t*t*t*t:1-Math.pow(-2*t+2,4)/2}
  function scrollToId(id){
    var el=id?document.getElementById(id):null, to=el?el.getBoundingClientRect().top+se.scrollTop:0;
    if(reduce){se.scrollTop=to;return}
    wheeling=false;anim={from:se.scrollTop,to:Math.max(0,Math.min(maxScroll(),to)),t0:performance.now(),dur:Math.min(2600,900+Math.abs(to-se.scrollTop)*.35)};
  }
  document.addEventListener('click',function(e){
    var ev=e.target.closest&&e.target.closest('[data-event]');
    if(ev){window.dataLayer.push({event:ev.getAttribute('data-event')});if(window.fbq)fbq('track','Lead',{content_name:ev.getAttribute('data-event')})}
    var a=e.target.closest&&e.target.closest('a[href^="#"]');if(!a)return;
    e.preventDefault();if(menu)setMenu(false);
    var id=a.getAttribute('href').slice(1);scrollToId(id);
    if(history.replaceState)history.replaceState(null,'',id?'#'+id:location.pathname);
  });
  document.addEventListener('mousemove',function(e){
    mx=e.clientX;my=e.clientY;tpx=e.clientX/innerWidth-.5;tpy=e.clientY/innerHeight-.5;
    if(dot)dot.style.transform='translate3d('+mx+'px,'+my+'px,0)';
    if(xy){xy.style.transform='translate3d('+mx+'px,'+my+'px,0)';xy.textContent='x '+mx+' · y '+my}
    if(ring)ring.classList.add('on');
  });
  document.addEventListener('mouseover',function(e){
    var t=e.target.closest&&e.target.closest('[data-cursor]');
    if(ring)ring.classList.toggle('is-hover',!!t);if(label)label.textContent=t?t.getAttribute('data-cursor'):'';
  });
  document.documentElement.addEventListener('mouseleave',function(){if(ring)ring.classList.remove('on')});
  function loop(now){
    if(anim){var t=Math.min(1,(now-anim.t0)/anim.dur);se.scrollTop=anim.from+(anim.to-anim.from)*ease(t);if(t>=1)anim=null}
    else if(wheeling){cur+=(target-cur)*.075;if(Math.abs(target-cur)<.5){cur=target;wheeling=false}se.scrollTop=cur}
    var y=se.scrollTop;
    if(hdr){hdr.classList.toggle('solid',y>60);var d=y-(hy==null?y:hy);if(d>3&&y>320)hdr.classList.add('hide');else if(d<-3||y<320)hdr.classList.remove('hide');hy=y}
    vel+=((y-last)-vel)*.2;last=y;rx+=(mx-rx)*.16;ry+=(my-ry)*.16;px+=(tpx-px)*.06;py+=(tpy-py)*.06;
    if(ring)ring.style.transform='translate3d('+rx+'px,'+ry+'px,0)';
    if(!reduce){root.style.setProperty('--mx',px.toFixed(4));root.style.setProperty('--my',py.toFixed(4));root.style.setProperty('--vel',Math.max(-10,Math.min(10,vel*.35)).toFixed(2)+'deg')}
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Idioma elegido a mano: se recuerda para la próxima visita
  document.addEventListener('click',function(e){
    var l=e.target.closest&&e.target.closest('[data-lang]');
    if(l){try{localStorage.setItem('miiish_lang',l.getAttribute('data-lang'))}catch(x){}}
  },true);

  // Formulario de contacto
  var f=document.getElementById('cf'), done=document.getElementById('cf-done');
  if(f){
    var L=(document.documentElement.lang||'es').slice(0,2);
    var M={es:{req:'Completa tu nombre, tu correo y cuéntanos tu proyecto.',mail:'Revisa tu correo, parece que tiene un error.',err:'No pudimos enviar tu mensaje. Inténtalo de nuevo o escríbenos a hola@miiish.com.',env:'Enviando…'},
           en:{req:'Please add your name, email and a few words about your project.',mail:'Please check your email address.',err:'We could not send your message. Try again or write to hola@miiish.com.',env:'Sending…'},
           pt:{req:'Preencha seu nome, e-mail e conte sobre o seu projeto.',mail:'Confira o seu e-mail, parece ter um erro.',err:'Não conseguimos enviar sua mensagem. Tente de novo ou escreva para hola@miiish.com.',env:'Enviando…'}}[L]||{};
    var t0=Date.now(), box=f.querySelector('.cf-err'), btn=f.querySelector('.cf-send');
    f.elements.t.value=String(t0);
    // Si llega desde la página de un servicio (?s=Branding), deja marcada esa opción
    try{var pre=new URLSearchParams(location.search).get('s');if(pre)f.querySelectorAll('input[name="servicios[]"]').forEach(function(c){if(c.value===pre)c.checked=true})}catch(x){}
    function fallo(m){box.textContent=m;box.hidden=false}
    f.addEventListener('submit',function(e){
      e.preventDefault();box.hidden=true;
      var n=f.elements.nombre.value.trim(), m=f.elements.email.value.trim(), x=f.elements.mensaje.value.trim();
      if(!n||!m||!x)return fallo(M.req);
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m))return fallo(M.mail);
      var fd=new FormData(f);fd.append('idioma',L);fd.append('origen',location.href);
      btn.disabled=true;var txt=btn.innerHTML;btn.textContent=M.env;
      fetch(f.action,{method:'POST',body:fd,headers:{'Accept':'application/json'}})
        .then(function(r){return r.json().catch(function(){return{ok:false}})})
        .then(function(j){
          if(!j.ok)throw new Error(j.error||M.err);
          window.dataLayer.push({event:'formulario_enviado'});if(window.fbq)fbq('track','Lead');
          location.href=(L==='es'?'':'/'+L)+'/gracias/';
        })
        .catch(function(er){fallo(er&&er.message&&er.message!=='Failed to fetch'?er.message:M.err);btn.disabled=false;btn.innerHTML=txt});
    });
  }

  // Glosario: términos subrayados que se explican al hacer clic
  var pop=null;
  function cerrarGl(){if(pop){pop.remove();pop=null}document.querySelectorAll('.gl[aria-expanded="true"]').forEach(function(b){b.setAttribute('aria-expanded','false')})}
  document.querySelectorAll('.gl').forEach(function(b){b.setAttribute('aria-expanded','false')});
  document.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('.gl');
    if(!b){if(pop&&!(e.target.closest&&e.target.closest('.gl-pop')))cerrarGl();return}
    e.preventDefault();e.stopPropagation();
    var abierto=b.getAttribute('aria-expanded')==='true';cerrarGl();if(abierto)return;
    var d=(window.GLOSARIO||{})[b.getAttribute('data-g')];if(!d)return;
    var L=(document.documentElement.lang||'es').slice(0,2);
    pop=document.createElement('div');pop.className='gl-pop';pop.id='gl-pop';pop.setAttribute('role','dialog');
    var x=document.createElement('button');x.type='button';x.setAttribute('aria-label',L==='en'?'Close':L==='pt'?'Fechar':'Cerrar');x.textContent='×';x.onclick=cerrarGl;
    var t=document.createElement('b');t.textContent=(d.t&&d.t[L])||d.t.es;
    var p=document.createElement('div');p.textContent=d[L]||d.es;
    pop.appendChild(x);pop.appendChild(t);pop.appendChild(p);pop.setAttribute('aria-label',t.textContent);document.body.appendChild(pop);
    b.setAttribute('aria-expanded','true');b.setAttribute('aria-controls','gl-pop');
    if(innerWidth>640){var r=b.getBoundingClientRect(),w=pop.offsetWidth,h=pop.offsetHeight;
      var left=Math.min(Math.max(16,r.left+r.width/2-w/2),innerWidth-w-16),top=r.bottom+10;if(top+h>innerHeight-16)top=r.top-h-10;
      pop.style.left=left+'px';pop.style.top=top+'px'}
  },true);
  document.addEventListener('keydown',function(e){if(e.key==='Escape')cerrarGl();var b=e.target.closest&&e.target.closest('.gl');if(b&&(e.key==='Enter'||e.key===' ')){e.preventDefault();b.click()}});
  window.addEventListener('wheel',cerrarGl,{passive:true});window.addEventListener('touchmove',cerrarGl,{passive:true});
  if(location.hash.length>1)setTimeout(function(){scrollToId(location.hash.slice(1))},300);
})();
