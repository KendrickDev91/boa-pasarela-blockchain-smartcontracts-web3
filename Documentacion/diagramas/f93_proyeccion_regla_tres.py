# -*- coding: utf-8 -*-
U=[10,25,50,100]; CPU=[0.30,0.56,0.70,1.06]; RAM=[676,726,809,994]
def panel(ox,titulo,ylab,ymax,ystep,pts,k,lineas,fmt):
    W,H=780,560; L,T,R,B=110,70,30,90; pw,ph=W-L-R,H-T-B
    X=lambda u: ox+L+u/220*pw; Y=lambda v: T+ph-v/ymax*ph
    s=[f'<text x="{ox+W/2}" y="38" font-size="26" font-weight="bold" text-anchor="middle">{titulo}</text>']
    v=0
    while v<=ymax+1e-9:
        s.append(f'<line x1="{ox+L}" y1="{Y(v)}" x2="{ox+L+pw}" y2="{Y(v)}" stroke="#d9d9d9"/>')
        s.append(f'<text x="{ox+L-10}" y="{Y(v)+8}" font-size="21" text-anchor="end">{fmt(v)}</text>'); v+=ystep
    for u in range(0,221,25):
        s.append(f'<text x="{X(u)}" y="{T+ph+32}" font-size="21" text-anchor="middle">{u}</text>')
    s.append(f'<line x1="{ox+L}" y1="{T+ph}" x2="{ox+L+pw}" y2="{T+ph}" stroke="#000" stroke-width="2"/><line x1="{ox+L}" y1="{T}" x2="{ox+L}" y2="{T+ph}" stroke="#000" stroke-width="2"/>')
    s.append(f'<text x="{ox+L+pw/2}" y="{H-18}" font-size="22" text-anchor="middle">Usuarios concurrentes</text>')
    s.append(f'<text transform="translate({ox+30},{T+ph/2}) rotate(-90)" font-size="22" text-anchor="middle">{ylab}</text>')
    s.append(f'<line x1="{X(0)}" y1="{Y(0)}" x2="{X(200)}" y2="{Y(k*200)}" stroke="#1F4E79" stroke-width="4"/>')
    for val,txt,col in lineas:
        s.append(f'<line x1="{ox+L}" y1="{Y(val)}" x2="{ox+L+pw}" y2="{Y(val)}" stroke="{col}" stroke-width="3" stroke-dasharray="10,7"/>')
        s.append(f'<text x="{ox+L+12}" y="{Y(val)-10}" font-size="20" fill="{col}" stroke="#fff" stroke-width="6" paint-order="stroke">{txt}</text>')
    s.append(f'<circle cx="{X(200)}" cy="{Y(k*200)}" r="9" fill="#1F4E79"/><text x="{X(200)-16}" y="{Y(k*200)-16}" font-size="20" font-weight="bold" text-anchor="end" fill="#1F4E79" stroke="#fff" stroke-width="6" paint-order="stroke">Proyección: {fmt(k*200)}</text>')
    for u,v in zip(U,pts):
        s.append(f'<rect x="{X(u)-9}" y="{Y(v)-9}" width="18" height="18" fill="#E69F00" stroke="#000"/>')
    return s
s=[]
s+=panel(0,'Procesador','vCPU utilizados',4.5,0.5,CPU,0.014,[(1.4,'Capacidad útil mínima: 70 % de 2 vCPU','#C00000'),(2.8,'Capacidad útil ideal: 70 % de 4 vCPU','#2E7D32')],lambda v:f'{v:.1f}'.replace('.',','))
s+=panel(800,'Memoria RAM','MB utilizados',6500,1000,RAM,16.18,[(2867,'Capacidad útil mínima: 70 % de 4 GB','#C00000'),(5734,'Capacidad útil ideal: 70 % de 8 GB','#2E7D32')],lambda v:f'{v:,.0f}'.replace(',',' '))
ley=('<rect x="420" y="585" width="18" height="18" fill="#E69F00" stroke="#000"/><text x="448" y="601" font-size="21">Valor medido en la prueba de carga</text>'
     '<line x1="820" y1="594" x2="870" y2="594" stroke="#1F4E79" stroke-width="4"/><text x="880" y="601" font-size="21">Proyección por regla de tres (desde 50 usuarios)</text>')
svg=f'<svg id="g" xmlns="http://www.w3.org/2000/svg" width="1580" height="620" font-family="Arial" style="background:#fff">{"".join(s)}{ley}</svg>'
open('grafico.html','w',encoding='utf8').write(f'<html><body style="margin:0;background:#fff">{svg}</body></html>')
