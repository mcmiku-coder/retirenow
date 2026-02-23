/**
 * PDF Page Generators - Part 3
 * Pages 7-9: Simulation Choice, Retirement Benefits, Data Review
 */

import autoTable from 'jspdf-autotable';
import {
    addPageNumber,
    addPageHeader,
    formatCurrency,
    formatNumber,
    formatDate,
    checkPageBreak
} from './pdfHelpers';

/**
 * Page 7: Simulation Choice
 */
export const generateSimulationChoice = (pdf, scenarioData, userData, language, pageNum, totalPages) => {
    pdf.addPage();

    const isCouple = userData.analysisType === 'couple';

    let yPos = addPageHeader(
        pdf,
        language === 'fr' ? 'Choix de Simulation' : 'Simulation Choice',
        null,
        20
    );

    yPos += 5;

    // Retirement option
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(language === 'fr' ? 'Option de Retraite Choisie' : 'Chosen Retirement Option', 15, yPos);
    yPos += 8;

    const option = scenarioData?.retirementOption || 'option1';

    // Calculate ages for display
    const birthDate1 = new Date(userData.birthDate);
    const retireDate1 = new Date(scenarioData?.wishedRetirementDate || userData.theoreticalDeathDate);
    const retireAge1 = retireDate1.getFullYear() - birthDate1.getFullYear();

    let retireAge2 = null;
    if (isCouple && userData.birthDate2) {
        const birthDate2 = new Date(userData.birthDate2);
        const retireDate2 = new Date(scenarioData?.wishedRetirementDate2 || userData.theoreticalDeathDate2);
        retireAge2 = retireDate2.getFullYear() - birthDate2.getFullYear();
    }

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');

    let optionText = '';
    if (option === 'option0') {
        optionText = language === 'fr' ? `Retraite à l'âge légal` : `Legal Retirement Age`;
    } else if (option === 'option1') {
        optionText = language === 'fr' ? `Retraite anticipée avec pension LPP` : `Early Retirement with LPP Pension`;
    } else if (option === 'option2') {
        optionText = language === 'fr' ? `Retraite anticipée avec capital LPP` : `Early Retirement with LPP Capital`;
    } else if (option === 'option3') {
        optionText = language === 'fr' ? `Optimisation de la date de retraite` : `Retirement Date Optimization`;
    }

    pdf.text(optionText, 20, yPos);
    yPos += 10;

    // Retirement details
    const detailsHead = isCouple
        ? [[language === 'fr' ? 'Champ' : 'Field', language === 'fr' ? 'Personne 1' : 'Person 1', language === 'fr' ? 'Personne 2' : 'Person 2']]
        : [[language === 'fr' ? 'Champ' : 'Field', language === 'fr' ? 'Valeur' : 'Value']];

    const detailsData = [
        [
            language === 'fr' ? 'Âge de Retraite Souhaité' : 'Desired Retirement Age',
            `${retireAge1} ${language === 'fr' ? 'ans' : 'years'}`
        ],
        [
            language === 'fr' ? 'Date de Retraite Souhaitée' : 'Desired Retirement Date',
            formatDate(scenarioData?.wishedRetirementDate)
        ]
    ];

    if (isCouple) {
        detailsData[0].push(`${retireAge2} ${language === 'fr' ? 'ans' : 'years'}`);
        detailsData[1].push(formatDate(scenarioData?.wishedRetirementDate2));
    }

    if (scenarioData?.pensionCapital) {
        const row = [language === 'fr' ? 'Capital de Pension Actuel' : 'Current Pension Capital', formatCurrency(scenarioData.pensionCapital)];
        if (isCouple) row.push(formatCurrency(scenarioData.pensionCapital2));
        detailsData.push(row);
    }

    if (scenarioData?.projectedLPPPension && option === 'option1') {
        const row = [language === 'fr' ? 'Pension LPP Projetée (Annuelle)' : 'Projected LPP Pension (Annual)', formatCurrency(scenarioData.projectedLPPPension)];
        if (isCouple) row.push(formatCurrency(scenarioData.projectedLPPPension2));
        detailsData.push(row);
    }

    autoTable(pdf, {
        startY: yPos,
        head: detailsHead,
        body: detailsData,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fontStyle: 'bold' },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 80 }
        },
        margin: { left: 20 }
    });

    addPageNumber(pdf, pageNum, totalPages, language);
};

/**
 * Page 8: Retirement Benefits
 */
