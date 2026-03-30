export const texts = [
  "The quick brown fox jumps over the lazy dog in a vibrant garden full of flowers.",
  "Exploration of the deep ocean is a daunting task that requires advanced technology and courage.",
  "Programming is not just about writing code; it's about solving problems and creating value.",
  "Speed and accuracy are essential for any typist looking to improve their efficiency and productivity.",
  "Consistency is the key to mastering any skill, whether it's playing music or learning a language.",
  "A journey of a thousand miles begins with a single step towards your ultimate destination.",
  "Technology continues to evolve rapidly, transforming how we live, work, and connect with others.",
  "The beauty of nature often inspires creativity and provides a sense of peace and tranquility.",
  "Dream big, work hard, and never give up on the goals you have set for your future self.",
  "In the world of developers, curiosity and persistence are the most valuable assets a person can possess.",
  "India is a land of vibrant traditions, diverse cultures, and breathtaking historical architectural wonders.",
  "Digital transformation in the education sector is opening up new avenues for inclusive and accessible learning.",
  "Climate change is one of the most pressing global challenges that requires immediate and sustained collective action.",
  "The rise of artificial intelligence is redefining how we interact with technology and solve human problems."
];

export const getAllIndiaRank = (wpm) => {
  if (wpm === 0) return "Unranked";
  const baseTotal = 542910; // Simulated total participants
  
  // Percentile based on WPM (estimated distribution)
  let percentile;
  if (wpm >= 120) percentile = 0.0001; // Top 0.01%
  else if (wpm >= 100) percentile = 0.001; // Top 0.1%
  else if (wpm >= 80) percentile = 0.01;  // Top 1%
  else if (wpm >= 65) percentile = 0.05;  // Top 5%
  else if (wpm >= 50) percentile = 0.15;  // Top 15%
  else if (wpm >= 40) percentile = 0.40;  // Top 40%
  else if (wpm >= 30) percentile = 0.65;  // Top 65%
  else if (wpm >= 20) percentile = 0.85;  // Top 85%
  else percentile = 0.95; // Bottom 5%

  const rank = Math.max(1, Math.floor(baseTotal * percentile) + Math.floor(Math.random() * 50));
  return `#${rank.toLocaleString()}`;
};

export const getTitle = (wpm) => {
  if (wpm < 20) return "Novice Typist";
  if (wpm < 40) return "Average Typist";
  if (wpm < 60) return "Pro Typist";
  if (wpm < 80) return "Turbo Fingers";
  if (wpm < 100) return "Ghost Rider";
  return "Sonic Typist";
};

export const calcXP = (wpm, accuracy) => {
  return Math.floor((wpm * 10) * (accuracy / 100));
};

export const getLevel = (totalXP) => {
  return Math.floor(totalXP / 500) + 1;
};

export const getXPProgress = (totalXP) => {
  return (totalXP % 500) / 5; // % of 500
};
