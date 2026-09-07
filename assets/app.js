
const search = document.querySelector('#bookSearch');
const buttons = [...document.querySelectorAll('.filter')];
function apply(){
  const q=(search?.value||'').trim().toLowerCase();
  const active=document.querySelector('.filter.active')?.dataset.filter || 'all';
  document.querySelectorAll('.book').forEach(card=>{
    const text=(card.dataset.name+' '+card.dataset.group+' '+card.dataset.testament).toLowerCase();
    const okQ=!q||text.includes(q);
    const okF=active==='all'||card.dataset.testament===active;
    card.style.display=(okQ&&okF)?'flex':'none';
  });
}
search?.addEventListener('input',apply);
buttons.forEach(btn=>btn.addEventListener('click',()=>{
  buttons.forEach(b=>b.classList.remove('active')); btn.classList.add('active'); apply();
}));
