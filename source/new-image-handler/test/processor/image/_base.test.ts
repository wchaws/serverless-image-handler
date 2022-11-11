import { ActionMask, split1 } from '../../../src/processor/image/_base';

test(`${ActionMask.name} all enabled by default`, () => {
  const actions = '1 1 1 1 1 1'.split(' ');
  const s = new ActionMask(actions);

  expect(s.length).toBe(actions.length);
  expect(s.filterEnabledActions()).toEqual(actions);
});

test(`${ActionMask.name} getAction`, () => {
  const actions = '1 2 3 4 5 6'.split(' ');
  const s = new ActionMask(actions);

  expect(s.length).toBe(actions.length);

  s.disable(0);
  s.enable(0);
  expect(s.isDisabled(0)).toBeFalsy();

  s.forEachAction((action, enable, index) => {
    expect(s.getAction(index)).toEqual(action);
    expect(s.isEnabled(index)).toBe(enable);
    expect(action).toBe(`${1 + index}`);
  });
});

test(`${ActionMask.name} enable/disable`, () => {
  const actions = '1 2 3 4 5 6'.split(' ');
  const s = new ActionMask(actions);

  expect(s.length).toBe(actions.length);
  s.disable(0);
  s.disable(1);
  s.disable(2);
  expect(s.filterEnabledActions().length).toBe(3);
  expect(s.filterEnabledActions()).toEqual('4 5 6'.split(' '));
});

test(`${ActionMask.name} forEach enable/disable`, () => {
  const actions = '1 2 3 4 5 6'.split(' ');
  const s = new ActionMask(actions);

  expect(s.length).toBe(actions.length);
  s.forEachAction((_, enabled, index) => {
    expect(enabled).toBeTruthy();
    s.disable(index);
  });
  expect(s.filterEnabledActions()).toEqual([]);
});

test(`${ActionMask.name} index out of range`, () => {
  const actions = '1 2 3 4 5 6'.split(' ');
  const s = new ActionMask(actions);

  expect(() => {
    s.enable(-1);
  }).toThrowError(/Index out of range/);
});

test(`${split1.name} split`, () => {
  const s = 'text_SG9ZT0xBQkBvZmZjaWFsK0DvvIEjQO-8gSPvvIEj77-l77yBQO-_pe-8gUAj77-l77yB77-l77yBZQ==';
  expect(split1(s, '_')).toEqual([
    'text',
    'SG9ZT0xBQkBvZmZjaWFsK0DvvIEjQO-8gSPvvIEj77-l77yBQO-_pe-8gUAj77-l77yB77-l77yBZQ==',
  ]);
});


