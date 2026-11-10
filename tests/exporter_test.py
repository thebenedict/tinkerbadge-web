import argparse, copy, importlib.util, json, pathlib, subprocess, tempfile, unittest
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('exporter',pathlib.Path(__file__).parents[1]/'scripts/export_assets.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
from kicad_source import ModelResolver, collect_inputs, outline_bounds, validate_config, verify_inputs

class NativeMetadataTests(unittest.TestCase):
    def fixture(self):
        properties={'MPN':'PART','JLCPCB Part #':'C123','Datasheet':'https://example.org/ds'}
        footprint={'uuid':'c6d25470-c7e0-4540-a4e1-14842ec56a73','reference':'C1','schematicPath':'/sheet/symbol','value':'10n','footprint':'Local:cap','properties':properties,'excludeFromBom':False,'dnp':False,'layer':'F.Cu','x':1,'y':2,'rotation':0,'nets':['GND'],'models':['cap.step'],'modelSources':[{'path':'cap.step','resolved':True,'hidden':False,'nativeGlbSupported':True}]}
        symbol={'uuid':'symbol','reference':'C1','schematicPath':'/sheet/symbol','schematicSheetId':'/sheet','value':'10n','properties':{**properties,'Footprint':'Local:cap'},'inBom':True,'onBoard':True,'dnp':False}
        return {'components':[footprint]},[symbol]
    def test_native_bom_uuid_and_sheet_identity(self):
        board,symbols=self.fixture();record=module.component_records('B',board,symbols)[0]
        self.assertEqual(record['id'],'B:'+board['components'][0]['uuid']);self.assertEqual(record['bom']['supplierPartNumber'],'C123');self.assertEqual(record['bom']['quantity'],1)
        self.assertEqual(record['schematicSheetId'],'/sheet');self.assertEqual(record['identityStatus'],'verified')
        self.assertFalse(record['hasModel']);self.assertTrue(record['modelExpected'])
    def test_draft_property_differences_are_reported_without_erasing_pcb_data(self):
        board,symbols=self.fixture();symbols[0]['properties']['MPN']=''
        record=module.component_records('B',board,symbols)[0]
        self.assertEqual(record['bom']['partNumber'],'PART');self.assertEqual(record['bom']['source'],'pcb')
        self.assertEqual(record['sourceDifferences'],[{'field':'MPN','pcb':'PART','schematic':''}])
    def test_incomplete_population_is_explicit(self):
        board,symbols=self.fixture();board['components']=[]
        records=module.component_records('B',board,symbols)
        self.assertEqual(records,[])
        self.assertEqual(module.population_info(symbols,records),{'symbols':1,'onBoard':1,'placed':0,'unplacedReferences':['C1'],'pcbOnlyReferences':[]})
    def test_reference_conflict_never_links_to_guessed_symbol(self):
        board,symbols=self.fixture();symbols[0]['reference']='C2'
        record=module.component_records('B',board,symbols)[0]
        self.assertEqual(record['identityStatus'],'conflict');self.assertIsNone(record['schematicSheetId']);self.assertIsNone(record['symbolUuid'])
    def test_unjoined_board_item_uses_only_pcb_uuid(self):
        board,symbols=self.fixture();symbols[0]['schematicPath']='/somewhere/else'
        record=module.component_records('B',board,symbols)[0]
        self.assertEqual(record['identityStatus'],'pcb-only');self.assertIsNone(record['schematicPath'])
    def test_native_root_relative_paths_have_exact_verified_mapping(self):
        board,symbols=self.fixture();symbols[0].update(schematicRootUuid='root',schematicPath='/root/sheet/symbol')
        record=module.component_records('badge',board,symbols)[0]
        self.assertEqual(record['identityStatus'],'verified');self.assertEqual(record['schematicPath'],'/root/sheet/symbol');self.assertEqual(record['pcbSchematicPath'],'/sheet/symbol')
        symbols[0]['schematicRootUuid']='wrong-root'
        self.assertEqual(module.component_records('badge',board,symbols)[0]['identityStatus'],'pcb-only')
    def test_duplicate_uuid_and_ambiguous_schematic_paths_fail(self):
        board,symbols=self.fixture();board['components'].append(copy.deepcopy(board['components'][0]))
        with self.assertRaisesRegex(RuntimeError,'Duplicate footprint'):module.component_records('B',board,symbols)
        board,symbols=self.fixture();symbols.append(copy.deepcopy(symbols[0]))
        with self.assertRaisesRegex(RuntimeError,'Duplicate schematic'):module.component_records('B',board,symbols)
    def test_quantity_counts_populated_pcb_parts(self):
        board,symbols=self.fixture();second=copy.deepcopy(board['components'][0]);second.update(uuid='cf6eef41-bcb3-4022-8038-a42d4fab117e',reference='C2',dnp=True)
        board['components'].append(second)
        self.assertEqual([c['bom']['quantity'] for c in module.component_records('B',board,symbols)],[1,1])

class HierarchyTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=pathlib.Path(self.temp.name)
    def tearDown(self): self.temp.cleanup()
    def write(self,path,text):
        p=self.root/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text);return p
    def fixture(self):
        root=self.write('main.kicad_sch','''(kicad_sch (uuid "root") (sheet_instances (path "/" (page "1")))
          (sheet (uuid "left") (property "Sheetname" "Left") (property "Sheetfile" "sub/channel.kicad_sch")
           (instances (project "real-project" (path "/root" (page "2")))))
          (sheet (uuid "right") (property "Sheetname" "Right") (property "Sheetfile" "sub/channel.kicad_sch")
           (instances (project "real-project" (path "/root" (page "3"))))))''')
        self.write('sub/channel.kicad_sch','''(kicad_sch (uuid "file-id")
          (symbol (uuid "symbol-id") (at 12 34) (property "Reference" "STALE") (property "Value" "10k")
           (property "Footprint" "Resistor:R") (in_bom yes) (on_board yes)
           (instances
             (project "unrelated" (path "/root/left" (reference "WRONG") (unit 1)))
             (project "real-project" (path "/root/left" (reference "R1") (unit 1))
                                      (path "/root/right" (reference "R2") (unit 1))))))''')
        return root
    def test_reused_sheet_matches_project_instance_and_reference(self):
        result=module.schematic_hierarchy(self.fixture(),self.root,'real-project')
        self.assertEqual([s['id'] for s in result['sheets']],['/root','/root/left','/root/right'])
        self.assertEqual([s['page'] for s in result['sheets']],['1','2','3'])
        self.assertEqual([s['reference'] for s in result['symbols']],['R1','R2'])
        self.assertEqual([s['schematicPath'] for s in result['symbols']],['/root/left/symbol-id','/root/right/symbol-id'])
        self.assertEqual([s['schematicSheetId'] for s in result['symbols']],['/root/left','/root/right'])
        self.assertEqual(result['sheets'][1]['sourcePath'],'sub/channel.kicad_sch')
        self.assertEqual(result['sheets'][1]['symbols'][0]['x'],12)
    def test_nested_instance_paths_and_pages(self):
        root=self.fixture();p=self.root/'sub/channel.kicad_sch';text=p.read_text()
        p.write_text(text[:-1]+''' (sheet (uuid "nested") (property "Sheetname" "Detail") (property "Sheetfile" "detail.kicad_sch")
          (instances (project "real-project" (path "/root/left" (page "4")) (path "/root/right" (page "5"))))))''')
        self.write('sub/detail.kicad_sch','(kicad_sch (uuid "detail-file"))')
        result=module.schematic_hierarchy(root,self.root,'real-project')
        self.assertEqual([s['id'] for s in result['sheets']],['/root','/root/left','/root/left/nested','/root/right','/root/right/nested'])
    def test_unknown_project_is_not_guessed(self):
        with self.assertRaisesRegex(RuntimeError,'no matching'):module.schematic_hierarchy(self.fixture(),self.root,'wrong-project')
    def test_missing_symbol_instance_does_not_invent_join_path(self):
        root=self.fixture();p=self.root/'sub/channel.kicad_sch';p.write_text(p.read_text().replace('(reference "R2")','(reference "R2")').replace('"/root/right"','"/other/right"'))
        result=module.schematic_hierarchy(root,self.root,'real-project');symbol=result['sheets'][2]['symbols'][0]
        self.assertEqual(symbol['reference'],'STALE');self.assertIsNone(symbol['schematicPath']);self.assertEqual(symbol['identityStatus'],'unverified')
    def test_ambiguous_symbol_instance_fails(self):
        root=self.fixture();p=self.root/'sub/channel.kicad_sch';p.write_text(p.read_text().replace('(path "/root/right" (reference "R2") (unit 1))','(path "/root/left" (reference "R2") (unit 1))'))
        with self.assertRaisesRegex(RuntimeError,'Ambiguous'):module.schematic_hierarchy(root,self.root,'real-project')
    def test_sheet_escape_and_cycle_are_rejected(self):
        root=self.fixture();root.write_text(root.read_text().replace('sub/channel.kicad_sch','../outside.kicad_sch'))
        with self.assertRaisesRegex(RuntimeError,'escapes'):module.schematic_hierarchy(root,self.root,'real-project')
        root=self.fixture();p=self.root/'sub/channel.kicad_sch';p.write_text(p.read_text()[:-1]+'''(sheet (uuid "loop") (property "Sheetname" "Loop") (property "Sheetfile" "../main.kicad_sch") (instances (project "real-project" (path "/root/left" (page "9"))))))''')
        with self.assertRaisesRegex(RuntimeError,'Cyclic'):module.schematic_hierarchy(root,self.root,'real-project')

