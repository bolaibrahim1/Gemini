import { FlowGraph, validateFlowGraph } from './flow-validator';

const validGraph: FlowGraph = {
  nodes: [
    { id: 'start', type: 'trigger.conversation_started' },
    { id: 'welcome', type: 'message.text', config: { text: 'أهلاً بك! كيف نساعدك؟' } },
    { id: 'ask', type: 'input.choice', config: { prompt: 'اختر خدمة', variable: 'service', options: ['sales', 'support'] } },
    { id: 'branch', type: 'logic.condition', config: { condition: { variable: 'service', operator: 'equals', value: 'sales' } } },
    { id: 'sales', type: 'message.text', config: { text: 'سيتواصل معك فريق المبيعات.' } },
    { id: 'end', type: 'nav.end' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'welcome' },
    { id: 'e2', source: 'welcome', target: 'ask' },
    { id: 'e3', source: 'ask', target: 'branch' },
    { id: 'e4', source: 'branch', target: 'sales', label: 'yes' },
    { id: 'e5', source: 'branch', target: 'end', label: 'else' },
    { id: 'e6', source: 'sales', target: 'end' },
  ],
};

describe('validateFlowGraph', () => {
  it('accepts a valid flow', () => {
    expect(validateFlowGraph(validGraph)).toEqual([]);
  });

  it('rejects a flow without a trigger', () => {
    const graph: FlowGraph = {
      nodes: validGraph.nodes.filter((n) => n.id !== 'start'),
      edges: validGraph.edges.filter((e) => e.source !== 'start'),
    };
    const codes = validateFlowGraph(graph).map((i) => i.code);
    expect(codes).toContain('missing_start');
  });

  it('rejects multiple triggers', () => {
    const graph: FlowGraph = {
      ...validGraph,
      nodes: [...validGraph.nodes, { id: 'start2', type: 'trigger.incoming_message' }],
      edges: [...validGraph.edges, { id: 'e7', source: 'start2', target: 'welcome' }],
    };
    const codes = validateFlowGraph(graph).map((i) => i.code);
    expect(codes).toContain('multiple_starts');
  });

  it('rejects edges pointing at missing nodes', () => {
    const graph: FlowGraph = {
      ...validGraph,
      edges: [...validGraph.edges, { id: 'bad', source: 'welcome', target: 'ghost' }],
    };
    const issues = validateFlowGraph(graph);
    expect(issues.some((i) => i.code === 'invalid_edge' && i.edgeId === 'bad')).toBe(true);
  });

  it('rejects unreachable nodes', () => {
    const graph: FlowGraph = {
      ...validGraph,
      nodes: [...validGraph.nodes, { id: 'orphan', type: 'message.text', config: { text: 'hi' } }],
    };
    const issues = validateFlowGraph(graph);
    expect(issues.some((i) => i.code === 'unreachable_node' && i.nodeId === 'orphan')).toBe(true);
  });

  it('rejects missing required config', () => {
    const graph: FlowGraph = {
      ...validGraph,
      nodes: validGraph.nodes.map((n) =>
        n.id === 'welcome' ? { ...n, config: {} } : n,
      ),
    };
    const issues = validateFlowGraph(graph);
    expect(issues.some((i) => i.code === 'missing_config' && i.nodeId === 'welcome')).toBe(true);
  });

  it('requires a fallback branch on conditions', () => {
    const graph: FlowGraph = {
      ...validGraph,
      edges: validGraph.edges.map((e) => (e.id === 'e5' ? { ...e, label: 'no' } : e)),
    };
    const issues = validateFlowGraph(graph);
    expect(issues.some((i) => i.code === 'missing_fallback_branch' && i.nodeId === 'branch')).toBe(
      true,
    );
  });
});
