// src/components/blocks/InventoryPanel.js
import React from 'react';
import { BLOCK_TEMPLATES } from './BlockTypes';

const CATEGORY = { bg:'#a14ebf', border:'#8e3aae', text:'#fff' };

export default function InventoryPanel() {
  const onDragStart = (e, key) => {
    e.dataTransfer.setData('text/plain', key);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div style={S.root}>
      <div style={S.header}>Blocks</div>

      {Object.entries(BLOCK_TEMPLATES).map(([key, templ]) => (
        <div key={key} draggable onDragStart={(e)=>onDragStart(e, key)}
             style={{ ...S.block, background:CATEGORY.bg, border:`2px solid ${CATEGORY.border}` }}
             title={templ.label}>
          <div style={S.tabTop}/>
          <div style={S.body}>
            <div style={S.title}>{templ.label}</div>
            {/* small preview */}
            <div style={S.preview}>
              IF {templ.data.cond?.always ? 'always' :
                `${templ.data.cond.sensor} ${templ.data.cond.metric} ${templ.data.cond.op} ${templ.data.cond.value}`
              } → speed {templ.data.act.accel} turn {templ.data.act.turn} {templ.data.act.steer}
            </div>
          </div>
          <div style={S.tabBottom}/>
        </div>
      ))}
    </div>
  );
}

const S = {
  root: { width: 260, background:'#1f2127', borderRight:'1px solid #2d2f36', padding:8, color:'#eaeaf0', overflowY:'auto' },
  header: { fontWeight:700, fontSize:13, letterSpacing:0.3, margin:'2px 0 8px', opacity:0.9 },
  block: { userSelect:'none', cursor:'grab', marginBottom:8, position:'relative', fontSize:12, lineHeight:1.2, borderRadius:10 },
  body: { padding:'6px 10px', color:'#fff' },
  title: { fontWeight:700, marginBottom:4 },
  preview: { fontSize:11, opacity:0.95 },

  tabTop: { height:6, background:'transparent', borderBottom:`6px solid ${CATEGORY.border}`, borderLeft:'6px solid transparent', borderRight:'6px solid transparent', margin:'-6px auto 0', width:36, borderRadius:'0 0 10px 10px' },
  tabBottom: { height:6, background:'transparent', borderTop:`6px solid ${CATEGORY.border}`, borderLeft:'6px solid transparent', borderRight:'6px solid transparent', margin:'0 auto -6px', width:36, borderRadius:'10px 10px 0 0' }
};
