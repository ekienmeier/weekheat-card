# Weekheat

A heating schedule card and automation blueprint for Home Assistant, for heat-only thermostats such as radiator valves (TRVs) with a single setpoint.

Each room gets a **weekday** plan and a **weekend** plan. Which one applies is decided per day: weekend days, public holidays from the Workday integration, calendar events whose title contains a keyword, and exceptions set on the card.

Status: in development, not usable yet.

Based on the idea and structure of [Temperate](https://github.com/xman2000/temperate-card) by Stephen (MIT), which does the same for heat/cool thermostats with one day plan.

## License

MIT
