import numpy as np, wave, sys
SR=44100; DUR=43.6
out=np.zeros(int(SR*DUR))
rng=np.random.default_rng(1)
def add(sig,t,g):
    i=int(t*SR); n=min(len(sig),len(out)-i); out[i:i+n]+=sig[:n]*g
def whoosh(d=0.45):
    n=int(SR*d); x=rng.standard_normal(n); y=np.zeros(n); a=0.0
    for k in range(n):
        c=0.02+0.25*np.sin(np.pi*k/n)  # sweeping lowpass
        a+=c*(x[k]-a); y[k]=a
    return y*np.sin(np.pi*np.linspace(0,1,n))**2/ (np.abs(y).max()+1e-9)
def pop(d=0.16,f0=500,f1=1500):
    t=np.linspace(0,d,int(SR*d)); f=np.linspace(f0,f1,len(t))
    return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*22)
def thump():
    t=np.linspace(0,0.5,int(SR*0.5))
    return np.sin(2*np.pi*70*t)*np.exp(-t*9)+0.3*rng.standard_normal(len(t))*np.exp(-t*40)
for t in [2.4,3.9]: add(pop(),t,0.25)
for t in [15.25,17.74,33.41]: add(whoosh(0.5),t-0.25,0.35); add(pop(),t,0.22)
for t in [21.13,21.73,22.33,22.93,23.53,24.13]: add(whoosh(0.3),t-0.15,0.28); add(pop(0.12),t,0.15)
add(whoosh(0.6),39.05,0.25); add(thump(),42.0,0.6)
out=np.clip(out,-1,1)
w=wave.open(sys.argv[1],'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((out*32767).astype(np.int16).tobytes()); w.close()
