import path from 'node:path';
export const escapeHtml = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const localHref = (from,to) => path.posix.relative(path.posix.dirname(from),to) || path.posix.basename(to);
export function markdownRenderer({sourceRel,pageRoute,sourceFiles,sourceBase,nativeArchive}) {
  function destination(href){
    if(!href)return null;
    if(/^(https?:|mailto:)/i.test(href))return href;
    if(href.startsWith('#'))return href;
    if(/^[a-z][a-z0-9+.-]*:/i.test(href)||href.startsWith('//'))return null;
    const [file,fragment]=href.split('#');const rel=path.posix.normalize(path.posix.join(path.posix.dirname(sourceRel),decodeURIComponent(file)));
    if(rel.startsWith('../')||path.posix.isAbsolute(rel))return null;
    const found=sourceFiles.has(rel)?rel:sourceFiles.has(`${rel}/README.md`)?`${rel}/README.md`:null;
    if(found)return localHref(pageRoute,found.endsWith('.md')?`docs/${found.replace(/\.md$/,'.html')}`:`${sourceBase}${found}`)+(fragment?`#${encodeURIComponent(fragment)}`:'');
    if(rel==='hardware')return localHref(pageRoute,nativeArchive);
    return null;
  }
  return {
    html({text}){return escapeHtml(text);},
    link({href,title,tokens}){const body=this.parser.parseInline(tokens),dest=destination(href);if(!dest)return `<span class="not-bundled" title="This source reference is not included in the viewer bundle">${body}</span>`;const external=/^https?:/i.test(dest);return `<a href="${escapeHtml(dest)}"${title?` title="${escapeHtml(title)}"`:''}${external?' rel="noreferrer noopener"':''}>${body}</a>`;},
    image({href,text}){const dest=destination(href);if(!dest||/^https?:/i.test(dest))return `<span class="not-bundled">${escapeHtml(text)} (image not bundled)</span>`;return `<img loading="lazy" src="${escapeHtml(dest)}" alt="${escapeHtml(text)}">`;},
    heading({tokens,depth,text}){const id=text.toLowerCase().replace(/[^a-z0-9 -]/g,'').replace(/\s+/g,'-');return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}</h${depth}>`;}
  };
}
