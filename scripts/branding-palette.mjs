export const brandingPalette={green:'#20563d',white:'#ffffff',paper:'#f5f3ec',darkTab:'#202124',keyline:'#c7e2cd'};
export function contrastRatio(a,b) {
  const luminance=color=>color.slice(1).match(/../g).map(hex=>parseInt(hex,16)/255)
    .map(channel=>channel<=0.04045?channel/12.92:((channel+0.055)/1.055)**2.4)
    .reduce((sum,channel,index)=>sum+channel*[0.2126,0.7152,0.0722][index],0);
  const first=luminance(a),second=luminance(b);
  return (Math.max(first,second)+0.05)/(Math.min(first,second)+0.05);
}
