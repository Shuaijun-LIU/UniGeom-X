"""Package the licensed CarryQ Panda assets; run with the source web directory."""
import sys,json,gzip,base64,xml.etree.ElementTree as ET
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
ET.SubElement(world,'geom',name='bench',type='box',pos='.35 0 -.027',size='.62 .44 .027',rgba='.20 .22 .26 1',friction='.7 .01 .001')
ET.SubElement(world,'geom',name='floor',type='plane',pos='0 0 -.09',size='2 2 .02',rgba='.09 .09 .12 1')
b=ET.SubElement(world,'body',name='object',pos='.46 0 .034')
ET.SubElement(b,'freejoint',name='object_free')
ET.SubElement(b,'geom',name='sample',type='box',size='.025 .022 .033',mass='.08',friction='.55 .01 .001',condim='4',solref='.008 1',rgba='.72 .56 .36 1')
ET.SubElement(world,'geom',name='destination',type='cylinder',pos='.46 .22 .001',size='.066 .001',rgba='.25 .58 .52 1',contype='0',conaffinity='0')
xml=ET.tostring(r,encoding='unicode')
files={'scene.xml':base64.b64encode(xml.encode()).decode()}
for mesh in r.find('asset').findall('mesh'):
 f=mesh.get('file');files['assets/'+f]=base64.b64encode((source/'public/franka/assets'/f).read_bytes()).decode()
out.mkdir(parents=True,exist_ok=True)
(out/'physics.json.gz').write_bytes(gzip.compress(json.dumps(files,separators=(',',':')).encode(),mtime=0))
print('Packaged',len(files),'files;', (out/'physics.json.gz').stat().st_size,'bytes')