class SourceSnapshotTests(HierarchyTests):
    def config(self):
        return {'schemaVersion':2,'project':{'name':'Example'},'defaultVariant':'main','variants':[{'id':'main','instanceProject':'real-project','files':{'schematic':'main.kicad_sch'}}]}
    def test_allowlist_contains_hierarchy_local_libraries_models_only(self):
        self.fixture();self.write('sym-lib-table','(sym_lib_table (lib (name "Local") (uri "${KIPRJMOD}/custom.kicad_sym")))')
        self.write('custom.kicad_sym','(kicad_symbol_lib)')
        self.write('fp-lib-table','(fp_lib_table (lib (name "Local") (uri "${KIPRJMOD}/Local.pretty")))')
        self.write('Local.pretty/R.kicad_mod','(footprint "R" (model "${KIPRJMOD}/models/R.wrl"))')
        self.write('models/R.wrl','#VRML V2.0 utf8');self.write('models/R.step','STEP')
        self.write('models/secret.txt','not included');self.write('secret.env','SECRET');self.write('.build/result.json','not included')
        inputs=collect_inputs(self.root,self.config(),ModelResolver(self.root,[]))
        self.assertEqual(set(inputs['files']),{'main.kicad_sch','sub/channel.kicad_sch','sym-lib-table','fp-lib-table','custom.kicad_sym','Local.pretty/R.kicad_mod','models/R.wrl','models/R.step'})
        hashes={r:module.sha(p) for r,p in inputs['files'].items()};verify_inputs(inputs,hashes,{})
        (self.root/'models/R.step').write_text('CHANGED')
        with self.assertRaisesRegex(RuntimeError,'Source changed'):verify_inputs(inputs,hashes,{})
    def test_explicit_license_files_and_text_directory_are_preserved(self):
        self.fixture();cfg=self.config();cfg['snapshot']={'files':['LICENSE'],'documents':['LICENSE.md'],'directories':['LICENSES']}
        files={'LICENSE':'Project license map','LICENSE.md':'Scope','LICENSES/Apache-2.0.txt':'Full license text','LICENSES/README.md':'Provenance','LICENSES/NOTICE':'Attribution'}
        for path,content in files.items():self.write(path,content)
        for path in ['LICENSES/run.py','LICENSES/vendor.pdf','LICENSES/.hidden.txt']:self.write(path,'Excluded')
        inputs=collect_inputs(self.root,cfg,ModelResolver(self.root,[]))
        for path,content in files.items():self.assertEqual(inputs['files'][path].read_text(),content)
        self.assertFalse(any(path in inputs['files'] for path in ['LICENSES/run.py','LICENSES/vendor.pdf','LICENSES/.hidden.txt']))

    def test_installed_models_are_hashed_and_snapshotted(self):
        self.fixture();self.write('fp-lib-table','(fp_lib_table (lib (name "Local") (uri "${KIPRJMOD}/Local.pretty")))')
        self.write('Local.pretty/R.kicad_mod','(footprint "R" (model "${KICAD10_3DMODEL_DIR}/R.step"))')
        with tempfile.TemporaryDirectory() as models:
            (pathlib.Path(models)/'R.step').write_text('NATIVE STEP')
            inputs=collect_inputs(self.root,self.config(),ModelResolver(self.root,[models]))
            self.assertEqual(len(inputs['external']),1)
            name=next(iter(inputs['external']));self.assertTrue(name.startswith('_dependencies/models/'));self.assertTrue(name.endswith('-R.step'))
    def test_unapproved_external_and_unknown_variables_never_resolve(self):
        resolver=ModelResolver(self.root,[])
        self.assertIsNone(resolver.resolve('/etc/passwd',self.root));self.assertIsNone(resolver.resolve('${SECRET}/part.step',self.root))
    def test_explicit_file_escape_rejected(self):
        self.fixture();cfg=self.config();cfg['snapshot']={'files':['../outside.json']}
        with self.assertRaisesRegex(RuntimeError,'escapes'):collect_inputs(self.root,cfg,ModelResolver(self.root,[]))
    def test_config_requires_explicit_safe_variants(self):
        cfg=self.config();validate_config(cfg)
        cfg['variants'][0]['id']='../escape'
        with self.assertRaisesRegex(RuntimeError,'safe'):validate_config(cfg)

