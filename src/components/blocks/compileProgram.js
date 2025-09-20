// src/blocks/compileProgram.js
/**
 * Workspace model: array of block instances in order.
 * Each block: { id, type, data }
 * We compile only RULE blocks (others are editable pieces the user can use to replace).
 */
export function compileBlocksToProgram(blocks) {
    const rules = blocks.filter(b => b.type === 'RULE');
    // Translate to BlockRuntime program format
    return rules.map(r => ({
      if: (r.data?.condition ?? 'true'),
      then: {
        throttle: (r.data?.throttle ?? '0'),
        steer: (r.data?.steer ?? '0')
      }
    }));
  }
  