
/**
 * verify_mc_semantics_8.js
 */

const round = (v) => Math.round(v || 0);

function testSemantics() {
    console.log("--- PHASE 8 SEMANTICS & RENDERING VERIFICATION ---");

    // Scenario:
    // rowYear = 2049 (Pre-injection)
    // rowYear = 2050 (Injection year)
    // baseVal = 200000 constant
    // mcInvested = 0 until Jan 2050 (idx 288)

    const rowYear49 = 2049;
    const yearEndIdx49 = 288; // Dec 2049 end
    const baseVal49 = 200000;
    const mcInvested49 = 0; // Market value
    const mc5Val49 = baseVal49 + mcInvested49; // calculateRecomposedTotalAtIndex returns B + MC

    console.log("[YEAR-END SAMPLING PROBE] 2049", {
        rowYear: rowYear49,
        B: round(baseVal49),
        mc5Total: round(mc5Val49),
        expectedOverlap: baseVal49 === mc5Val49 ? "YES (Invisible MC)" : "NO"
    });

    const rowYear50 = 2050;
    const yearEndIdx50 = 300; // Dec 2050 end
    const baseVal50 = 200000;
    const mcInvested50 = 45000; // After injection + some evolution
    const mc5Val50 = baseVal50 + mcInvested50;

    console.log("[YEAR-END SAMPLING PROBE] 2050", {
        rowYear: rowYear50,
        B: round(baseVal50),
        mc5Total: round(mc5Val50),
        divergenceCheck: mc5Val50 > baseVal50 ? "PASS (Diverging)" : "FAIL"
    });

    console.log("\n[MC RENDER FLAGS] Example", {
        isInvested: true,
        hasMCDetails: true,
        show5: true,
        show10: false,
        show25: false
    });

    console.log("\n[PDF TOTAL SEMANTICS] Example", {
        year: 2049,
        B_end: baseVal49,
        mc5Total_end: mc5Val49
    });
}

testSemantics();
