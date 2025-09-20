// src/components/blocks/BlockWorkbench.js
import React, { useMemo, useState } from 'react';
import InventoryPanel from './InventoryPanel';
import WorkspacePanel from './WorkspacePanel';
import { compileBlocksToProgram } from './compileProgram';

export default function BlockWorkbench({ onProgramCompiled }) {
  const [blocks, setBlocks] = useState(() => []);

  const handleCompile = () => {
    const program = compileBlocksToProgram(blocks);
    onProgramCompiled?.(program);
  };

  const count = useMemo(() => blocks.length, [blocks.length]);

  return (
    <div style={styles.root}>
      <InventoryPanel />
      <WorkspacePanel blocks={blocks} setBlocks={setBlocks} onCompile={handleCompile} />
    </div>
  );
}

const styles = {
  root: { display: 'flex', width: '100%', height: '100%', borderTop: '1px solid #2a2d34' }
};
