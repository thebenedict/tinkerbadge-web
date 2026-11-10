import importlib.util,json,pathlib,struct,sys,tempfile,unittest,zlib
ROOT=pathlib.Path(__file__).parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from render_feature_views import png_channel,enclosed_holes,calibrate,source_holes,prepare_inputs,load_snapshot,verify_orientation,BOARD_SHA
from kicad_source import sha,sexpr,children,child,prop,outline_bounds,vrml_box_envelope

class FeatureCalibrationTests(unittest.TestCase):
    def fixtures(self,back=False):
        positions=[('H1',104,117.5,2.2),('H2',206,117.5,2.2),('H3',104,166,2.2),('H4',206,166,2.2),('H5',104,112,3.2),('H6',206,112,3.2)]
        holes=[{'reference':ref,'uuid':ref+'-native','pcbMm':[x,y],'drillMm':drill} for ref,x,y,drill in positions]
        scale=-10 if back else 10;offset=2200 if back else -950
        regions=[{'center':[scale*x+offset,10*y-900],'area':400,'bounds':[0,0,drill*10,drill*10]} for _,x,y,drill in positions]
        return holes,regions
    def test_front_and_mirrored_back_map_exact_mounting_holes(self):
        for back in [False,True]:
            holes,regions=self.fixtures(back);fit=calibrate(holes,regions,'back' if back else 'front')
            for actual,expected in zip(fit['pcbToImage'],[-10 if back else 10,0,2200 if back else -950,0,10,-900]):self.assertAlmostEqual(actual,expected,places=9)
            self.assertLess(fit['maxResidualPx'],1e-9);self.assertEqual(len(fit['anchors']),6)
    def test_bounded_pixel_noise_preserves_accurate_alignment(self):
        holes,regions=self.fixtures();regions[4]['center'][0]+=.12
        fit=calibrate(holes,regions,'front');self.assertLess(fit['maxResidualPx'],.2)
    def test_missing_or_wrong_mounting_pattern_is_rejected(self):
        holes,regions=self.fixtures()
        with self.assertRaisesRegex(RuntimeError,'six-hole'):calibrate(holes,regions[:-1],'front')
        regions[4]['center'][1]+=8
        with self.assertRaisesRegex(RuntimeError,'six-hole'):calibrate(holes,regions,'front')
    def test_symmetric_holes_need_separate_outline_orientation_evidence(self):
        holes,regions=self.fixtures()
        self.assertGreater(calibrate(holes,regions,'front')['pcbToImage'][0],0)
        self.assertLess(calibrate(holes,regions,'back')['pcbToImage'][0],0)
    def test_background_is_not_a_hole(self):
        width=height=20;mask=bytearray([0]*(width*height))
        for y in range(3,17):
            for x in range(3,17):mask[y*width+x]=255
        for y in range(8,12):
            for x in range(8,12):mask[y*width+x]=0
        holes=enclosed_holes(width,height,mask,min_area=4)
        self.assertEqual(len(holes),1);self.assertEqual(holes[0]['center'],[10,10])

class PngDecoderTests(unittest.TestCase):
    def make_png(self,filter_type):
        rows=[bytes([10,20,30,40,50,60,70,80]),bytes([11,22,33,44,55,66,77,88])];encoded=[]
        for row_index,row in enumerate(rows):
            previous=rows[row_index-1] if row_index else bytes(len(row));output=bytearray()
            for i,current in enumerate(row):
                a=row[i-4] if i>=4 else 0;b=previous[i];c=previous[i-4] if i>=4 else 0
                if filter_type==0:prediction=0
                elif filter_type==1:prediction=a
                elif filter_type==2:prediction=b
                elif filter_type==3:prediction=(a+b)//2
                else:
                    p=a+b-c;ds=[abs(p-a),abs(p-b),abs(p-c)];prediction=[a,b,c][ds.index(min(ds))]
                output.append((current-prediction)&255)
            encoded.append(bytes([filter_type])+output)
        def chunk(kind,payload):return struct.pack('>I',len(payload))+kind+payload+struct.pack('>I',zlib.crc32(kind+payload)&0xffffffff)
        return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',2,2,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(encoded)))+chunk(b'IEND',b'')
    def test_every_png_filter_and_channel(self):
        with tempfile.TemporaryDirectory() as d:
            path=pathlib.Path(d)/'fixture.png'
            for filter_type in range(5):
                path.write_bytes(self.make_png(filter_type))
                for channel in range(4):
                    w,h,values=png_channel(path,channel);self.assertEqual((w,h),(2,2))
                    self.assertEqual(list(values),[[10,50,11,55],[20,60,22,66],[30,70,33,77],[40,80,44,88]][channel])
    def test_corrupt_png_chunk_is_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            path=pathlib.Path(d)/'bad.png';data=bytearray(self.make_png(0));data[-1]^=1;path.write_bytes(data)
            with self.assertRaisesRegex(RuntimeError,'integrity'):png_channel(path)

