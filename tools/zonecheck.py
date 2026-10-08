import json,math,sys
Z=json.load(open('data/zones.geojson'))['features']
def polys(g):
    return [g['coordinates']] if g['type']=='Polygon' else g['coordinates']
def inside(pt,ring):
    x,y=pt; c=False
    for i in range(len(ring)):
        x1,y1=ring[i]; x2,y2=ring[i-1]
        if (y1>y)!=(y2>y) and x < (x2-x1)*(y-y1)/(y2-y1)+x1: c=not c
    return c
def segd(p,a,b):
    kx=111320*math.cos(math.radians(p[1])); ky=110540
    px,py=p[0]*kx,p[1]*ky; ax,ay=a[0]*kx,a[1]*ky; bx,by=b[0]*kx,b[1]*ky
    dx,dy=bx-ax,by-ay; t=0 if dx==dy==0 else max(0,min(1,((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy)))
    return math.hypot(px-ax-t*dx,py-ay-t*dy)
def check(lat,lon):
    p=(lon,lat); hits=[]; near=[]
    for f in Z:
        for poly in polys(f['geometry']):
            if inside(p,poly[0]) and not any(inside(p,h) for h in poly[1:]):
                hits.append(f['properties'])
            d=min(segd(p,r[i-1],r[i]) for r in poly for i in range(len(r)))
            near.append((d,f['properties']))
    near.sort(key=lambda x:x[0])
    return hits,near[:2]
for line in sys.stdin:
    if not line.strip(): continue
    name,lat,lon=[s.strip() for s in line.split('|')]
    h,n=check(float(lat),float(lon))
    print(f"{name:28s}", "INSIDE: "+"; ".join(f"{x['name']} [{x['spear']}]" for x in h) if h else "clear", "| nearest:", "; ".join(f"{int(d)}m {p['name']} [{p['spear']}]" for d,p in n))
