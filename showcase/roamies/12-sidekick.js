// The chosen sidekick: the LED matrix dither blob, without the drips, with the agent layer on top.
Roamie.register(Roamie.ditherKit({
  id: 'sidekick', label: 'Sidekick', matrix: true, pixel: 1.3, glow: 0.55, speed: 80,
  pal: [[11, 13, 26], [110, 18, 55], [240, 42, 85], [40, 165, 255], [240, 250, 255]],
  plugin: (kit) => Roamie.agentPlugin?.(kit) ?? null,
}));
