// 16x20 pixel heads hand-pixelled from the team headshots on petroflow.com/about
// '.' = transparent, '#' = outline, letters map to the per-face palette
const FACES = {
  zach: {
    pal: { H: '#9c7a4e', h: '#c9a26b', S: '#f4c3a4', s: '#d9917a', b: '#8a6a45', e: '#4a6fb0', w: '#ffffff', m: '#a8403a', t: '#d79c86' },
    rows: [
      '....########....',
      '..##HHhhHHHHH##.',
      '.#HHHhhHHHHHHH#.',
      '#HHHHHHHHHHHHHH#',
      '#HHHHHHHHHHHHHH#',
      '#HHSSSSSSSSSSHH#',
      '#HSSSSSSSSSSSSH#',
      '#SSSSSSSSSSSSSS#',
      '#SSbbbSSSSbbbSS#',
      '#SSSeeSSSSeeSSS#',
      '#SSSSSSssSSSSSS#',
      '#SSSSSSssSSSSSS#',
      '#SSSSSssssSSSSS#',
      '#StSSSSSSSSSStS#',
      '#StSSwwwwwwSStS#',
      '#tSSSmmmmmmSSSt#',
      '.#tSSSSSSSSSSt#.',
      '..#tSSSSSSSSt#..',
      '...##tttttt##...',
      '.....######.....'
    ]
  },
  geir: {
    pal: { W: '#f4f4f0', w: '#cfcfc8', S: '#e8a98a', s: '#c07a5e', g: '#b0b0b0', e: '#5b7f9a', m: '#9a4a44' },
    rows: [
      '.....######.....',
      '...##WWWWWW##...',
      '..#WWwWWWWWWW#..',
      '.#WWWWWWWWWWWW#.',
      '#WWWWwWWWWWWWWW#',
      '#WWWSSSSSSSSWWW#',
      '#WWSSSSSSSSSSWW#',
      '#WSSSSSSSSSSSSW#',
      '#SSgggSSSSgggSS#',
      '#SSSeeSSSSeeSSS#',
      '#SSsSSSSSSSSsSS#',
      '#SSSSSSssSSSSSS#',
      '#SSSSSssssSSSSS#',
      '#SSSWWWWWWWWSSS#',
      '#SSSWWmmmmWWSSS#',
      '#SSSSWWWWWWSSSS#',
      '.#SSSWWWWWWSSS#.',
      '..#SSWWWWWWSS#..',
      '...##WWWWWW##...',
      '.....######.....'
    ]
  },
  mack: {
    pal: { S: '#f0b896', s: '#cf8a6c', D: '#3a2a24', F: '#15151a', e: '#101018', m: '#9a4a44', t: '#c99a80' },
    rows: [
      '.....######.....',
      '...##SSSSSS##...',
      '..#SSSSSSSSSS#..',
      '.#DSSSSSSSSSSD#.',
      '#DDSSSSSSSSSSDD#',
      '#DDSSSSSSSSSSDD#',
      '#SDSSSSSSSSSSDS#',
      '#SSSSSSSSSSSSSS#',
      '#SSDDDSSSSDDDSS#',
      '#FFFFFFSSFFFFFF#',
      '#FSeeSFSSFSeeSF#',
      '#FSSSSFSSFSSSSF#',
      '#FFFFFFSSFFFFFF#',
      '#SSSSSssssSSSSS#',
      '#tSSSSSSSSSSSSt#',
      '#tSSDDDDDDDDSSt#',
      '.#tSSSSmmSSSSt#.',
      '..#tSSSSSSSSt#..',
      '...##tttttt##...',
      '.....######.....'
    ]
  }
};
