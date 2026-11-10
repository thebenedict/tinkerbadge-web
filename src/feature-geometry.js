export function projectAnchor(matrix, point) {
  if (!Array.isArray(matrix) || matrix.length !== 6 || !matrix.every(Number.isFinite)) throw new Error('Invalid feature projection.');
  if (!point.every(Number.isFinite)) throw new Error('Invalid feature anchor.');
  const [a,b,c,d,e,f]=matrix,[x,y]=point;
  return [a*x+b*y+c,d*x+e*y+f];
}
export function featureAnchors(feature, components, side, projection, accessories=[]) {
  if(!['front','back'].includes(side))throw new Error('Feature anchors require an explicit board side.');
  if (!Array.isArray(feature.anchors) || feature.anchors.length !== 1 || !Array.isArray(feature.anchors[0]) || feature.anchors[0].length !== 1) throw new Error('Each feature requires one representative component and one leader.');
  const kind=feature.anchorType??'component';
  if(!['component','accessory','board-region'].includes(kind))throw new Error('Unknown feature anchor type.');
  const reference=feature.anchors[0][0],matches=(kind==='accessory'?accessories:components).filter(part=>part.reference===reference);
  if(matches.length!==1)throw new Error(`Feature reference ${reference} is missing or ambiguous.`);
  const part=matches[0];
  // A through-board region is an explicitly labeled, model-less native reserve.
  // It may be projected from either viewing side without claiming fitted copper.
  if(kind==='board-region'){
    if(!feature.reservation||!part.boardOnly||(part.models??[]).length||!feature.sourceDocument)throw new Error('A board-region anchor requires a documented, model-less reservation.');
  }else{
    if(part.layer!==(side==='front'?'F.Cu':'B.Cu'))throw new Error(`Feature reference ${reference} is on the wrong side.`);
    if(part.boardOnly&&!feature.reservation)throw new Error(`Feature reference ${reference} is a reservation, not a fitted component.`);
  }
  if(kind==='accessory'&&(!part.id||!part.positionMm||!feature.reservation))throw new Error('Accessory anchors require a named provisional assembly object.');
  let point=kind==='accessory'?[part.positionMm.x,part.positionMm.y]:[part.x,part.y];
  if(feature.anchorOffsetMm){
    const offset=feature.anchorOffsetMm;
    if(kind!=='component'||!Array.isArray(offset)||offset.length!==2||!offset.every(Number.isFinite)||!feature.sourceDocument||part.footprint!==feature.anchorFootprint||!feature.anchorModelSha256||!(part.modelSources??[]).some(model=>model.sourceSha256===feature.anchorModelSha256))throw new Error('Offset anchors require a verified native footprint and model.');
    const angle=(part.rotation??0)*Math.PI/180,[dx,dy]=offset;
    point=[part.x+dx*Math.cos(angle)+dy*Math.sin(angle),part.y-dx*Math.sin(angle)+dy*Math.cos(angle)];
  }
  return [{references:[reference],pointMm:point,pixel:projectAnchor(projection,point)}];
}
// Image and SVG share an aspect ratio. The browser scales both uniformly.
export function leaderPoints(label, image, anchor, naturalSize, mobile=false, column='left') {
  const end=[image.x+anchor[0]/naturalSize[0]*image.width,image.y+anchor[1]/naturalSize[1]*image.height];
  const start=mobile?[label.x+label.width/2,label.y]:[column==='left'?label.x+label.width:label.x,label.y+Math.min(label.height/2,35)];
  const elbow=mobile?[start[0],image.y+image.height+12]:[(start[0]+end[0])/2,start[1]];
  return [start,elbow,end];
}
