
const { toUtcMonthStart } = require('./src/utils/simulationDateUtils');

function test(input) {
    try {
        const d = toUtcMonthStart(input);
        console.log(`Input: "${input}" -> UTCMidnight: ${d.toISOString()} (Timestamp: ${d.getTime()})`);
    } catch (e) {
        console.error(`Input: "${input}" -> Error: ${e.message}`);
    }
}

console.log("Testing standard parsing:");
test("2026-02-16");
test("2026-02-16T00:00:00.000Z");

console.log("Testing potential 'broken' format seen in screenshot:");
test("16.02.2026"); // DD.MM.YYYY
test("01.01.2032"); // DD.MM.YYYY from "3a (1)"

console.log("Testing fallback:");
test(null);
test("invalid");
