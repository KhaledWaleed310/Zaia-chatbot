/**
 * Neural Network Visualization Helpers
 * Math utilities for positioning, physics, and curve calculations
 */

// Node type colors
export const NODE_COLORS = {
  experience: { primary: '#06B6D4', glow: 'rgba(6, 182, 212, 0.6)' },   // Cyan
  pattern: { primary: '#8B5CF6', glow: 'rgba(139, 92, 246, 0.6)' },     // Purple
  knowledge: { primary: '#F59E0B', glow: 'rgba(245, 158, 11, 0.6)' },   // Gold
  bot: { primary: '#3B82F6', glow: 'rgba(59, 130, 246, 0.6)' },         // Blue
  connection: { primary: '#4B5563', active: '#8B5CF6' },                 // Gray / Purple
};

// Animation configuration
export const ANIMATION_CONFIG = {
  ambient: {
    nodeMovement: 0.3,
    connectionPulse: 0.5,
    particleSpeed: 0.5,
    glowIntensity: 0.4,
  },
  interactive: {
    nodeMovement: 1.0,
    connectionPulse: 1.0,
    particleSpeed: 1.5,
    glowIntensity: 1.0,
  },
};

/**
 * Generate random position within bounds
 */
export const randomPosition = (width, height, padding = 50) => ({
  x: padding + Math.random() * (width - padding * 2),
  y: padding + Math.random() * (height - padding * 2),
});

/**
 * Calculate distance between two points
 */
export const distance = (p1, p2) => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Normalize a vector
 */
export const normalize = (v) => {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  return len > 0 ? { x: v.x / len, y: v.y / len } : { x: 0, y: 0 };
};

/**
 * Apply force-directed layout physics
 */
export const applyForces = (nodes, connections, width, height, config = ANIMATION_CONFIG.ambient) => {
  const repulsion = 2000;
  const attraction = 0.01;
  const damping = 0.9;
  const centerGravity = 0.001;

  // Reset velocities
  nodes.forEach(node => {
    if (!node.vx) node.vx = 0;
    if (!node.vy) node.vy = 0;
  });

  // Repulsion between nodes
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[j].x - nodes[i].x;
      const dy = nodes[j].y - nodes[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = repulsion / (dist * dist);
      const fx = (dx / dist) * force * config.nodeMovement;
      const fy = (dy / dist) * force * config.nodeMovement;

      nodes[i].vx -= fx;
      nodes[i].vy -= fy;
      nodes[j].vx += fx;
      nodes[j].vy += fy;
    }
  }

  // Attraction along connections
  connections.forEach(conn => {
    const source = nodes.find(n => n.id === conn.source);
    const target = nodes.find(n => n.id === conn.target);
    if (!source || !target) return;

    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const force = dist * attraction * config.nodeMovement;

    source.vx += (dx / dist) * force;
    source.vy += (dy / dist) * force;
    target.vx -= (dx / dist) * force;
    target.vy -= (dy / dist) * force;
  });

  // Center gravity
  const centerX = width / 2;
  const centerY = height / 2;
  nodes.forEach(node => {
    node.vx += (centerX - node.x) * centerGravity;
    node.vy += (centerY - node.y) * centerGravity;
  });

  // Apply velocities with damping
  nodes.forEach(node => {
    if (node.fixed) return;
    node.vx *= damping;
    node.vy *= damping;
    node.x += node.vx;
    node.y += node.vy;

    // Keep within bounds
    const padding = node.radius || 20;
    node.x = Math.max(padding, Math.min(width - padding, node.x));
    node.y = Math.max(padding, Math.min(height - padding, node.y));
  });
};

/**
 * Calculate quadratic bezier curve point
 */
export const bezierPoint = (t, p0, p1, p2) => {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
};

/**
 * Calculate control point for curved connection
 */
export const getControlPoint = (source, target, curvature = 0.3) => {
  const midX = (source.x + target.x) / 2;
  const midY = (source.y + target.y) / 2;
  const dx = target.x - source.x;
  const dy = target.y - source.y;

  // Perpendicular offset
  return {
    x: midX - dy * curvature,
    y: midY + dx * curvature,
  };
};

/**
 * Ease in-out function
 */
