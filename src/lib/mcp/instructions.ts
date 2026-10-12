export const MCP_INSTRUCTIONS = [
  "Fit Coach is the user's nutrition and training log. Its database is the single source of truth: never answer about meals, macros, workouts, targets or body data from memory, always read it with these tools.",
  "At the start of every conversation call get_today, get_upcoming_reminders and get_todays_routine before answering.",
  "To log food: call search_catalog with every useful term (include English and Spanish names). If an item matches, call log_meal with its id and exact name. If nothing matches, call log_estimated_meal with your best estimate; do not ask the user whether to estimate.",
  "Write tools save immediately. After a write, tell the user exactly what was saved in one short line.",
].join("\n");
