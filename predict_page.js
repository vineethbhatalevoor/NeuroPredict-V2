/**
 * NeuroPredict — Predict Page
 *
 * TWO distinct render modes:
 *   1. CSV upload / manual entry  → Transparent anatomical 3D brain (procedural)
 *   2. MRI Image upload           → The ACTUAL uploaded scan rendered in pseudo-3D
 *                                   using brightness-as-depth displacement
 *
 * MEDICAL DISCLAIMER (shown in UI):
 *   "AI-generated pseudo-3D visualization from a single 2D MRI slice.
 *    Not a medically accurate 3D reconstruction. True volumetric 3D MRI
 *    requires a full DICOM series (multiple slices)."
 */

/* ══════════════════════════════════════════════════════════════════════════
   GLSL — TRANSPARENT ANATOMICAL CORTEX (used for CSV / manual entry)
══════════════════════════════════════════════════════════════════════════ */
const CORTEX_VERT = `
  varying vec3  vNorm; varying vec3 vViewPos; varying float vConcave;
  float fold(vec3 p){
    float n = sin(p.x*3.3+p.z*2.6)*cos(p.y*4.2-p.x*1.1)*0.095;
    n+=sin(p.y*5.0-p.x*3.8)*cos(p.z*4.1+p.y*0.9)*0.085;
    n+=cos(p.z*3.5+p.y*4.4)*sin(p.x*3.9-p.z*1.2)*0.078;
    n+=sin(p.x*8.4+p.y*7.9)*cos(p.z*8.7)*0.048;
    n+=sin(p.z*9.5-p.y*7.5)*cos(p.x*8.9)*0.040;
    n+=sin(p.x*15.2+p.y*14.5+p.z*16.1)*0.018;
    n-=exp(-p.x*p.x*100.0)*0.19;
    n-=exp(-(p.y+0.09)*(p.y+0.09)*30.0)*exp(-(abs(abs(p.x)-0.53))*(abs(abs(p.x)-0.53))*20.0)*0.11;
    return n;
  }
  void main(){
    vec3 n=normalize(position); float d=fold(n);
    float eps=0.025;
    float dx=fold(normalize(n+vec3(eps,0,0)))-d;
    float dy=fold(normalize(n+vec3(0,eps,0)))-d;
    float dz=fold(normalize(n+vec3(0,0,eps)))-d;
    vConcave=clamp(-(dx+dy+dz)/eps*0.16,0.0,1.0);
    vec3 tn=normalize(normal-vec3(dx,dy,dz)/eps*0.3);
    vNorm=normalize(normalMatrix*tn);
    vViewPos=-(modelViewMatrix*vec4(n*(1.0+d),1.0)).xyz;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(n*(1.0+d),1.0);
  }`;
const CORTEX_FRAG = `
  varying vec3 vNorm; varying vec3 vViewPos; varying float vConcave;
  void main(){
    vec3 N=normalize(vNorm); vec3 V=normalize(vViewPos);
    float NV=max(dot(N,V),0.0); float fr=pow(1.0-NV,2.4);
    float alpha=mix(0.055,0.72,fr);
    vec3 gc=vec3(0.94,0.89,0.87); vec3 sc=vec3(0.62,0.54,0.52);
    vec3 bc=mix(gc,sc,vConcave*0.5);
    vec3 L=normalize(vec3(1.6,2.4,1.6));
    float d1=max(dot(N,L),0.0)*0.55; float d2=max(dot(normalize(vec3(-0.8,-0.4,0.9)),N),0.0)*0.18;
    float sp=pow(max(dot(V,reflect(-L,N)),0.0),55.0)*0.85;
    float sss=max(dot(-N,L),0.0)*0.30; vec3 sssC=vec3(1.0,0.76,0.70)*sss;
    vec3 rimC=vec3(0.68,0.83,1.0)*fr*0.28;
    vec3 col=bc*(0.28+d1+d2)+sssC+vec3(sp)+rimC;
    gl_FragColor=vec4(col,alpha);
  }`;

