"""Source-backed component names, without a second maintained label catalog."""
from __future__ import annotations
import json,re
from collections import Counter,defaultdict
from kicad_source import sha,source_path


def plain(text):
    text=re.sub(r'\[([^\]]+)\]\([^)]*\)',r'\1',text)
    return ' '.join(text.replace('**','').replace('`','').replace('\\|','|').split())


def markdown_tables(path):
    """Read named Markdown columns; non-table prose and procurement columns stay out."""
    headers=None
    for line_number,line in enumerate(path.read_text().splitlines(),1):
        if not line.lstrip().startswith('|'):
            headers=None;continue
        cells=[c.strip() for c in re.split(r'(?<!\\)\|',line.strip().strip('|'))]
        if all(re.fullmatch(r':?-{3,}:?',c) for c in cells):continue
        if headers is None:
            headers=[plain(c) for c in cells];continue
        if len(cells)!=len(headers):continue
        yield {**dict(zip(headers,cells)),'_line':line_number}


def exact_token(text,token):
    return bool(token and re.search(r'(?<![A-Za-z0-9_.+/-])'+re.escape(token)+r'(?![A-Za-z0-9_.+/-])',text))


def apply_component_names(config, source, symbols, records, pcb_components):
    """Use exact contract/MPN evidence and propagate only across verified UUID joins."""
    for obj in [*symbols,*records,*pcb_components]:obj.update(displayName=None,displayNameSource=None)
    if not config:return None
    bom_path=config['bomSource'];bom_file=source_path(source,bom_path);bom_sha=sha(bom_file)
    rows=defaultdict(list)
    for row in markdown_tables(bom_file):
        if not all(k in row for k in ['ID','Description','Package']):continue
        identifier=plain(row['ID'])
        if re.fullmatch(r'[A-Z]+-\d+',identifier) and plain(row['Description']):rows[identifier].append(row)
    # A duplicated ID, even if the labels happen to agree, has no unique provenance.
    bom={key:values[0] for key,values in rows.items() if len(values)==1}
    contracts=defaultdict(list);source_hashes={bom_path:bom_sha}
    for path in config.get('contracts',[]):
        file=source_path(source,path);source_hashes[path]=sha(file)
        data=json.loads(file.read_text())
        for row in data.get('components',[]):
            if row.get('ref'):
                contracts[row['ref']].append({**row,'_sourcePath':path,'_sha256':source_hashes[path]})
    amendments=defaultdict(list)
    amendment_path=config.get('amendmentsSource')
    if amendment_path:
        file=source_path(source,amendment_path);source_hashes[amendment_path]=sha(file)
        for row in markdown_tables(file):
            identifier=plain(row.get('Planning ID',''))
            if not re.fullmatch(r'[A-Z]+-\d+',identifier):continue
            # Explicit lists only. Ranges and mixed-ID rows do not identify one role.
            refs=plain(row.get('Current reference','')).split(',')
            if not refs or any(not re.fullmatch(r'[A-Z]+\d+',ref.strip()) for ref in refs):continue
            for ref in refs:amendments[ref.strip()].append({**row,'bom_id':identifier})
    mpn_refs=defaultdict(set)
    for obj in [*symbols,*records]:
        part=obj.get('properties',{}).get('MPN') or obj.get('bom',{}).get('partNumber')
        if part:mpn_refs[part].add(obj['reference'])
    symbol_counts=Counter(s['reference'] for s in symbols)

    def bom_result(identifier,part,method,via=None):
        row=bom.get(identifier)
        if not row:return None
        return {'displayName':plain(row['Description']),'displayNameSource':{
            'kind':method,'sourcePath':bom_path,'sha256':bom_sha,'tableRowId':identifier,'line':row['_line'],
            'matchedField':'MPN','matchedValue':part,**({'association':via} if via else {})}}

    def resolve(symbol):
        ref=symbol['reference'];part=symbol.get('properties',{}).get('MPN','')
        if symbol.get('identityStatus')!='verified' or symbol_counts[ref]!=1:return None
        entries=contracts.get(ref,[])
        direct=[e for e in entries if e.get('bom_id')]
        if direct:
            if len(direct)!=1:return None
            entry=direct[0];expected=entry.get('mpn') or entry.get('exact_mpn')
            if not part or part!=expected:return None
            return bom_result(entry['bom_id'],part,'bom-contract',{
                'sourcePath':entry['_sourcePath'],'sha256':entry['_sha256'],'reference':ref,'bomId':entry['bom_id'],'mpn':expected})
        for row in amendments.get(ref,[]):
            matching=[e for e in entries if (e.get('mpn') or e.get('exact_mpn'))==part and part]
            if len(matching)==1 and len(amendments[ref])==1 and exact_token(plain(row.get('Decision','')),part):
                return bom_result(row['bom_id'],part,'bom-current-amendment',{
                    'sourcePath':amendment_path,'sha256':source_hashes[amendment_path],'line':row['_line'],'reference':ref,
                    'contractSourcePath':matching[0]['_sourcePath'],'contractSha256':matching[0]['_sha256'],'mpn':part})
        if config.get('allowUniqueMpn') and part and len(mpn_refs[part])==1:
            candidates=[key for key,row in bom.items() if exact_token(plain(row['Package']),part)]
            if len(candidates)==1:return bom_result(candidates[0],part,'bom-unique-current-mpn')
        # Only neutral, explicitly supported standard passive symbols. The name is
        # read from the native library cache, not generated from a reference prefix.
        if symbol.get('libId') in {'Device:R','Device:C','Device:L'} and symbol.get('libraryDescription'):
            path=symbol['sourcePath']
            return {'displayName':symbol['libraryDescription'],'displayNameSource':{
                'kind':'native-generic-library','sourcePath':path,'sha256':sha(source_path(source,path)),
                'libraryId':symbol['libId'],'matchedField':'lib_id','matchedValue':symbol['libId']}}
        return None

    for symbol in symbols:
        result=resolve(symbol)
        if result:symbol.update(result)
    by_path={s['schematicPath']:s for s in symbols if s.get('schematicPath')}
    raw_by_uuid={c['uuid']:c for c in pcb_components}
    for record in records:
        symbol=by_path.get(record.get('schematicPath'))
        if record.get('identityStatus')!='verified' or not symbol:continue
        # A stale PCB part cannot inherit the role of a different schematic MPN.
        if record.get('bom',{}).get('partNumber','')!=symbol.get('properties',{}).get('MPN',''):
            symbol.update(displayName=None,displayNameSource=None)
        fields={key:symbol.get(key) for key in ['displayName','displayNameSource']}
        record.update(fields);raw_by_uuid[record['uuid']].update(fields)
    return {'sources':source_hashes,'namedSymbols':sum(bool(s['displayName']) for s in symbols),
        'namedComponents':sum(bool(c['displayName']) for c in records),
        'unnamedReferences':[c['reference'] for c in records if not c['displayName']]}
