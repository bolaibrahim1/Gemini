import {
  EngineContext,
  evaluateCondition,
  interpolate,
  MAX_EXECUTION_STEPS,
  startExecution,
  tick,
} from './engine';
import { FlowGraph } from './flow-validator';

const ctx: EngineContext = {
  now: new Date('2026-01-05T10:00:00Z'), // a Monday
  timezone: 'Africa/Cairo',
  contact: { attributes: { name: 'Sara' }, tags: ['vip'] },
  language: 'en',
};

const journeyGraph: FlowGraph = {
  nodes: [
    { id: 'start', type: 'trigger.conversation_started' },
    { id: 'welcome', type: 'message.text', config: { text: 'Welcome {{name}}!' } },
    {
      id: 'ask',
      type: 'input.choice',
      config: { prompt: 'Pick a service', variable: 'service', options: ['sales', 'support'] },
    },
    {
      id: 'branch',
      type: 'logic.condition',
      config: { condition: { variable: 'service', operator: 'equals', value: 'sales' } },
    },
    { id: 'tag', type: 'action.add_tag', config: { tag: 'lead' } },
    { id: 'sales-msg', type: 'message.text', config: { text: 'Sales will contact you.' } },
    { id: 'handover', type: 'action.handover', config: { reason: 'support_request' } },
    { id: 'end', type: 'nav.end' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'welcome' },
    { id: 'e2', source: 'welcome', target: 'ask' },
    { id: 'e3', source: 'ask', target: 'branch' },
    { id: 'e4', source: 'branch', target: 'tag', label: 'yes' },
    { id: 'e5', source: 'branch', target: 'handover', label: 'else' },
    { id: 'e6', source: 'tag', target: 'sales-msg' },
    { id: 'e7', source: 'sales-msg', target: 'end' },
  ],
};

describe('engine journey', () => {
  it('runs to the input node and waits', () => {
    const result = tick(journeyGraph, startExecution(), null, ctx);
    expect(result.state.status).toBe('waiting_input');
    expect(result.state.waitingNodeId).toBe('ask');
    // Welcome message (interpolated) + choice prompt.
    expect(result.outputs[0]).toEqual({ type: 'text', content: { text: 'Welcome Sara!' } });
    expect(result.outputs[1].type).toBe('buttons');
  });

  it('reprompts on invalid choice and stays waiting', () => {
    const waiting = tick(journeyGraph, startExecution(), null, ctx);
    const result = tick(journeyGraph, waiting.state, 'nonsense', ctx);
    expect(result.state.status).toBe('waiting_input');
    expect(result.outputs).toHaveLength(1);
    expect(String(result.outputs[0].content.text)).toContain('available options');
  });

  it('completes the sales path with a tag effect', () => {
    const waiting = tick(journeyGraph, startExecution(), null, ctx);
    const result = tick(journeyGraph, waiting.state, 'sales', ctx);
    expect(result.state.status).toBe('completed');
    expect(result.state.variables.service).toBe('sales');
    expect(result.effects).toContainEqual({ type: 'add_tag', tag: 'lead' });
    expect(result.outputs).toContainEqual({
      type: 'text',
      content: { text: 'Sales will contact you.' },
    });
  });

  it('hands over on the fallback path', () => {
    const waiting = tick(journeyGraph, startExecution(), null, ctx);
    const result = tick(journeyGraph, waiting.state, 'support', ctx);
    expect(result.state.status).toBe('handed_over');
    expect(result.effects).toContainEqual({
      type: 'handover',
      departmentId: undefined,
      reason: 'support_request',
    });
  });

  it('is resumable from serialized state', () => {
    const waiting = tick(journeyGraph, startExecution(), null, ctx);
    // Simulate a worker restart: state round-trips through JSON.
    const restored = JSON.parse(JSON.stringify(waiting.state));
    const result = tick(journeyGraph, restored, 'sales', ctx);
    expect(result.state.status).toBe('completed');
  });
});

describe('engine safety', () => {
  it('fails when the step limit is exceeded by a loop', () => {
    const loop: FlowGraph = {
      nodes: [
        { id: 'start', type: 'trigger.conversation_started' },
        { id: 'a', type: 'message.text', config: { text: 'ping' } },
        { id: 'b', type: 'message.text', config: { text: 'pong' } },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'a' },
        { id: 'e2', source: 'a', target: 'b' },
        { id: 'e3', source: 'b', target: 'a' },
      ],
    };
    const result = tick(loop, startExecution(), null, ctx);
    expect(result.state.status).toBe('failed');
    expect(result.state.error).toContain('step limit');
    expect(result.state.stepCount).toBe(MAX_EXECUTION_STEPS);
  });

  it('fails gracefully when the graph has no trigger', () => {
    const result = tick({ nodes: [], edges: [] }, startExecution(), null, ctx);
    expect(result.state.status).toBe('failed');
  });
});

describe('input parsing', () => {
  const inputGraph = (type: string, config: Record<string, unknown>): FlowGraph => ({
    nodes: [
      { id: 'start', type: 'trigger.conversation_started' },
      { id: 'in', type, config: { prompt: 'p', variable: 'v', ...config } },
      { id: 'end', type: 'nav.end' },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'in' },
      { id: 'e2', source: 'in', target: 'end' },
    ],
  });

  const submit = (type: string, config: Record<string, unknown>, value: string) => {
    const graph = inputGraph(type, config);
    const waiting = tick(graph, startExecution(), null, ctx);
    return tick(graph, waiting.state, value, ctx);
  };

  it('validates emails', () => {
    expect(submit('input.email', {}, 'not-an-email').state.status).toBe('waiting_input');
    const result = submit('input.email', {}, 'Sara@Example.COM');
    expect(result.state.status).toBe('completed');
    expect(result.state.variables.v).toBe('sara@example.com');
  });

  it('validates phones', () => {
    expect(submit('input.phone', {}, 'abc').state.status).toBe('waiting_input');
    expect(submit('input.phone', {}, '+20 100 123-4567').state.variables.v).toBe('+201001234567');
  });

  it('parses Arabic-Indic digits as numbers', () => {
    expect(submit('input.number', {}, '٤٢').state.variables.v).toBe(42);
  });

  it('understands Arabic confirmations', () => {
    expect(submit('input.confirmation', {}, 'نعم').state.variables.v).toBe(true);
    expect(submit('input.confirmation', {}, 'لا').state.variables.v).toBe(false);
    expect(submit('input.confirmation', {}, 'ربما').state.status).toBe('waiting_input');
  });
});

describe('helpers', () => {
  it('interpolates variables and leaves unknowns empty', () => {
    expect(interpolate('Hi {{name}}, order {{order_id}}', { name: 'Ali' })).toBe('Hi Ali, order ');
  });

  it('evaluates operators', () => {
    const vars = { n: 5, s: 'hello', empty: '' };
    expect(evaluateCondition({ variable: 'n', operator: 'gt', value: 3 }, vars, ctx)).toBe(true);
    expect(evaluateCondition({ variable: 'n', operator: 'lte', value: 4 }, vars, ctx)).toBe(false);
    expect(evaluateCondition({ variable: 's', operator: 'contains', value: 'ell' }, vars, ctx)).toBe(true);
    expect(evaluateCondition({ variable: 'empty', operator: 'is_empty' }, vars, ctx)).toBe(true);
    expect(evaluateCondition({ variable: 'x', operator: 'has_tag', value: 'vip' }, vars, ctx)).toBe(true);
  });
});
