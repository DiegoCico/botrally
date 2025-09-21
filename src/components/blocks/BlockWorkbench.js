// src/components/blocks/BlockWorkbench.js
import React, { useState } from 'react';
import InventoryPanel from './InventoryPanel';
import BlockCanvasPanel from './BlockCanvasPanel';
import { compileBlocksToProgram } from './compileProgram';

export default function BlockWorkbench({ onProgramCompiled, isRunning, hasProgram, onRunToggle, onStop }) {
  const [blocks, setBlocks] = useState([]);

  const handleCompile = () => {
    const ordered = [...blocks].sort((a, b) => (a.y ?? 0) - (b.y ?? 0) || (a.x ?? 0) - (b.x ?? 0));
    const program = compileBlocksToProgram(ordered);
    onProgramCompiled?.(program);
  };

  return (
    <div style={{ display:'flex', width:'100%', height:'100%', borderTop:'1px solid #2a2d34' }}>
      <InventoryPanel />
      <BlockCanvasPanel 
        blocks={blocks} 
        setBlocks={setBlocks} 
        onCompile={handleCompile}
        isRunning={isRunning}
        hasProgram={hasProgram}
        onRunToggle={onRunToggle}
        onStop={onStop}
      />
    </div>
  );
}
