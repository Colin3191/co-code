export const generateUniqueId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};
