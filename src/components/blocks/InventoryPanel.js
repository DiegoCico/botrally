// Enhanced Scratch-like Inventory Panel
import React, { useState } from 'react';
import { BLOCK_TEMPLATES, CATEGORIES, getBlockCategory, getBlockShape } from './BlockTypes';

export default function InventoryPanel() {
  const [selectedCategory, setSelectedCategory] = useState('MOTION');

  const onDragStart = (e, key) => {
    e.dataTransfer.setData('text/plain', key);
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Group blocks by category
  const blocksByCategory = Object.entries(BLOCK_TEMPLATES).reduce((acc, [key, template]) => {
    const category = template.category || 'CONTROL';
    if (!acc[category]) acc[category] = [];
    acc[category].push([key, template]);
    return acc;
  }, {});

  const renderBlock = (key, template) => {
    const category = getBlockCategory(key);
    const shape = getBlockShape(key);
    
    return (
      <div
        key={key}
        draggable
        onDragStart={(e) => onDragStart(e, key)}
        style={{
          ...S.block,
          background: category.color,
          border: `2px solid ${category.border}`,
          borderRadius: shape.rounded ? '16px' : shape.hexagon ? '0' : '8px',
          clipPath: shape.hexagon ? 'polygon(20% 0%, 80% 0%, 100% 50%, 80% 100%, 20% 100%, 0% 50%)' : 'none'
        }}
        title={template.label}
      >
        {shape.hasNotch && <div style={{ ...S.notch, borderBottomColor: category.border }} />}
        
        <div style={S.body}>
          <div style={S.title}>{template.label}</div>
          <div style={S.preview}>
            {renderBlockPreview(template)}
          </div>
        </div>
        
        {shape.hasBump && <div style={{ ...S.bump, borderTopColor: category.border }} />}
      </div>
    );
  };

  const renderBlockPreview = (template) => {
    switch (template.type) {
      case 'MOTION':
        return `Speed: ${template.data.speed || 'N/A'}`;
      case 'SENSING':
        return `Sensor: ${template.data.side || 'forward'}`;
      case 'CONTROL':
        return 'Control flow';
      case 'LOGIC':
        return 'Logic operation';
      case 'VARIABLES':
        return `Var: ${template.data.name || 'variable'}`;
      case 'EVENTS':
        return 'Event trigger';
      case 'RULE':
        const cond = template.data.cond;
        const act = template.data.act;
        if (cond?.always) return 'Always → action';
        return `${cond?.sensor} ${cond?.op} ${cond?.value} → ${act?.accel}`;
      default:
        return 'Block';
    }
  };

  return (
    <div style={S.root}>
      <div style={S.header}>Block Palette</div>
      
      {/* Category Tabs */}
      <div style={S.categoryTabs}>
        {Object.entries(CATEGORIES).map(([key, category]) => (
          <button
            key={key}
            style={{
              ...S.categoryTab,
              background: selectedCategory === key ? category.color : '#2a2d34',
              color: selectedCategory === key ? '#fff' : '#aaa',
              borderColor: category.border
            }}
            onClick={() => setSelectedCategory(key)}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Blocks for selected category */}
      <div style={S.blocksContainer}>
        {blocksByCategory[selectedCategory]?.map(([key, template]) => 
          renderBlock(key, template)
        )}
      </div>
    </div>
  );
}

const S = {
  root: { 
    width: 280, 
    background: '#1f2127', 
    borderRight: '1px solid #2d2f36', 
    padding: 8, 
    color: '#eaeaf0', 
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column'
  },
  header: { 
    fontWeight: 700, 
    fontSize: 14, 
    letterSpacing: 0.3, 
    margin: '2px 0 12px', 
    opacity: 0.9 
  },
  categoryTabs: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 12
  },
  categoryTab: {
    border: '1px solid',
    borderRadius: 6,
    padding: '4px 8px',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    background: 'none',
    transition: 'all 0.2s'
  },
  blocksContainer: {
    flex: 1,
    overflowY: 'auto'
  },
  block: { 
    userSelect: 'none', 
    cursor: 'grab', 
    marginBottom: 8, 
    position: 'relative', 
    fontSize: 12, 
    lineHeight: 1.2,
    minHeight: 32,
    transition: 'transform 0.1s',
    '&:hover': {
      transform: 'scale(1.02)'
    }
  },
  body: { 
    padding: '8px 12px', 
    color: '#fff' 
  },
  title: { 
    fontWeight: 700, 
    marginBottom: 2,
    fontSize: 12
  },
  preview: { 
    fontSize: 10, 
    opacity: 0.9,
    fontStyle: 'italic'
  },
  notch: {
    position: 'absolute',
    top: -6,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 0,
    height: 0,
    borderLeft: '8px solid transparent',
    borderRight: '8px solid transparent',
    borderBottom: '6px solid'
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
    borderTop: '6px solid'
  }
};