class BoardGeometryTests(unittest.TestCase):
    def test_power_and_mixed_copper_are_discovered_in_stack_order(self):
        with tempfile.TemporaryDirectory() as directory:
            p=pathlib.Path(directory)/'board.kicad_pcb';p.write_text('''(kicad_pcb (general (thickness 1.6))
              (layers (0 "F.Cu" signal) (2 "B.Cu" signal) (4 "In1.Cu" power) (6 "In2.Cu" mixed) (25 "Edge.Cuts" user))
              (gr_rect (start 10 20) (end 50 70) (layer "Edge.Cuts")))''')
            board=module.board_info(p)
            self.assertEqual(board['copperLayers'],['F.Cu','In1.Cu','In2.Cu','B.Cu']);self.assertEqual(board['outlineBounds'],[10,20,40,50]);self.assertEqual(board['components'],[])
    def test_resolved_vrml_is_not_assumed_missing_before_native_export(self):
        with tempfile.TemporaryDirectory() as d:
            root=pathlib.Path(d);(root/'model.wrl').write_text('#VRML V2.0 utf8')
            pcb=root/'board.kicad_pcb';pcb.write_text('(kicad_pcb (footprint "review" (uuid "c6d25470-c7e0-4540-a4e1-14842ec56a73") (property "Reference" "R1") (model "${KIPRJMOD}/model.wrl")))')
            info=module.board_info(pcb);self.assertEqual(info['missingModels'],[])
            source=info['components'][0]['modelSources'][0];self.assertTrue(source['resolved']);self.assertEqual(source['format'],'wrl');self.assertNotIn('nativeGlbSupported',source)
            record=module.component_records('test',info,[])[0];self.assertTrue(record['modelExpected']);self.assertFalse(record['hasModel'])
    def test_circle_bounds_include_radius(self):
        self.assertEqual(outline_bounds(module.sexpr('(kicad_pcb (gr_circle (center 10 20) (end 13 24) (layer "Edge.Cuts")))')),[5,15,10,10])
    def test_arc_bounds_include_cardinal_extrema(self):
        bounds=outline_bounds(module.sexpr('(kicad_pcb (gr_arc (start 0.8660254 0.5) (mid 0 1) (end -0.8660254 0.5) (layer "Edge.Cuts")))'))
        self.assertAlmostEqual(bounds[3],0.5,places=6)
    def test_outline_absent_is_available_as_explicit_state(self):
        self.assertIsNone(outline_bounds(module.sexpr('(kicad_pcb)')))

