// Enhanced Scratch-like Block Canvas
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BLOCK_TEMPLATES, SensorSide, Metric, Op, TurnDir, uid, getBlockCategory, getBlockShape, CATEGORIES } from './BlockTypes';

const CANVAS_SIZE = { w: 4000, h: 3000 };
const GRID_SIZE = 20;

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
    // Snap to grid
    const snapX = Math.round(x / GRID_SIZE) * GRID_SIZE;
    const snapY = Math.round(y / GRID_SIZE) * GRID_SIZE;
    setBlocks(prev => [...prev, { 
      id: uid(), 
      type: templ.type, 
      blockType: key,
      data: deepCopy(templ.data), 
      x: snapX, 
      y: snapY 
    }]);
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
      const nx = Math.round((world.x - d.offX) / GRID_SIZE) * GRID_SIZE;
      const ny = Math.round((world.y - d.offY) / GRID_SIZE) * GRID_SIZE;
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

  // Render block-specific editor UI
  const renderBlockEditor = (block, template, updateBlock) => {
    if (!template) return null;

    switch (template.type) {
      case 'MOTION':
        return renderMotionEditor(block, updateBlock);
      case 'SENSING':
        return renderSensingEditor(block, updateBlock);
      case 'CONTROL':
        return renderControlEditor(block, updateBlock);
      case 'LOGIC':
        return renderLogicEditor(block, updateBlock);
      case 'VARIABLES':
        return renderVariablesEditor(block, updateBlock);
      case 'EVENTS':
        return renderEventsEditor(block, updateBlock);
      case 'RULE':
        return renderRuleEditor(block, updateBlock);
      default:
        return <div style={S.hint}>No editor available</div>;
    }
  };

  const renderMotionEditor = (block, updateBlock) => (
    <div style={S.editorContent}>
      {block.data.speed !== undefined && (
        <div style={S.row}>
          <Chip>Speed</Chip>
          <Num value={block.data.speed} min={0} max={1} step={0.1}
            onChange={v => updateBlock(block.id, old => ({ ...old, data: { ...old.data, speed: v } }))}
          />
        </div>
      )}
      {block.data.angle !== undefined && (
        <div style={S.row}>
          <Chip>Angle</Chip>
          <Num value={block.data.angle} min={-180} max={180} step={5}
            onChange={v => updateBlock(block.id, old => ({ ...old, data: { ...old.data, angle: v } }))}
          />
        </div>
      )}
      {block.data.duration !== undefined && (
        <div style={S.row}>
          <Chip>Duration</Chip>
          <Num value={block.data.duration} min={0} max={10} step={0.1}
            onChange={v => updateBlock(block.id, old => ({ ...old, data: { ...old.data, duration: v } }))}
          />
        </div>
      )}
    </div>
  );

  const renderSensingEditor = (block, updateBlock) => (
    <div style={S.editorContent}>
      {block.data.side !== undefined && (
        <div style={S.row}>
          <Chip>Side</Chip>
          <Select value={block.data.side} onChange={v => updateBlock(block.id, old => ({ ...old, data: { ...old.data, side: v } }))} options={SensorSide} />
        </div>
      )}
      {block.data.metric !== undefined && (
        <div style={S.row}>
          <Chip>Metric</Chip>
          <Select value={block.data.metric} onChange={v => updateBlock(block.id, old => ({ ...old, data: { ...old.data, metric: v } }))} options={Metric} />
        </div>
      )}
      {block.data.threshold !== undefined && (
        <div style={S.row}>
          <Chip>Threshold</Chip>
          <Num value={block.data.threshold} min={0} max={100} step={1}
            onChange={v => updateBlock(block.id, old => ({ ...old, data: { ...old.data, threshold: v } }))}
          />
        </div>
      )}
    </div>
  );

  const renderControlEditor = (block, updateBlock) => (
    <div style={S.editorContent}>
      {block.data.times !== undefined && (
        <div style={S.row}>
          <Chip>Times</Chip>
          <Num value={block.data.times} min={1} max={100} step={1}
            onChange={v => updateBlock(block.id, old => ({ ...old, data: { ...old.data, times: v } }))}
          />
        </div>
      )}
      {block.data.seconds !== undefined && (
        <div style={S.row}>
          <Chip>Seconds</Chip>
          <Num value={block.data.seconds} min={0} max={10} step={0.1}
            onChange={v => updateBlock(block.id, old => ({ ...old, data: { ...old.data, seconds: v } }))}
          />
        </div>
      )}
    </div>
  );

  const renderLogicEditor = (block, updateBlock) => (
    <div style={S.editorContent}>
      {block.data.op !== undefined && (
        <div style={S.row}>
          <Chip>Operation</Chip>
          <Select value={block.data.op} onChange={v => updateBlock(block.id, old => ({ ...old, data: { ...old.data, op: v } }))} options={Op} />
        </div>
      )}
      {block.data.left !== undefined && (
        <div style={S.row}>
          <Chip>Left</Chip>
          <Num value={block.data.left} min={-1000} max={1000} step={1}
            onChange={v => updateBlock(block.id, old => ({ ...old, data: { ...old.data, left: v } }))}
          />
        </div>
      )}
      {block.data.right !== undefined && (
        <div style={S.row}>
          <Chip>Right</Chip>
          <Num value={block.data.right} min={-1000} max={1000} step={1}
            onChange={v => updateBlock(block.id, old => ({ ...old, data: { ...old.data, right: v } }))}
          />
        </div>
      )}
    </div>
  );

  const renderVariablesEditor = (block, updateBlock) => (
    <div style={S.editorContent}>
      {block.data.name !== undefined && (
        <div style={S.row}>
          <Chip>Name</Chip>
          <input
            type="text"
            value={block.data.name}
            onChange={e => updateBlock(block.id, old => ({ ...old, data: { ...old.data, name: e.target.value } }))}
            style={S.textInput}
          />
        </div>
      )}
      {block.data.value !== undefined && (
        <div style={S.row}>
          <Chip>Value</Chip>
          <Num value={block.data.value} min={-1000} max={1000} step={1}
            onChange={v => updateBlock(block.id, old => ({ ...old, data: { ...old.data, value: v } }))}
          />
        </div>
      )}
    </div>
  );

  const renderEventsEditor = (block, updateBlock) => (
    <div style={S.editorContent}>
      {block.data.threshold !== undefined && (
        <div style={S.row}>
          <Chip>Threshold</Chip>
          <Num value={block.data.threshold} min={0} max={100} step={1}
            onChange={v => updateBlock(block.id, old => ({ ...old, data: { ...old.data, threshold: v } }))}
          />
        </div>
      )}
    </div>
  );

  const renderRuleEditor = (block, updateBlock) => (
    <div style={S.editorContent}>
      <div style={S.row}>
        <Chip>IF</Chip>
        <Select value={block.data.cond?.sensor} onChange={v => updateBlock(block.id, old => ({ ...old, data: { ...old.data, cond: { ...old.data.cond, sensor: v } } }))} options={SensorSide} />
        <Select value={block.data.cond?.metric} onChange={v => updateBlock(block.id, old => ({ ...old, data: { ...old.data, cond: { ...old.data.cond, metric: v } } }))} options={Metric} />
        <Select value={block.data.cond?.op} onChange={v => updateBlock(block.id, old => ({ ...old, data: { ...old.data, cond: { ...old.data.cond, op: v } } }))} options={Op} />
        <Num value={block.data.cond?.value} min={-1000} max={1000} step={1}
          onChange={v => updateBlock(block.id, old => ({ ...old, data: { ...old.data, cond: { ...old.data.cond, value: v } } }))}
        />
      </div>
      <div style={S.row}>
        <Chip>THEN</Chip>
        <Chip>speed</Chip>
        <Num value={block.data.act?.accel} min={0} max={1} step={0.1}
          onChange={v => updateBlock(block.id, old => ({ ...old, data: { ...old.data, act: { ...old.data.act, accel: v } } }))}
        />
        <Chip>turn</Chip>
        <Select value={block.data.act?.turn} onChange={v => updateBlock(block.id, old => ({ ...old, data: { ...old.data, act: { ...old.data.act, turn: v } } }))} options={TurnDir} />
      </div>
    </div>
  );

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

          {blocks.map(b => {
            const category = getBlockCategory(b.blockType);
            const shape = getBlockShape(b.blockType);
            const template = BLOCK_TEMPLATES[b.blockType];
            
            return (
              <div
                key={b.id}
                style={{
                  ...S.block,
                  left: b.x || 100,
                  top: b.y || 100,
                  background: category.color,
                  border: `2px solid ${category.border}`,
                  borderRadius: shape.rounded ? '16px' : shape.hexagon ? '0' : '8px',
                  clipPath: shape.hexagon ? 'polygon(20% 0%, 80% 0%, 100% 50%, 80% 100%, 20% 100%, 0% 50%)' : 'none',
                  minHeight: shape.height
                }}
                onMouseDown={(e) => startBlockDrag(e, b)}
                title="Drag to move"
              >
                {shape.hasNotch && <div style={{ ...S.notch, borderBottomColor: category.border }} />}
                
                <div style={S.blockContent}>
                  <div style={S.title}>
                    {template?.label || b.type}
                    <span style={S.del} onClick={() => remove(b.id)}>✕</span>
                  </div>
                  
                  {renderBlockEditor(b, template, updateBlock)}
                </div>
                
                {shape.hasBump && <div style={{ ...S.bump, borderTopColor: category.border }} />}
              </div>
            );
          })}
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
  root: { flex: 1, display: 'flex', flexDirection: 'column', background: '#17181d', color: '#eee' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderBottom: '1px solid #2a2d34' },
  tip: { background: '#222a', border: '1px solid #333', borderRadius: 8, padding: '2px 6px', fontSize: 12 },
  run: { background: '#3b82f6', border: 'none', color: '#fff', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 },

  viewport: { position: 'relative', width: '100%', height: '100%', overflow: 'hidden', cursor: 'grab' },
  canvas: { position: 'absolute', left: 0, top: 0, background: '#15161a', borderLeft: '1px solid #222', borderTop: '1px solid #222' },
  grid: { position: 'absolute', inset: 0, backgroundImage: `linear-gradient(to right, #222 1px, transparent 1px), linear-gradient(to bottom, #222 1px, transparent 1px)`, backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px` },

  block: { 
    position: 'absolute', 
    width: 280, 
    fontSize: 12, 
    lineHeight: 1.2, 
    userSelect: 'none',
    cursor: 'grab',
    transition: 'transform 0.1s, box-shadow 0.1s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
  },
  blockContent: { 
    padding: '8px 12px',
    position: 'relative',
    zIndex: 1
  },
  title: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 6, 
    fontWeight: 700,
    fontSize: 13,
    color: '#fff'
  },
  del: { 
    cursor: 'pointer', 
    padding: '2px 6px', 
    background: 'rgba(255,255,255,0.2)', 
    borderRadius: 4, 
    fontSize: 11,
    transition: 'background 0.2s'
  },

  editorContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4
  },
  row: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 6, 
    flexWrap: 'wrap'
  },
  chip: { 
    background: 'rgba(255,255,255,0.15)', 
    border: '1px solid rgba(255,255,255,0.2)', 
    borderRadius: 4, 
    padding: '2px 6px', 
    fontSize: 10,
    fontWeight: 600,
    color: '#fff'
  },
  select: { 
    background: 'rgba(0,0,0,0.3)', 
    color: '#fff', 
    border: '1px solid rgba(255,255,255,0.2)', 
    borderRadius: 4, 
    padding: '2px 6px', 
    fontSize: 11 
  },
  num: { 
    width: 60, 
    background: 'rgba(0,0,0,0.3)', 
    color: '#fff', 
    border: '1px solid rgba(255,255,255,0.2)', 
    borderRadius: 4, 
    padding: '2px 6px', 
    fontSize: 11 
  },
  textInput: {
    background: 'rgba(0,0,0,0.3)', 
    color: '#fff', 
    border: '1px solid rgba(255,255,255,0.2)', 
    borderRadius: 4, 
    padding: '2px 6px', 
    fontSize: 11,
    width: 100
  },
  hint: { 
    fontSize: 10, 
    opacity: 0.8, 
    marginTop: 4,
    fontStyle: 'italic'
  },

  // Scratch-like connectors
  notch: {
    position: 'absolute',
    top: -6,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 0,
    height: 0,
    borderLeft: '8px solid transparent',
    borderRight: '8px solid transparent',
    borderBottom: '6px solid',
    zIndex: 2
  },
  bump: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 0,
    height: 0,
    borderLeft: '8px solid transparent',
    borderRight: '8px solid transparent',
    borderTop: '6px solid',
    zIndex: 2
  }
};

function deepCopy(v){ return JSON.parse(JSON.stringify(v)); }
