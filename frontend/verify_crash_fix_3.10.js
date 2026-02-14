
/**
 * verify_crash_fix_3.10.js
 */

const hasInvestments = true;
const portfolioSimulation = {
    percentiles: {
        p5: new Float64Array(372),
        p10: new Float64Array(372)
    },
    simulationStartDate: "2026-01-01T00:00:00.000Z"
};

try {
    // Mimic the fixed log block
    console.log("[MC RUN]", {
        hasInvested: hasInvestments, // Fixed identifier
        gotSim: !!portfolioSimulation,
        p5Len: portfolioSimulation?.percentiles?.p5?.length,
        p10Len: portfolioSimulation?.percentiles?.p10?.length
    });

    if (portfolioSimulation) {
        // Mimic setMonteCarloProjections logic
        console.log("[MC UI] projections set", {
            p5Len: portfolioSimulation?.percentiles?.p5?.length,
            p10Len: portfolioSimulation?.percentiles?.p10?.length
        });
    }
} catch (error) {
    console.error("Crash detected during verification:", error);
}