export const easeInOut = (t) => {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

/**
 * Pulse animation value (0-1)
 */
export const pulseValue = (time, frequency = 1, phase = 0) => {
  return (Math.sin((time * frequency + phase) * Math.PI * 2) + 1) / 2;
};

/**
 * Generate node size based on importance/confidence
 */
export const getNodeSize = (type, value = 0.5) => {
  const baseSizes = {
    experience: 6,
    pattern: 12,
    knowledge: 18,
    bot: 30,
  };
  const base = baseSizes[type] || 10;
  return base + (value * base * 0.5);
};

/**
 * Convert learning data to visualization nodes
 */
export const createNodesFromData = (data, width, height) => {
  const nodes = [];
  const connections = [];

  // Add experience nodes (recent, smaller)
  if (data.experiences) {
    data.experiences.forEach((exp, i) => {
      nodes.push({
        id: `exp-${exp.id || i}`,
        type: 'experience',
        label: exp.user_message?.substring(0, 30) || 'Experience',
        x: randomPosition(width, height).x,
        y: randomPosition(width, height).y,
        radius: getNodeSize('experience', exp.importance_score || 0.5),
        value: exp.importance_score || 0.5,
        pulse: true,
      });
    });
  }

  // Add pattern nodes (medium, connected to experiences)
  if (data.patterns) {
    data.patterns.forEach((pattern, i) => {
      const nodeId = `pattern-${pattern.id || i}`;
      nodes.push({
        id: nodeId,
        type: 'pattern',
        label: pattern.pattern_description?.substring(0, 40) || pattern.pattern_type,
        x: randomPosition(width, height).x,
        y: randomPosition(width, height).y,
        radius: getNodeSize('pattern', pattern.confidence || 0.5),
        value: pattern.confidence || 0.5,
        evidenceCount: pattern.evidence_count || 0,
      });

      // Connect patterns to some experiences
      const expNodes = nodes.filter(n => n.type === 'experience');
      if (expNodes.length > 0) {
        const connectCount = Math.min(3, expNodes.length);
        for (let j = 0; j < connectCount; j++) {
          const expNode = expNodes[Math.floor(Math.random() * expNodes.length)];
          connections.push({
            source: expNode.id,
            target: nodeId,
            strength: pattern.confidence || 0.5,
          });
        }
      }
    });
  }

  // Add knowledge nodes (large, connected to patterns)
  if (data.knowledge) {
    data.knowledge.forEach((know, i) => {
      const nodeId = `knowledge-${know.id || i}`;
      nodes.push({
        id: nodeId,
        type: 'knowledge',
        label: know.description?.substring(0, 50) || know.level,
        x: width / 2 + (Math.random() - 0.5) * 200,
        y: height / 2 + (Math.random() - 0.5) * 200,
        radius: getNodeSize('knowledge', know.confidence || 0.7),
        value: know.confidence || 0.7,
        level: know.level,
      });

      // Connect knowledge to patterns
      const patternNodes = nodes.filter(n => n.type === 'pattern');
      if (patternNodes.length > 0) {
        const connectCount = Math.min(2, patternNodes.length);
        for (let j = 0; j < connectCount; j++) {
          const patternNode = patternNodes[Math.floor(Math.random() * patternNodes.length)];
          connections.push({
            source: patternNode.id,
            target: nodeId,
            strength: know.confidence || 0.7,
          });
        }
      }
    });
  }

  return { nodes, connections };
};

/**
 * Create demo/placeholder nodes when no data
 */
export const createDemoNodes = (width, height, count = 15) => {
  const nodes = [];
  const connections = [];
  const types = ['experience', 'experience', 'experience', 'pattern', 'pattern', 'knowledge'];

  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    nodes.push({
      id: `demo-${i}`,
      type,
      label: `${type} ${i + 1}`,
      x: randomPosition(width, height).x,
      y: randomPosition(width, height).y,
      radius: getNodeSize(type, 0.5 + Math.random() * 0.5),
      value: 0.5 + Math.random() * 0.5,
    });

    // Create some connections
    if (i > 0 && Math.random() > 0.3) {
      const targetIdx = Math.floor(Math.random() * i);
      connections.push({
        source: nodes[targetIdx].id,
        target: nodes[i].id,
        strength: 0.5 + Math.random() * 0.5,
      });
    }
  }

  return { nodes, connections };
};

export default {
  NODE_COLORS,
  ANIMATION_CONFIG,
  randomPosition,
  distance,
  normalize,
  applyForces,
  bezierPoint,
  getControlPoint,
  easeInOut,
  pulseValue,
  getNodeSize,
  createNodesFromData,
  createDemoNodes,
};