class SchematicSvgIdentityTests(unittest.TestCase):
    def fixture(self,root):
        sheets=[{'id':'/root','name':'Root','displayPath':'/','sourcePath':'main.kicad_sch','symbols':[]},
                {'id':'/root/child','name':'Processor','displayPath':'/Processor/','sourcePath':'child.kicad_sch','symbols':[{'reference':'U201','renderedReference':'U201'}]}]
        def svg(path,values):path.write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 297 210">'+''.join('<text>'+v+'</text>' for v in values)+'</svg>')
        svg(root/'arbitrary-1.svg',['Sheet: /','File: main.kicad_sch'])
        svg(root/'unrelated-name.svg',['Sheet: /Processor/','File: child.kicad_sch','U201'])
        return sheets,svg
    def test_full_export_matches_native_identity_not_filename_or_order(self):
        with tempfile.TemporaryDirectory() as d:
            root=pathlib.Path(d);sheets,_=self.fixture(root);matched=module.match_schematic_svgs(sheets,root)
            self.assertEqual(matched['/root/child']['path'].name,'unrelated-name.svg');self.assertEqual(matched['/root/child']['verification']['visibleReferenceCount'],1)
    def test_root_drawing_with_child_page_metadata_is_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            root=pathlib.Path(d);sheets,svg=self.fixture(root)
            svg(root/'unrelated-name.svg',['Sheet: /Processor/','File: child.kicad_sch','ROOT OVERVIEW'])
            with self.assertRaisesRegex(RuntimeError,'missing native visible references'):module.match_schematic_svgs(sheets,root)
    def test_duplicate_root_svg_cannot_impersonate_child(self):
        with tempfile.TemporaryDirectory() as d:
            root=pathlib.Path(d);sheets,_=self.fixture(root);(root/'unrelated-name.svg').write_bytes((root/'arbitrary-1.svg').read_bytes())
            with self.assertRaisesRegex(RuntimeError,'uniquely verify'):module.match_schematic_svgs(sheets,root)

