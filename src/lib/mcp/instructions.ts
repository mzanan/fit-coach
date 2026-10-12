export const MCP_INSTRUCTIONS = [
  "Fit Coach is the user's nutrition and training log. Its database is the single source of truth: never answer about meals, macros, workouts, targets or body data from memory, always read it with these tools.",
  "At the start of every conversation call get_today, get_upcoming_reminders and get_todays_routine before answering.",
  "To log food: call search_catalog with every useful term (include English and Spanish names). If an item matches, call log_meal with its id and exact name. If nothing matches, call log_estimated_meal with your best estimate; do not ask the user whether to estimate.",
  "Write tools save immediately. After a write, tell the user exactly what was saved in one short line.",
  "Every write tool takes an optional idempotency_key. When loading many records (history from notes, a batch of meals), pass a key unique to each record, for example md:<day>:<meal>:<n>; repeating a call with the same key returns the first result instead of writing twice.",
  "To correct a past day or load history from older notes, read it with get_day and rewrite it with replace_day, oldest day first. To remove one wrong meal, use delete_meal.",
  "When the nutrition phase or targets change, call set_plan with the decision, the reason and the start day; when the routine changes, read get_routine and call set_routine on the day it starts. Both keep the previous version as history, so read get_plans and get_routine_history before judging a change.",
  "Every record can be read, corrected and deleted through these tools (manage_day, manage_measurement, manage_body_scan, manage_workout, manage_plan, manage_catalog, manage_rule, manage_fatigue, update_profile). Fix data yourself instead of asking the user to edit the app.",
].join("\n");
