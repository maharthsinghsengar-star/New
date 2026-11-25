import numpy as np, wave, sys
SR=44100; DUR=73.7
n=int(SR*DUR); out=np.zeros(n); rng=np.random.default_rng(5)
# ocean wash: lowpassed noise with slow swell
x=rng.standard_normal(n); y=np.zeros(n); a=0.0; c=0.02
for i in range(0,n): a+=c*(x[i]-a); y[i]=a
t=np.arange(n)/SR; sw=0.55+0.45*np.sin(2*np.pi*t/6.0)
ocean=y/np.abs(y).max()*sw
mask=np.ones(n)
for s,e in [(11.9,14.8),(14.7,40.3),(56.7,58.95)]: mask[int(s*SR):int(e*SR)]=0.15
out+=ocean*mask*0.10
def add(sig,ts,g):
    i=int(ts*SR); m=min(len(sig),n-i); out[i:i+m]+=sig[:m]*g
def engine(d):
    tt=np.arange(int(SR*d))/SR; s=np.sign(np.sin(2*np.pi*55*tt))*0.4+np.sin(2*np.pi*110*tt)*0.3; env=np.minimum(1,tt/0.3)*np.minimum(1,(d-tt)/0.4); return s*env
def thump():
    tt=np.arange(int(SR*0.5))/SR; return np.sin(2*np.pi*65*tt)*np.exp(-tt*8)+0.25*rng.standard_normal(len(tt))*np.exp(-tt*40)
add(engine(3.5),40.3,0.05); add(thump(),49.8,0.45)
w=wave.open(sys.argv[1],'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(out,-1,1)*32767).astype(np.int16).tobytes()); w.close()
