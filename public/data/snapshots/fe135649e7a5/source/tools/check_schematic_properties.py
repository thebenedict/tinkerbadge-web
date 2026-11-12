#!/usr/bin/env python3
"""Check specified values, MPNs, footprints and DNP metadata in exported netlists.
Not a substitute for physical footprint acceptance or prototype qualification.
"""
import argparse,json,hashlib,pathlib,sys,re,math
from check_schematic_contracts import sexp,children,val
ROOT=pathlib.Path(__file__).resolve().parents[1]
def nominal(value):
 first=value.strip().split()[0]
 m=re.fullmatch(r'([0-9]+(?:\.[0-9]+)?)([pnumkKMGTµ]?)(?:F|H|R|Ω)?',first)
 if not m:return first
 scale={'p':1e-12,'n':1e-9,'u':1e-6,'µ':1e-6,'m':1e-3,'':1,'k':1e3,'K':1e3,'M':1e6,'G':1e9,'T':1e12}
 return float(m.group(1))*scale[m.group(2)]
def check(path,blocks=("power","mcu","display","peripherals")):
 tree=sexp(path.read_text());actual={val(c,'ref'):c for c in children(children(tree,'components')[0],'comp')};issues=[];count={};unset=[]
 def compare(ref,field,expected,got):
  count[field]=count.get(field,0)+1
  if expected!=got:issues.append({'reference':ref,'field':field,'expected':expected,'actual':got})
 for block in blocks:
  d=json.loads((ROOT/'docs/design'/f'{block}_contract.json').read_text())
  for c in d['components']+d.get('two_terminal_support',[]):
   ref=c['ref'];a=actual.get(ref)
   if a is None:issues.append({'reference':ref,'error':'missing component'});continue
   props={val(x,'name'):val(x,'value') for x in children(a,'property')}
   mpn=c.get('mpn') or c.get('exact_mpn')
   if mpn:compare(ref,'MPN',mpn,props.get('MPN'))
   if c.get('value') and (ref.startswith(('R','C','L')) or block=='mcu'):
    if block in ('display','peripherals'):
     compare(ref,'NominalValue',nominal(c['value']),nominal(val(a,'value')))
     compare(ref,'Rating',c.get('rating') if block=='display' else c['value'],props.get('Rating'))
     # A visible voltage label must also agree with the reviewed rating.
     want=re.search(r'([0-9]+(?:\.[0-9]+)?)\s*V',c.get('rating',c['value']))
     shown=re.search(r'([0-9]+(?:\.[0-9]+)?)\s*V',val(a,'value'))
     if want and shown:compare(ref,'VisibleVoltageRating',float(want.group(1)),float(shown.group(1)))
    else:compare(ref,'Value',c['value'],val(a,'value'))
   if c.get('lib_id'):
    lib=children(a,'libsource')[0];compare(ref,'lib_id',c['lib_id'],val(lib,'lib')+':'+val(lib,'part'))
   if 'footprint' in c:compare(ref,'Footprint',c['footprint'] or '',val(a,'footprint') or '')
   if not val(a,'footprint'):unset.append(ref)
   if c.get('population','').lower()=='dnp' or c.get('fitted') is False:
    compare(ref,'Populate','DNP',(props.get('Populate') or props.get('Population') or '').upper())
 return {'netlist_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'checks_by_field':count,'unassigned_footprints':unset,'issues':issues,'status':'PASS' if not issues else 'FAIL','scope':'Only explicitly specified property comparisons. Unassigned footprints and generic passive MPNs remain release gates.'}
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('netlist',type=pathlib.Path);p.add_argument('--output',type=pathlib.Path);a=p.parse_args();r=check(a.netlist)
 if a.output:a.output.write_text(json.dumps(r,indent=2)+'\n')
 print(json.dumps(r,indent=2));sys.exit(0 if r['status']=='PASS' else 1)
