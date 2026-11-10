import {leaderPoints} from './feature-geometry.js';
export function setupFeatures(){
  const preview=document.querySelector('.feature-preview');if(!preview)return;
  const diagrams=[...preview.querySelectorAll('.feature-diagram')];
  const mobile=matchMedia('(max-width: 680px)');
  for(const diagram of diagrams){
    const data=JSON.parse(diagram.querySelector('.feature-anchors').textContent),svg=diagram.querySelector('.feature-leaders'),image=diagram.querySelector('.feature-image'),labels=[...diagram.querySelectorAll('.feature-label')];
    let active=labels[0]?.dataset.feature;
    function activate(id){active=id;labels.forEach(label=>{const selected=label.dataset.feature===id;label.classList.toggle('is-active',selected);label.setAttribute('aria-pressed',String(selected));});diagram.querySelectorAll('[data-dots]').forEach(group=>group.classList.toggle('is-active',group.dataset.dots===id));draw();}
    function draw(){
      if(diagram.hidden)return;
      const bounds=diagram.getBoundingClientRect(),rect=image.getBoundingClientRect();
      svg.setAttribute('viewBox',`0 0 ${bounds.width} ${bounds.height}`);svg.replaceChildren();
      for(const feature of data.features){
        if(mobile.matches&&active!==feature.id)continue;
        const label=labels.find(label=>label.dataset.feature===feature.id),r=label.getBoundingClientRect();
        for(const anchor of feature.anchors){
          const points=leaderPoints({x:r.x-bounds.x,y:r.y-bounds.y,width:r.width,height:r.height},{x:rect.x-bounds.x,y:rect.y-bounds.y,width:rect.width,height:rect.height},anchor,[data.width,data.height],mobile.matches,label.dataset.column);
          const path=document.createElementNS('http://www.w3.org/2000/svg','polyline');path.setAttribute('points',points.map(point=>point.join(',')).join(' '));path.classList.toggle('is-active',active===feature.id);svg.append(path);
        }
      }
    }
    labels.forEach(label=>{label.addEventListener('click',()=>activate(label.dataset.feature));label.addEventListener('focus',()=>activate(label.dataset.feature));label.addEventListener('pointerenter',()=>{if(!mobile.matches)activate(label.dataset.feature);});});
    const observer=new ResizeObserver(draw);observer.observe(diagram);observer.observe(image);
    diagram.querySelector('img').addEventListener('load',draw);mobile.addEventListener('change',draw);
    diagram.addEventListener('featureview',draw);draw();
  }
  function selectView(){
    const radio=preview.querySelector('[name=feature-view]:checked');if(!radio)return;
    diagrams.forEach(diagram=>{diagram.hidden=diagram.dataset.featureView!==radio.value;if(!diagram.hidden)diagram.dispatchEvent(new Event('featureview'));});
  }
  preview.querySelectorAll('[name=feature-view]').forEach(radio=>radio.addEventListener('change',selectView));
  window.addEventListener('pageshow',selectView);selectView();
}
