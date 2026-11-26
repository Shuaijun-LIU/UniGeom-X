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

# A second, independent task; retain the rigid scene and its recordings verbatim.
import copy
soft=copy.deepcopy(r)
soft.set('model','UniGeom-X soft sponge')
soft.find('option').set('timestep','0.001')
soft.find('option').set('jacobian','dense')
soft.find('option').set('cone','elliptic')
soft.find('option').set('noslip_iterations','4')
soft.find('option').set('impratio','10')
sw=soft.find('worldbody')
# Only the tactile pads interact with the sponge in this controlled task.
for body in sw.iter('body'):
 for geom in body.findall('geom'):
  if geom.get('name') not in ['left_pad','right_pad']:
   geom.set('contype','0');geom.set('conaffinity','0')
  else:geom.set('size','.025 .005 .028')
sw.remove(next(b for b in sw.findall('body') if b.get('name')=='object'))
for g in sw.findall('geom'):
 name=g.get('name','')
 if name=='tray_base':g.set('size','.080 .070 .002')
 if name.startswith('tray_side_'):
  sign=int(name.rsplit('_',1)[-1]);g.set('pos',f'{.46+sign*.074} .25 .009');g.set('size','.006 .064 .005')
 if name.startswith('tray_end_'):
  sign=int(name.rsplit('_',1)[-1]);g.set('pos',f'.46 {.25+sign*.064} .009');g.set('size','.080 .006 .005')
# Reduced elastic sponge: eight compliant contact nodes around a free carrier.
# No attachment or constraint connects the object to the robot.
carrier=ET.SubElement(sw,'body',name='sponge',pos='.46 0 .032')
ET.SubElement(carrier,'freejoint',name='sponge_free')
ET.SubElement(carrier,'inertial',pos='0 0 0',mass='.020',diaginertia='.000010 .000010 .000010')
for i,(x,y,z) in enumerate(( (x,y,z) for x in [-1,1] for y in [-1,1] for z in [-1,1] )):
 node=ET.SubElement(carrier,'body',name=f'sponge_node_{i}',pos=f'{x*.017} {y*.015} {z*.023}')
 for axis,direction in enumerate(['1 0 0','0 1 0','0 0 1']):
  ET.SubElement(node,'joint',name=f'sponge_spring_{i}_{axis}',type='slide',axis=direction,stiffness='80' if axis==1 else '200',damping='.15',limited='true',range='-.014 .014')
 ET.SubElement(node,'geom',name=f'sponge_contact_{i}',type='sphere',size='.008',mass='.001',contype='2',conaffinity='1',friction='1.0 .01 .001',condim='4',solref='.008 1',rgba='.88 .67 .26 1',group='3')
soft_files={'soft-scene.xml':base64.b64encode(ET.tostring(soft,encoding='unicode').encode()).decode()}
(out/'soft-physics.json.gz').write_bytes(gzip.compress(json.dumps(soft_files,separators=(',',':')).encode(),mtime=0))
print('Packaged soft-scene XML; robot meshes are shared with the rigid task.')
