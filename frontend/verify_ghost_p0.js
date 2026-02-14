
/**
 * verify_ghost_p0.js
 */

const toUtcMonthStart = (input) => {
    const d = new Date(input);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
};

const dateToMonthIndex = (startDateStr, targetDateStr) => {
    const start = toUtcMonthStart(startDateStr);
    const target = toUtcMonthStart(targetDateStr);
    return (target.getUTCFullYear() - start.getUTCFullYear()) * 12 + (target.getUTCMonth() - start.getUTCMonth());
};

// SIMULATE Phase 6 logic
function simulateInputBuilding(assets, simulationStartDate) {
    const engineAssets = [];
    const engineCashflows = [];
    const initialInvested = [];
    const simStart = toUtcMonthStart(simulationStartDate);

    assets.forEach(asset => {
        let isAvailableAtStart = false;
        let startMonthIndex = -1;

        if (asset.availabilityDate) {
            const availDate = toUtcMonthStart(asset.availabilityDate);
            startMonthIndex = dateToMonthIndex(simStart, availDate);
            if (startMonthIndex <= 0) {
                isAvailableAtStart = true;
                startMonthIndex = 0;
            }
        } else {
            isAvailableAtStart = false;
            startMonthIndex = 0;
        }

        if (isAvailableAtStart) {
            engineAssets.push({ id: asset.id, name: asset.name, initialValue: asset.amount });
            initialInvested.push(asset);
        } else {
            engineAssets.push({ id: asset.id, name: asset.name, initialValue: 0 });
            const injectionMonth = Math.max(0, startMonthIndex);
            engineCashflows.push({ monthIndex: injectionMonth, amount: asset.amount, assetId: asset.id });
        }
    });

    const initialPrincipal = engineAssets.reduce((s, a) => s + (a.initialValue || 0), 0);

    console.log("[MC INPUT INTEGRITY]", {
        simStart: simStart.toISOString(),
        investedAssetsCount: assets.length,
        investedAvailableAtStartCount: initialInvested.length,
        initialPrincipal,
        investedAvailableAtStartNames: initialInvested.map(a => a.name),
        firstCashflows: engineCashflows.slice(0, 5)
    });

    return { engineAssets, engineCashflows, initialPrincipal };
}

function simulateEngine(initialPrincipal, cashflows, horizonMonths) {
    const principalPath = new Float64Array(horizonMonths + 1);
    let currentPrincipal = initialPrincipal;
    principalPath[0] = currentPrincipal;

    const cashflowBuckets = new Array(horizonMonths + 1).fill(null).map(() => []);
    cashflows.forEach(f => {
        if (f.monthIndex <= horizonMonths) cashflowBuckets[f.monthIndex].push(f);
    });

    for (let t = 1; t <= horizonMonths; t++) {
        const monthCashflows = cashflowBuckets[t - 1];
        let monthlyNetFlow = 0;
        if (monthCashflows) {
            for (let c = 0; c < monthCashflows.length; c++) {
                monthlyNetFlow += monthCashflows[c].amount;
            }
        }
        currentPrincipal += monthlyNetFlow;
        principalPath[t] = currentPrincipal;
    }

    const firstInjection = cashflows.find(f => Math.abs(f.amount) > 0);
    const M = firstInjection ? firstInjection.monthIndex : null;
    console.log("[MC P0 ACCEPTANCE]", {
        initialPrincipal,
        firstInjectionMonthIndex: M,
        P0: principalPath[0],
        P_M: M !== null ? principalPath[M] : null,
        P_Mplus12: (M !== null && M + 12 < principalPath.length) ? principalPath[M + 12] : null,
        P_at_2049_end: principalPath[288], // Dec 2049
        P_at_2050_jan: principalPath[289], // Jan 2050 (t=289, cashflow monthIndex 288 applied)
        P_at_2050_end: principalPath[300]  // Dec 2050
    });
}

const assets = [{ id: '3a', name: '3a (1)', amount: 45000, availabilityDate: '2050-01-01' }];
const simulationStartDate = '2026-01-01';

const inputs = simulateInputBuilding(assets, simulationStartDate);
simulateEngine(inputs.initialPrincipal, inputs.engineCashflows, 372);
