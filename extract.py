import json,sys
D=sys.argv[1]; out=sys.argv[2]
L=lambda f: json.load(open(f'{D}/{f}.json'))
chars=L('characters'); cls=L('classes'); ab=L('abilities'); dj=L('djinn')
names=['Isaac','Garet','Ivan','Mia','Felix','Jenna','Sheba','Piers']
elem=[0,2,3,1,0,2,3,1]   # V=0 Me=1 Ma=2 J=3
mono=[0,1,2,3,0,20,2,21]
C=[]
for i,c in enumerate(chars):
    C.append({'name':names[i],'el':elem[i],'mono':mono[i],'startLv':c['level'],'curve':c['stats'],
              'aff':[v-50 if v>=50 else v for v in c['elements']]})
S=[]; used=set()
for c in cls:
    tiers=[]
    for t in range(len(c['classes'])):
        ps=[[pid,lv] for pid,lv in zip(c['psynergy'][t],c['levels'][t]) if pid]
        used.update(p for p,_ in ps)
        tiers.append({'name':c['classes'][t],'req':c['elements'][t],'mult':[v*10 for v in c['stats'][t]],'psy':ps})
    S.append({'id':c['id'],'tiers':tiers})
A={}
for pid in sorted(used):
    a=ab[str(pid)]
    A[pid]={'n':a['name'],'t':a['target'],'d':a['damageType'],'e':a['element'],'r':a['range'],'c':a['cost'],'p':a['power'],'x':a['addedEffect']}
J=[{'n':d['name'],'e':d['element'],'s':d['stats']} for d in dj]
it=L('items'); shops=L('shops')
sold=set()
for sh in shops:
    sold.update(x for x in sh['items'] if x); sold.update(x for x in sh.get('artifacts',[]) if x)
SLOT={1:'w',2:'b',3:'a',4:'h',5:'f',8:'r',9:'s'}
I={}
for v in it.values():
    if v['itemType'] not in SLOT or not v['equipCompat']: continue
    eff=[[t,(x-256 if x>127 else x)] for t,x in v['equipEffects'] if t]
    o={'n':v['name'],'sl':SLOT[v['itemType']],'m':v['equipCompat'],'a':v['attack'],'d':v['defense'],
       'k':v['desc'].split(':')[0].strip()}
    if eff: o['e']=eff
    if v['flags']&1: o['c']=1
    if v['id'] in sold: o['b']=1
    if v['useType']==2 and v['useEffect']:
        u=ab[str(v['useEffect'])]
        o['us']={'n':u['name'],'d':u['damageType'],'p':u['power'],'r':u['range'],
                 't':v['desc'].split(':',1)[1].strip() if ':' in v['desc'] else v['desc']}
    if v['unleashId']:
        u=ab[str(v['unleashId'])]
        o['u']={'n':u['name'],'d':u['damageType'],'e':u['element'],'p':u['power'],'x':u['addedEffect'],'r':v['unleashRate']*5}
    I[v['id']]=o
BOOST=[]
for nm,stat in [('Power Bread',0),('Cookie',1),('Apple',2),('Hard Nut',3),('Mint',4),('Lucky Pepper',5)]:
    v=[x for x in it.values() if x['name']==nm][0]
    BOOST.append({'n':nm,'s':stat,'v':ab[str(v['useEffect'])]['power']})
json.dump({'chars':C,'series':S,'abil':A,'djinn':J,'items':I,'boost':BOOST},open(out,'w'),separators=(',',':'))
print('ok',len(C),len(S),len(A),len(J),len(I))
