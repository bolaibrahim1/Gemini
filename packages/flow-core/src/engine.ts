/**
 * Durable flow execution engine (plan §6.4 "Flow Execution States",
 * "Execution Requirements" and §6.5 "Conversation Engine").
 *
 * The engine is pure: `tick` takes the graph, the current serialized state,
 * an optional inbound input, and a context, and returns the next state plus
 * the outbound messages, side effects, and a step trace. Persistence, queues,
 * and channels live in the callers (API simulator, flow worker), which makes
 * the engine deterministic and unit-testable, and lets state be stored as
 * JSON and resumed after a worker restart.
 */

import { FlowEdge, FlowGraph, FlowNode } from './flow-validator';

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type Variables = Record<string, JsonValue>;

export type ExecutionStatus =
  | 'created'
  | 'running'
  | 'waiting_input'
  | 'handed_over'
  | 'completed'
  | 'failed';

export interface EngineState {
  status: ExecutionStatus;
  /** Node to execute next while running. */
  currentNodeId: string | null;
  /** Input node the execution is parked on while waiting_input. */
  waitingNodeId: string | null;
  variables: Variables;
  stepCount: number;
  error?: string;
}

export interface EngineContext {
  now: Date;
  /** IANA timezone used by business-hours checks. */
  timezone: string;
  contact: {
    attributes: Record<string, JsonValue>;
    tags: string[];
  };
  language: 'ar' | 'en';
}

export interface OutboundMessage {
  type: 'text' | 'image' | 'document' | 'buttons' | 'list';
  content: Record<string, JsonValue>;
}

export type EngineEffect =
  | { type: 'add_tag'; tag: string }
  | { type: 'remove_tag'; tag: string }
  | { type: 'handover'; departmentId?: string; reason?: string }
  | { type: 'webhook_requested'; nodeId: string; url: string; method: string };

export interface StepTrace {
  nodeId: string;
  nodeType: string;
  status: 'ok' | 'waiting' | 'failed' | 'skipped';
  detail?: string;
}

export interface TickResult {
  state: EngineState;
  outputs: OutboundMessage[];
  effects: EngineEffect[];
  steps: StepTrace[];
}

/** Hard ceiling on nodes executed in a single execution (plan §6.4). */
export const MAX_EXECUTION_STEPS = 100;

const FALLBACK_MESSAGES = {
  ar: {
    invalidEmail: 'عذراً، البريد الإلكتروني غير صحيح. حاول مرة أخرى.',
    invalidPhone: 'عذراً، رقم الهاتف غير صحيح. حاول مرة أخرى.',
    invalidNumber: 'عذراً، الرجاء إدخال رقم صحيح.',
    invalidDate: 'عذراً، الرجاء إدخال تاريخ صحيح.',
    invalidChoice: 'عذراً، الرجاء الاختيار من الخيارات المتاحة.',
    invalidConfirmation: 'الرجاء الإجابة بنعم أو لا.',
    aiUnavailable: 'عذراً، لا يمكنني الإجابة الآن. سيتم تحويلك إلى أحد موظفينا.',
  },
  en: {
    invalidEmail: 'Sorry, that email address is not valid. Please try again.',
    invalidPhone: 'Sorry, that phone number is not valid. Please try again.',
    invalidNumber: 'Sorry, please enter a valid number.',
    invalidDate: 'Sorry, please enter a valid date.',
    invalidChoice: 'Sorry, please pick one of the available options.',
    invalidConfirmation: 'Please answer yes or no.',
    aiUnavailable: 'Sorry, I cannot answer right now. You will be connected to an agent.',
  },
} as const;

const YES_WORDS = new Set(['yes', 'y', 'نعم', 'اي', 'أيوة', 'ايوه', 'اه', 'ok', 'تمام']);
const NO_WORDS = new Set(['no', 'n', 'لا', 'مش', 'كلا']);

export function startExecution(): EngineState {
  return {
    status: 'created',
    currentNodeId: null,
    waitingNodeId: null,
    variables: {},
    stepCount: 0,
  };
}

