#!/usr/bin/env python3
"""Independently compare exported KiCad netlists with reviewed physical-pin contracts.
Reads only exported .net files. Never reads or writes native CAD source.
"""
import argparse,json,pathlib,re,hashlib,sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
def sexp(text):
 tokens=re.findall(r'\(|\)|"(?:\\.|[^"\\])*"|[^\s()]+',text);stack=[];root=None
 for t in tokens:
  if t=='(':
   a=[]
   if stack:stack[-1].append(a)
   stack.append(a)
  elif t==')':
   a=stack.pop()
   if not stack:root=a
  else:stack[-1].append(json.loads(t) if t.startswith('"') else t)
 if stack:raise ValueError('unbalanced exported netlist')
 return root
def children(a,k):return [x for x in a[1:] if isinstance(x,list) and x and x[0]==k]
def val(a,k):
 q=children(a,k);return q[0][1] if q and len(q[0])>1 else None
def expected(block):
 path=ROOT/'docs/design'/f'{block}_contract.json';d=json.loads(path.read_text());comps=d['components']+d.get('two_terminal_support',[]);ep={}
 for c in comps:
  pins=c['pins']
  if isinstance(pins,list):
   numbered={}
   for pin in pins:
    number=str(pin['number'])
    if number in numbered:raise ValueError('duplicate contract physical pin '+c['ref']+'.'+number)
    numbered[number]=pin['net']
   pins=numbered
  for p,n in pins.items():
   key=(c['ref'],str(p))
   if key in ep:raise ValueError('duplicate expected endpoint '+str(key))
   ep[key]=n
 return ep,hashlib.sha256(path.read_bytes()).hexdigest()
def check(path,blocks):
 tree=sexp(path.read_text()); nets=children(tree,'nets')[0];comps=children(tree,'components')[0];actual={};groups={};types={}
 for net in children(nets,'net'):
  name=val(net,'name');nodes=children(net,'node'); groups[name]=[(val(n,'ref'),val(n,'pin')) for n in nodes]
  for n in nodes:
   key=(val(n,'ref'),val(n,'pin'))
   if key in actual:raise ValueError('endpoint in multiple nets: '+str(key))
   actual[key]=name;types[key]=val(n,'pintype')
 exp={};hashes={}
 for b in blocks:
  e,h=expected(b);overlap=set(e)&set(exp)
  if overlap:raise ValueError('cross-contract duplicate endpoints '+str(overlap))
  exp.update(e);hashes[b]=h
 issues=[];nc=0
 for key,want in exp.items():
  got=actual.get(key)
  if got is None:issues.append({'endpoint':list(key),'expected':want,'error':'endpoint missing from export'});continue
  if want is None:
   nc+=1
   if len(groups[got])!=1 or 'no_connect' not in (types[key] or ''):issues.append({'endpoint':list(key),'expected':'intentional NC','actual_net':got,'members':groups[got],'pin_type':types[key]})
  elif got.split('/')[-1]!=want:issues.append({'endpoint':list(key),'expected':want,'actual_net':got})
 # One logical contract net must be one actual KiCad net, not disconnected
 # sheet-local labels that merely share their basename.
 named_groups={}
 for key,want in exp.items():
  if want is not None and key in actual:named_groups.setdefault(want,set()).add(actual[key])
 for want,names in sorted(named_groups.items()):
  if len(names)>1:issues.append({'expected_net':want,'error':'logical net split across actual nets','actual_nets':sorted(names)})
 refs={x[0] for x in exp}
 for key in actual:
  if key[0] in refs and key not in exp:issues.append({'endpoint':list(key),'error':'exported pin absent from contract','actual_net':actual[key]})
 present={val(c,'ref') for c in children(comps,'comp')};missing=sorted(refs-present)
 if set(blocks)=={'power','mcu','display','peripherals'}:
  for ref in sorted(present-refs):
   if not ref.startswith('#'):issues.append({'reference':ref,'error':'exported component absent from all reviewed contracts'})
 result={'netlist':str(path),'netlist_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'contract_sha256':hashes,'expected_components':len(refs),'expected_endpoints':len(exp),'intentional_nc_endpoints':nc,'observed_endpoints_for_expected_components':sum(k[0] in refs for k in actual),'missing_components':missing,'issues':issues,'status':'PASS' if not issues and not missing else 'FAIL'}
 return result
if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('netlist',type=pathlib.Path);ap.add_argument('--blocks',nargs='+',default=['power','mcu','display','peripherals']);ap.add_argument('--output',type=pathlib.Path);a=ap.parse_args();r=check(a.netlist,a.blocks)
 if a.output:a.output.write_text(json.dumps(r,indent=2)+'\n')
 print(json.dumps(r,indent=2));sys.exit(0 if r['status']=='PASS' else 1)
