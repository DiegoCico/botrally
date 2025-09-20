// src/components/blocks/WorkspacePanel.js
import React, { useCallback } from 'react';
import { BLOCK_TEMPLATES, uid } from './BlockTypes';

export default function WorkspacePanel({ blocks, setBlocks, onCompile }) {
  const onDrop = (e) => {
    e.preventDefault();
    const key = e.dataTransfer.getData('text/plain');
    const templ = BLOCK_TEMPLATES[key];
    if (!templ) return;
    setBlocks(prev => [
      ...prev,
      { id: uid(), type: templ.type, data: JSON.parse(JSON.stringify(templ.data || {})) }
    ]);
  };
  const onDragOver = (e) => e.preventDefault();

  const updateField = useCallback((id, field, value) => {
    setBlocks(prev =>
      prev.map(b => (b.id === id ? { ...b, data: { ...b.data, [field]: value } } : b))
    );
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
        <button style={styles.compileBtn} onClick={onCompile}>▶ Run</button>
      </div>

      {blocks.length === 0 && (
        <div style={styles.empty}>Drag blocks here</div>
      )}

      {blocks.map((b) => (
        <div key={b.id} style={{ ...styles.block, ...(b.type === 'RULE' ? styles.rule : styles.misc) }}>
          <div style={styles.tabTop}></div>

          <div style={styles.blockBody}>
            <div style={styles.blockTitle}>
              {b.type}
              <div style={styles.controls}>
                <span style={styles.ctrlBtn} onClick={() => move(b.id, -1)} title="Move up">↑</span>
                <span style={styles.ctrlBtn} onClick={() => move(b.id, +1)} title="Move down">↓</span>
                <span style={styles.ctrlBtn} onClick={() => remove(b.id)} title="Delete">✕</span>
              </div>
            </div>

            {b.type === 'RULE' && (
              <>
                <LabeledInput
                  label="Condition"
                  value={b.data.condition}
                  onChange={v => updateField(b.id, 'condition', v)}
                />
                <div style={styles.twoCol}>
                  <LabeledInput
                    label="Throttle (−1..1)"
                    value={b.data.throttle}
                    onChange={v => updateField(b.id, 'throttle', v)}
                  />
                  <LabeledInput
                    label="Steer (−1..1)"
                    value={b.data.steer}
                    onChange={v => updateField(b.id, 'steer', v)}
                  />
                </div>
                <div style={styles.hint}>
                  Vars: <code>f_min</code>, <code>l_min</code>, <code>r_min</code>, <code>f_avg</code>, <code>speed</code>
                </div>
              </>
            )}
          </div>

          <div style={styles.tabBottom}></div>
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

const PURPLE = { bg: '#a14ebf', border: '#8e3aae' };

const styles = {
  root: { flex: 1, padding: 8, overflowY: 'auto', background: '#17181d', color: '#eee' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  compileBtn: { background: '#3b82f6', border: 'none', color: 'white', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 },

  empty: { opacity: 0.7, padding: 12, fontStyle: 'italic', border: '2px dashed #333', borderRadius: 10, textAlign: 'center' },

  block: { marginBottom: 8, position: 'relative', fontSize: 12, lineHeight: 1.2, borderRadius: 10 },
  blockBody: { padding: '6px 10px', borderRadius: 10 },

  blockTitle: { display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontWeight: 700 },
  controls: { display: 'flex', gap: 4 },
  ctrlBtn: { cursor: 'pointer', padding: '0 4px', background: '#0003', borderRadius: 4, fontSize: 11 },

  rule: { background: PURPLE.bg, border: `2px solid ${PURPLE.border}` },
  misc: { background: '#2c3a2e', border: '2px solid #1e271f' },

  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 },
  label: { display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11 },
  input: { background: '#111418', color: '#eaeaf0', border: '1px solid #2d3040', borderRadius: 4, padding: '2px 4px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 11 },
  hint: { fontSize: 11, opacity: 0.85, marginTop: 4 },

  // compact puzzle connectors
  tabTop: {
    height: 6,
    background: 'transparent',
    borderBottom: `6px solid ${PURPLE.border}`,
    borderLeft: '6px solid transparent',
    borderRight: '6px solid transparent',
    margin: '-6px auto 0 auto',
    width: 36,
    borderRadius: '0 0 10px 10px'
  },
  tabBottom: {
    height: 6,
    background: 'transparent',
    borderTop: `6px solid ${PURPLE.border}`,
    borderLeft: '6px solid transparent',
    borderRight: '6px solid transparent',
    margin: '0 auto -6px auto',
    width: 36,
    borderRadius: '10px 10px 0 0'
  }
};
