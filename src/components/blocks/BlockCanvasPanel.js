// src/components/blocks/BlockCanvasPanel.js
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BLOCK_TEMPLATES, SensorSide, Metric, Op, TurnDir, uid } from './BlockTypes';

const PURPLE = { bg: '#a14ebf', border: '#8e3aae' };
const CANVAS_SIZE = { w: 4000, h: 3000 };

export default function BlockCanvasPanel({ blocks, setBlocks, onCompile }) {
  const viewportRef = useRef(null);
  const [pan, setPan]   = useState({ x: -400, y: -250 });
  const [zoom, setZoom] = useState(1);
  const dragState = useRef({ kind: 'none' });

  const screenToWorld = useCallback((sx, sy) => {
    const rect = viewportRef.current.getBoundingClientRect();
    const localX = sx - rect.left;
    const localY = sy - rect.top;
    return { x: (localX - pan.x) / zoom, y: (localY - pan.y) / zoom };
  }, [pan.x, pan.y, zoom]);

  // inventory drop
  const onDrop = (e) => {
    e.preventDefault();
    const key = e.dataTransfer.getData('text/plain');
    const templ = BLOCK_TEMPLATES[key];
    if (!templ) return;
    const { x, y } = screenToWorld(e.clientX, e.clientY);
    setBlocks(prev => [...prev, { id: uid(), type: 'RULE', data: deepCopy(templ.data), x, y }]);
  };
  const onDragOver = (e) => e.preventDefault();

  // pan & block drag
  const onMouseDown = (e) => {
    if (dragState.current.kind !== 'none') return;
    dragState.current = { kind: 'pan', startX: e.clientX, startY: e.clientY, base: { ...pan } };
  };
  const onMouseMove = (e) => {
    const d = dragState.current;
    if (d.kind === 'pan') {
      setPan({ x: d.base.x + (e.clientX - d.startX), y: d.base.y + (e.clientY - d.startY) });
    } else if (d.kind === 'block') {
      const world = screenToWorld(e.clientX, e.clientY);
      const nx = Math.round((world.x - d.offX) / 4) * 4;
      const ny = Math.round((world.y - d.offY) / 4) * 4;
      setBlocks(prev => prev.map(b => b.id === d.id ? { ...b, x: nx, y: ny } : b));
    }
  };
  const endDrag = () => { dragState.current = { kind: 'none' }; };
  useEffect(() => {
    const vp = viewportRef.current;
    vp.addEventListener('mouseup', endDrag);
    vp.addEventListener('mouseleave', endDrag);
    return () => {
      vp.removeEventListener('mouseup', endDrag);
      vp.removeEventListener('mouseleave', endDrag);
    };
  }, []);

  // zoom (ctrl/⌘ + wheel)
  const onWheel = (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const oldZ = zoom;
    const nz = Math.min(1.6, Math.max(0.5, +(oldZ + (-Math.sign(e.deltaY))*0.1).toFixed(2)));
    const before = screenToWorld(e.clientX, e.clientY);
    setZoom(nz);
    setPan(prev => {
      const rect = viewportRef.current.getBoundingClientRect();
      const lx = e.clientX - rect.left, ly = e.clientY - rect.top;
      return { x: lx - before.x * nz, y: ly - before.y * nz };
    });
  };

  const interactiveSelector = 'input, select, textarea, option, button, label';

  const startBlockDrag = (e, block) => {
    // If the user grabbed a form control, don't start dragging the block.
    if (e.target.closest(interactiveSelector)) return;
  
    e.stopPropagation();
    const world = screenToWorld(e.clientX, e.clientY);
    dragState.current = {
      kind: 'block',
      id: block.id,
      offX: world.x - (block.x || 0),
      offY: world.y - (block.y || 0)
    };
  };
  

  const updateBlock = (id, updater) => setBlocks(prev => prev.map(b => b.id === id ? updater(b) : b));
  const remove = (id) => setBlocks(prev => prev.filter(b => b.id !== id));

  // compile: order by Y then X
  const handleRun = () => onCompile?.();

  return (
    <div style={S.root}>
      <div style={S.toolbar}>
        <div style={{ display:'flex', gap:8 }}>
          <span style={S.tip}>Drag background to pan</span>
          <span style={S.tip}>Ctrl/⌘ + Wheel to zoom</span>
        </div>
        <button style={S.run} onClick={handleRun}>▶ Run</button>
      </div>

      <div
        ref={viewportRef}
        style={S.viewport}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onWheel={onWheel}
      >
        <div
          style={{
            ...S.canvas,
            width: CANVAS_SIZE.w, height: CANVAS_SIZE.h,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0'
          }}
        >
          <div style={S.grid} />

          {blocks.map(b => (
            <div
              key={b.id}
              style={{ ...S.block, left: b.x||100, top: b.y||100, background: PURPLE.bg, border: `2px solid ${PURPLE.border}` }}
              onMouseDown={(e)=>startBlockDrag(e,b)}
              title="Drag to move"
            >
              <div style={S.tabTop}/>
                <div style={S.title}>
                  Rule
                  <span style={S.del} onClick={()=>remove(b.id)}>✕</span>
                </div>

                {/* IF row */}
                <div style={S.row}>
                  <Chip>IF</Chip>
                  <Select value={b.data.cond.sensor} onChange={v=>updateBlock(b.id, old=>({ ...old, data:{ ...old.data, cond:{ ...old.data.cond, sensor:v }}}))} options={SensorSide}/>
                  <Select value={b.data.cond.metric} onChange={v=>updateBlock(b.id, old=>({ ...old, data:{ ...old.data, cond:{ ...old.data.cond, metric:v }}}))} options={Metric}/>
                  <Select value={b.data.cond.op} onChange={v=>updateBlock(b.id, old=>({ ...old, data:{ ...old.data, cond:{ ...old.data.cond, op:v }}}))} options={Op}/>
                  <Num value={b.data.cond.value} min={-1000} max={1000} step={1}
                    onChange={v=>updateBlock(b.id, old=>({ ...old, data:{ ...old.data, cond:{ ...old.data.cond, value:v }}}))}
                  />
                  <label style={S.chk}>
                    <input type="checkbox" checked={!!b.data.cond.always}
                      onChange={e=>updateBlock(b.id, old=>({ ...old, data:{ ...old.data, cond:{ ...old.data.cond, always:e.target.checked }}}))}
                    />
                    Always
                  </label>

                {/* THEN row */}
                <div style={S.row}>
                  <Chip>THEN</Chip>
                  <Chip>speed</Chip>
                  <Num value={b.data.act.accel} min={0} max={1} step={0.1}
                    onChange={v=>updateBlock(b.id, old=>({ ...old, data:{ ...old.data, act:{ ...old.data.act, accel:v }}}))}
                  />
                  <Chip>turn</Chip>
                  <Select value={b.data.act.turn} onChange={v=>updateBlock(b.id, old=>({ ...old, data:{ ...old.data, act:{ ...old.data.act, turn:v }}}))} options={['none','left','right','auto']}/>
                  <Chip>by</Chip>
                  <Num value={b.data.act.steer} min={0} max={1} step={0.1}
                    onChange={v=>updateBlock(b.id, old=>({ ...old, data:{ ...old.data, act:{ ...old.data.act, steer:v }}}))}
                  />
                </div>

                <div style={S.hint}>Sensors: distances in model units. Accel/Steer are 0..1.</div>
              </div>
              <div style={S.tabBottom}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* UI bits */
const Chip = ({ children }) => <span style={S.chip}>{children}</span>;

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={e=>onChange(e.target.value)} style={S.select}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
function Num({ value, onChange, min=0, max=1, step=0.1 }) {
  return (
    <input type="number" value={Number(value)} min={min} max={max} step={step}
      onChange={e=>onChange(Number(e.target.value))}
      style={S.num}
    />
  );
}

const S = {
  root: { flex:1, display:'flex', flexDirection:'column', background:'#17181d', color:'#eee' },
  toolbar: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 8px', borderBottom:'1px solid #2a2d34' },
  tip: { background:'#222a', border:'1px solid #333', borderRadius:8, padding:'2px 6px', fontSize:12 },
  run: { background:'#3b82f6', border:'none', color:'#fff', padding:'4px 10px', borderRadius:6, cursor:'pointer', fontSize:13, fontWeight:600 },

  viewport: { position:'relative', width:'100%', height:'100%', overflow:'hidden', cursor:'grab' },
  canvas: { position:'absolute', left:0, top:0, background:'#15161a', borderLeft:'1px solid #222', borderTop:'1px solid #222' },
  grid: { position:'absolute', inset:0, backgroundImage:'linear-gradient(to right, #222 1px, transparent 1px), linear-gradient(to bottom, #222 1px, transparent 1px)', backgroundSize:'24px 24px' },

  block: { position:'absolute', width: 360, borderRadius:10, fontSize:12, lineHeight:1.2, userSelect:'none' },
  body: { padding:'6px 10px' },
  title: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4, fontWeight:700 },
  del: { cursor:'pointer', padding:'0 6px', background:'#0003', borderRadius:6, fontSize:12 },

  row: { display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', margin:'4px 0' },
  chip: { background:'#0002', border:'1px solid #0003', borderRadius:6, padding:'1px 6px', fontSize:11 },
  select: { background:'#111418', color:'#eaeaf0', border:'1px solid #2d3040', borderRadius:6, padding:'2px 6px', fontSize:11 },
  num: { width:72, background:'#111418', color:'#eaeaf0', border:'1px solid #2d3040', borderRadius:6, padding:'2px 6px', fontSize:11 },
  hint: { fontSize:11, opacity:0.85, marginTop:2 },

  tabTop: { height:6, background:'transparent', borderBottom:`6px solid ${PURPLE.border}`, borderLeft:'6px solid transparent', borderRight:'6px solid transparent', margin:'-6px auto 0', width:36, borderRadius:'0 0 10px 10px' },
  tabBottom: { height:6, background:'transparent', borderTop:`6px solid ${PURPLE.border}`, borderLeft:'6px solid transparent', borderRight:'6px solid transparent', margin:'0 auto -6px', width:36, borderRadius:'10px 10px 0 0' }
};

function deepCopy(v){ return JSON.parse(JSON.stringify(v)); }