export const generateRetirementBenefits = (pdf, scenarioData, userData, language, pageNum, totalPages) => {
    pdf.addPage();

    const isCouple = userData.analysisType === 'couple';

    let yPos = addPageHeader(
        pdf,
        language === 'fr' ? 'Prestations de Retraite' : 'Retirement Benefits',
        null,
        20
    );

    yPos += 5;

    // AVS/AHVSection
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(language === 'fr' ? 'AVS (Assurance Vieillesse et Survivants)' : 'AHV (Old Age and Survivors Insurance)', 15, yPos);
    yPos += 8;

    const avsHead = isCouple
        ? [[language === 'fr' ? 'Champ' : 'Field', language === 'fr' ? 'Personne 1' : 'Person 1', language === 'fr' ? 'Personne 2' : 'Person 2']]
        : [[language === 'fr' ? 'Champ' : 'Field', language === 'fr' ? 'Valeur' : 'Value']];

    const avsAnnual1 = scenarioData?.benefitsData?.avs?.amount || 0;
    const avsAnnual2 = isCouple ? (scenarioData?.benefitsData?.avs2?.amount || 0) : 0;

    const avsData = [
        [language === 'fr' ? 'Pension AVS Annuelle' : 'Annual AHV Pension', formatCurrency(avsAnnual1)]
    ];
    if (isCouple) avsData[0].push(formatCurrency(avsAnnual2));

    autoTable(pdf, {
        startY: yPos,
        head: avsHead,
        body: avsData,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fontStyle: 'bold' },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 80 }
        },
        margin: { left: 20 }
    });

    yPos = pdf.lastAutoTable.finalY + 15;

    // LPP
    yPos = checkPageBreak(pdf, yPos, 60);

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(language === 'fr' ? 'LPP (Prévoyance Professionnelle)' : 'LPP (Occupational Pension)', 15, yPos);
    yPos += 8;

    const lppHead = isCouple
        ? [[language === 'fr' ? 'Champ' : 'Field', language === 'fr' ? 'Personne 1' : 'Person 1', language === 'fr' ? 'Personne 2' : 'Person 2']]
        : [[language === 'fr' ? 'Champ' : 'Field', language === 'fr' ? 'Valeur' : 'Value']];

    const lppData = [];

    // Capital
    const capRow = [language === 'fr' ? 'Capital LPP Actuel' : 'Current LPP Capital', formatCurrency(scenarioData.pensionCapital || 0)];
    if (isCouple) capRow.push(formatCurrency(scenarioData.pensionCapital2 || 0));
    lppData.push(capRow);

    // Projected Pension
    const penRow = [language === 'fr' ? 'Pension LPP Projetée (Annuelle)' : 'Projected LPP Pension (Annual)', formatCurrency(scenarioData.projectedLPPPension || 0)];
    if (isCouple) penRow.push(formatCurrency(scenarioData.projectedLPPPension2 || 0));
    lppData.push(penRow);

    // Conversion Rate
    const rateRow = [language === 'fr' ? 'Taux de Conversion LPP' : 'LPP Conversion Rate', `${((scenarioData.lppConversionRate || 0.05) * 100).toFixed(2)}%`];
    if (isCouple) rateRow.push(`${((scenarioData.lppConversionRate2 || 0.05) * 100).toFixed(2)}%`);
    lppData.push(rateRow);

    autoTable(pdf, {
        startY: yPos,
        head: lppHead,
        body: lppData,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fontStyle: 'bold' },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 80 }
        },
        margin: { left: 20 }
    });

    addPageNumber(pdf, pageNum, totalPages, language);
};

/**
 * Page 9: Data Review
 * Shows comprehensive data review matching the UI page
 */
