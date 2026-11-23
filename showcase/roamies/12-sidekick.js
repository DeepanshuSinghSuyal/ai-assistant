// The chosen sidekick: the LED matrix dither blob, without the drips, with the agent layer on top.
Roamie.register(Roamie.ditherKit({
  id: 'sidekick', label: 'Sidekick', matrix: true, pixel: 1.3, glow: 0.55, speed: 80,
  pal: [[12, 14, 18], [48, 56, 68], [120, 134, 152], [200, 214, 230], [245, 250, 255]],
  plugin: (kit) => Roamie.agentPlugin?.(kit) ?? null,
}));
