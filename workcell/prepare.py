"""Package the licensed CarryQ Panda assets; run with the source web directory."""
import sys,json,gzip,base64,math,xml.etree.ElementTree as ET
from pathlib import Path
source=Path(sys.argv[1]); out=Path(__file__).resolve().parents[1]/'docs/assets/workcell/data'
r=ET.fromstring((source/'public/franka/panda.xml').read_text())
r.set('model','UniGeom-X gentle grasp')
opt=r.find('option');opt.set('timestep','0.002');opt.set('integrator','implicitfast');opt.set('cone','elliptic');opt.set('iterations','80')
r.remove(r.find('keyframe'))
for j in r.iter('joint'):
 if j.get('name','').startswith('finger_joint'): j.set('damping','6')
for b in r.iter('body'): b.set('gravcomp','1')
hand=next(b for b in r.iter('body') if b.get('name')=='hand')
ET.SubElement(hand,'site',name='grasp_center',pos='0 0 0.103',size='.003',rgba='0 0 0 0')
for side in ['left','right']:
 b=next(b for b in r.iter('body') if b.get('name')==side+'_finger')
 for g in b.findall('geom'):
  if g.get('class')!='visual':g.set('contype','0');g.set('conaffinity','0')
 ET.SubElement(b,'geom',name=side+'_pad',type='box',pos='0 .005 .0445',size='.012 .005 .016',mass='.004',friction='.55 .01 .001',condim='4',solref='.008 1',rgba='.35 .68 .63 1')
act=r.find('actuator');act.remove(act[-1]);ET.SubElement(act,'general',name='gripper_force',tendon='split',gainprm='1',biastype='none',ctrlrange='-24 12',forcerange='-24 12')
world=r.find('worldbody')
# A compact rubber mat sits on a real, four-legged workbench.
ET.SubElement(world,'geom',name='bench',type='box',pos='.30 .04 -.006',size='.53 .37 .006',rgba='.22 .38 .37 1',friction='.7 .01 .001')
ET.SubElement(world,'geom',name='tabletop',type='box',pos='.30 .04 -.033',size=f'{.49*math.sqrt(2):.12f} {.35*math.sqrt(2):.12f} .021',rgba='.72 .69 .59 1')
for x in [-.33,.93]:
 for y in [-.39,.47]:
  ET.SubElement(world,'geom',name=f'leg_{x}_{y}',type='box',pos=f'{x} {y} -.324',size='.022 .022 .270',rgba='.16 .23 .25 1')
for y in [-.39,.47]:
 ET.SubElement(world,'geom',name=f'apron_{y}',type='box',pos=f'.30 {y} -.080',size='.63 .014 .026',rgba='.16 .23 .25 1')
ET.SubElement(world,'geom',name='floor',type='plane',pos='0 0 -.60',size='3 3 .02',rgba='.26 .31 .34 1')
# The object must clear this divider before it can enter the receiving pocket.
ET.SubElement(world,'geom',name='divider',type='box',pos='.46 .125 .055',size='.095 .013 .055',rgba='.65 .40 .27 1')
ET.SubElement(world,'geom',name='tray_base',type='box',pos='.46 .25 .002',size='.067 .060 .002',rgba='.48 .57 .55 1')
for x in [-1,1]:
 ET.SubElement(world,'geom',name=f'tray_side_{x}',type='box',pos=f'{.46+x*.038} .25 .016',size='.006 .043 .012',rgba='.48 .57 .55 1')
for y in [-1,1]:
 ET.SubElement(world,'geom',name=f'tray_end_{y}',type='box',pos=f'.46 {.25+y*.039} .016',size='.044 .006 .012',rgba='.48 .57 .55 1')
b=ET.SubElement(world,'body',name='object',pos='.46 0 .034')
ET.SubElement(b,'freejoint',name='object_free')
ET.SubElement(b,'geom',name='sample',type='box',size='.025 .022 .033',mass='.08',friction='.55 .01 .001',condim='4',solref='.008 1',rgba='.72 .56 .36 1')

xml=ET.tostring(r,encoding='unicode')
files={'scene.xml':base64.b64encode(xml.encode()).decode()}
for mesh in r.find('asset').findall('mesh'):
 f=mesh.get('file');files['assets/'+f]=base64.b64encode((source/'public/franka/assets'/f).read_bytes()).decode()
out.mkdir(parents=True,exist_ok=True)
(out/'physics.json.gz').write_bytes(gzip.compress(json.dumps(files,separators=(',',':')).encode(),mtime=0))
print('Packaged',len(files),'files;', (out/'physics.json.gz').stat().st_size,'bytes')
