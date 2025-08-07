const pageEnter = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.4 }
};

// 页面标题动画
const pageTitle = {
  initial: { opacity: 0, y: -30, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.6 }
};

// 卡片动画
const card = {
  initial: { opacity: 0, y: 30, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -30, scale: 0.95 },
  transition: { duration: 0.5 }
};

// 统计卡片动画
const statCard = {
  initial: { opacity: 0, y: 40, scale: 0.9 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.5 }
};

// 列表项动画
const listItem = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
  transition: { duration: 0.3 }
};

// 按钮动画
const button = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.3 }
};

// 主要导出对象 - 这是修复编译错误的关键
export const animations = {
  pageEnter,
  pageTitle,
  card,
  statCard,
  listItem,
  button
};

// 默认导出
export default animations;
