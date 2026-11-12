import hashlib,json,pathlib,sys,unittest,zipfile
ROOT=pathlib.Path(__file__).parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from kicad_source import sha,sexpr,children,child
from component_names import markdown_tables,plain

class FrozenBundleTests(unittest.TestCase):
    def setUp(self):
        self.manifest=json.loads((ROOT/'public/data/manifest.json').read_text())
        self.snapshot=ROOT/'public/data/snapshots'/self.manifest['snapshot']['id']
    def test_native_archive_contains_full_licenses_notices_and_exact_frozen_bytes(self):
        required={'LICENSES/CERN-OHL-P-2.0.txt':'eeecc593866fa1c3b80189c7e3dc0ceb77740557fa92f81771f891cc54c579cb',
            'LICENSES/Apache-2.0.txt':'074e6e32c86a4c0ef8b3ed25b721ca23aca83df277cd88106ef7177c354615ff',
            'LICENSES/CC-BY-4.0.txt':'d557539df68e771cc1eedcc91d13f70fca930e508d11eedcafa4b15db49e3744',
            'LICENSES/CC-BY-SA-4.0.txt':'cde7883b9050a1104f4ac19a1572aafd6e5d7323b68351aaf51fbf4beba54966'}
        with zipfile.ZipFile(self.snapshot/'native-design.zip') as archive:
            names=archive.namelist();self.assertEqual(len(names),len(set(names)))
            for name in ['LICENSE','LICENSE.md','LICENSES/README.md','docs/THIRD_PARTY_NOTICES.md',*required]:self.assertIn(name,names)
            for relative,expected in {**self.manifest['snapshot']['sourceHashes'],**self.manifest['snapshot']['dependencyHashes']}.items():
                self.assertEqual(hashlib.sha256(archive.read(relative)).hexdigest(),expected)
                self.assertEqual(archive.read(relative),(self.snapshot/'source'/relative).read_bytes())
            for relative,expected in required.items():self.assertEqual(hashlib.sha256(archive.read(relative)).hexdigest(),expected)
    def test_readable_names_are_identical_across_all_verified_views(self):
        variant=self.manifest['variants'][0];index=json.loads((ROOT/'public'/variant['componentsUrl']).read_text())
        raw={p['uuid']:p for p in variant['pcb']['components']}
        symbols={s['schematicPath']:s for sheet in variant['schematic']['sheets'] for s in sheet['symbols'] if s.get('schematicPath')}
        components={c['reference']:c for c in index['components']}
        bom_source=variant['componentNaming']['sources']
        bom_path=next(path for path in bom_source if '/AI_Tinkerers_Badge_Design_BOM_' in path)
        descriptions={plain(row['ID']):plain(row['Description']) for row in markdown_tables(self.snapshot/'source'/bom_path) if all(key in row for key in ['ID','Description','Package'])}
        for ref,identifier in [('U506','EXP-06')]:
            self.assertTrue(components[ref]['displayName'])
            self.assertEqual(components[ref]['displayName'],descriptions[identifier])
            self.assertEqual(components[ref]['displayNameSource']['tableRowId'],identifier)
        self.assertEqual(components['U201']['displayName'],'Microcontroller')
        self.assertEqual(components['U201']['displayNameSource']['tableRowId'],'MCU-01')
        self.assertEqual(components['U504']['displayName'],'Infrared receiver')
        self.assertEqual(components['Q501']['displayName'],'Infrared LED driver')
        for ref in ['Q101','Q102']:self.assertNotEqual(components[ref]['displayName'],'Infrared LED driver')
        self.assertNotIn('Q103',components);self.assertNotIn('U107',components);self.assertNotIn('U301',components);self.assertNotEqual(components['D101']['displayName'],'Zener diode')
        for component in index['components']:
            for field in ['displayName','displayNameSource']:
                self.assertEqual(component[field],raw[component['uuid']][field])
                if component['identityStatus']=='verified':self.assertEqual(component[field],symbols[component['schematicPath']][field])
            if component['displayName']:
                provenance=component['displayNameSource'];self.assertEqual(provenance['sha256'],sha(self.snapshot/'source'/provenance['sourcePath']))
        self.assertEqual(variant['componentNaming']['namedComponents'],sum(bool(c['displayName']) for c in index['components']))
        for relative,expected in variant['componentNaming']['sources'].items():self.assertEqual(sha(self.snapshot/'source'/relative),expected)
    def test_routing_counts_match_frozen_native_reports_and_source_geometry(self):
        variant=self.manifest['variants'][0];pcb=variant['pcb']
        native=sexpr((self.snapshot/'source/tinkerbadge.kicad_pcb').read_text())
        self.assertEqual(pcb['trackSegments'],len(children(native,'segment')))
        self.assertEqual(pcb['vias'],len(children(native,'via')))
        self.assertEqual(pcb['copperZones'],len([z for z in children(native,'zone') if not child(z,'keepout')]))
        self.assertIsNone(pcb['routing']) # No old first-pass DRC claims on this new snapshot.
        self.assertEqual(pcb['population']['placed']+len(pcb['population']['unplacedReferences']),pcb['population']['onBoard'])
        self.assertEqual(variant['enclosure']['board_sha256'],self.manifest['snapshot']['sourceHashes']['tinkerbadge.kicad_pcb'])
        self.assertEqual(any('schematic components are not placed' in w for w in variant['warnings']),bool(pcb['population']['unplacedReferences']))
    def test_publication_chain_matches_frozen_sources_and_manufacturing(self):
        from export_assets import publication_metadata
        result=publication_metadata('exports/publication/manifest.json',self.snapshot/'source','tinkerbadge.kicad_pcb')
        self.assertEqual(result,self.manifest['variants'][0]['verification'])
        self.assertRegex(self.manifest['snapshot']['sourceCommit'],r'^[a-f0-9]{40}$')
    def test_configured_review_pins_match_the_published_bundle(self):
        cfg=json.loads((ROOT/'config/badge.json').read_text())
        for path,expected in cfg['snapshot']['expectedHashes'].items():self.assertEqual(self.manifest['snapshot']['sourceHashes'][path],expected)
        self.assertEqual(self.manifest['project']['tagline'],'An open hardware badge designed for professional networking and built for your experiments.')

if __name__=='__main__':unittest.main()