/**
 * Advance the execution as far as possible: process a pending input if the
 * execution is waiting for one, then execute nodes until the flow waits,
 * completes, hands over, fails, or hits the step limit.
 */
export function tick(
  graph: FlowGraph,
  previous: EngineState,
  input: string | null,
  ctx: EngineContext,
): TickResult {
  const state: EngineState = {
    ...previous,
    variables: { ...previous.variables },
  };
  const outputs: OutboundMessage[] = [];
  const effects: EngineEffect[] = [];
  const steps: StepTrace[] = [];
  const nodesById = new Map(graph.nodes.map((n) => [n.id, n]));
  const messages = FALLBACK_MESSAGES[ctx.language] ?? FALLBACK_MESSAGES.ar;

  // Resolve a fresh start.
  if (state.status === 'created') {
    const trigger = graph.nodes.find((n) => n.type.startsWith('trigger.'));
    if (!trigger) {
      return fail(state, outputs, effects, steps, 'Flow has no trigger node');
    }
    steps.push({ nodeId: trigger.id, nodeType: trigger.type, status: 'ok' });
    state.currentNodeId = nextNodeId(graph.edges, trigger.id);
    state.status = 'running';
  }

  // Consume the pending input if we are parked on an input node.
  if (state.status === 'waiting_input') {
    if (input === null || input === undefined) {
      // Nothing to consume; stay parked.
      return { state, outputs, effects, steps };
    }
    const waitingNode = state.waitingNodeId ? nodesById.get(state.waitingNodeId) : undefined;
    if (!waitingNode) {
      return fail(state, outputs, effects, steps, 'Waiting node no longer exists in the flow');
    }
    const parsed = parseInput(waitingNode, input, messages);
    if (!parsed.valid) {
      outputs.push({ type: 'text', content: { text: parsed.reprompt ?? '' } });
      steps.push({
        nodeId: waitingNode.id,
        nodeType: waitingNode.type,
        status: 'waiting',
        detail: 'invalid_input',
      });
      return { state, outputs, effects, steps };
    }
    const variable = String(waitingNode.config?.variable ?? '');
    if (variable) state.variables[variable] = parsed.value ?? null;
    steps.push({ nodeId: waitingNode.id, nodeType: waitingNode.type, status: 'ok' });
    state.currentNodeId = nextNodeId(graph.edges, waitingNode.id);
    state.waitingNodeId = null;
    state.status = 'running';
  }

  // Main execution loop.
  while (state.status === 'running') {
    if (state.currentNodeId === null) {
      state.status = 'completed';
      break;
    }
    if (state.stepCount >= MAX_EXECUTION_STEPS) {
      return fail(state, outputs, effects, steps, 'Maximum execution step limit reached');
    }
    const node = nodesById.get(state.currentNodeId);
    if (!node) {
      return fail(state, outputs, effects, steps, `Node "${state.currentNodeId}" not found`);
    }
    state.stepCount += 1;

    const result = executeNode(node, graph.edges, state, ctx, messages);
    outputs.push(...result.outputs);
    effects.push(...result.effects);
    steps.push(result.step);

    if (result.terminal) {
      state.status = result.terminal;
      state.currentNodeId = null;
      break;
    }
    if (result.wait) {
      state.status = 'waiting_input';
      state.waitingNodeId = node.id;
      state.currentNodeId = null;
      break;
    }
    state.currentNodeId = result.nextNodeId;
  }

  return { state, outputs, effects, steps };
}

interface NodeResult {
  outputs: OutboundMessage[];
  effects: EngineEffect[];
  step: StepTrace;
  nextNodeId: string | null;
  wait?: boolean;
  terminal?: Extract<ExecutionStatus, 'completed' | 'handed_over'>;
}

