export const formatDate = (date) => {
  return new Date(date).toLocaleDateString();
};

export const getDateRange = (days) => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return { start, end };
};
