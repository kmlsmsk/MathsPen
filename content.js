(function() {
    /* 
       ================================================================
       MATHPEN v25.0 - STABILITY & ZERO-JUMP EDITION
       Fix: Removed CSS 'overflow:hidden' to prevent page jumping to top.
       New Logic: JS Event Blocking for Scroll Lock (Wheel & Touch).
       Core: All previous features (UI, Colors, Zoom, Signature) preserved.
       ================================================================
    */

    // EĞER ZATEN YÜKLÜYSE TEKRAR YÜKLEME
    if (document.getElementById('mathpen-v25')) return;

    const CFG = {
        ID: 'mathpen-v25',
        Z: 2147483647,
        WIDTH: 54,
        LOGO_URL: 'https://img.pikbest.com/png-images/20241202/minimal-pen-and-paper-writing-logo_11152312.png!sw800',
        PALETTE: [
            '#000000', '#ffffff', '#ff3b30', '#ff9500', '#ffcc00', 
            '#4cd964', '#5ac8fa', '#007aff', '#5856d6', '#ff2d55', 
            '#8e8e93', '#c69c6d', '#6366f1', '#10b981', '#ec4899'
        ]
    };

    const PEN_CURSOR = `url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0eWxlPSJmaWx0ZXI6IGRyb3Atc2hhZG93KDFweCAxcHCAMXB4IHJnYmEoMCwwLDAsMC41KSk7IGZpbGw6IHJnYmEoMCwwLDAsMC4yKTsiPjxwYXRoIGQ9Ik0xNyAzYTIuODI4IDIuODI4IDAgMSAxIDQgNEw3LjUgMjAuNSAyIDIyMS41LTUuNUwxNyAzeiIvPjwvc3ZnPg==") 0 24, auto`;

    const state = {
        tool: 'smart', color: '#000000', size: 3, isDown: false,
        paperType: 'none', theme: 'light', zoomLevel: 100, scrollMode: false,
        points: [], history: [], redoStack: [], histStep: -1, laserTrail: [],
        lastPos: {x:0, y:0}, lastTime: 0
    };

    const el = (tag, cls, par, html) => {
        const e = document.createElement(tag);
        if(cls) e.className = cls;
        if(html) e.innerHTML = html;
        if(par) par.appendChild(e);
        return e;
    };

    const style = document.createElement('style');
    style.textContent = `
        #${CFG.ID} * { box-sizing: border-box; }
        
        /* CURSOR & POINTER EVENTS */
        .${CFG.ID}-layer { 
            cursor: ${PEN_CURSOR} !important; 
            touch-action: none !important; /* Dokunmatik kaydırmayı CSS ile engelle */
            user-select: none !important;
            pointer-events: auto;
        }
        
        /* SCROLL MODU: Canvas'ı delip geç, siteye erişime izin ver */
        .mp-scroll-active { 
            pointer-events: none !important; 
            touch-action: auto !important; 
            cursor: auto !important;
        }

        #${CFG.ID} {
            position: fixed; top: 100px; right: 20px;
            width: ${CFG.WIDTH}px; 
            background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(15px);
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.1);
            z-index: ${CFG.Z};
            display: flex; flex-direction: column; align-items: center;
            padding: 6px 0; gap: 6px; user-select: none; font-family: 'Segoe UI', sans-serif;
            transition: height 0.2s;
        }
        
        .mp-logo-container { cursor: grab; padding-bottom: 4px; width: 100%; display: flex; justify-content: center; }
        .mp-logo { width: 34px; height: 34px; border-radius: 50%; background: #fff; padding: 3px; object-fit: contain; pointer-events: none; box-shadow: 0 0 10px rgba(255,255,255,0.1); }

        .mp-grp-btn {
            width: 40px; height: 40px; border-radius: 8px; flex-shrink: 0;
            background: rgba(255,255,255,0.05); color: #94a3b8;
            display: flex; align-items: center; justify-content: center;
            font-size: 20px; cursor: pointer; transition: all 0.2s;
            border: 1px solid rgba(255,255,255,0.05); position: relative;
        }
        .mp-grp-btn:hover { background: rgba(255,255,255,0.15); color: #fff; }
        .mp-grp-btn.active { 
            background: linear-gradient(135deg, #3b82f6, #6366f1);
            color: #fff; border-color: rgba(255,255,255,0.3);
            box-shadow: 0 0 12px rgba(99, 102, 241, 0.4);
        }
        
        .mp-popover {
            position: absolute; right: 62px; top: 0; left: auto;
            background: #151922; border-radius: 12px; padding: 10px;
            display: none; flex-direction: column; gap: 6px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.7); border: 1px solid rgba(255,255,255,0.1);
            width: 150px; z-index: 100;
        }
        .mp-popover.open-right { right: auto; left: 62px; }
        .mp-popover.upwards { top: auto; bottom: 0; }
        .mp-popover.show { display: flex; animation: mpFade 0.15s; }
        @keyframes mpFade { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }

        .mp-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        .mp-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; width: 100%; }

        .mp-sub-btn {
            height: 40px; width: 100%; border-radius: 8px; background: rgba(255,255,255,0.06);
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            cursor: pointer; color: #cbd5e1; transition: 0.1s; border: 1px solid transparent;
        }
        .mp-sub-btn:hover { background: rgba(255,255,255,0.15); color: #fff; }
        .mp-sub-btn.active { background: linear-gradient(135deg, #0ea5e9, #3b82f6); color: #fff; border-color: rgba(255,255,255,0.3); }
        .mp-sub-btn i { font-size: 16px; line-height: 1; margin-bottom: 2px; }
        .mp-sub-btn span { font-size: 8px; font-weight: 600; opacity: 0.9; }

        .mp-col { width: 100%; aspect-ratio: 1; border-radius: 6px; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); }
        .mp-col:hover { transform: scale(1.1); z-index:1; }
        .mp-col.active { border: 2px solid #fff; transform: scale(0.9); }
        
        .mp-custom-picker { grid-column: span 3; width: 100%; height: 32px; background: linear-gradient(90deg, red, yellow, lime, cyan, blue, magenta); border-radius: 6px; position: relative; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3); }
        .mp-custom-picker input { opacity: 0; width: 100%; height: 100%; cursor: pointer; position: absolute; }

        .mp-size-section { background: rgba(255,255,255,0.05); padding: 8px; border-radius: 8px; display: flex; flex-direction: column; align-items: center; gap: 6px; margin-top: 4px; }
        .mp-preview-dot { width: 3px; height: 3px; background: #fff; border-radius: 50%; transition: 0.1s; margin-bottom: 2px; }
        input[type=range] { width: 100%; height: 4px; accent-color: #3b82f6; cursor: pointer; }

        .mp-close-main { margin-top: auto; font-size: 14px; color: #64748b; cursor: pointer; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition:0.2s; background: rgba(255,255,255,0.05); }
        .mp-close-main:hover { color: #fff; background: #ef4444; }
        
        .mp-signature { 
            font-family: 'Georgia', serif; font-weight: 900; font-style: italic; 
            font-size: 13px; color: #f59e0b; 
            margin-top: 5px; opacity: 0.9; pointer-events: none; 
            text-shadow: 0 1px 3px rgba(0,0,0,0.8); letter-spacing: 1px;
        }
    `;
    document.head.appendChild(style);

    // --- LAYERS ---
    const bgL = el('div', `${CFG.ID}-layer`, document.body);
    Object.assign(bgL.style, { position:'fixed', top:0, left:0, width:'100vw', height:'100vh', zIndex:CFG.Z-3, pointerEvents:'none', display:'none', background:'#fff' });

    const cvs = document.createElement('canvas'); cvs.className = `${CFG.ID}-layer`;
    Object.assign(cvs.style, { position:'fixed', top:0, left:0, width:'100vw', height:'100vh', zIndex:CFG.Z-2, pointerEvents:'auto' });
    document.body.appendChild(cvs);
    const ctx = cvs.getContext('2d', { willReadFrequently: true });

    const tmp = document.createElement('canvas'); tmp.className = `${CFG.ID}-layer`;
    Object.assign(tmp.style, { position:'fixed', top:0, left:0, width:'100vw', height:'100vh', zIndex:CFG.Z-1, cursor:'crosshair', pointerEvents:'auto' });
    document.body.appendChild(tmp);
    const ctxT = tmp.getContext('2d');

    const resize = () => {
        const d = ctx.getImageData(0,0,cvs.width,cvs.height);
        [cvs, tmp].forEach(c => { c.width = window.innerWidth; c.height = window.innerHeight; });
        ctx.putImageData(d,0,0);
    };
    window.addEventListener('resize', resize);
    resize();

    // --- LOGIC: SCROLL LOCKING SYSTEM (NO JUMP FIX) ---
    
    // Olayı durdurma fonksiyonu (Passive: false ile çalışır)
    const preventScroll = (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
    };

    // Kaydırma Modunu Değiştir
    const toggleScroll = (forceState) => {
        state.scrollMode = forceState !== undefined ? forceState : !state.scrollMode;
        
        if (state.scrollMode) {
            // --- SCROLL MODU (EL) ---
            // 1. Canvas'ları delip geç (arkadaki siteye eriş)
            cvs.classList.add('mp-scroll-active');
            tmp.classList.add('mp-scroll-active');
            
            // 2. Mouse tekerleği kilidini KALDIR
            window.removeEventListener('wheel', preventScroll, { passive: false });
            
            // 3. UI Temizliği
            document.querySelectorAll('.mp-popover').forEach(p => p.classList.remove('show'));
            document.querySelectorAll('.mp-grp-btn').forEach(b => b.classList.remove('active'));
            if(btnHand) btnHand.classList.add('active');
            
        } else {
            // --- ÇİZİM MODU (KALEM) ---
            // 1. Canvas'ları aktif et (Çizim yakala)
            cvs.classList.remove('mp-scroll-active');
            tmp.classList.remove('mp-scroll-active');
            
            // 2. Mouse tekerleğini KİLİTLE (Sayfa sabit kalsın)
            window.addEventListener('wheel', preventScroll, { passive: false });
            
            if(btnHand) btnHand.classList.remove('active');
        }
    };

    const setTool = (newTool) => {
        toggleScroll(false); // Kalem seçince scroll kilidini aç (sayfayı sabitle)
        if (state.tool === 'spot' || state.tool === 'laser') ctxT.clearRect(0, 0, tmp.width, tmp.height);
        state.tool = newTool;
    };

    const updatePaper = () => {
        if(state.paperType === 'none') { bgL.style.display = 'none'; return; }
        bgL.style.display = 'block';
        const dark = state.theme === 'dark';
        const c1 = dark ? '#1e293b' : '#ffffff'; 
        const c2 = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'; 
        bgL.style.backgroundColor = c1;
        bgL.style.backgroundImage = 'none';
        
        if(state.paperType === 'grid') { bgL.style.backgroundImage = `linear-gradient(${c2} 1px, transparent 1px), linear-gradient(90deg, ${c2} 1px, transparent 1px)`; bgL.style.backgroundSize = '20px 20px'; }
        else if(state.paperType === 'line') { bgL.style.backgroundImage = `linear-gradient(${c2} 1px, transparent 1px)`; bgL.style.backgroundSize = '100% 30px'; }
        else if(state.paperType === 'iso') { bgL.style.backgroundImage = `url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iMjMiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMTEuNWwyMCAxMS41TDQwIDExLjVWMGwtMjAgMTEuNUwwIDB6IiBmaWxsPSJub25lIiBzdHJva2U9IiM5NGEzYjgiIHN0cm9rZS13aWR0aD0iMC41IiBzdHJva2Utb3BhY2l0eT0iMC4zIi8+PC9zdmc+')`; }
        else if(state.paperType === 'hex') { bgL.style.backgroundImage = `url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIzNSI+PHBhdGggZD0iTTAgMTcuNSAxMCAwIDIwIDE3LjUgMTAgMzV6IiBmaWxsPSJub25lIiBzdHJva2U9IiM5NGEzYjgiIHN0cm9rZS13aWR0aD0iMC41IiBzdHJva2Utb3BhY2l0eT0iMC4zIi8+PC9zdmc+')`; }
        else if(state.paperType === 'milli') { bgL.style.backgroundImage = `linear-gradient(${c2} 1px, transparent 1px), linear-gradient(90deg, ${c2} 1px, transparent 1px)`; bgL.style.backgroundSize = '10px 10px'; }
        else if(state.paperType === 'dot') { bgL.style.backgroundImage = `radial-gradient(${c2} 1px, transparent 1px)`; bgL.style.backgroundSize = '20px 20px'; }
    };

    const handleZoom = (delta) => {
        state.zoomLevel += delta;
        if(state.zoomLevel < 50) state.zoomLevel = 50;
        if(state.zoomLevel > 200) state.zoomLevel = 200;
        document.body.style.zoom = state.zoomLevel + "%";
    };

    const saveState = () => {
        state.histStep++;
        state.history = state.history.slice(0, state.histStep);
        state.history.push(ctx.getImageData(0,0,cvs.width,cvs.height));
        state.redoStack = [];
        if(state.history.length>20) { state.history.shift(); state.histStep--; }
    };

    // ZOOM CALIBRATED COORDINATES
    const getPos = (e) => {
        const zoomFactor = state.zoomLevel / 100;
        let clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : e.clientX;
        let clientY = (e.touches && e.touches.length > 0) ? e.touches[0].clientY : e.clientY;
        return { x: clientX / zoomFactor, y: clientY / zoomFactor };
    };

    const recognizeShape = (pts) => { if (pts.length < 5) return null; const start = pts[0]; const end = pts[pts.length-1]; const dist = Math.hypot(end.x - start.x, end.y - start.y); let pathLen = 0; for(let i=1; i<pts.length; i++) pathLen += Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y); if (dist / pathLen > 0.93) return { type: 'line', p1: start, p2: end }; if (dist < 40 && pathLen > 50) { let minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity; pts.forEach(p => { minX=Math.min(minX,p.x); maxX=Math.max(maxX,p.x); minY=Math.min(minY,p.y); maxY=Math.max(maxY,p.y); }); const w = maxX-minX, h = maxY-minY; if (Math.abs(w-h) < Math.max(w,h)*0.3) return { type: 'circle', x: minX, y: minY, w: w, h: h }; } return null; };
    const drawGeo = (c, t, p1, p2) => { const w = p2.x-p1.x, h = p2.y-p1.y; c.beginPath(); if(t==='rect') c.rect(p1.x,p1.y,w,h); else if(t==='circle') c.ellipse(p1.x+w/2,p1.y+h/2,Math.abs(w)/2,Math.abs(h)/2,0,0,Math.PI*2); else if(t==='line') { c.moveTo(p1.x,p1.y); c.lineTo(p2.x,p2.y); } else if(t==='arrow1') { const a=Math.atan2(h,w); c.moveTo(p1.x,p1.y); c.lineTo(p2.x,p2.y); c.lineTo(p2.x-15*Math.cos(a-0.5), p2.y-15*Math.sin(a-0.5)); c.moveTo(p2.x,p2.y); c.lineTo(p2.x-15*Math.cos(a+0.5), p2.y-15*Math.sin(a+0.5)); } else if(t==='arrow2') { const a=Math.atan2(h,w); c.moveTo(p1.x,p1.y); c.lineTo(p2.x,p2.y); c.lineTo(p2.x-15*Math.cos(a-0.5), p2.y-15*Math.sin(a-0.5)); c.moveTo(p2.x,p2.y); c.lineTo(p2.x-15*Math.cos(a+0.5), p2.y-15*Math.sin(a+0.5)); c.moveTo(p1.x,p1.y); c.lineTo(p1.x+15*Math.cos(a-0.5), p1.y+15*Math.sin(a-0.5)); c.moveTo(p1.x,p1.y); c.lineTo(p1.x+15*Math.cos(a+0.5), p1.y+15*Math.sin(a+0.5)); } else if(t==='para') { const s=w*0.2; c.moveTo(p1.x+s,p1.y); c.lineTo(p1.x+w,p1.y); c.lineTo(p1.x+w-s,p1.y+h); c.lineTo(p1.x, p1.y+h); c.closePath(); } else if(t==='star') { const cx=p1.x+w/2, cy=p1.y+h/2, R=Math.min(Math.abs(w),Math.abs(h))/2, r=R/2; for(let i=0;i<5;i++){ c.lineTo(cx+R*Math.cos((18+i*72)*0.017), cy+R*Math.sin((18+i*72)*0.017)); c.lineTo(cx+r*Math.cos((54+i*72)*0.017), cy+r*Math.sin((54+i*72)*0.017)); } c.closePath(); } else if(t==='tri') { c.moveTo(p1.x+w/2,p1.y); c.lineTo(p1.x,p1.y+h); c.lineTo(p1.x+w,p1.y+h); c.closePath(); } c.stroke(); };

    const down = (e) => {
        if(e.target.closest(`#${CFG.ID}`)) return;
        if(state.scrollMode) return;
        // Dokunmatik cihazlarda kaydırmayı engelle
        if(e.type === 'touchstart') e.preventDefault(); 
        
        state.isDown = true; 
        const p = getPos(e);
        state.startPos = p; state.lastPos = p; state.lastTime = Date.now();
        state.points = [p, p];

        if(state.tool === 'text') {
            const text = prompt("Metin:");
            if(text) { ctx.font = `bold ${state.size * 5}px 'Segoe UI', sans-serif`; ctx.fillStyle = state.color; ctx.fillText(text, p.x, p.y); saveState(); }
            state.isDown = false; return;
        }

        [ctx, ctxT].forEach(c => {
            c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = state.color; c.fillStyle = state.color;
            c.lineWidth = state.size; c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.shadowBlur = 0;
        });
        if(state.tool==='marker') { ctx.globalCompositeOperation='multiply'; ctx.globalAlpha=0.3; ctx.lineWidth=state.size*5; }
        else if(state.tool==='eraser') { ctx.globalCompositeOperation='destination-out'; ctx.lineWidth=state.size*8; }
        else if(state.tool==='brush') { ctx.shadowBlur = 10; ctx.shadowColor = state.color; }
        else if(state.tool==='laser') { state.laserTrail = []; }
    };

    const move = (e) => {
        if(state.scrollMode) return;
        if(!state.isDown && state.tool !== 'laser' && state.tool !== 'spot') return;
        if(e.type === 'touchmove') e.preventDefault(); 

        const p = getPos(e);
        
        if(state.tool === 'spot') {
            ctxT.clearRect(0,0,tmp.width,tmp.height); ctxT.fillStyle = 'rgba(0,0,0,0.85)';
            ctxT.fillRect(0,0,tmp.width,tmp.height); ctxT.globalCompositeOperation = 'destination-out';
            ctxT.beginPath(); ctxT.arc(p.x, p.y, 100 + (state.size*5), 0, Math.PI*2); ctxT.fill();
            ctxT.globalCompositeOperation = 'source-over'; ctxT.strokeStyle = 'rgba(255,255,255,0.5)'; ctxT.lineWidth=2; ctxT.stroke();
            return;
        }
        if(state.tool === 'laser') {
            ctxT.clearRect(0,0,tmp.width,tmp.height); state.laserTrail.push(p); if(state.laserTrail.length>12) state.laserTrail.shift();
            if(state.laserTrail.length>1) {
                ctxT.beginPath(); ctxT.strokeStyle='rgba(255,0,0,0.5)'; ctxT.lineWidth=4;
                ctxT.moveTo(state.laserTrail[0].x, state.laserTrail[0].y);
                state.laserTrail.forEach(pt=>ctxT.lineTo(pt.x,pt.y)); ctxT.stroke();
            }
            ctxT.beginPath(); ctxT.arc(p.x,p.y,5,0,Math.PI*2); ctxT.fillStyle='#ef4444'; 
            ctxT.shadowColor='red'; ctxT.shadowBlur=15; ctxT.fill(); ctxT.shadowBlur=0; return;
        }

        if(!state.isDown) return; state.points.push(p);

        const isFree = ['smart','magic','pen','fountain','marker','eraser','brush'].includes(state.tool);
        if(isFree) {
            const dist = Math.hypot(p.x - state.lastPos.x, p.y - state.lastPos.y);
            const time = Date.now() - state.lastTime;
            const vel = dist / (time || 1);

            ctx.beginPath();
            if(state.tool === 'fountain') { let w = Math.max(1, state.size - vel * 0.8); ctx.lineWidth = w; ctx.moveTo(state.lastPos.x, state.lastPos.y); ctx.lineTo(p.x, p.y); }
            else if(state.tool === 'smart' || state.tool === 'magic') {
                if (state.points.length > 2) {
                    const prev = state.points[state.points.length-2]; const pp = state.points[state.points.length-3];
                    const mid1 = {x:(pp.x+prev.x)/2, y:(pp.y+prev.y)/2}; const mid2 = {x:(prev.x+p.x)/2, y:(prev.y+p.y)/2};
                    ctx.moveTo(mid1.x, mid1.y); ctx.quadraticCurveTo(prev.x, prev.y, mid2.x, mid2.y);
                }
            } else { const last = state.points[state.points.length-2]; ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); }
            ctx.stroke();
        } else { ctxT.clearRect(0,0,tmp.width,tmp.height); drawGeo(ctxT, state.tool, state.startPos, p); }
        state.lastPos = p; state.lastTime = Date.now();
    };

    const up = (e) => {
        if(!state.isDown) return; state.isDown = false;
        if(state.tool === 'magic') {
            if(state.histStep >= 0) ctx.putImageData(state.history[state.histStep],0,0); else ctx.clearRect(0,0,cvs.width,cvs.height);
            const shape = recognizeShape(state.points); ctx.beginPath(); ctx.strokeStyle=state.color; ctx.lineWidth=state.size;
            if(shape) {
                if(shape.type==='line') { ctx.moveTo(shape.p1.x, shape.p1.y); ctx.lineTo(shape.p2.x, shape.p2.y); }
                else if(shape.type==='circle') { ctx.beginPath(); ctx.ellipse(shape.x+shape.w/2, shape.y+shape.h/2, shape.w/2, shape.h/2, 0,0,Math.PI*2); }
                ctx.stroke();
            } else {
                ctx.moveTo(state.points[0].x, state.points[0].y);
                for(let i=1; i<state.points.length-1; i++){
                    const mp = {x:(state.points[i].x+state.points[i+1].x)/2, y:(state.points[i].y+state.points[i+1].y)/2};
                    ctx.quadraticCurveTo(state.points[i].x, state.points[i].y, mp.x, mp.y);
                } ctx.stroke();
            } saveState(); return;
        }
        if(!['smart','pen','fountain','marker','eraser','magic','laser','spot','brush','text'].includes(state.tool)) {
            const p = getPos(e); ctxT.clearRect(0,0,tmp.width,tmp.height); drawGeo(ctx, state.tool, state.startPos, p);
        } saveState();
    };

    // EVENTS
    window.addEventListener('mousedown', down); window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    window.addEventListener('touchstart', down, { passive: false }); window.addEventListener('touchmove', move, { passive: false }); window.addEventListener('touchend', up);

    const side = el('div', '', document.body); side.id = CFG.ID;
    
    // Drag
    const handle = el('div', 'mp-logo-container', side); const logo = el('img', 'mp-logo', handle); logo.src = CFG.LOGO_URL;
    let isDragging = false, dragOffset = {x:0, y:0};
    handle.onmousedown = (e) => { isDragging = true; dragOffset.x = e.clientX - side.getBoundingClientRect().left; dragOffset.y = e.clientY - side.getBoundingClientRect().top; side.style.right = 'auto'; };
    window.addEventListener('mousemove', (e) => { if(isDragging) { side.style.left = (e.clientX - dragOffset.x) + 'px'; side.style.top = (e.clientY - dragOffset.y) + 'px'; }});
    window.addEventListener('mouseup', () => isDragging = false);

    const toggle = (btn) => {
        const pop = btn.querySelector('.mp-popover'); const isOpen = pop.classList.contains('show');
        document.querySelectorAll('.mp-popover').forEach(p => p.classList.remove('show'));
        document.querySelectorAll('.mp-grp-btn').forEach(b => b.classList.remove('active'));
        if(!isOpen) { 
            const rect = side.getBoundingClientRect();
            if(rect.left < window.innerWidth / 2) pop.classList.add('open-right'); else pop.classList.remove('open-right');
            btn.classList.add('active'); pop.classList.add('show'); 
        }
    };

    const gPen = el('div', 'mp-grp-btn', side, '✏️'); const pPen = el('div', 'mp-popover', gPen); const pPenGrid = el('div', 'mp-grid-2', pPen);
    gPen.onclick = (e) => { if(e.target===gPen) toggle(gPen); };
    [{id:'smart',i:'✨',t:'Akıllı'}, {id:'magic',i:'🪄',t:'Sihirli'}, {id:'pen',i:'🖊️',t:'Kalem'}, {id:'marker',i:'🖍️',t:'Fosfor'}, {id:'fountain',i:'✒️',t:'Dolma'}, {id:'text',i:'T',t:'Yazı'}].forEach(x => {
        const b = el('div', `mp-sub-btn ${state.tool===x.id?'active':''}`, pPenGrid, `<i>${x.i}</i><span>${x.t}</span>`);
        b.onclick = () => { setTool(x.id); document.querySelectorAll('.mp-sub-btn').forEach(s=>s.classList.remove('active')); b.classList.add('active'); };
    });

    const gGeo = el('div', 'mp-grp-btn', side, '🔶'); const pGeo = el('div', 'mp-popover', gGeo); const pGeoGrid = el('div', 'mp-grid-2', pGeo);
    gGeo.onclick = (e) => { if(e.target===gGeo) toggle(gGeo); };
    [{id:'line',i:'📏',t:'Çizgi'}, {id:'rect',i:'⬜',t:'Kare'}, {id:'circle',i:'⭕',t:'Daire'}, {id:'para',i:'▰',t:'Paralel'}, {id:'arrow1',i:'➝',t:'Ok'}, {id:'arrow2',i:'⟷',t:'Çift'}, {id:'star',i:'⭐',t:'Yıldız'}, {id:'tri',i:'🔺',t:'Üçgen'}].forEach(x => {
        const b = el('div', 'mp-sub-btn', pGeoGrid, `<i>${x.i}</i><span>${x.t}</span>`);
        b.onclick = () => { setTool(x.id); document.querySelectorAll('.mp-sub-btn').forEach(s=>s.classList.remove('active')); b.classList.add('active'); };
    });

    // Hand
    const btnHand = el('div', 'mp-grp-btn', side, '✋');
    btnHand.onclick = () => { toggleScroll(); document.querySelectorAll('.mp-grp-btn').forEach(b => {if(b!==btnHand)b.classList.remove('active')}); document.querySelectorAll('.mp-popover').forEach(p=>p.classList.remove('show')); if(state.scrollMode) btnHand.classList.add('active'); };

    const gTool = el('div', 'mp-grp-btn', side, '🛠️'); const pTool = el('div', 'mp-popover', gTool); const pToolGrid = el('div', 'mp-grid-2', pTool);
    gTool.onclick = (e) => { if(e.target===gTool) toggle(gTool); };
    const btnZIn = el('div', 'mp-sub-btn', pToolGrid, '<i>+</i><span>Büyüt</span>'); btnZIn.onclick = () => handleZoom(10);
    const btnZOut = el('div', 'mp-sub-btn', pToolGrid, '<i>-</i><span>Küçült</span>'); btnZOut.onclick = () => handleZoom(-10);
    [{id:'spot',i:'💡',t:'Spot',f:()=>{setTool('spot')}},{id:'laser',i:'🔦',t:'Lazer',f:()=>{setTool('laser')}},{id:'eraser',i:'🧼',t:'Silgi',f:()=>{setTool('eraser')}},{id:'undo',i:'↩',t:'Geri',f:()=>{if(state.histStep>0){state.redoStack.push(state.history[state.histStep]); state.histStep--; ctx.putImageData(state.history[state.histStep],0,0);}else ctx.clearRect(0,0,cvs.width,cvs.height)}},{id:'redo',i:'↪',t:'İleri',f:()=>{if(state.redoStack.length>0){const img=state.redoStack.pop(); state.histStep++; state.history[state.histStep]=img; ctx.putImageData(img,0,0);}}},{id:'clr',i:'🗑',t:'Sil',f:()=>{ctx.clearRect(0,0,cvs.width,cvs.height); saveState();}}].forEach(x => {
        const b = el('div', 'mp-sub-btn', pToolGrid, `<i>${x.i}</i><span>${x.t}</span>`);
        b.onclick = () => { if(x.f)x.f(); if(['spot','laser','eraser'].includes(x.id)){document.querySelectorAll('.mp-sub-btn').forEach(s=>s.classList.remove('active')); b.classList.add('active');}};
    });

    const gPap = el('div', 'mp-grp-btn', side, '📄'); const pPap = el('div', 'mp-popover', gPap); const pPapGrid = el('div', 'mp-grid-2', pPap);
    gPap.onclick = (e) => { if(e.target===gPap) toggle(gPap); };
    [{id:'none',i:'🚫',t:'Yok'}, {id:'grid',i:'▦',t:'Kareli'}, {id:'line',i:'📝',t:'Çizgili'}, {id:'iso',i:'📐',t:'İzometrik'}, {id:'hex',i:'⬡',t:'Altıgen'}, {id:'dot',i:'⁙',t:'Noktalı'}].forEach(x => {
        const b = el('div', 'mp-sub-btn', pPapGrid, `<i>${x.i}</i><span>${x.t}</span>`);
        b.onclick = () => { state.paperType=x.id; updatePaper(); };
    });
    const bTheme = el('div', 'mp-sub-btn', pPapGrid, '<i>🌗</i><span>Tema</span>');
    bTheme.onclick = () => { state.theme = state.theme==='light'?'dark':'light'; updatePaper(); };

    const gCol = el('div', 'mp-grp-btn', side, '🎨'); const pCol = el('div', 'mp-popover upwards', gCol); gCol.onclick = (e) => { if(e.target===gCol) toggle(gCol); };
    const pColGrid = el('div', 'mp-grid-3', pCol);
    CFG.PALETTE.forEach(c => {
        const b = el('div', `mp-col ${state.color===c?'active':''}`, pColGrid); b.style.background=c;
        b.onclick = () => { state.color=c; document.querySelectorAll('.mp-col').forEach(s=>s.classList.remove('active')); b.classList.add('active'); previewDot.style.background = c; };
    });
    const cPick = el('div', 'mp-custom-picker', pCol); cPick.innerHTML = '<i>🌈</i>';
    const inp = el('input', '', cPick); inp.type='color'; inp.oninput = (e) => { state.color=e.target.value; previewDot.style.background = state.color; };
    const sSec = el('div', 'mp-size-section', pCol);
    const previewDot = el('div', 'mp-preview-dot', sSec); previewDot.style.width='3px'; previewDot.style.height='3px'; previewDot.style.background=state.color;
    const sld = el('input', '', sSec); sld.type='range'; sld.min=1; sld.max=50; sld.value=3;
    sld.oninput = (e) => { const v=parseInt(e.target.value); state.size=v; previewDot.style.width=v+'px'; previewDot.style.height=v+'px'; };

    el('div', 'mp-close-main', side, '✕').onclick = () => { 
        side.remove(); cvs.remove(); tmp.remove(); bgL.remove(); 
        // Scroll kilitlerini temizle
        window.removeEventListener('wheel', preventScroll);
    };
    el('div', 'mp-signature', side, 'K.Ş');

    // Başlangıçta Kalem Seçili -> Scroll Kilitli
    toggleScroll(false);
    saveState();
})();