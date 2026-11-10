import json,pathlib,sys,tempfile,unittest
ROOT=pathlib.Path(__file__).parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from component_names import apply_component_names

class ComponentNamingTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=pathlib.Path(self.temp.name)
        self.cfg={'bomSource':'bom.md','contracts':['contract.json'],'amendmentsSource':'current.md','allowUniqueMpn':True}
        self.write('bom.md','| ID | Description | Package |\n|---|---|---|\n| IR-01 | Infrared driver | **SHARED** |\n| SEN-01 | Motion sensor | **SENSOR** |\n')
        self.write('current.md','');self.contract([]);self.write('main.kicad_sch','Native schematic fixture')
    def tearDown(self):self.temp.cleanup()
    def write(self,path,text):(self.root/path).write_text(text)
    def contract(self,rows):self.write('contract.json',json.dumps({'components':rows}))
    def symbol(self,ref,mpn,**extra):return {'reference':ref,'properties':{'MPN':mpn},'schematicPath':'/root/'+ref,'identityStatus':'verified','sourcePath':'main.kicad_sch',**extra}
    def run_names(self,symbols,records=None,raw=None):
        records=records if records is not None else [];raw=raw if raw is not None else []
        return apply_component_names(self.cfg,self.root,symbols,records,raw)
    def test_shared_mpn_does_not_spread_a_contract_role(self):
        self.contract([{'ref':'Q1','mpn':'SHARED','bom_id':'IR-01'},{'ref':'Q2','mpn':'SHARED'}])
        a,b=self.symbol('Q1','SHARED'),self.symbol('Q2','SHARED');self.run_names([a,b])
        self.assertEqual(a['displayName'],'Infrared driver');self.assertIsNone(b['displayName'])
    def test_unique_exact_mpn_and_contract_provenance(self):
        s=self.symbol('U1','SENSOR');self.run_names([s]);self.assertEqual(s['displayName'],'Motion sensor')
        self.assertEqual(s['displayNameSource']['kind'],'bom-unique-current-mpn')
        self.contract([{'ref':'U1','exact_mpn':'SENSOR','bom_id':'SEN-01'}]);self.run_names([s])
        self.assertEqual(s['displayNameSource']['association']['reference'],'U1')
        s['properties']['MPN']='SENSOR-OTHER';self.run_names([s]);self.assertIsNone(s['displayName'])
    def test_procurement_tables_and_mpn_substrings_do_not_name_parts(self):
        self.write('bom.md',(self.root/'bom.md').read_text()+'\n| ID | MPN | Stock |\n|---|---|---|\n| SEN-01 | SENSOR | Incorrect label |\n')
        a,b=self.symbol('U1','SENSOR'),self.symbol('U2','SENS');self.run_names([a,b])
        self.assertEqual(a['displayName'],'Motion sensor');self.assertIsNone(b['displayName'])
    def test_ambiguous_ids_and_conflicting_contracts_fail_closed(self):
        self.contract([{'ref':'U1','mpn':'SENSOR','bom_id':'SEN-01'},{'ref':'U1','mpn':'SENSOR','bom_id':'IR-01'}])
        s=self.symbol('U1','SENSOR');self.run_names([s]);self.assertIsNone(s['displayName'])
        self.contract([{'ref':'U1','mpn':'SENSOR','bom_id':'SEN-01'}]);self.write('bom.md',(self.root/'bom.md').read_text()+'| SEN-01 | Another role | SENSOR |\n')
        self.run_names([s]);self.assertIsNone(s['displayName'])
    def test_current_amendment_requires_exact_ref_mpn_and_single_planning_id(self):
        self.write('current.md','| Planning ID | Current reference | Decision |\n|---|---|---|\n| IR-01 | Q1, Q2 | SHARED parts now perform this role. |\n')
        self.contract([{'ref':'Q1','mpn':'SHARED'},{'ref':'Q2','mpn':'SHARED'}]);a,b=self.symbol('Q1','SHARED'),self.symbol('Q2','SHARED');self.run_names([a,b])
        self.assertEqual(a['displayNameSource']['kind'],'bom-current-amendment');self.assertEqual(b['displayName'],'Infrared driver')
        self.write('current.md',(self.root/'current.md').read_text().replace('IR-01 |','IR-01 / SEN-01 |'))
        self.run_names([a,b]);self.assertIsNone(a['displayName']);self.assertIsNone(b['displayName'])
    def test_newly_documented_parts_resolve_without_a_viewer_name_catalog(self):
        self.cfg['allowUniqueMpn']=False
        self.contract([{'ref':'U107','mpn':'TMUX1511PWR'},
            {'ref':'U301','exact_mpn':'SN74LVC541APWR','bom_id':'DISP-06'},
            {'ref':'U506','mpn':'TCA9534PWR','bom_id':'EXP-06'}])
        self.write('current.md','| Planning ID | Current reference | Decision |\n|---|---|---|\n| PWR-16 | U107 | Added TMUX1511PWR for the reviewed function. |\n')
        parts=[('U107','TMUX1511PWR','PWR-16'),('U301','SN74LVC541APWR','DISP-06'),('U506','TCA9534PWR','EXP-06')]
        symbols=[self.symbol(ref,mpn) for ref,mpn,_ in parts]
        self.run_names(symbols);self.assertEqual([s['displayName'] for s in symbols],[None]*3)
        # The source table supplies the actual labels. They are not embedded in
        # the implementation, and current contract associations are still required.
        self.write('bom.md','| ID | Description | Package |\n|---|---|---|\n'+''.join(f'| {identifier} | Reviewed role {i} | {mpn} |\n' for i,(_,mpn,identifier) in enumerate(parts)))
        self.run_names(symbols)
        for i,(symbol,(_,mpn,identifier)) in enumerate(zip(symbols,parts)):
            self.assertEqual(symbol['displayName'],f'Reviewed role {i}')
            self.assertEqual(symbol['displayNameSource']['tableRowId'],identifier)
            self.assertEqual(symbol['displayNameSource']['matchedValue'],mpn)
        self.assertEqual(symbols[0]['displayNameSource']['kind'],'bom-current-amendment')
        self.assertEqual([s['displayNameSource']['kind'] for s in symbols[1:]],['bom-contract']*2)
    def test_generic_descriptions_require_exact_safe_native_library_id(self):
        a=self.symbol('R1','',libId='Device:R',libraryDescription='Resistor')
        b=self.symbol('D1','TVS',libId='Device:D_Zener',libraryDescription='Zener diode')
        c=self.symbol('R2','',libId='Custom:R',libraryDescription='Custom label')
        self.run_names([a,b,c]);self.assertEqual(a['displayName'],'Resistor');self.assertIsNone(b['displayName']);self.assertIsNone(c['displayName'])
    def test_verified_uuid_join_propagates_and_mpn_conflict_clears_all_views(self):
        s=self.symbol('U1','SENSOR');r={'reference':'U1','uuid':'native','identityStatus':'verified','schematicPath':s['schematicPath'],'bom':{'partNumber':'SENSOR'}};raw={'uuid':'native'}
        self.run_names([s],[r],[raw])
        self.assertEqual([o['displayName'] for o in [s,r,raw]],['Motion sensor']*3)
        self.assertEqual(s['displayNameSource'],r['displayNameSource']);self.assertEqual(s['displayNameSource'],raw['displayNameSource'])
        r['bom']['partNumber']='OTHER';self.run_names([s],[r],[raw]);self.assertEqual([o['displayName'] for o in [s,r,raw]],[None]*3)
    def test_unverified_or_duplicate_native_references_are_not_named(self):
        a=self.symbol('U1','SENSOR',identityStatus='unverified');self.run_names([a]);self.assertIsNone(a['displayName'])
        a,b=self.symbol('U1','SENSOR'),self.symbol('U1','SENSOR');self.run_names([a,b]);self.assertIsNone(a['displayName']);self.assertIsNone(b['displayName'])

if __name__=='__main__':unittest.main()