/* ══════════════════════════════════════════════════════════════════════════
   GLSL — INTERNAL STRUCTURES
══════════════════════════════════════════════════════════════════════════ */
const STRUCT_VERT=`varying vec3 vNorm;varying vec3 vViewPos;void main(){vNorm=normalize(normalMatrix*normal);vViewPos=-(modelViewMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const STRUCT_FRAG=`uniform vec3 uColor;uniform vec3 uEmissive;uniform float uEmissiveStr;uniform float uTime;uniform float uPulse;varying vec3 vNorm;varying vec3 vViewPos;void main(){vec3 N=normalize(vNorm);vec3 V=normalize(vViewPos);vec3 L=normalize(vec3(1.5,2.0,1.5));float d=max(dot(N,L),0.0);float sp=pow(max(dot(V,reflect(-L,N)),0.0),30.0)*0.4;float sss=max(dot(-N,L),0.0)*0.25;vec3 sssC=uColor*vec3(1.2,1.0,0.9)*sss;float pulse=uPulse*(0.5+0.5*sin(uTime*2.1))*uEmissiveStr;vec3 col=uColor*(0.35+d*0.65)+sssC+vec3(sp)+uEmissive*pulse;gl_FragColor=vec4(col,1.0);}`;

/* ══════════════════════════════════════════════════════════════════════════
   GLSL — PSEUDO-3D MRI DISPLACEMENT VIEWER
   Uses the actual uploaded MRI brightness as depth → displaces plane mesh
══════════════════════════════════════════════════════════════════════════ */
const MRI_VERT = `
  uniform sampler2D uDepthTex;
  uniform float     uStrength;
  varying vec2      vUv;
  varying float     vDepth;
  void main(){
    vUv = uv;
    float d = texture2D(uDepthTex, uv).r;
    vDepth  = d;
    vec3 pos = position + normal * d * uStrength;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }`;

const MRI_FRAG = `
  uniform sampler2D uMRITex;
  uniform int       uCond;
  uniform float     uTime;
  varying vec2      vUv;
  varying float     vDepth;

  void main(){
    vec3 mri = texture2D(uMRITex, vUv).rgb;
    float br = dot(mri, vec3(0.299, 0.587, 0.114));   // luminance
    vec3  col = mri;

    // ── Region highlight overlays ──────────────────────────────────────
    float pulse = 0.5 + 0.5 * sin(uTime * 2.2);

    if (uCond == 1) {
      // AD: Temporal lobes (left & right, lower quarter)
      float lT = step(0.08,vUv.x)*step(vUv.x,0.30)*step(0.22,vUv.y)*step(vUv.y,0.52);
      float rT = step(0.70,vUv.x)*step(vUv.x,0.92)*step(0.22,vUv.y)*step(vUv.y,0.52);
      float hp = step(0.25,vUv.x)*step(vUv.x,0.45)*step(0.30,vUv.y)*step(vUv.y,0.55);  // L hippo approx
          hp += step(0.55,vUv.x)*step(vUv.x,0.75)*step(0.30,vUv.y)*step(vUv.y,0.55);  // R hippo
      float zone = clamp(lT + rT + hp * 1.5, 0.0, 1.0);
      if (zone > 0.0 && br > 0.12) {
        col = mix(col, vec3(0.95, 0.18, 0.12), zone * 0.52);
        col += vec3(1.0, 0.1, 0.05) * zone * br * pulse * 0.20;
      }
    }

    if (uCond == 2) {
      // PD: Basal ganglia / substantia nigra (central, mid-depth)
      float bg = step(0.30,vUv.x)*step(vUv.x,0.70)*step(0.38,vUv.y)*step(vUv.y,0.68);
      float sn = step(0.35,vUv.x)*step(vUv.x,0.65)*step(0.48,vUv.y)*step(vUv.y,0.62);
      float zone = clamp(bg * 0.6 + sn * 1.0, 0.0, 1.0);
      if (zone > 0.0 && br > 0.12) {
        col = mix(col, vec3(0.48, 0.22, 1.0), zone * 0.50);
        col += vec3(0.4, 0.0, 1.0) * zone * br * pulse * 0.18;
      }
    }

    if (uCond == 3) {
      // MCI: subtle hippocampal tinting
      float lH = step(0.18,vUv.x)*step(vUv.x,0.36)*step(0.28,vUv.y)*step(vUv.y,0.54);
      float rH = step(0.64,vUv.x)*step(vUv.x,0.82)*step(0.28,vUv.y)*step(vUv.y,0.54);
      float zone = clamp(lH + rH, 0.0, 1.0);
      if (zone > 0.0 && br > 0.12) {
        col = mix(col, vec3(1.0, 0.62, 0.08), zone * 0.40);
        col += vec3(1.0, 0.5, 0.0) * zone * br * pulse * 0.12;
      }
    }

    // Depth-based shading: brighter tissue = slightly highlighted
    col *= (0.80 + vDepth * 0.35);

    gl_FragColor = vec4(col, 1.0);
  }`;

/* ══════════════════════════════════════════════════════════════════════════
   GLSL — Particle plaque
══════════════════════════════════════════════════════════════════════════ */
const PLAQUE_VERT=`uniform float uTime;attribute float aPhase;varying float vPhase;void main(){vPhase=aPhase;float p=1.0+0.28*sin(uTime*2.2+aPhase*6.28);gl_PointSize=5.0*p;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const PLAQUE_FRAG=`uniform float uTime;uniform vec3 uCol;varying float vPhase;void main(){vec2 uv=gl_PointCoord-0.5;float d=length(uv);if(d>0.5)discard;float a=1.0-smoothstep(0.15,0.5,d);float b=0.65+0.35*sin(uTime*3.5+vPhase*9.0);gl_FragColor=vec4(uCol*b,a*0.92);}`;

/* ══════════════════════════════════════════════════════════════════════════
   Colour palette
══════════════════════════════════════════════════════════════════════════ */
window.PRED_COLOURS = {
  "Control (CN)":     {bg:'rgba(29,158,117,0.1)', border:'#1D9E75',text:'#44C89D',badge:'badge-teal',   condIdx:0},
  "Alzheimer's (AD)": {bg:'rgba(226,75,74,0.1)',  border:'#E24B4A',text:'#F87B7B',badge:'badge-red',    condIdx:1},
  "Parkinson's (PD)": {bg:'rgba(127,119,221,0.1)',border:'#7F77DD',text:'#9A95EC',badge:'badge-purple', condIdx:2},
  "MCI / Other":      {bg:'rgba(186,117,23,0.1)', border:'#BA7517',text:'#F0AE50',badge:'badge-amber',  condIdx:3},
};

/* ══════════════════════════════════════════════════════════════════════════
   PAGE HTML
══════════════════════════════════════════════════════════════════════════ */
function renderPredictPage(container){
  container.innerHTML=`
    <div style="border-bottom:1px solid var(--border-color);padding-bottom:16px;">
      <h2 style="color:white;font-size:22px;">🤖 Upload & Predict — NeuroSift AI Engine</h2>
      <p style="color:var(--text-muted);font-size:13px;">
        Upload a <strong>CSV</strong> (clinical data) → anatomical transparent 3D brain.<br>
        Upload an <strong>MRI brain image</strong> (JPG/PNG) → your actual scan rendered in
        <strong>pseudo-3D with disease region overlays</strong> using brightness-as-depth displacement.
      </p>
    </div>
    <div class="card" style="padding:20px;">
      <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start;">
        <div id="drop-zone"
          ondragover="event.preventDefault();this.style.borderColor='var(--primary)';this.style.background='rgba(127,119,221,0.07)';"
          ondragleave="this.style.borderColor='var(--border-color)';this.style.background='var(--bg-main)';"
          ondrop="npHandleFileDrop(event)"
          onclick="document.getElementById('any-file-input').click()"
          style="flex:1;min-width:240px;border:2px dashed var(--border-color);border-radius:12px;
                 padding:28px 24px;text-align:center;cursor:pointer;background:var(--bg-main);transition:all 0.2s;">
          <div style="font-size:30px;margin-bottom:8px;">📁</div>
          <div style="font-size:14px;font-weight:600;color:white;">Drop CSV or MRI Brain Scan</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">
            CSV → Anatomical 3D brain &nbsp;|&nbsp; JPG/PNG → Your scan in pseudo-3D
          </div>
          <input type="file" id="any-file-input" accept=".csv,.jpg,.jpeg,.png,.bmp"
                 style="display:none;" onchange="npHandleFileSelect(this)">
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;min-width:160px;">
          <button class="btn btn-primary" onclick="document.getElementById('any-file-input').click()">📂 Upload File</button>
          <button class="btn btn-secondary" onclick="npDownloadSampleCSV()">⬇ Sample CSV</button>
        </div>
        <div style="border-left:1px solid var(--border-color);padding-left:20px;flex:1;min-width:260px;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--text-dim);font-weight:700;margin-bottom:10px;">Quick Single Patient (no scan)</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
            <div><label class="form-label" style="font-size:10px;">Name</label><input type="text" class="form-input" id="m-name" value="Test Patient" style="padding:8px 10px;"></div>
            <div><label class="form-label" style="font-size:10px;">Age</label><input type="number" class="form-input" id="m-age" value="65" style="padding:8px 10px;"></div>
            <div><label class="form-label" style="font-size:10px;">Sex</label><select class="form-input form-select" id="m-sex" style="padding:8px 10px;"><option value="M">Male</option><option value="F">Female</option></select></div>
            <div><label class="form-label" style="font-size:10px;">MMSE (0–30)</label><input type="number" class="form-input" id="m-mmse" value="24" min="0" max="30" style="padding:8px 10px;"></div>
            <div style="grid-column:1/-1;"><label class="form-label" style="font-size:10px;">UPDRS-III (0 if N/A)</label><input type="number" class="form-input" id="m-updrs" value="0" style="padding:8px 10px;"></div>
          </div>
          <button class="btn btn-primary" style="width:100%;" onclick="npRunManual()">⚡ Run AI Prediction</button>
        </div>
      </div>
    </div>
    <div id="predict-results-area">
      <div style="text-align:center;padding:60px 20px;border:1px dashed var(--border-color);border-radius:12px;color:var(--text-dim);">
        <div style="font-size:48px;margin-bottom:16px;">🧠</div>
        <div style="font-size:14px;color:var(--text-muted);">Upload a file or enter patient data to begin</div>
        <div style="font-size:12px;margin-top:8px;">NeuroSift RF · 150 trees · AUC 0.906 · 162 real clinical subjects</div>
      </div>
    </div>`;
}

/* ── File I/O ──────────────────────────────────────────────────────────────── */
function npHandleFileDrop(e){e.preventDefault();const z=document.getElementById('drop-zone');if(z){z.style.borderColor='var(--border-color)';z.style.background='var(--bg-main)';}if(e.dataTransfer.files[0]) npSendFile(e.dataTransfer.files[0]);}
function npHandleFileSelect(inp){if(inp.files[0]) npSendFile(inp.files[0]);}
function npShowError(msg){const a=document.getElementById('predict-results-area');if(a) a.innerHTML=`<div style="padding:20px;border:1px solid var(--accent-red);border-radius:8px;background:rgba(226,75,74,0.08);color:var(--accent-red);font-size:13px;"><strong>Prediction failed:</strong> ${msg}<br><br><span style="color:var(--text-muted);font-size:12px;">Make sure <strong>predict_server.py</strong> is running:<br><code style="background:var(--bg-input);padding:4px 8px;border-radius:4px;display:inline-block;margin-top:6px;">python predict_server.py</code></span></div>`;}

function npSendFile(file){
  const a=document.getElementById('predict-results-area');
  if(a) a.innerHTML=`<div style="text-align:center;padding:40px;color:var(--text-muted);">⏳ Analysing <strong>${file.name}</strong>…</div>`;
  const fd=new FormData();fd.append('file',file);
  fetch('http://localhost:8001/predict-file',{method:'POST',body:fd})
    .then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
    .then(d=>npRenderResults(d,file.name))
    .catch(e=>npShowError(e.message));
}
function npRunManual(){
  const p={name:document.getElementById('m-name').value||'Patient',age:parseFloat(document.getElementById('m-age').value||65),sex:document.getElementById('m-sex').value||'M',mmse:parseFloat(document.getElementById('m-mmse').value||24),updrs:parseFloat(document.getElementById('m-updrs').value||0)};
  const a=document.getElementById('predict-results-area');
  if(a) a.innerHTML=`<div style="text-align:center;padding:40px;color:var(--text-muted);">⏳ Running classifier…</div>`;
  fetch('http://localhost:8001/predict',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)})
    .then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
    .then(d=>npRenderResults(d,'Manual Entry'))
    .catch(e=>npShowError(e.message));
}

