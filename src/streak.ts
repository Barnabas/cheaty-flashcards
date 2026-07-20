// Cheat-free streak milestones: how many consecutive questions in a row a
// player has answered correctly without using a hint before a celebration
// is shown. Kept short at the low end so new players see a reward quickly.
export const STREAK_MILESTONES = [5, 10, 25, 50, 100, 250, 500];

export function isStreakMilestone(streak: number): boolean {
  return STREAK_MILESTONES.includes(streak);
}
