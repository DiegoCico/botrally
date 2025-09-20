// src/components/blocks/WorkspacePanel.js
import React, { useCallback } from 'react';
import { BLOCK_TEMPLATES, uid } from './BlockTypes';

export default function WorkspacePanel({ blocks, setBlocks, onCompile }) {
  const onDrop = (e) => {
    e.preventDefault();
    const key = e.dataTransfer.getData('text/plain');
    const templ = BLOCK_TEMPLATES[key];
    if (!templ) return;
    setBlocks(prev => [...prev, { id: uid(), type: templ.type, data: JSON.parse(JSON.stringify(templ.data || {})) }]);
  };
  const onDragOver = (e) => e.preventDefault();

  const updateField = useCallback((id, field, value) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, data: { ...b.data, [field]: value } } : b));
  }, [setBlocks]);

  const remove = (id) => setBlocks(prev => prev.filter(b => b.id !== id));

  const move = (id, dir) => {
    setBlocks(prev => {
      const i = prev.findIndex(b => b.id === id);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = prev.slice();
      const [item] = next.splice(i, 1);
      next.splice(j, 0, item);
      return next;
    });
  };

  return (
    <div style={styles.root} onDrop={onDrop} onDragOver={onDragOver}>
      <div style={styles.header}>
        <h3 style={{ margin: 0 }}>Workspace</h3>
        <button style={styles.compileBtn} onClick={onCompile}>Compile ▶</button>
      </div>

      {blocks.length === 0 && (
        <div style={styles.empty}>Drag blocks here to build behavior</div>
      )}

      {blocks.map((b, idx) => (
        <div key={b.id} style={{ ...styles.block, background: b.type === 'RULE' ? '#303553' : '#2c3a2e' }}>
          <div style={styles.blockHeader}>
            <span style={{ fontWeight: 700 }}>{b.type}</span>
            <div>
              <button onClick={() => move(b.id, -1)} style={styles.iconBtn} title="Move up">↑</button>
              <button onClick={() => move(b.id, +1)} style={styles.iconBtn} title="Move down">↓</button>
              <button onClick={() => remove(b.id)} style={styles.iconBtn} title="Delete">✕</button>
            </div>
          </div>

          {b.type === 'RULE' && (
            <>
              <LabeledInput label="Condition (if)" value={b.data.condition} onChange={v => updateField(b.id, 'condition', v)} />
              <div style={styles.twoCol}>
                <LabeledInput label="Throttle (−1..1)" value={b.data.throttle} onChange={v => updateField(b.id, 'throttle', v)} />
                <LabeledInput label="Steer (−1..1)" value={b.data.steer} onChange={v => updateField(b.id, 'steer', v)} />
              </div>
              <div style={styles.hint}>
                Vars: <code>f_min</code>, <code>l_min</code>, <code>r_min</code>, <code>f_avg</code>, <code>speed</code>.
                Use JS expressions: e.g. <code>(r_min - l_min) * 0.05</code>
              </div>
            </>
          )}

          {b.type === 'CONDITION' && (
            <LabeledInput label="Condition" value={b.data.condition} onChange={v => updateField(b.id, 'condition', v)} />
          )}

          {b.type === 'ACTION' && (
            <div style={styles.twoCol}>
              <LabeledInput label="Throttle (−1..1)" value={b.data.throttle} onChange={v => updateField(b.id, 'throttle', v)} />
              <LabeledInput label="Steer (−1..1)" value={b.data.steer} onChange={v => updateField(b.id, 'steer', v)} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function LabeledInput({ label, value, onChange }) {
  return (
    <label style={styles.label}>
      <div>{label}</div>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        style={styles.input}
        spellCheck={false}
      />
    </label>
  );
}

const styles = {
  root: { flex: 1, padding: 12, overflowY: 'auto', background: '#17181d', color: '#eee' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  compileBtn: { background: '#3b82f6', border: 'none', color: 'white', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' },
  empty: { opacity: 0.7, padding: 12, fontStyle: 'italic', border: '1px dashed #333', borderRadius: 8 },
  block: { border: '1px solid #444a', borderRadius: 10, padding: 10, marginBottom: 10 },
  blockHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  iconBtn: { marginLeft: 6, padding: '2px 6px', background: '#333a', border: '1px solid #5558', color: '#eee', borderRadius: 6, cursor: 'pointer' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  label: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 },
  input: { background: '#111418', color: '#eaeaf0', border: '1px solid #2d3040', borderRadius: 6, padding: '6px 8px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
  hint: { fontSize: 12, opacity: 0.8, marginTop: 6 }
};