class AccessorySourceTests(unittest.TestCase):
    def test_source_boxes_preserve_native_units_and_material(self):
        with tempfile.TemporaryDirectory() as d:
            path=pathlib.Path(d)/'panel.wrl';path.write_text('#VRML V2.0 utf8\nTransform { translation 0 0 1 children [ Shape { appearance Appearance { material Material { diffuseColor .1 .2 .3 transparency .25 } } geometry Box { size 10 20 3 } } ] }')
            envelope=module.vrml_box_envelope(path)
            self.assertEqual(envelope['boxesMm'][0],{'centerMm':[0,0,2.54],'sizeMm':[25.4,50.8,7.62],'color':[.1,.2,.3],'opacity':.75})
            self.assertEqual(envelope['sourceSha256'],module.sha(path))
    def test_unknown_vrml_geometry_is_not_approximated(self):
        with tempfile.TemporaryDirectory() as d:
            path=pathlib.Path(d)/'panel.wrl';path.write_text('#VRML V2.0 utf8\nShape { geometry Sphere { radius 5 } }')
            with self.assertRaisesRegex(RuntimeError,'Box-only'):module.vrml_box_envelope(path)
    def test_exact_cuboid_faces_are_accepted_without_approximating_other_meshes(self):
        from kicad_source import cuboid_from_faces
        points=[[-1,-2,-3],[1,-2,-3],[1,2,-3],[-1,2,-3],[-1,-2,3],[1,-2,3],[1,2,3],[-1,2,3]]
        indices=[0,3,2,1,-1,4,5,6,7,-1,0,1,5,4,-1,1,2,6,5,-1,2,3,7,6,-1,3,0,4,7,-1]
        self.assertEqual(cuboid_from_faces(points,indices),([0,0,0],[2,4,6]))
        broken=copy.deepcopy(points);broken[0][0]=-.9
        with self.assertRaisesRegex(RuntimeError,'exact axis-aligned'):cuboid_from_faces(broken,indices)
        with self.assertRaisesRegex(RuntimeError,'six closed'):cuboid_from_faces(points,indices[:-5])
        with self.assertRaisesRegex(RuntimeError,'winding'):cuboid_from_faces(points,[1,2,3,0,-1]+indices[5:])
    def test_poster_override_changes_only_requested_private_copy_attributes(self):
        with tempfile.TemporaryDirectory() as d:
            source=pathlib.Path(d)/'native.kicad_pcb';output=pathlib.Path(d)/'poster.kicad_pcb'
            text='(kicad_pcb (footprint "review" (property "Reference" "MECH_PANEL") (at 10 20) (attr board_only exclude_from_bom exclude_from_pos_files) (model "source.wrl")) (footprint "part" (property "Reference" "R1") (attr smd)))'
            source.write_text(text);adjusted=module.make_poster_input(source,output,['MECH_PANEL'])
            self.assertEqual(source.read_text(),text);self.assertEqual(adjusted,['MECH_PANEL'])
            self.assertEqual(output.read_text(),text.replace('(attr board_only exclude_from_bom exclude_from_pos_files)','(attr smd)'))
            with self.assertRaisesRegex(RuntimeError,'excluded board-only'):module.make_poster_input(source,output,['R1'])
    def test_accessory_requires_non_bom_board_only_native_footprint(self):
        board,_=NativeMetadataTests().fixture()
        with self.assertRaisesRegex(RuntimeError,'board-only'):module.separate_accessories('badge',board,[{'id':'panel','reference':'C1'}],pathlib.Path('.'))
        board['components'][0].update(excludeFromBom=True,boardOnly=True)
        reduced,accessories=module.separate_accessories('badge',board,[{'id':'panel','reference':'C1'}],pathlib.Path('.'))
        self.assertEqual(reduced['components'],[]);self.assertEqual(accessories[0]['id'],'badge:accessory:panel');self.assertEqual(accessories[0]['uuid'],board['components'][0]['uuid']);self.assertEqual(len(board['components']),1)