class PublishedFeatureAssetsTests(unittest.TestCase):
    def test_images_and_calibration_remain_bound_to_frozen_native_source(self):
        directory=ROOT/'public/features/badge';metadata=json.loads((directory/'renders.json').read_text())
        snapshot_id,snapshot=load_snapshot()
        self.assertEqual(metadata['schemaVersion'],1);self.assertEqual(metadata['snapshotId'],snapshot_id);self.assertEqual(metadata['boardSha256'],BOARD_SHA)
        self.assertEqual([(v['id'],v['side']) for v in metadata['views']],[('front','front'),('components','front'),('back','back')])
        board=snapshot/'source/tinkerbadge.kicad_pcb';self.assertEqual(sha(board),BOARD_SHA)
        self.assertEqual(metadata['provenance']['generatorSha256'],sha(ROOT/'scripts/render_feature_views.py'))
        native={hole['reference']:hole for hole in source_holes(board)}
        for view in metadata['views']:
            image=directory/view['image'];self.assertEqual(sha(image),view['sha256'])
            args=view['render']['args'];self.assertEqual(args[args.index('--quality')+1],'basic')
            self.assertEqual(struct.unpack('>II',image.read_bytes()[16:24]),(view['width'],view['height']))
            self.assertLess(view['maxResidualPx'],.6);self.assertEqual(len(view['anchors']),6)
            self.assertEqual(verify_orientation(image,view),view['orientationVerification'])
            wrong=dict(view);wrong['pcbToImage']=list(view['pcbToImage']);wrong['pcbToImage'][0]*=-1;wrong['pcbToImage'][2]=view['width']-view['pcbToImage'][2]
            with self.assertRaisesRegex(RuntimeError,'orientation'):verify_orientation(image,wrong)
            self.assertGreater(view['pcbToImage'][4],0);self.assertEqual(view['pcbToImage'][0]>0,view['side']=='front')
            for anchor in view['anchors']:
                self.assertEqual(anchor['uuid'],native[anchor['reference']]['uuid']);self.assertEqual(anchor['pcbMm'],native[anchor['reference']]['pcbMm'])
        self.assertEqual(metadata['views'][1]['render']['sourceModelsOmitted'],['MECH_PANEL','MECH_BATTERY'])
        self.assertEqual(metadata['views'][2]['render']['sourceModelsOmitted'],[])
        self.assertIn('MECH_BATTERY',metadata['views'][2]['render']['sourceModelsVisible'])
        self.assertIn('RES_J502',metadata['views'][2]['render']['sourceModelsVisible'])

