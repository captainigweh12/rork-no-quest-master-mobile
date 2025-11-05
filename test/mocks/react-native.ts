export default {
  Platform: {
    OS: 'test',
    select: (obj: Record<string, any>) => obj.default
  },
  StyleSheet: {
    create: (styles: Record<string, any>) => styles,
  },
};