const now = new Date();
console.log("Current Server Time (toString):", now.toString());
console.log("Current Server Time (ISO):", now.toISOString());
console.log("Timezone Offset:", now.getTimezoneOffset());

// Simulate a match happening NOW
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');
const hour = String(now.getHours()).padStart(2, '0');
const minute = String(now.getMinutes()).padStart(2, '0');

const matchDate = `${year}-${month}-${day}`;
const matchTime = `${hour}:${minute}`;

console.log(`\nSimulated Match: ${matchDate} ${matchTime}`);

const matchDateTime = new Date(`${matchDate}T${matchTime}`);
console.log("Parsed Match Time (toString):", matchDateTime.toString());
console.log("Parsed Match Time (ISO):", matchDateTime.toISOString());

const matchEnd = new Date(matchDateTime.getTime() + 3 * 60 * 60 * 1000);
console.log("Match End Time:", matchEnd.toString());

const isOngoing = now >= matchDateTime && now <= matchEnd;
console.log("Is Ongoing?", isOngoing);

// Simulate a match that should be UPCOMING (1 hour from now)
const future = new Date(now.getTime() + 60 * 60 * 1000);
const fYear = future.getFullYear();
const fMonth = String(future.getMonth() + 1).padStart(2, '0');
const fDay = String(future.getDate()).padStart(2, '0');
const fHour = String(future.getHours()).padStart(2, '0');
const fMinute = String(future.getMinutes()).padStart(2, '0');

const fDate = `${fYear}-${fMonth}-${fDay}`;
const fTime = `${fHour}:${fMinute}`;
const fDateTime = new Date(`${fDate}T${fTime}`);

console.log(`\nSimulated Future Match: ${fDate} ${fTime}`);
console.log("Parsed Future Match Time:", fDateTime.toString());
const isUpcoming = fDateTime > now;
console.log("Is Upcoming?", isUpcoming);

// Check comparison with fixed string if timezone is weird
// User current time: 2026-01-22T00:21:52+05:45
// If I use a fixed string "2026-01-22T00:21:00"
const fixed = new Date("2026-01-22T00:21:00");
console.log("\nFixed String '2026-01-22T00:21:00' parsed as:", fixed.toString());