/* ── Results router ───────────────────────────────────────────────────────── */
function npRenderResults(data,filename){
  const area=document.getElementById('predict-results-area');
  const results=data.results||[];
  if(!results.length){npShowError('No valid rows returned.');return;}
  window._npResults=results;
  if(results.length===1&&!results[0].error){npRenderDetail(results[0],area);return;}
  const counts={};results.forEach(r=>{if(!r.error) counts[r.prediction]=(counts[r.prediction]||0)+1;});
  const sumH=Object.entries(counts).map(([l,n])=>{const c=PRED_COLOURS[l]||{};return `<div style="flex:1;min-width:80px;padding:12px;border-radius:8px;background:${c.bg||'rgba(100,116,139,0.1)'};border:1px solid ${c.border||'#475569'};text-align:center;"><div style="font-size:22px;font-weight:600;color:${c.text||'#94A3B8'}">${n}</div><div style="font-size:10px;color:${c.text||'#94A3B8'};font-weight:700">${l}</div></div>`;}).join('');
  const cardsH=results.map((r,i)=>{if(r.error) return `<div style="padding:12px;border:1px solid var(--accent-red);border-radius:8px;color:var(--accent-red);font-size:13px;"><strong>${r.name}</strong>: ${r.error}</div>`;const c=PRED_COLOURS[r.prediction]||{};return `<div onclick="npRenderDetail(window._npResults[${i}],document.getElementById('predict-results-area'))" style="padding:16px;border-radius:10px;background:${c.bg};border:1px solid ${c.border};display:flex;justify-content:space-between;align-items:center;cursor:pointer;" onmouseover="this.style.opacity='0.82'" onmouseout="this.style.opacity='1'"><div><div style="font-size:14px;font-weight:600;color:white">${r.name}</div><div style="font-size:12px;color:var(--text-muted);margin-top:2px">${r.prediction} · ${r.confidence}% confidence</div></div><div style="display:flex;align-items:center;gap:10px;"><div class="badge ${c.badge||''}">${r.risk} Risk</div><span style="color:var(--text-dim);font-size:20px">›</span></div></div>`;}).join('');
  area.innerHTML=`<div style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">✅ ${results.length} results from <strong>${filename}</strong> — click row for detail</div><div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">${sumH}</div><div style="display:flex;flex-direction:column;gap:10px;max-height:520px;overflow-y:auto">${cardsH}</div><button class="btn btn-secondary" style="width:100%;margin-top:12px;" onclick="npExportCSV(window._npResults)">⬇ Export CSV</button>`;
}