export const generateDataReview = (pdf, allData, userData, language, pageNum, totalPages) => {
    pdf.addPage();

    const isCouple = userData.analysisType === 'couple';

    let yPos = addPageHeader(
        pdf,
        language === 'fr' ? 'Révision des Données Avant Simulation' : 'Data Review Before Simulation',
        language === 'fr' ? 'Vue d\'ensemble complète de toutes les entrées' : 'Complete overview of all inputs',
        20
    );

    yPos += 5;

    const { income, assets, costs, debts } = allData;

    // Periodic Inflows
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(language === 'fr' ? 'Entrées Périodiques' : 'Periodic Inflows', 15, yPos);
    yPos += 6;

    if (income && income.length > 0) {
        const incomeBody = income.map(item => {
            const row = [
                item.name || 'N/A',
                formatCurrency(item.amount),
                formatCurrency(item.adjustedAmount || item.amount),
                item.frequency || 'N/A',
                formatDate(item.startDate),
                formatDate(item.endDate)
            ];
            if (isCouple) row.push(item.owner ? item.owner.toUpperCase() : (language === 'fr' ? 'PARTAGÉ' : 'SHARED'));
            return row;
        });

        const incomeHead = [[
            language === 'fr' ? 'Nom' : 'Name',
            { content: language === 'fr' ? 'Original' : 'Original', styles: { halign: 'right' } },
            { content: language === 'fr' ? 'Ajusté' : 'Adjusted', styles: { halign: 'right' } },
            language === 'fr' ? 'Fréquence' : 'Frequency',
            language === 'fr' ? 'Début' : 'Start',
            language === 'fr' ? 'Fin' : 'End'
        ]];
        if (isCouple) incomeHead[0].push(language === 'fr' ? 'Propriétaire' : 'Owner');

        autoTable(pdf, {
            startY: yPos,
            head: incomeHead,
            body: incomeBody,
            theme: 'striped',
            headStyles: { fillColor: [46, 204, 113], textColor: 255, fontSize: 7, fontStyle: 'bold' },
            styles: { fontSize: 6 },
            columnStyles: {
                1: { halign: 'right' },
                2: { halign: 'right' }
            },
            margin: { left: 15, right: 15 }
        });

        yPos = pdf.lastAutoTable.finalY + 10;
    } else {
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(150, 150, 150);
        pdf.text(language === 'fr' ? 'Aucune entrée définie' : 'No inflows defined', 20, yPos);
        yPos += 10;
    }

    // Current or Future Assets
    yPos = checkPageBreak(pdf, yPos, 50);

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(language === 'fr' ? 'Actifs Actuels ou Futurs' : 'Current or Future Assets', 15, yPos);
    yPos += 6;

    if (assets && assets.length > 0) {
        const assetBody = assets.map(item => {
            // Logic for Availability Value
            let availabilityValue = 'N/A';
            if (item.availabilityType === 'Date') {
                availabilityValue = formatDate(item.availabilityDate);
            } else if (item.availabilityType === 'Period' || item.availabilityTimeframe) {
                if (language === 'fr') {
                    const timeframes = {
                        'within_5y': 'dans les 5 ans',
                        'within_5_10y': 'dans 5-10 ans',
                        'within_10_15y': 'dans 10-15 ans',
                        'within_15_20y': 'dans 15-20 ans',
                        'within_20_25y': 'dans 20-25 ans',
                        'within_25_30y': 'dans 25-30 ans'
                    };
                    availabilityValue = timeframes[item.availabilityTimeframe] || item.availabilityTimeframe || 'N/A';
                } else {
                    const timeframes = {
                        'within_5y': 'within 5y',
                        'within_5_10y': 'within 5-10y',
                        'within_10_15y': 'within 10-15y',
                        'within_15_20y': 'within 15-20y',
                        'within_20_25y': 'within 20-25y',
                        'within_25_30y': 'within 25-30y'
                    };
                    availabilityValue = timeframes[item.availabilityTimeframe] || item.availabilityTimeframe || 'N/A';
                }
            }

            // Logic for Invest?
            const isInvested = item.category === 'Liquid' && item.strategy === 'Invested';
            const investText = isInvested ? (language === 'fr' ? 'Oui' : 'Yes') : (language === 'fr' ? 'Non' : 'No');

            const row = [
                item.name || 'N/A',
                formatCurrency(item.amount),
                formatCurrency(item.adjustedAmount || item.amount),
                item.category || 'N/A',
                item.availabilityType || 'N/A',
                availabilityValue,
                investText,
                item.clusterTag || ''
            ];
            if (isCouple) row.push(item.owner ? item.owner.toUpperCase() : (language === 'fr' ? 'PARTAGÉ' : 'SHARED'));
            return row;
        });

        const assetHead = [[
            language === 'fr' ? 'Nom' : 'Name',
            { content: language === 'fr' ? 'Original' : 'Original', styles: { halign: 'right' } },
            { content: language === 'fr' ? 'Ajusté' : 'Adjusted', styles: { halign: 'right' } },
            language === 'fr' ? 'Catégorie' : 'Category',
            language === 'fr' ? 'Type de dispo.' : 'Availability Type',
            language === 'fr' ? 'Valeur de dispo.' : 'Availability Value',
            language === 'fr' ? 'Investir ?' : 'Invest?',
            language === 'fr' ? 'Tag Cluster' : 'Cluster Tag'
        ]];
        if (isCouple) assetHead[0].push(language === 'fr' ? 'Propriétaire' : 'Owner');

        autoTable(pdf, {
            startY: yPos,
            head: assetHead,
            body: assetBody,
            theme: 'striped',
            headStyles: { fillColor: [52, 152, 219], textColor: 255, fontSize: 7, fontStyle: 'bold' },
            styles: { fontSize: 5.5 }, // Reduced size for many columns
            columnStyles: {
                1: { halign: 'right' },
                2: { halign: 'right' }
            },
            margin: { left: 15, right: 15 }
        });

        yPos = pdf.lastAutoTable.finalY + 10;
    } else {
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(150, 150, 150);
        pdf.text(language === 'fr' ? 'Aucun actif défini' : 'No assets defined', 20, yPos);
        yPos += 10;
    }

    // Periodic Outflows
    yPos = checkPageBreak(pdf, yPos, 50);

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(language === 'fr' ? 'Sorties Périodiques' : 'Periodic Outflows', 15, yPos);
    yPos += 6;

    if (costs && costs.length > 0) {
        const costBody = costs.map(item => {
            const row = [
                item.name || 'N/A',
                formatCurrency(item.amount),
                formatCurrency(item.adjustedAmount || item.amount),
                item.frequency || 'N/A',
                formatDate(item.startDate),
                formatDate(item.endDate)
            ];
            if (isCouple) row.push(item.owner ? item.owner.toUpperCase() : (language === 'fr' ? 'PARTAGÉ' : 'SHARED'));
            return row;
        });

        const costHead = [[
            language === 'fr' ? 'Nom' : 'Name',
            { content: language === 'fr' ? 'Original' : 'Original', styles: { halign: 'right' } },
            { content: language === 'fr' ? 'Ajusté' : 'Adjusted', styles: { halign: 'right' } },
            language === 'fr' ? 'Fréquence' : 'Frequency',
            language === 'fr' ? 'Début' : 'Start',
            language === 'fr' ? 'Fin' : 'End'
        ]];
        if (isCouple) costHead[0].push(language === 'fr' ? 'Propriétaire' : 'Owner');

        autoTable(pdf, {
            startY: yPos,
            head: costHead,
            body: costBody,
            theme: 'striped',
            headStyles: { fillColor: [231, 76, 60], textColor: 255, fontSize: 7, fontStyle: 'bold' },
            styles: { fontSize: 6 },
            columnStyles: {
                1: { halign: 'right' },
                2: { halign: 'right' }
            },
            margin: { left: 15, right: 15 }
        });

        yPos = pdf.lastAutoTable.finalY + 10;
    } else {
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(150, 150, 150);
        pdf.text(language === 'fr' ? 'Aucune sortie définie' : 'No outflows defined', 20, yPos);
        yPos += 10;
    }

    // Debts
    yPos = checkPageBreak(pdf, yPos, 50);

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(language === 'fr' ? 'Dettes Actuelles ou Futures' : 'Current or Future Debts', 15, yPos);
    yPos += 6;

    if (debts && debts.length > 0) {
        const debtBody = debts.map(item => {
            const row = [
                item.name || 'N/A',
                formatCurrency(item.amount),
                formatCurrency(item.adjustedAmount || item.amount),
                item.frequency || 'N/A',
                formatDate(item.startDate),
                formatDate(item.endDate)
            ];
            if (isCouple) row.push(item.owner ? item.owner.toUpperCase() : (language === 'fr' ? 'PARTAGÉ' : 'SHARED'));
            return row;
        });

        const debtHead = [[
            language === 'fr' ? 'Nom' : 'Name',
            { content: language === 'fr' ? 'Original' : 'Original', styles: { halign: 'right' } },
            { content: language === 'fr' ? 'Ajusté' : 'Adjusted', styles: { halign: 'right' } },
            language === 'fr' ? 'Fréquence' : 'Frequency',
            language === 'fr' ? 'Début' : 'Start',
            language === 'fr' ? 'Fin' : 'End'
        ]];
        if (isCouple) debtHead[0].push(language === 'fr' ? 'Propriétaire' : 'Owner');

        autoTable(pdf, {
            startY: yPos,
            head: debtHead,
            body: debtBody,
            theme: 'striped',
            headStyles: { fillColor: [192, 57, 43], textColor: 255, fontSize: 7, fontStyle: 'bold' },
            styles: { fontSize: 6 },
            columnStyles: {
                1: { halign: 'right' },
                2: { halign: 'right' }
            },
            margin: { left: 15, right: 15 }
        });
    } else {
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(150, 150, 150);
        pdf.text(language === 'fr' ? 'Aucune dette définie' : 'No debts defined', 20, yPos);
    }

    addPageNumber(pdf, pageNum, totalPages, language);
};

export default {
    generateSimulationChoice,
    generateRetirementBenefits,
    generateDataReview
};