class ExportPipelineTests(unittest.TestCase):
    def fixture(self, root, kind):
        source=root/'hardware';source.mkdir();viewer=root/'viewer';viewer.mkdir();(viewer/'.work').mkdir()
        for relative in ['scripts/export_assets.py','scripts/kicad_source.py','scripts/component_names.py','scripts/optimize_glb.mjs','scripts/bind_components.mjs','src/component-index.js']:
            path=viewer/relative;path.parent.mkdir(parents=True,exist_ok=True);path.write_text('pipeline fixture')
        files={}
        if kind in ['schematic','combined']:
            (source/'main.kicad_sch').write_text('(kicad_sch (uuid "root") (sheet_instances (path "/" (page "1"))) (symbol (uuid "symbol") (at 10 20) (property "Reference" "R1") (property "Value" "10k") (instances (project "main" (path "/root" (reference "R1"))))))')
            files['schematic']='main.kicad_sch'
        if kind in ['board','combined']:
            (source/'main.kicad_pcb').write_text('(kicad_pcb (general (thickness 1.6)) (layers (0 "F.Cu" signal) (2 "B.Cu" signal) (4 "In1.Cu" power) (6 "In2.Cu" mixed)) (gr_rect (start 10 20) (end 50 70) (layer "Edge.Cuts")))')
            files['pcb']='main.kicad_pcb'
        cfg={'schemaVersion':2,'source':'unused','project':{'name':'Fixture','title':'Fixture viewer'},'defaultVariant':'main','variants':[{'id':'main','label':'Main','files':files}]}
        config=root/'config.json';config.write_text(json.dumps(cfg))
        args=argparse.Namespace(config=config,source=source,output=viewer/'public/data',kicad_cli='fake-kicad',skip_existing=False)
        return viewer,source,args
    def fake_run(self,command,**kwargs):
        output=pathlib.Path(command[command.index('--output')+1])
        if command[1:4]==['sch','export','svg']:
            (output/'arbitrary-native-name.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 297 210"><text>Sheet: /</text><text>File: main.kicad_sch</text><text>R1</text></svg>')
        elif command[1:4]==['sch','export','pdf']: output.write_bytes(b'%PDF-fixture')
        elif command[1:4]==['pcb','export','svg']: output.write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 297 210"/>')
        elif command[1:4]==['pcb','export','glb']: return subprocess.CompletedProcess(command,1,'','Fixture has no GLB')
        else: raise AssertionError(command)
        return subprocess.CompletedProcess(command,0,'','')
    def run_export(self,viewer,args,run=None):
        with patch.object(module,'ROOT',viewer),patch.object(module.subprocess,'check_output',return_value='10.0.8\n'),patch.object(module.subprocess,'run',side_effect=run or self.fake_run):
            return module.export(args)
    def test_schematic_only_pipeline_and_content_addressed_snapshot(self):
        with tempfile.TemporaryDirectory() as d:
            viewer,source,args=self.fixture(pathlib.Path(d),'schematic');manifest=self.run_export(viewer,args)
            variant=manifest['variants'][0]
            self.assertIsNone(variant['pcb']);self.assertIsNone(variant['model']);self.assertIsNone(manifest['readme'])
            self.assertEqual(variant['schematic']['sheets'][0]['id'],'/root')
            self.assertEqual(variant['schematic']['population']['unplacedReferences'],['R1'])
            for relative,expected in manifest['snapshot']['outputHashes'].items():self.assertEqual(module.sha(viewer/'public'/relative),expected)
            self.assertEqual((source/'main.kicad_sch').read_bytes(),(viewer/'public'/variant['schematic']['nativeUrl']).read_bytes())
            args.skip_existing=True;reused=self.run_export(viewer,args,lambda *a,**k:self.fail('A matching snapshot should not rerun KiCad'))
            self.assertEqual(reused['snapshot']['id'],manifest['snapshot']['id'])
    def test_four_layer_outline_pipeline_survives_unavailable_3d(self):
        with tempfile.TemporaryDirectory() as d:
            viewer,source,args=self.fixture(pathlib.Path(d),'combined');manifest=self.run_export(viewer,args);v=manifest['variants'][0]
            self.assertEqual(v['pcb']['copperLayers'],['F.Cu','In1.Cu','In2.Cu','B.Cu']);self.assertEqual(len(v['pcb']['layers']),11)
            self.assertEqual([v['pcb']['widthMm'],v['pcb']['heightMm']],[40,50]);self.assertEqual(v['pcb']['viewBox'],[8.5,18.5,43,53])
            self.assertIsNone(v['model']);self.assertTrue(v['componentsUrl']);self.assertTrue(any('could not export' in warning for warning in v['warnings']))
            for layer in v['pcb']['layers']:self.assertEqual(module.svg_viewbox(viewer/'public'/layer['url']),v['pcb']['viewBox'])
    def test_pcb_dimensions_are_null_when_source_outline_is_absent(self):
        with tempfile.TemporaryDirectory() as d:
            viewer,source,args=self.fixture(pathlib.Path(d),'board')
            path=source/'main.kicad_pcb';path.write_text(path.read_text().replace('(gr_rect (start 10 20) (end 50 70) (layer "Edge.Cuts"))',''))
            variant=self.run_export(viewer,args)['variants'][0]
            self.assertIsNone(variant['pcb']['widthMm']);self.assertIsNone(variant['pcb']['heightMm']);self.assertIsNone(variant['model'])
            self.assertNotIn('widthMm',variant)
    def test_source_change_does_not_publish_manifest(self):
        with tempfile.TemporaryDirectory() as d:
            viewer,source,args=self.fixture(pathlib.Path(d),'schematic')
            def mutate(command,**kwargs):
                result=self.fake_run(command,**kwargs)
                if command[1:4]==['sch','export','pdf']:(source/'main.kicad_sch').write_text('(changed)')
                return result
            with self.assertRaisesRegex(RuntimeError,'Source changed'):self.run_export(viewer,args,mutate)
            self.assertFalse((args.output/'manifest.json').exists())

class SourcePinTests(unittest.TestCase):
    def test_source_pin_requires_exact_allowlisted_source_hash(self):
        expected={'board.kicad_pcb':'a'*64}
        module.validate_source_pins(expected,expected)
        module.validate_source_pins({}, {})
        for actual in [{},{'board.kicad_pcb':'b'*64}]:
            with self.assertRaisesRegex(RuntimeError,'Pinned source hash mismatch'):module.validate_source_pins(actual,expected)
        with self.assertRaisesRegex(RuntimeError,'Invalid pinned'):module.validate_source_pins(expected,{'board.kicad_pcb':'short'})

if __name__=='__main__':unittest.main()