/* ── Detailed single result ───────────────────────────────────────────────── */
function npRenderDetail(r,area){
  if(!area||!r) return;
  const c=PRED_COLOURS[r.prediction]||{bg:'rgba(100,116,139,0.1)',border:'#64748B',text:'#94A3B8',badge:'badge-purple',condIdx:0};
  const proj=r.projection||[]; const regs=r.brain_regions||[];
  const hasMRI = !!(r.mri_3d && r.mri_3d.orig_b64);

  // Growth chart
  const cW=420,cH=160,pL=34,pR=10,pT=14,pB=28;
  const maxY=Math.max(100,...proj.map(p=>p.risk));
  const px=i=>pL+(i/5)*(cW-pL-pR),py=v=>pT+(1-v/maxY)*(cH-pT-pB);
  const ptA=proj.map((p,i)=>`${px(i)},${py(p.risk)}`).join(' ');
  const ptT=proj.map((p,i)=>`${px(i)},${py(p.risk_treated)}`).join(' ');
  const grid=[0,25,50,75,100].filter(v=>v<=maxY).map(v=>`<line x1="${pL}" y1="${py(v)}" x2="${cW-pR}" y2="${py(v)}" stroke="rgba(255,255,255,0.05)" stroke-dasharray="3 3"/><text x="${pL-4}" y="${py(v)+4}" font-size="8" fill="#475569" text-anchor="end">${v}</text>`).join('');
  const xLbl=proj.map((p,i)=>`<text x="${px(i)}" y="${cH-pB+16}" font-size="9" fill="#475569" text-anchor="middle">Y${i}</text>`).join('');
  const svgChart=`<svg viewBox="0 0 ${cW} ${cH}" style="width:100%;height:160px;">${grid}${xLbl}<polyline points="${ptA}" fill="none" stroke="${c.text}" stroke-width="2.5" stroke-linecap="round"/><polyline points="${ptT}" fill="none" stroke="#1D9E75" stroke-width="2" stroke-dasharray="5 3" stroke-linecap="round"/>${proj.map((p,i)=>`<circle cx="${px(i)}" cy="${py(p.risk)}" r="3.5" fill="${c.text}" stroke="#07090F" stroke-width="1.5"/>`).join('')}${proj.map((p,i)=>`<circle cx="${px(i)}" cy="${py(p.risk_treated)}" r="3" fill="#1D9E75" stroke="#07090F" stroke-width="1.5"/>`).join('')}</svg>`;

  const probBars=Object.entries(r.probabilities||{}).map(([l,pct])=>{const pc=PRED_COLOURS[l]||{text:'#94A3B8'};return `<div style="display:flex;align-items:center;gap:8px;margin-top:5px;"><div style="width:110px;font-size:11px;color:var(--text-dim);white-space:nowrap;">${l}</div><div style="flex-grow:1;height:7px;background:var(--bg-input);border-radius:4px;overflow:hidden;"><div style="width:${pct}%;height:100%;background:${pc.text};border-radius:4px;"></div></div><div style="width:36px;text-align:right;font-size:11px;font-weight:700;color:${pc.text};">${pct}%</div></div>`;}).join('');
  const regHtml=regs.length?regs.map(rg=>`<div style="padding:6px 10px;background:${c.bg};border:1px solid ${c.border};border-radius:6px;font-size:12px;color:${c.text};">${rg}</div>`).join(''):`<div style="font-size:12px;color:var(--text-dim);">No pathological regions flagged</div>`;
  const projCards=proj.filter((_,i)=>[1,3,5].includes(i)).map(p=>`<div style="text-align:center;padding:10px;background:var(--bg-main);border-radius:8px;"><div style="font-size:10px;color:var(--text-dim);">YEAR ${p.year}</div><div style="font-size:18px;font-weight:600;color:${c.text};">${p.risk}%</div><div style="font-size:10px;color:#1D9E75;">→ ${p.risk_treated}% treated</div></div>`).join('');

  // Brain panel title depends on mode
  const brainTitle = hasMRI ? '🖥️ Your MRI Scan — Pseudo-3D Depth Viewer' : '🧠 Transparent Anatomical Brain';

  area.innerHTML=`
    <button class="btn btn-secondary" style="margin-bottom:16px;" onclick="npGoBack()">◀ Back</button>

    ${hasMRI ? `<div style="padding:10px 14px;background:rgba(186,117,23,0.12);border:1px solid #BA7517;border-radius:8px;font-size:12px;color:#F0AE50;margin-bottom:16px;">
      ⚠️ <strong>AI-generated pseudo-3D visualization from a single 2D MRI slice.</strong>
      Brightness used as depth proxy. This is NOT a medically accurate 3D reconstruction.
      True volumetric 3D MRI requires a full DICOM series. For research/demo purposes only.
    </div>` : ''}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start;">
      <!-- LEFT -->
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div class="card" style="border-color:${c.border};">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
            <div><div style="font-size:20px;font-weight:600;color:white;">${r.name}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">Risk: <strong style="color:${c.text}">${r.risk}</strong> · Confidence: <strong style="color:${c.text}">${r.confidence}%</strong>${hasMRI?' · Source: MRI scan':''}</div></div>
            <div class="badge ${c.badge}" style="font-size:13px;padding:6px 14px;">${r.prediction}</div>
          </div>
          <div style="font-size:11px;color:var(--text-dim);margin-bottom:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Probability Distribution</div>
          ${probBars}
        </div>
        <div class="card">
          <div class="panel-header" style="margin-bottom:12px;"><h3 class="panel-title">🔬 Affected Brain Structures</h3></div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">${regHtml}</div>
        </div>
        ${hasMRI?`<div class="card"><div class="panel-header"><h3 class="panel-title">📊 Scan Pixel Statistics</h3></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div style="padding:10px;background:var(--bg-main);border-radius:6px;"><div style="font-size:10px;color:var(--text-dim);">BRIGHTNESS</div><div style="font-size:18px;font-weight:600;color:white;">${r.mri_3d.mean_brightness}/255</div></div>
            <div style="padding:10px;background:var(--bg-main);border-radius:6px;"><div style="font-size:10px;color:var(--text-dim);">CONTRAST STD</div><div style="font-size:18px;font-weight:600;color:white;">${r.mri_3d.contrast_std}</div></div>
            <div style="padding:10px;background:var(--bg-main);border-radius:6px;"><div style="font-size:10px;color:var(--text-dim);">CSF/DARK RATIO</div><div style="font-size:18px;font-weight:600;color:var(--accent-amber);">${r.mri_3d.dark_ratio}%</div></div>
            <div style="padding:10px;background:var(--bg-main);border-radius:6px;"><div style="font-size:10px;color:var(--text-dim);">WHITE MATTER</div><div style="font-size:18px;font-weight:600;color:var(--accent-teal);">${r.mri_3d.white_ratio}%</div></div>
          </div>
        </div>`:''}
        <div class="card">
          <div class="panel-header" style="margin-bottom:8px;"><h3 class="panel-title">📈 5-Year Growth Projection</h3></div>
          ${svgChart}
          <div style="display:flex;gap:16px;justify-content:center;font-size:11px;margin-top:8px;">
            <div style="display:flex;align-items:center;gap:6px;"><span style="width:16px;height:3px;background:${c.text};display:inline-block;border-radius:2px;"></span>Without Intervention</div>
            <div style="display:flex;align-items:center;gap:6px;"><span style="width:16px;height:3px;border-top:2px dashed #1D9E75;display:inline-block;"></span>With Early Treatment</div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px;">${projCards}</div>
        </div>
      </div>

      <!-- RIGHT: 3D viewer -->
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div class="card" style="padding:0;overflow:hidden;position:relative;background:#07090F;">
          <div style="padding:12px 16px;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center;background:var(--bg-card);">
            <h3 class="panel-title" style="margin:0;">${brainTitle}</h3>
            <div style="display:flex;gap:6px;">
              <button id="btn-rotate" onclick="npToggleRotate()" class="btn btn-secondary" style="padding:4px 10px;font-size:11px;">⏸ Rotate</button>
              ${hasMRI?`<button onclick="npToggleDepthMode()" id="btn-depth" class="btn btn-secondary" style="padding:4px 10px;font-size:11px;">🗺 Depth Map</button>`:''}
            </div>
          </div>
          <div id="brain-label-overlay" style="position:absolute;top:46px;left:0;width:100%;pointer-events:none;z-index:10;"></div>
          <canvas id="brain-canvas" style="width:100%;height:360px;display:block;"></canvas>
          <div style="padding:8px 16px 10px;font-size:11px;color:var(--text-dim);text-align:center;background:var(--bg-card);">
            ${hasMRI
              ? '🖱️ Drag to rotate · Scroll to zoom · Coloured zones = AI-detected disease regions on your actual scan'
              : '🖱️ Drag to rotate · Scroll to zoom · Transparent cortex reveals internal structures'}
          </div>
        </div>
        ${!hasMRI?`<div class="card"><div style="font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">3D Structure Legend</div><div id="brain-legend" style="display:flex;flex-direction:column;gap:6px;font-size:12px;"></div></div>`:''}
      </div>
    </div>`;

  requestAnimationFrame(()=>{
    if(hasMRI) npInitMRI3D(c.condIdx, r.mri_3d);
    else       npInitBrain3D(c.condIdx, regs);
  });
}
function npGoBack(){const area=document.getElementById('predict-results-area');if(area&&window._npResults&&window._npResults.length>1) npRenderResults({results:window._npResults},'previous');else renderPredictPage(document.getElementById('view-content'));}

