import numpy as np, wave, sys
SR=44100; DUR=52.0
out=np.zeros(int(SR*DUR)); rng=np.random.default_rng(2)
def add(sig,t,g):
    i=int(t*SR); n=min(len(sig),len(out)-i); out[i:i+n]+=sig[:n]*g
def siren(d):
    t=np.linspace(0,d,int(SR*d)); f=750+250*np.sin(2*np.pi*0.9*t)
    s=np.sin(2*np.pi*np.cumsum(f)/SR)*0.6+np.sin(4*np.pi*np.cumsum(f)/SR)*0.15
    env=np.minimum(1,t/0.4)*np.minimum(1,(d-t)/0.8); return s*env
def thump():
    t=np.linspace(0,0.5,int(SR*0.5)); return np.sin(2*np.pi*65*t)*np.exp(-t*8)+0.25*rng.standard_normal(len(t))*np.exp(-t*40)
def sting():
    t=np.linspace(0,0.9,int(SR*0.9)); s=sum(np.sin(2*np.pi*f*t) for f in (220,277,330))/3; return s*np.exp(-t*3)
add(sting(),20.6,0.25); add(thump(),40.6,0.5); add(siren(4.0),43.9,0.16)
w=wave.open(sys.argv[1],'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(out,-1,1)*32767).astype(np.int16).tobytes()); w.close()
