/**
 * NeuralNetworkCanvas - Core visualization engine for AIDEN learning
 * Renders animated neural network with nodes and synaptic connections
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  NODE_COLORS,
  ANIMATION_CONFIG,
  applyForces,
  getControlPoint,
  bezierPoint,
  pulseValue,
  createNodesFromData,
  createDemoNodes,
} from './utils/neuralHelpers';

const NeuralNetworkCanvas = ({
  data = null,
  width = 800,
  height = 400,
  mode = 'ambient', // 'ambient' | 'interactive'
  showLabels = false,
  onNodeClick = null,
  onNodeHover = null,
  className = '',
  darkMode = true,
}) => {
  const canvasRef = useRef(null);
  const nodesRef = useRef([]);
  const connectionsRef = useRef([]);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const hoveredNodeRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const config = useMemo(() => ANIMATION_CONFIG[mode], [mode]);

  // Initialize nodes from data
  useEffect(() => {
    // Check if data is in the new API format (has nodes array directly)
    if (data && data.nodes?.length > 0) {
      // New API format: { nodes: [...], links: [...] }
      const nodes = data.nodes.map(node => ({
        ...node,
        x: node.x || (50 + Math.random() * (width - 100)),
        y: node.y || (50 + Math.random() * (height - 100)),
        radius: getNodeRadius(node.type, node.value),
        pulse: node.type === 'experience',
        vx: 0,
        vy: 0,
      }));

      nodesRef.current = nodes;
      connectionsRef.current = data.links || [];
    } else if (data && (data.patterns?.length > 0 || data.experiences?.length > 0 || data.knowledge?.length > 0)) {
      // Legacy format with patterns/experiences/knowledge arrays
      const { nodes, connections } = createNodesFromData(data, width, height);
      nodesRef.current = nodes;
      connectionsRef.current = connections;
    } else {
      // Create demo nodes if no data
      const { nodes, connections } = createDemoNodes(width, height, 20);
      nodesRef.current = nodes;
      connectionsRef.current = connections;
    }
    setIsInitialized(true);
  }, [data, width, height]);

  // Helper to get node radius by type
  const getNodeRadius = (type, value = 0.5) => {
    const baseSizes = {
      experience: 6,
      pattern: 12,
      knowledge: 18,
      bot: 25,
    };
    const base = baseSizes[type] || 10;
    return base + (value * base * 0.5);
  };

  // Create flowing particles for connections
  const createParticle = useCallback((connection) => {
    const source = nodesRef.current.find(n => n.id === connection.source);
    const target = nodesRef.current.find(n => n.id === connection.target);
    if (!source || !target) return null;

    return {
      connectionId: `${connection.source}-${connection.target}`,
      t: 0,
      speed: 0.005 + Math.random() * 0.01,
      source,
      target,
      control: getControlPoint(source, target, 0.2),
    };
  }, []);

  // Animation loop
  useEffect(() => {
    if (!canvasRef.current || !isInitialized) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set canvas resolution for sharp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    let lastTime = 0;

    const animate = (time) => {
      const deltaTime = time - lastTime;
      lastTime = time;

      // Clear canvas
      ctx.fillStyle = darkMode ? 'rgba(15, 23, 42, 1)' : 'rgba(248, 250, 252, 1)';
      ctx.fillRect(0, 0, width, height);

      // Apply physics
      applyForces(nodesRef.current, connectionsRef.current, width, height, config);

      // Update and spawn particles
      if (Math.random() > 0.95) {
        const randomConn = connectionsRef.current[Math.floor(Math.random() * connectionsRef.current.length)];
        if (randomConn) {
          const particle = createParticle(randomConn);
          if (particle) particlesRef.current.push(particle);
        }
      }

      // Draw connections
      connectionsRef.current.forEach(conn => {
        const source = nodesRef.current.find(n => n.id === conn.source);
        const target = nodesRef.current.find(n => n.id === conn.target);
        if (!source || !target) return;

        const control = getControlPoint(source, target, 0.15);
        const isHovered = hoveredNodeRef.current &&
          (hoveredNodeRef.current.id === source.id || hoveredNodeRef.current.id === target.id);

        // Draw connection line
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.quadraticCurveTo(control.x, control.y, target.x, target.y);

        const gradient = ctx.createLinearGradient(source.x, source.y, target.x, target.y);
        const sourceColor = NODE_COLORS[source.type]?.primary || '#6B7280';
        const targetColor = NODE_COLORS[target.type]?.primary || '#6B7280';
        gradient.addColorStop(0, `${sourceColor}40`);
        gradient.addColorStop(1, `${targetColor}40`);

        ctx.strokeStyle = isHovered ? '#8B5CF680' : gradient;
        ctx.lineWidth = isHovered ? 2 : 1;
        ctx.stroke();
      });

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter(p => {
        p.t += p.speed * config.particleSpeed;
        if (p.t >= 1) return false;

        // Recalculate source and target positions (they move)
        const source = nodesRef.current.find(n => n.id === p.source.id);
        const target = nodesRef.current.find(n => n.id === p.target.id);
        if (!source || !target) return false;

        const control = getControlPoint(source, target, 0.15);
        const pos = bezierPoint(p.t, source, control, target);

        // Draw particle
        const alpha = Math.sin(p.t * Math.PI);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139, 92, 246, ${alpha * config.glowIntensity})`;
        ctx.fill();

        // Particle glow
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139, 92, 246, ${alpha * 0.3 * config.glowIntensity})`;
        ctx.fill();

        return true;
      });

      // Draw nodes
      nodesRef.current.forEach(node => {
        const isHovered = hoveredNodeRef.current?.id === node.id;
        const colors = NODE_COLORS[node.type] || NODE_COLORS.pattern;
        const pulseAmount = node.pulse ? pulseValue(time / 1000, 1.5, node.id.charCodeAt(0)) : 0;
        const glowRadius = node.radius + 10 + (pulseAmount * 5 * config.glowIntensity);

        // Outer glow
        const glowGradient = ctx.createRadialGradient(
          node.x, node.y, node.radius * 0.5,
          node.x, node.y, glowRadius
        );
        glowGradient.addColorStop(0, `${colors.primary}${isHovered ? '80' : '40'}`);
        glowGradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();

        // Node body
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

        const bodyGradient = ctx.createRadialGradient(
          node.x - node.radius * 0.3, node.y - node.radius * 0.3, 0,
          node.x, node.y, node.radius
        );
        bodyGradient.addColorStop(0, `${colors.primary}FF`);
        bodyGradient.addColorStop(1, `${colors.primary}AA`);

        ctx.fillStyle = bodyGradient;
        ctx.fill();

        // Inner highlight
        ctx.beginPath();
        ctx.arc(node.x - node.radius * 0.2, node.y - node.radius * 0.2, node.radius * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();

        // Border
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.strokeStyle = isHovered ? '#FFFFFF' : `${colors.primary}`;
        ctx.lineWidth = isHovered ? 2 : 1;
        ctx.stroke();

        // Label (if enabled and hovered or interactive mode)
        if (showLabels || (isHovered && mode === 'interactive')) {
          ctx.font = '11px Inter, system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = darkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)';
          ctx.fillText(
            node.label?.substring(0, 25) || node.type,
            node.x,
            node.y + node.radius + 15
          );
        }
      });

      // Draw legend (bottom-left)
      const legendY = height - 60;
      const legendTypes = [
        { type: 'bot', label: 'Bot' },
        { type: 'experience', label: 'Experience' },
        { type: 'pattern', label: 'Pattern' },
        { type: 'knowledge', label: 'Knowledge' },
      ];

      ctx.font = '10px Inter, system-ui, sans-serif';
      legendTypes.forEach((item, idx) => {
        const x = 20 + idx * 90;
        const colors = NODE_COLORS[item.type];

        ctx.beginPath();
        ctx.arc(x, legendY, 5, 0, Math.PI * 2);
        ctx.fillStyle = colors.primary;
        ctx.fill();

        ctx.fillStyle = darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';
        ctx.textAlign = 'left';
        ctx.fillText(item.label, x + 10, legendY + 3);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isInitialized, width, height, mode, config, darkMode, showLabels, createParticle]);

  // Mouse interaction
  const handleMouseMove = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    mouseRef.current = { x, y };

    // Find hovered node
    const hoveredNode = nodesRef.current.find(node => {
      const dx = node.x - x;
      const dy = node.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= node.radius + 5;
    });

    if (hoveredNode !== hoveredNodeRef.current) {
      hoveredNodeRef.current = hoveredNode;
      if (onNodeHover) {
        onNodeHover(hoveredNode);
      }
    }
  }, [onNodeHover]);

  const handleClick = useCallback((e) => {
    if (hoveredNodeRef.current && onNodeClick) {
      onNodeClick(hoveredNodeRef.current);
    }
  }, [onNodeClick]);

  const handleMouseLeave = useCallback(() => {
    hoveredNodeRef.current = null;
    if (onNodeHover) {
      onNodeHover(null);
    }
  }, [onNodeHover]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className={`rounded-lg ${className}`}
      onMouseMove={mode === 'interactive' ? handleMouseMove : undefined}
      onClick={mode === 'interactive' ? handleClick : undefined}
      onMouseLeave={mode === 'interactive' ? handleMouseLeave : undefined}
    />
  );
};

export default NeuralNetworkCanvas;