function executeNode(
  node: FlowNode,
  edges: FlowEdge[],
  state: EngineState,
  ctx: EngineContext,
  messages: (typeof FALLBACK_MESSAGES)['ar'] | (typeof FALLBACK_MESSAGES)['en'],
): NodeResult {
  const cfg = node.config ?? {};
  const vars = { ...ctx.contact.attributes, ...state.variables };
  const ok = (extra?: Partial<NodeResult>): NodeResult => ({
    outputs: [],
    effects: [],
    step: { nodeId: node.id, nodeType: node.type, status: 'ok' },
    nextNodeId: nextNodeId(edges, node.id),
    ...extra,
  });

  switch (node.type) {
    case 'message.text':
      return ok({
        outputs: [{ type: 'text', content: { text: interpolate(String(cfg.text ?? ''), vars) } }],
      });

    case 'message.image':
    case 'message.document': {
      const type = node.type === 'message.image' ? 'image' : 'document';
      return ok({
        outputs: [
          {
            type,
            content: {
              url: String(cfg.url ?? ''),
              caption: interpolate(String(cfg.caption ?? ''), vars),
            },
          },
        ],
      });
    }

    case 'message.buttons':
      return ok({
        outputs: [
          {
            type: 'buttons',
            content: {
              text: interpolate(String(cfg.text ?? ''), vars),
              buttons: (cfg.buttons as JsonValue) ?? [],
            },
          },
        ],
      });

    case 'message.list':
      return ok({
        outputs: [
          {
            type: 'list',
            content: {
              text: interpolate(String(cfg.text ?? ''), vars),
              items: (cfg.items as JsonValue) ?? [],
            },
          },
        ],
      });

    case 'input.text':
    case 'input.email':
    case 'input.phone':
    case 'input.number':
    case 'input.date':
    case 'input.choice':
    case 'input.confirmation': {
      const outputs: OutboundMessage[] = [
        { type: 'text', content: { text: interpolate(String(cfg.prompt ?? ''), vars) } },
      ];
      if (node.type === 'input.choice' && Array.isArray(cfg.options)) {
        outputs[0] = {
          type: 'buttons',
          content: {
            text: interpolate(String(cfg.prompt ?? ''), vars),
            buttons: cfg.options as JsonValue,
          },
        };
      }
      return {
        outputs,
        effects: [],
        step: { nodeId: node.id, nodeType: node.type, status: 'waiting' },
        nextNodeId: null,
        wait: true,
      };
    }

    case 'logic.condition': {
      const condition = cfg.condition as
        | { variable: string; operator: string; value?: JsonValue }
        | undefined;
      const matched = condition ? evaluateCondition(condition, vars, ctx) : false;
      return ok({
        nextNodeId: branchTarget(edges, node.id, matched),
        step: {
          nodeId: node.id,
          nodeType: node.type,
          status: 'ok',
          detail: matched ? 'matched' : 'fallback',
        },
      });
    }

    case 'logic.switch': {
      const value = String(vars[String(cfg.variable ?? '')] ?? '');
      const outgoing = edges.filter((e) => e.source === node.id);
      const match = outgoing.find((e) => (e.label ?? '') === value);
      const fallback = outgoing.find((e) =>
        ['else', 'fallback', 'default'].includes((e.label ?? '').toLowerCase()),
      );
      return ok({
        nextNodeId: (match ?? fallback)?.target ?? null,
        step: {
          nodeId: node.id,
          nodeType: node.type,
          status: 'ok',
          detail: match ? `case:${value}` : 'fallback',
        },
      });
    }

    case 'logic.wait':
      // v0 executes waits immediately; the worker will translate this into a
      // delayed job once scheduled continuations land.
      return ok({
        step: { nodeId: node.id, nodeType: node.type, status: 'skipped', detail: 'wait_not_scheduled' },
      });

    case 'logic.business_hours': {
      const within = isWithinBusinessHours(cfg, ctx);
      return ok({
        nextNodeId: branchTarget(edges, node.id, within),
        step: {
          nodeId: node.id,
          nodeType: node.type,
          status: 'ok',
          detail: within ? 'within_hours' : 'outside_hours',
        },
      });
    }

    case 'action.set_variable': {
      const name = String(cfg.variable ?? '');
      if (name) state.variables[name] = interpolate(String(cfg.value ?? ''), vars);
      return ok();
    }

    case 'action.add_tag':
      return ok({ effects: [{ type: 'add_tag', tag: String(cfg.tag ?? '') }] });

    case 'action.remove_tag':
      return ok({ effects: [{ type: 'remove_tag', tag: String(cfg.tag ?? '') }] });

    case 'action.handover':
      return {
        outputs: cfg.message
          ? [{ type: 'text', content: { text: interpolate(String(cfg.message), vars) } }]
          : [],
        effects: [
          {
            type: 'handover',
            departmentId: cfg.departmentId ? String(cfg.departmentId) : undefined,
            reason: cfg.reason ? String(cfg.reason) : undefined,
          },
        ],
        step: { nodeId: node.id, nodeType: node.type, status: 'ok' },
        nextNodeId: null,
        terminal: 'handed_over',
      };

    case 'action.webhook':
      // The AI/integration workers are not built yet (plan phases 3+). Surface
      // the request as an effect so callers can log it, and keep going.
      return ok({
        effects: [
          {
            type: 'webhook_requested',
            nodeId: node.id,
            url: String(cfg.url ?? ''),
            method: String(cfg.method ?? 'POST'),
          },
        ],
        step: { nodeId: node.id, nodeType: node.type, status: 'skipped', detail: 'webhook_not_executed' },
      });

    case 'ai.answer':
    case 'ai.intent':
    case 'ai.extract':
    case 'ai.rag_query': {
      // AI orchestration arrives in Phase 3; honor the node's configured
      // fallback behavior (plan §6.7 "Fallback Rules").
      const fallbackMessage = String(cfg.fallbackMessage ?? messages.aiUnavailable);
      if (cfg.fallbackBehavior === 'handover') {
        return {
          outputs: [{ type: 'text', content: { text: fallbackMessage } }],
          effects: [{ type: 'handover', reason: 'ai_unavailable' }],
          step: { nodeId: node.id, nodeType: node.type, status: 'skipped', detail: 'ai_not_configured' },
          nextNodeId: null,
          terminal: 'handed_over',
        };
      }
      return ok({
        outputs: [{ type: 'text', content: { text: fallbackMessage } }],
        step: { nodeId: node.id, nodeType: node.type, status: 'skipped', detail: 'ai_not_configured' },
      });
    }

    case 'nav.end':
      return {
        outputs: [],
        effects: [],
        step: { nodeId: node.id, nodeType: node.type, status: 'ok' },
        nextNodeId: null,
        terminal: 'completed',
      };

    case 'nav.go_to_flow':
      // Cross-flow navigation lands with multi-flow bots; complete for now.
      return {
        outputs: [],
        effects: [],
        step: { nodeId: node.id, nodeType: node.type, status: 'skipped', detail: 'go_to_flow_not_supported' },
        nextNodeId: null,
        terminal: 'completed',
      };

    default:
      return ok({
        step: { nodeId: node.id, nodeType: node.type, status: 'skipped', detail: 'unknown_node_type' },
      });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fail(
  state: EngineState,
  outputs: OutboundMessage[],
  effects: EngineEffect[],
  steps: StepTrace[],
  error: string,
): TickResult {
  state.status = 'failed';
  state.error = error;
  state.currentNodeId = null;
  state.waitingNodeId = null;
  return { state, outputs, effects, steps };
}

function nextNodeId(edges: FlowEdge[], nodeId: string): string | null {
  return edges.find((e) => e.source === nodeId)?.target ?? null;
}

/** Follow the "yes" edge when matched, otherwise the else/fallback edge. */
function branchTarget(edges: FlowEdge[], nodeId: string, matched: boolean): string | null {
  const outgoing = edges.filter((e) => e.source === nodeId);
  const fallback = outgoing.find((e) =>
    ['else', 'fallback', 'default', 'no'].includes((e.label ?? '').toLowerCase()),
  );
  if (matched) {
    const yes = outgoing.find((e) => !fallback || e.id !== fallback.id);
    return yes?.target ?? null;
  }
  return fallback?.target ?? null;
}

/** Replace {{variable}} placeholders from execution variables and contact attributes. */
export function interpolate(template: string, variables: Variables): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, name: string) => {
    const value = variables[name];
    return value === undefined || value === null ? '' : String(value);
  });
}