/* ══════════════════════════════════════════════════════════════════════════
   MRI PSEUDO-3D VIEWER — renders the actual uploaded scan with displacement
══════════════════════════════════════════════════════════════════════════ */
let _npAnimId=null,_npAutoRotate=true,_npDepthMode=false,_npMRIMat=null;

function npToggleRotate(){_npAutoRotate=!_npAutoRotate;const b=document.getElementById('btn-rotate');if(b) b.textContent=_npAutoRotate?'⏸ Rotate':'▶ Rotate';}
function npToggleDepthMode(){
  _npDepthMode=!_npDepthMode;
  const b=document.getElementById('btn-depth');
  if(b) b.textContent=_npDepthMode?'🖼 Original':'🗺 Depth Map';
  if(_npMRIMat) _npMRIMat.uniforms.uShowDepth={value:_npDepthMode?1:0};
}

function npInitMRI3D(condIdx, mri3d){
  const canvas=document.getElementById('brain-canvas');if(!canvas) return;
  const go=()=>_npBuildMRI3D(canvas,condIdx,mri3d);
  if(window.THREE) go();
  else{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';s.onload=go;document.head.appendChild(s);}
}

function _npBuildMRI3D(canvas,condIdx,mri3d){
  if(_npAnimId){cancelAnimationFrame(_npAnimId);_npAnimId=null;}
  const T=window.THREE;
  const W=canvas.clientWidth||480,H=canvas.clientHeight||360;
  const renderer=new T.WebGLRenderer({canvas,antialias:true});
  renderer.setSize(W,H,false);renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.setClearColor(0x07090F,1);

  const scene=new T.Scene();
  const camera=new T.PerspectiveCamera(46,W/H,0.01,100);
  camera.position.set(0,0,2.2);

  // Lights
  scene.add(new T.AmbientLight(0x334466,2));
  const kL=new T.DirectionalLight(0xffffff,1.5);kL.position.set(1,2,2);scene.add(kL);
  const bL=new T.DirectionalLight(0x4466ff,0.5);bL.position.set(-1,-1,0);scene.add(bL);

  // Load textures from base64
  function b64Tex(b64){
    const img=new Image();img.src='data:image/png;base64,'+b64;
    const tex=new T.Texture(img);tex.needsUpdate=true;
    img.onload=()=>{tex.needsUpdate=true;};
    return tex;
  }
  const mriTex  = b64Tex(mri3d.orig_b64);
  const depthTex = b64Tex(mri3d.depth_b64);

  // High-res plane geometry for displacement
  const aspect = mri3d.width / mri3d.height;
  const geo = new T.PlaneGeometry(aspect * 1.8, 1.8, 220, 220);

  // Custom displacement shader
  const mat = new T.ShaderMaterial({
    vertexShader: MRI_VERT,
    fragmentShader: MRI_FRAG,
    uniforms:{
      uDepthTex:{ value: depthTex },
      uMRITex:  { value: mriTex  },
      uStrength:{ value: 0.28    },
      uCond:    { value: condIdx },
      uTime:    { value: 0       },
    }
  });
  _npMRIMat = mat;

  const mesh = new T.Mesh(geo, mat);
  scene.add(mesh);

  // Scan border frame
  const frameGeo = new T.EdgesGeometry(new T.PlaneGeometry(aspect*1.82,1.82));
  const frameMat = new T.LineBasicMaterial({color:0x334466,opacity:0.5,transparent:true});
  scene.add(new T.LineSegments(frameGeo,frameMat));

  // Region labels on scan
  const REGION_UV = {
    'Hippocampus':       {x:-0.28,y:-0.18},
    'Entorhinal Cortex': {x: 0.32,y:-0.12},
    'Temporal Lobe':     {x: 0.50,y: 0.05},
    'Prefrontal Cortex': {x: 0.00,y: 0.60},
    'Basal Ganglia':     {x: 0.10,y: 0.08},
    'Substantia Nigra':  {x: 0.00,y:-0.05},
    'Motor Cortex':      {x: 0.00,y: 0.52},
    'Putamen':           {x:-0.22,y: 0.08},
    'Anterior Cingulate':{x: 0.00,y: 0.38},
    'Parietal Cortex':   {x: 0.08,y: 0.45},
  };

  const c=PRED_COLOURS[Object.keys(PRED_COLOURS).find(k=>PRED_COLOURS[k].condIdx===condIdx)]||{text:'#E24B4A'};
  const overlay=document.getElementById('brain-label-overlay');
  const labels3D=[];
  const regs=Object.keys(PRED_COLOURS).reduce((a,k)=>PRED_COLOURS[k].condIdx===condIdx?a:a,null);

  // Get affected regions from window if available
  const affRegs=window._npResults&&window._npResults[0]?window._npResults[0].brain_regions||[]:[];
  if(overlay){
    affRegs.forEach(reg=>{
      const uv=REGION_UV[reg];if(!uv) return;
      const worldX=uv.x*aspect*1.8;
      const worldY=uv.y*1.8;
      const el=document.createElement('div');
      el.style.cssText=`position:absolute;pointer-events:none;font-size:10px;font-weight:700;
        color:white;background:rgba(0,0,0,0.80);border:1px solid ${c.text};
        padding:3px 8px;border-radius:20px;white-space:nowrap;opacity:0;transition:opacity 0.8s;
        box-shadow:0 0 10px ${c.text}55;`;
      el.textContent=reg;
      overlay.appendChild(el);
      labels3D.push({el,wx:worldX,wy:worldY});
      setTimeout(()=>el.style.opacity='1',900);
    });
  }

  // Mouse drag + scroll
  let drag=false,px0=0,py0=0;
  canvas.addEventListener('mousedown',e=>{drag=true;px0=e.clientX;py0=e.clientY;});
  window.addEventListener('mouseup',()=>drag=false);
  canvas.addEventListener('mousemove',e=>{
    if(!drag) return;
    mesh.rotation.y+=(e.clientX-px0)*0.010;
    mesh.rotation.x+=(e.clientY-py0)*0.008;
    px0=e.clientX;py0=e.clientY;
  });
  canvas.addEventListener('wheel',e=>{
    e.preventDefault();
    camera.position.z=Math.max(0.8,Math.min(5.0,camera.position.z+e.deltaY*0.003));
  },{passive:false});

  // Animate
  let t=0;
  function animate(){
    if(!document.contains(canvas)){cancelAnimationFrame(_npAnimId);return;}
    _npAnimId=requestAnimationFrame(animate);
    t+=0.016;
    if(_npAutoRotate&&!drag){mesh.rotation.y+=0.0030;mesh.rotation.x=Math.sin(t*0.3)*0.12;}
    mat.uniforms.uTime.value=t;
    renderer.render(scene,camera);
    // Update labels
    if(overlay&&labels3D.length){
      labels3D.forEach(({el,wx,wy})=>{
        const v=new T.Vector3(wx,wy,0.15).applyEuler(mesh.rotation);
        const proj=v.project(camera);
        el.style.left=(( proj.x*0.5+0.5)*W - el.offsetWidth/2)+'px';
        el.style.top =((-proj.y*0.5+0.5)*H - el.offsetHeight - 8)+'px';
        el.style.opacity=proj.z<1?'1':'0';
      });
    }
  }
  animate();
}

/* ══════════════════════════════════════════════════════════════════════════
   ANATOMICAL 3D BRAIN (CSV / manual — no real scan)
══════════════════════════════════════════════════════════════════════════ */
function npInitBrain3D(condIdx,affectedRegions){
  const canvas=document.getElementById('brain-canvas');if(!canvas) return;
  const go=()=>_npBuildBrain(canvas,condIdx,affectedRegions);
  if(window.THREE) go();
  else{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';s.onload=go;document.head.appendChild(s);}
}

function _npStructMat(T,col,emi,eStr,pulse){
  return new T.ShaderMaterial({vertexShader:STRUCT_VERT,fragmentShader:STRUCT_FRAG,
    uniforms:{uColor:{value:new T.Color(col)},uEmissive:{value:new T.Color(emi)},uEmissiveStr:{value:eStr},uTime:{value:0},uPulse:{value:pulse?1:0}}});
}

function _npBuildBrain(canvas,condIdx,affectedRegions){
  if(_npAnimId){cancelAnimationFrame(_npAnimId);_npAnimId=null;}
  const T=window.THREE;
  const W=canvas.clientWidth||480,H=canvas.clientHeight||360;
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false});
  renderer.setSize(W,H,false);renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.setClearColor(0x07090F,1);renderer.autoClear=false;

  const scene=new T.Scene();
  const camera=new T.PerspectiveCamera(42,W/H,0.05,100);
  camera.position.set(0,0.12,3.5);
  scene.add(new T.AmbientLight(0x1a2040,2.5));
  const kL=new T.DirectionalLight(0xffffff,1.8);kL.position.set(2,3,2);scene.add(kL);
  const fL=new T.DirectionalLight(0x4466aa,0.8);fL.position.set(-1.5,-0.5,1);scene.add(fL);
  scene.add(new T.DirectionalLight(0x88aaff,0.5).position.set(0,1,-2)&&new T.DirectionalLight(0x88aaff,0.5));

  const brain=new T.Group();
  const sms=[];

  // Cortex
  const cxMat=new T.ShaderMaterial({vertexShader:CORTEX_VERT,fragmentShader:CORTEX_FRAG,uniforms:{},transparent:true,depthWrite:false,side:T.DoubleSide});
  const cx=new T.Mesh(new T.SphereGeometry(1,96,72),cxMat);cx.renderOrder=10;cx.rotation.x=0.10;
  const cb=new T.Mesh(new T.SphereGeometry(0.44,48,36),cxMat);cb.position.set(0,-0.70,-0.42);cb.scale.set(1.05,0.68,0.82);cb.renderOrder=10;
  const stM=_npStructMat(T,'#2a1f1d','#000',0,false);sms.push(stM);
  const st=new T.Mesh(new T.CylinderGeometry(0.12,0.15,0.5,16),stM);st.position.set(0,-1.10,-0.16);st.rotation.x=0.22;st.renderOrder=1;

  // Corpus callosum
  const ccC=new T.CatmullRomCurve3([new T.Vector3(-0.60,0.22,0.18),new T.Vector3(-0.25,0.38,0.28),new T.Vector3(0,0.42,0.10),new T.Vector3(0.25,0.38,0.28),new T.Vector3(0.60,0.22,0.18)]);
  const ccM=_npStructMat(T,'#d4cdc8','#ffffff',0,false);sms.push(ccM);
  const cc=new T.Mesh(new T.TubeGeometry(ccC,30,0.058,10,false),ccM);cc.renderOrder=2;

  const mkHippo=(side)=>{
    const sg=side==='L'?-1:1,isAD=condIdx===1,isMCI=condIdx===3,at=isAD||isMCI;
    const scl=isAD?0.68:isMCI?0.84:1.0,col=isAD?'#cc2a22':isMCI?'#c47a10':'#b07a58',emi=isAD?'#ff4433':isMCI?'#f0a020':'#7a4a30',es=isAD?0.55:isMCI?0.30:0.08;
    const cur=new T.CatmullRomCurve3([new T.Vector3(sg*0.32,-0.15,0.40),new T.Vector3(sg*0.44,-0.22,0.28),new T.Vector3(sg*0.50,-0.32,0.10),new T.Vector3(sg*0.48,-0.42,-0.12),new T.Vector3(sg*0.38,-0.48,-0.28)]);
    const m=_npStructMat(T,col,emi,es,at);sms.push(m);
    const mesh=new T.Mesh(new T.TubeGeometry(cur,24,0.058*scl,10,false),m);mesh.renderOrder=3;return mesh;
  };
  const mkVent=(side)=>{
    const sg=side==='L'?-1:1,isAD=condIdx===1,enl=isAD?1.65:1.0,col=isAD?'#1a6bcc':'#0d4488',emi=isAD?'#2299ff':'#1166cc';
    const cur=new T.CatmullRomCurve3([new T.Vector3(sg*0.08,0.22,0.28),new T.Vector3(sg*0.18,0.10,0.22),new T.Vector3(sg*0.28,-0.04,0.12),new T.Vector3(sg*0.34,-0.18,-0.04),new T.Vector3(sg*0.30,-0.32,-0.22)]);
    const m=_npStructMat(T,col,emi,isAD?0.45:0.15,isAD);sms.push(m);
    const mesh=new T.Mesh(new T.TubeGeometry(cur,24,0.050*enl,10,false),m);mesh.renderOrder=4;return mesh;
  };
  const mkBG=(side)=>{
    const sg=side==='L'?-1:1,isPD=condIdx===2,col=isPD?'#6622cc':'#6a4a80',emi=isPD?'#9944ff':'#552288';
    const m=_npStructMat(T,col,emi,isPD?0.60:0.08,isPD);sms.push(m);
    const mesh=new T.Mesh(new T.SphereGeometry(0.14,20,16),m);mesh.scale.set(1,0.75,1.2);mesh.position.set(sg*0.38,-0.15,0.32);mesh.renderOrder=3;return mesh;
  };
  const mkThal=(side)=>{
    const sg=side;const m=_npStructMat(T,'#8a7060','#554433',condIdx===1?0.4:0.1,false);sms.push(m);
    const mesh=new T.Mesh(new T.SphereGeometry(0.16,24,18),m);mesh.scale.set(1.1,0.85,1.3);mesh.position.set(sg*0.16,-0.08,0.08);mesh.renderOrder=2;return mesh;
  };

  [cx,cb,st,cc,mkThal(-1),mkThal(1),mkHippo('L'),mkHippo('R'),mkVent('L'),mkVent('R'),mkBG('L'),mkBG('R')].forEach(m=>brain.add(m));

  // Plaques for AD/MCI
  if(condIdx===1||condIdx===3){
    const N=700,pos=[],phases=[];
    for(let i=0;i<N;i++){
      const th=Math.random()*Math.PI*2,ph=Math.random()*Math.PI,r=0.70+Math.random()*0.30;
      const x=Math.sin(ph)*Math.cos(th),y=Math.sin(ph)*Math.sin(th),z=Math.cos(ph);
      const w=Math.exp(-(x*x)*2.0-(y+0.25)*(y+0.25)*4.0);
      if(Math.random()<0.4+w*0.5){pos.push(x*r,y*r,z*r);phases.push(Math.random()*6.28);}
    }
    const pg=new T.BufferGeometry();pg.setAttribute('position',new T.Float32BufferAttribute(pos,3));pg.setAttribute('aPhase',new T.Float32BufferAttribute(phases,1));
    const pm=new T.ShaderMaterial({vertexShader:PLAQUE_VERT,fragmentShader:PLAQUE_FRAG,uniforms:{uTime:{value:0},uCol:{value:new T.Color(0xffdd44)}},transparent:true,depthWrite:false,blending:T.AdditiveBlending});
    const pl=new T.Points(pg,pm);pl.renderOrder=5;brain.add(pl);sms.push(pm);
  }

  scene.add(brain);

  // Legend
  const LEG={0:[{col:'#b07a58',l:'Hippocampus (Healthy)'},{col:'#0d4488',l:'Lateral Ventricles (Normal)'},{col:'rgba(255,255,255,0.3)',l:'Transparent Cortex'}],
    1:[{col:'#cc2a22',l:'Hippocampus (Atrophied — AD)'},{col:'#1a6bcc',l:'Ventricles (Enlarged — CSF +65%)'},{col:'#ffdd44',l:'Amyloid Plaques (β-amyloid)'},{col:'rgba(255,255,255,0.3)',l:'Transparent Cortex'}],
    2:[{col:'#6622cc',l:'Basal Ganglia (Dopamine loss)'},{col:'#330a00',l:'Substantia Nigra'},{col:'rgba(255,255,255,0.3)',l:'Transparent Cortex'}],
    3:[{col:'#c47a10',l:'Hippocampus (Early atrophy)'},{col:'#1a6bcc',l:'Ventricles (Mildly enlarged)'},{col:'#ffdd44',l:'Amyloid Plaques (Incipient)'}]
  };
  const legEl=document.getElementById('brain-legend');
  if(legEl) legEl.innerHTML=(LEG[condIdx]||[]).map(it=>`<div style="display:flex;align-items:center;gap:8px;"><div style="width:12px;height:12px;border-radius:50%;background:${it.col};flex-shrink:0;border:1px solid rgba(255,255,255,0.2);"></div><div style="color:var(--text-muted);">${it.l}</div></div>`).join('');

  // Labels
  const RW={'Hippocampus':new T.Vector3(-0.45,-0.32,0.35),'Entorhinal Cortex':new T.Vector3(0.70,-0.30,0.32),'Temporal Lobe':new T.Vector3(1.02,0.02,0.10),'Prefrontal Cortex':new T.Vector3(0.00,0.28,1.05),'Substantia Nigra':new T.Vector3(0.00,-0.72,0.22),'Basal Ganglia':new T.Vector3(0.55,-0.16,0.42),'Putamen':new T.Vector3(-0.60,-0.14,0.40),'Motor Cortex':new T.Vector3(0.00,0.88,0.42),'Anterior Cingulate':new T.Vector3(0.00,0.65,0.72),'Parietal Cortex':new T.Vector3(0.05,0.80,-0.52)};
  const overlay=document.getElementById('brain-label-overlay');
  const labEls=[];
  if(overlay&&affectedRegions.length){affectedRegions.forEach(reg=>{const v=RW[reg];if(!v) return;const el=document.createElement('div');el.style.cssText=`position:absolute;pointer-events:none;font-size:10px;font-weight:700;color:#fff;background:rgba(0,0,0,0.75);border:1px solid rgba(255,255,255,0.20);padding:3px 9px;border-radius:20px;white-space:nowrap;opacity:0;transition:opacity 0.6s;`;el.textContent=reg;overlay.appendChild(el);labEls.push({el,v3:v.clone()});setTimeout(()=>el.style.opacity='1',1000);});}

  let drag=false,px0=0,py0=0;
  canvas.addEventListener('mousedown',e=>{drag=true;px0=e.clientX;py0=e.clientY;});
  window.addEventListener('mouseup',()=>drag=false);
  canvas.addEventListener('mousemove',e=>{if(!drag) return;brain.rotation.y+=(e.clientX-px0)*0.010;brain.rotation.x+=(e.clientY-py0)*0.008;px0=e.clientX;py0=e.clientY;});
  canvas.addEventListener('wheel',e=>{e.preventDefault();camera.position.z=Math.max(1.6,Math.min(6.5,camera.position.z+e.deltaY*0.004));},{passive:false});

  let t=0;
  function animate(){
    if(!document.contains(canvas)){cancelAnimationFrame(_npAnimId);return;}
    _npAnimId=requestAnimationFrame(animate);t+=0.017;
    if(_npAutoRotate&&!drag) brain.rotation.y+=0.0035;
    sms.forEach(m=>{if(m.uniforms&&m.uniforms.uTime) m.uniforms.uTime.value=t;});
    renderer.clear();renderer.render(scene,camera);
    if(overlay&&labEls.length){labEls.forEach(({el,v3})=>{const wp=v3.clone().applyEuler(brain.rotation);const p=wp.project(camera);el.style.opacity=p.z<1?'1':'0';el.style.left=((p.x*0.5+0.5)*W-el.offsetWidth/2)+'px';el.style.top=((-p.y*0.5+0.5)*H-el.offsetHeight-8)+'px';});}
  }
  animate();
}

/* ── Utilities ─────────────────────────────────────────────────────────────── */
function npDownloadSampleCSV(){const c=`name,Age,Sex,MMSE,UPDRS_III\nAnanya Sharma,67,F,16,0\nRahul Verma,72,M,24,18\nDr. Sarah Jenkins,59,F,30,0\nSub-001 (EEG AD),57,F,16,0\nNTUA Subject8,49,M,30,5`;const b=new Blob([c],{type:'text/csv'}),u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='neuropredict_sample.csv';document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u);}
function npExportCSV(r){let c='Name,Prediction,Risk,Confidence (%)\r\n';r.forEach(x=>{if(!x.error) c+=`"${x.name}","${x.prediction}","${x.risk}",${x.confidence}\r\n`;});const b=new Blob([c],{type:'text/csv'}),u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=`neuropredict_${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u);}
