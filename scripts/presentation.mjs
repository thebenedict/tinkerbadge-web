import {Lexer} from 'marked';
export function projectPresentation(config,projectName) { return config?.projectName===projectName?config:{}; }
// Presentation-only omissions leave the frozen README, full document page and
// native archive intact. Lexer boundaries avoid mistaking code for headings.
export function landingReadme(source,omitSections=[]) {
  if(!Array.isArray(omitSections)||omitSections.some(value=>typeof value!=='string'))throw new Error('Invalid landing README section list.');
  const text=source.replace(/\r\n?/g,'\n'),omitted=new Set(omitSections);
  const tokens=Lexer.lex(text);let cursor=0,copyFrom=0,depth=null;const chunks=[];
  for(const token of tokens){
    const start=text.indexOf(token.raw,cursor);if(start<0)throw new Error('README token position could not be verified.');
    cursor=start+token.raw.length;
    if(token.type!=='heading')continue;
    if(depth!==null&&token.depth<=depth){copyFrom=start;depth=null;}
    if(depth===null&&omitted.has(token.text)){chunks.push(text.slice(copyFrom,start));depth=token.depth;}
  }
  if(depth===null)chunks.push(text.slice(copyFrom));
  return chunks.join('');
}
