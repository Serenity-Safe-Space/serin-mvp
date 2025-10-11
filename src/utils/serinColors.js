// Centralized palette for Serin brand colors; keep synchronized with design docs.
export const SERIN_COLORS = Object.freeze({
  DEEP_SERIN_PURPLE: {
    name: 'Deep Serin Purple',
    hex: '#281E4F',
    roles: ['Backgrounds', 'Modals', 'Shadows'],
    description: 'Core brand color with a warm, calming feel.',
  },
  LAVENDER_MIST: {
    name: 'Lavender Mist',
    hex: '#C7B6E8',
    roles: ['Chat bar', 'UI containers'],
    description: 'Provides soft contrast for text fields.',
  },
  SUNBEAM_YELLOW: {
    name: 'Sunbeam Yellow',
    hex: '#FFEB5B',
    roles: ['Buttons', 'Highlights', 'Mic icons'],
    description: 'Accent color that signals interaction and positivity.',
  },
  MID_PURPLE: {
    name: 'Mid Purple',
    hex: '#7A62B3',
    roles: ['Send buttons', 'Hover accents'],
    description: 'Secondary accent shade for interactive elements.',
  },
  COOL_WHITE: {
    name: 'Cool White',
    hex: '#FFFFFF',
    roles: ['Text on dark background'],
    description: 'Primary font color for titles.',
  },
  LILAC_GRAY: {
    name: 'Lilac Gray',
    hex: '#B5A8D6',
    roles: ['Secondary text'],
    description: 'Used for placeholders or footer text.',
  },
  SOFT_VIOLET: {
    name: 'Soft Violet',
    hex: '#A89CCF',
    roles: ['Placeholder icons', 'Inactive icons'],
    description: 'Adds subtle variation without harsh contrast.',
  },
  PURE_BLACK: {
    name: 'Pure Black',
    hex: '#000000',
    roles: ['Icon details'],
    description: 'Reserved for illustration accents such as sunglasses.',
  },
});

export const SERIN_COLOR_LIST = Object.freeze(
  Object.values(SERIN_COLORS)
);

