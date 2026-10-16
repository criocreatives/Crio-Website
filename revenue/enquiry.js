
/* Lightweight, no-cookie campaign attribution for Crio enquiry forms. */
(function(){
  var form=document.querySelector('form[data-revenue-form]');
  if(!form)return;
  var q=new URLSearchParams(window.location.search);
  ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach(function(key){
    var input=form.querySelector('input[name="'+key+'"]');
    if(input)input.value=(q.get(key)||'').slice(0,120);
  });
  var source=form.querySelector('input[name="landing_page"]');
  if(source)source.value=window.location.pathname.slice(0,160);
  var button=form.querySelector('button[type="submit"]');
  var status=form.querySelector('[role="status"]');
  var started=Date.now();
  form.addEventListener('submit',function(event){
    var trap=form.querySelector('input[name="_honey"]');
    if((trap&&trap.value.trim())||Date.now()-started<2500){
      event.preventDefault();
      if(status)status.textContent='Please review the form and try again.';
      return;
    }
    if(button){button.disabled=true;button.textContent='Sending…'}
  });
})();
