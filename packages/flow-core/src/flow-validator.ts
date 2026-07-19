/**
 * Flow graph validation (plan §6.4 "Flow Validation Rules").
 *
 * The graph format matches what the React Flow canvas persists:
 *   { nodes: [{ id, type, config }], edges: [{ id, source, target, label? }] }
 */

export type FlowNodeType =
  // Triggers
  | 'trigger.conversation_started'
  | 'trigger.incoming_message'
  | 'trigger.keyword'
  // Messages
  | 'message.text'
  | 'message.image'
  | 'message.document'
  | 'message.buttons'
  | 'message.list'
  // Inputs
  | 'input.text'
  | 'input.email'
  | 'input.phone'
  | 'input.number'
  | 'input.date'
  | 'input.choice'
  | 'input.confirmation'
  // Logic
  | 'logic.condition'
  | 'logic.switch'
  | 'logic.wait'
  | 'logic.business_hours'
  // AI
  | 'ai.answer'
  | 'ai.intent'
  | 'ai.extract'
  | 'ai.rag_query'
  // Actions
  | 'action.set_variable'
  | 'action.add_tag'
  | 'action.remove_tag'
  | 'action.webhook'
  | 'action.handover'
  // Navigation
  | 'nav.go_to_flow'
  | 'nav.end';

export interface FlowNode {
  id: string;
  type: FlowNodeType | string;
  config?: Record<string, unknown>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface FlowValidationIssue {
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
}

const TRIGGER_PREFIX = 'trigger.';
const TERMINAL_TYPES = new Set(['nav.end', 'nav.go_to_flow', 'action.handover']);

/** Node types whose config must include the listed keys. */
const REQUIRED_CONFIG: Record<string, string[]> = {
  'trigger.keyword': ['keywords'],
  'message.text': ['text'],
  'message.image': ['url'],
  'message.document': ['url'],
  'message.buttons': ['text', 'buttons'],
  'message.list': ['text', 'items'],
  'input.text': ['prompt', 'variable'],
  'input.email': ['prompt', 'variable'],
  'input.phone': ['prompt', 'variable'],
  'input.number': ['prompt', 'variable'],
  'input.date': ['prompt', 'variable'],
  'input.choice': ['prompt', 'variable', 'options'],
  'input.confirmation': ['prompt', 'variable'],
  'logic.condition': ['condition'],
  'logic.switch': ['variable'],
  'logic.wait': ['seconds'],
  'action.set_variable': ['variable', 'value'],
  'action.add_tag': ['tag'],
  'action.remove_tag': ['tag'],
  'action.webhook': ['url', 'method', 'timeoutMs'],
  'ai.answer': ['fallbackBehavior'],
  'ai.intent': ['intents', 'fallbackBehavior'],
  'ai.extract': ['schema', 'fallbackBehavior'],
  'ai.rag_query': ['fallbackBehavior'],
  'nav.go_to_flow': ['flowId'],
};

export function validateFlowGraph(graph: FlowGraph): FlowValidationIssue[] {
  const issues: FlowValidationIssue[] = [];
  const nodes = graph.nodes ?? [];
  const edges = graph.edges ?? [];
  const nodeIds = new Set(nodes.map((n) => n.id));

  if (nodeIds.size !== nodes.length) {
    issues.push({ code: 'duplicate_node_ids', message: 'Node identifiers must be unique' });
  }

  // Exactly one trigger/start node.
  const triggers = nodes.filter((n) => n.type.startsWith(TRIGGER_PREFIX));
  if (triggers.length === 0) {
    issues.push({ code: 'missing_start', message: 'The flow must have exactly one trigger node' });
  } else if (triggers.length > 1) {
    issues.push({
      code: 'multiple_starts',
      message: 'The flow must have exactly one trigger node',
      nodeId: triggers[1].id,
    });
  }

  // No invalid edge references.
  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      issues.push({
        code: 'invalid_edge',
        message: `Edge references a missing node`,
        edgeId: edge.id,
      });
    }
  }

  // All required node fields are configured.
  for (const node of nodes) {
    const required = REQUIRED_CONFIG[node.type];
    if (!required) continue;
    for (const key of required) {
      const value = node.config?.[key];
      if (value === undefined || value === null || value === '') {
        issues.push({
          code: 'missing_config',
          message: `Node is missing required field "${key}"`,
          nodeId: node.id,
        });
      }
    }
  }

  // Every condition has a fallback branch (an edge labelled "else"/"fallback",
  // or at least two outgoing branches for a condition).
  for (const node of nodes) {
    if (node.type !== 'logic.condition' && node.type !== 'logic.switch') continue;
    const outgoing = edges.filter((e) => e.source === node.id);
    const hasFallback = outgoing.some((e) =>
      ['else', 'fallback', 'default'].includes((e.label ?? '').toLowerCase()),
    );
    if (!hasFallback) {
      issues.push({
        code: 'missing_fallback_branch',
        message: 'Condition and switch nodes must have a fallback ("else") branch',
        nodeId: node.id,
      });
    }
  }

  // Every executable node must be reachable from the trigger.
  if (triggers.length === 1) {
    const adjacency = new Map<string, string[]>();
    for (const edge of edges) {
      if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
      adjacency.get(edge.source)!.push(edge.target);
    }
    const reachable = new Set<string>();
    const queue = [triggers[0].id];
    while (queue.length > 0) {
      const current = queue.pop()!;
      if (reachable.has(current)) continue;
      reachable.add(current);
      for (const next of adjacency.get(current) ?? []) queue.push(next);
    }
    for (const node of nodes) {
      if (!reachable.has(node.id)) {
        issues.push({
          code: 'unreachable_node',
          message: 'Node is not reachable from the trigger',
          nodeId: node.id,
        });
      }
    }

    // Terminal coverage: at least one path must reach a terminal node.
    const hasTerminal = nodes.some((n) => reachable.has(n.id) && TERMINAL_TYPES.has(n.type));
    if (nodes.length > 1 && !hasTerminal) {
      issues.push({
        code: 'missing_end',
        message: 'The flow must reach an end, go-to-flow, or handover node',
      });
    }
  }

  return issues;
}
