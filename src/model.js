export const length = 18;
export const beam = 12;

export function initialState() {
  return {mode: 'idle', x: 0, seconds: 0, detected: false, blocked: false,
    events: ['等待进料']};
}

export function start(mode) {
  if (mode !== 'normal' && mode !== 'jam') throw new Error('Unknown scenario.');
  return {...initialState(), mode, events: ['箱体进入进料区']};
}

export function advance(state, dt, speed) {
  if (state.mode === 'idle' || state.mode === 'complete' || state.mode === 'alarm') {
    return state;
  }
  let {x, seconds, detected, blocked, mode} = state;
  const events = [...state.events];
  if (blocked) {
    seconds += dt;
    if (seconds >= 1.4) {
      mode = 'alarm';
      events.push('AL01 · 光电遮挡超时，仿真停机');
    }
  } else {
    x = Math.min(length, x + speed * dt);
    if (!detected && x >= beam) {
      detected = true;
      events.push('S1 光电 · 检测到箱体');
      if (mode === 'jam') {
        blocked = true;
        x = beam;
        events.push('模拟卡箱 · 光电保持遮挡');
      }
    }
    if (x >= length) {
      mode = 'complete';
      events.push('箱体到达出料区 · 周期完成');
    }
  }
  return {mode,x,seconds,detected,blocked,events};
}