export function evaluateCondition(
  condition: { variable: string; operator: string; value?: JsonValue },
  variables: Variables,
  ctx: EngineContext,
): boolean {
  if (condition.operator === 'has_tag') {
    return ctx.contact.tags.includes(String(condition.value ?? ''));
  }
  const actual = variables[condition.variable];
  const expected = condition.value;
  switch (condition.operator) {
    case 'equals':
      return String(actual ?? '') === String(expected ?? '');
    case 'not_equals':
      return String(actual ?? '') !== String(expected ?? '');
    case 'contains':
      return String(actual ?? '').includes(String(expected ?? ''));
    case 'gt':
      return Number(actual) > Number(expected);
    case 'gte':
      return Number(actual) >= Number(expected);
    case 'lt':
      return Number(actual) < Number(expected);
    case 'lte':
      return Number(actual) <= Number(expected);
    case 'is_set':
      return actual !== undefined && actual !== null && actual !== '';
    case 'is_empty':
      return actual === undefined || actual === null || actual === '';
    default:
      return false;
  }
}

function isWithinBusinessHours(cfg: Record<string, unknown>, ctx: EngineContext): boolean {
  const days = Array.isArray(cfg.days) ? (cfg.days as number[]) : [0, 1, 2, 3, 4, 5, 6];
  const start = String(cfg.start ?? '09:00');
  const end = String(cfg.end ?? '17:00');
  const timezone = String(cfg.timezone ?? ctx.timezone);

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  const parts = formatter.formatToParts(ctx.now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const weekdayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  const minutes = Number(get('hour')) * 60 + Number(get('minute'));
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);

  return days.includes(weekdayIndex) && minutes >= startH * 60 + startM && minutes < endH * 60 + endM;
}

