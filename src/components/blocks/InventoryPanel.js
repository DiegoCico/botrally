// src/components/blocks/InventoryPanel.js
import React from 'react';
import { BLOCK_TEMPLATES } from './BlockTypes';

export default function InventoryPanel() {
  const onDragStart = (e, key) => {
    e.dataTransfer.setData('text/plain', key);
  };

  return (
    <div style={styles.root}>
      <h3 style={styles.title}>Inventory</h3>

      {Object.entries(BLOCK_TEMPLATES).map(([key, templ]) => (
        <div
          key={key}
          draggable
          onDragStart={(e) => onDragStart(e, key)}
          style={{ ...styles.item, ...(templ.type === 'RULE' ? styles.rule : styles.misc) }}
          title={`${templ.label} (${templ.type})`}
        >
          <div style={styles.itemTitle}>{templ.label}</div>
          {templ.type === 'RULE' && (
            <div style={styles.itemSub}>
              if: <code>{templ.data.condition}</code>
              <br />
              do: throttle=<code>{templ.data.throttle}</code>, steer=<code>{templ.data.steer}</code>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const styles = {
  root: { width: 280, padding: 12, borderRight: '1px solid #2d2f36', background: '#1f2127', color: '#eee', overflowY: 'auto' },
  title: { margin: '4px 0 12px 0' },
  item: { padding: 10, marginBottom: 8, borderRadius: 8, cursor: 'grab', userSelect: 'none' },
  rule: { background: '#2e3350', border: '1px solid #4a4f7a' },
  misc: { background: '#2b3a2c', border: '1px solid #426b47' },
  itemTitle: { fontWeight: 600, marginBottom: 4 },
  itemSub: { fontSize: 12, opacity: 0.9 }
};