class RefreshedNativeGeometryTests(unittest.TestCase):
    def test_source_outline_holes_and_private_model_offsets_are_current(self):
        _,snapshot=load_snapshot();board=snapshot/'source/tinkerbadge.kicad_pcb';before=sha(board);native=sexpr(board.read_text())
        self.assertEqual([round(v,6) for v in outline_bounds(native)],[100,100,110,80])
        edges=[n for n in native if isinstance(n,list) and n[0].startswith('gr_') and child(n,'layer')==['layer','Edge.Cuts']]
        self.assertEqual(len(edges),12);self.assertEqual(sum(e[0]=='gr_arc' for e in edges),6)
        tip=next(e for e in edges if e[0]=='gr_arc' and child(e,'start')==['start','155','102'])
        self.assertEqual(child(tip,'end'),['end','157','100'])
        self.assertEqual(child(tip,'mid'),['mid','155.585786','100.585786'])
        self.assertEqual(len(children(native,'segment')),1258);self.assertEqual(len(children(native,'via')),328)
        zones=[z for z in children(native,'zone') if not child(z,'keepout')]
        self.assertEqual([child(z,'layer')[1] for z in zones],['In1.Cu','In2.Cu'])
        self.assertTrue(all(child(z,'net')==['net','GND'] and len(children(z,'filled_polygon'))==1 for z in zones))
        lines=[{tuple(child(e,'start')[1:]),tuple(child(e,'end')[1:])} for e in edges if e[0]=='gr_line']
        self.assertIn({('104','106.75'),('154.5','106.75')},lines)
        self.assertNotIn({('105','100'),('105','106.25')},lines)
        self.assertEqual(len(children(native,'group')),8)
        holes=source_holes(board)
        self.assertEqual([h['pcbMm'] for h in holes],[[104,117.5],[206,117.5],[104,166],[206,166],[104,112],[206,112]])
        index=json.loads((snapshot/'badge/components.json').read_text())
        electrical=[c for c in index['components'] if c['identityStatus']=='verified']
        self.assertEqual(sum(c['layer']=='F.Cu' for c in electrical),164)
        self.assertEqual(sorted(c['reference'] for c in electrical if c['layer']=='B.Cu'),['TP201','TP202','TP203','TP204','TP205','TP206'])
        footprints={prop(f).get('Reference'):f for f in children(native,'footprint')}
        for ref,x in [('D401',160),('D402',180.5),('D403',201)]:
            self.assertEqual([float(n) for n in child(footprints[ref],'at')[1:3]],[x,103])
        for ref,pose in [('U501',[143.5,170.5,90]),('C501',[143.5,174.75,270]),('C502',[143.5,166.25,90]),('R504',[150.75,172,180]),('U504',[137.75,168.5,180]),('D501',[150,168.5,0]),('C202',[118.5,108.8,180]),('C511',[193,154.65,90]),('C512',[193.8,151.3,90]),('R508',[197.925,158.3,270])]:
            at=child(footprints[ref],'at');actual=[float(n) for n in at[1:]]
            actual=actual+[0]*(3-len(actual));actual[2]%=360
            self.assertEqual(actual,pose);self.assertEqual(child(footprints[ref],'layer'),['layer','F.Cu'])
        panel=footprints['MECH_PANEL'];model=child(panel,'model')
        self.assertEqual(child(model,'offset'),['offset',['xyz','0','0','3.5']])
        envelope=vrml_box_envelope(snapshot/'source/models/Review_Panel_93.3x54.9.wrl')
        underside=min(box['centerMm'][2]-box['sizeMm'][2]/2 for box in envelope['boxesMm'])+3.5
        self.assertAlmostEqual(underside,4.5,places=5)
        with tempfile.TemporaryDirectory() as directory:
            work=pathlib.Path(directory);visibility=prepare_inputs(snapshot,work)
            for view in ['front','components','back']:
                derived={prop(f).get('Reference'):f for f in children(sexpr((work/(view+'.kicad_pcb')).read_text()),'footprint')}
                self.assertEqual(child(derived['MECH_PANEL'],'at'),child(panel,'at'))
                self.assertEqual(child(derived['MECH_PANEL'],'layer'),child(panel,'layer'))
                if view=='components':
                    self.assertFalse(children(derived['MECH_PANEL'],'model'));self.assertFalse(children(derived['MECH_BATTERY'],'model'))
                else:
                    self.assertEqual(child(derived['MECH_PANEL'],'model')[2:],model[2:])
                    self.assertTrue(children(derived['MECH_BATTERY'],'model'))
            self.assertEqual(visibility['components']['omitted'],['MECH_PANEL','MECH_BATTERY'])
        self.assertEqual(sha(board),before)

if __name__=='__main__':unittest.main()