interface ParsedInput {
  valid: boolean;
  value?: JsonValue;
  reprompt?: string;
}

function parseInput(
  node: FlowNode,
  raw: string,
  messages: (typeof FALLBACK_MESSAGES)['ar'] | (typeof FALLBACK_MESSAGES)['en'],
): ParsedInput {
  const input = raw.trim();
  const cfg = node.config ?? {};
  const custom = cfg.invalidMessage ? String(cfg.invalidMessage) : undefined;

  switch (node.type) {
    case 'input.email': {
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input);
      return valid
        ? { valid, value: input.toLowerCase() }
        : { valid, reprompt: custom ?? messages.invalidEmail };
    }
    case 'input.phone': {
      const digits = input.replace(/[\s\-()]/g, '');
      const valid = /^\+?\d{8,15}$/.test(digits);
      return valid ? { valid, value: digits } : { valid, reprompt: custom ?? messages.invalidPhone };
    }
    case 'input.number': {
      // Accept Arabic-Indic digits as well.
      const normalized = input.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
      const value = Number(normalized);
      return Number.isFinite(value)
        ? { valid: true, value }
        : { valid: false, reprompt: custom ?? messages.invalidNumber };
    }
    case 'input.date': {
      const value = new Date(input);
      return Number.isNaN(value.getTime())
        ? { valid: false, reprompt: custom ?? messages.invalidDate }
        : { valid: true, value: value.toISOString().slice(0, 10) };
    }
    case 'input.choice': {
      const options = Array.isArray(cfg.options) ? cfg.options.map(String) : [];
      const match = options.find((o) => o.toLowerCase() === input.toLowerCase());
      return match
        ? { valid: true, value: match }
        : { valid: false, reprompt: custom ?? messages.invalidChoice };
    }
    case 'input.confirmation': {
      const lowered = input.toLowerCase();
      if (YES_WORDS.has(lowered)) return { valid: true, value: true };
      if (NO_WORDS.has(lowered)) return { valid: true, value: false };
      return { valid: false, reprompt: custom ?? messages.invalidConfirmation };
    }
    default:
      return { valid: true, value: input };
  }
}
