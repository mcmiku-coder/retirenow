/**
 * PDF Page Generators - Part 2
 * Pages 4-9: Personal Info, Inputs, Data Review
 */

import autoTable from 'jspdf-autotable';
import {
    addPageNumber,
    addPageHeader,
    formatCurrency,
    formatNumber,
    formatDate,
    addSeparatorLine,
    checkPageBreak
} from './pdfHelpers';

/**
 * Page 4: Personal Information and Simulation Choice (merged)
 */
export const generatePersonalInfo = (pdf, userData, scenarioData, language, pageNum, totalPages) => {
    pdf.addPage();

    const isCouple = userData.analysisType === 'couple';

    let yPos = addPageHeader(
        pdf,
        language === 'fr' ? 'Informations personnelles et choix de la simulation' : 'Personal Information & Simulation Choice',
        null,
        20
    );

    yPos += 5;

    // Personal details table
    const head = isCouple
        ? [[language === 'fr' ? 'Champ' : 'Field', language === 'fr' ? 'Personne 1' : 'Person 1', language === 'fr' ? 'Personne 2' : 'Person 2']]
        : [[language === 'fr' ? 'Champ' : 'Field', language === 'fr' ? 'Valeur' : 'Value']];

    const personalData = [
        [language === 'fr' ? 'Prénom' : 'First Name', userData.firstName || 'N/A'],
        [language === 'fr' ? 'Date de Naissance' : 'Birth Date', formatDate(userData.birthDate)],
        [language === 'fr' ? 'Âge Actuel' : 'Current Age', userData.currentAge || 'N/A'],
        [language === 'fr' ? 'Sexe' : 'Gender', userData.gender === 'male' ? (language === 'fr' ? 'Homme' : 'Male') : (language === 'fr' ? 'Femme' : 'Female')]
    ];

    if (isCouple) {
        personalData[0].push(userData.firstName2 || 'N/A');
        personalData[1].push(formatDate(userData.birthDate2));
        personalData[2].push(userData.currentAge2 || 'N/A');
        personalData[3].push(userData.gender2 === 'male' ? (language === 'fr' ? 'Homme' : 'Male') : (language === 'fr' ? 'Femme' : 'Female'));
    }

    autoTable(pdf, {
        startY: yPos,
        head: head,
        body: personalData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10 },
        margin: { left: 15, right: 15 }
    });

    yPos = pdf.lastAutoTable.finalY + 15;

    // Retirement and life expectancy
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(language === 'fr' ? 'Retraite et Espérance de Vie' : 'Retirement and Life Expectancy', 15, yPos);
    yPos += 8;

    const retirementHead = isCouple
        ? [[language === 'fr' ? 'Champ' : 'Field', language === 'fr' ? 'Personne 1' : 'Person 1', language === 'fr' ? 'Personne 2' : 'Person 2']]
        : [[language === 'fr' ? 'Champ' : 'Field', language === 'fr' ? 'Valeur' : 'Value']];

    const retirementData = [
        [language === 'fr' ? 'Âge Légal de Retraite' : 'Legal Retirement Age', scenarioData.legalRetirementAge || '65'],
        [language === 'fr' ? 'Date Légale de Retraite' : 'Legal Retirement Date', formatDate(scenarioData.legalRetirementDate)],
        [language === 'fr' ? 'Espérance de Vie' : 'Life Expectancy', `${scenarioData.lifeExpectancy || 'N/A'} ${language === 'fr' ? 'ans' : 'years'}`],
        [language === 'fr' ? 'Date de Décès Théorique' : 'Theoretical Death Date', formatDate(userData.theoreticalDeathDate)]
    ];

    if (isCouple) {
        retirementData[0].push(scenarioData.legalRetirementAge2 || '64/65');
        retirementData[1].push(formatDate(scenarioData.legalRetirementDate2));
        retirementData[2].push(`${scenarioData.lifeExpectancy2 || 'N/A'} ${language === 'fr' ? 'ans' : 'years'}`);
        retirementData[3].push(formatDate(userData.theoreticalDeathDate2));
    }

    autoTable(pdf, {
        startY: yPos,
        head: retirementHead,
        body: retirementData,
        theme: 'grid',
        headStyles: { fillColor: [52, 152, 219], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10 },
        margin: { left: 15, right: 15 }
    });

    yPos = pdf.lastAutoTable.finalY + 15;

    // ===== SIMULATION CHOICE SECTION (merged) =====
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(language === 'fr' ? 'Choix de Simulation' : 'Simulation Choice', 15, yPos);
    yPos += 8;

    // Retirement option text
    const option = scenarioData?.retirementOption || 'option1';

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

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(optionText, 20, yPos);
    yPos += 10;

    // Retirement details table
    const detailsHead = isCouple
        ? [[language === 'fr' ? 'Champ' : 'Field', language === 'fr' ? 'Personne 1' : 'Person 1', language === 'fr' ? 'Personne 2' : 'Person 2']]
        : [[language === 'fr' ? 'Champ' : 'Field', language === 'fr' ? 'Valeur' : 'Value']];

    const detailsData = [
        [language === 'fr' ? 'Date de Retraite Choisie' : 'Chosen Retirement Date', formatDate(scenarioData?.wishedRetirementDate)]
    ];
    if (isCouple) {
        detailsData[0].push(formatDate(scenarioData?.wishedRetirementDate2));
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
            0: { fontStyle: 'bold', cellWidth: 70 }
        },
        margin: { left: 20 }
    });

    addPageNumber(pdf, pageNum, totalPages, language);
};


/**
 * Page 5: Income and Assets
 */
export const generateIncomeAssets = (pdf, incomeData, assetData, language, pageNum, totalPages, isCouple) => {
    pdf.addPage();

    let yPos = addPageHeader(
        pdf,
        language === 'fr' ? 'Revenus et Actifs' : 'Income & Assets',
        null,
        20
    );

    yPos += 5;

    // Income section
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(language === 'fr' ? 'Sources de Revenus' : 'Income Sources', 15, yPos);
    yPos += 8;

    if (incomeData && incomeData.length > 0) {
        const incomeBody = incomeData.map(income => {
            const row = [
                income.name || 'N/A',
                formatCurrency(income.amount),
                income.frequency || 'N/A',
                formatDate(income.startDate),
                formatDate(income.endDate)
            ];
            if (isCouple) row.push(income.owner ? income.owner.toUpperCase() : (language === 'fr' ? 'PARTAGÉ' : 'SHARED'));
            return row;
        });

        const incomeHead = [[
            language === 'fr' ? 'Nom' : 'Name',
            language === 'fr' ? 'Montant' : 'Amount',
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
            headStyles: { fillColor: [46, 204, 113], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 8 },
            columnStyles: {
                1: { halign: 'right' }
            },
            margin: { left: 15, right: 15 }
        });

        yPos = pdf.lastAutoTable.finalY + 15;
    } else {
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(150, 150, 150);
        pdf.text(language === 'fr' ? 'Aucun revenu défini' : 'No income defined', 20, yPos);
        yPos += 15;
    }

    // Assets section
    yPos = checkPageBreak(pdf, yPos, 60);

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(language === 'fr' ? 'Actifs' : 'Assets', 15, yPos);
    yPos += 8;

    if (assetData && assetData.length > 0) {
        const assetBody = assetData.map(asset => {
            const row = [
                asset.name || 'N/A',
                formatCurrency(asset.amount),
                asset.category || 'N/A',
                asset.strategy || 'N/A',
                asset.availabilityType || 'N/A'
            ];
            if (isCouple) row.push(asset.owner ? asset.owner.toUpperCase() : (language === 'fr' ? 'PARTAGÉ' : 'SHARED'));
            return row;
        });

        const assetHead = [[
            language === 'fr' ? 'Nom' : 'Name',
            language === 'fr' ? 'Montant' : 'Amount',
            language === 'fr' ? 'Catégorie' : 'Category',
            language === 'fr' ? 'Stratégie' : 'Strategy',
            language === 'fr' ? 'Disponibilité' : 'Availability'
        ]];
        if (isCouple) assetHead[0].push(language === 'fr' ? 'Propriétaire' : 'Owner');

        autoTable(pdf, {
            startY: yPos,
            head: assetHead,
            body: assetBody,
            theme: 'striped',
            headStyles: { fillColor: [52, 152, 219], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 8 },
            columnStyles: {
                1: { halign: 'right' }
            },
            margin: { left: 15, right: 15 }
        });
    } else {
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(150, 150, 150);
        pdf.text(language === 'fr' ? 'Aucun actif défini' : 'No assets defined', 20, yPos);
    }

    addPageNumber(pdf, pageNum, totalPages, language);
};

/**
 * Page 6: Costs and Debts
 */
export const generateCostDebts = (pdf, costData, debtData, language, pageNum, totalPages, isCouple) => {
    pdf.addPage();

    let yPos = addPageHeader(
        pdf,
        language === 'fr' ? 'Dépenses et Dettes' : 'Costs & Debts',
        null,
        20
    );

    yPos += 5;

    // Costs section
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(language === 'fr' ? 'Dépenses Périodiques' : 'Periodic Costs', 15, yPos);
    yPos += 8;

    if (costData && costData.length > 0) {
        const costBody = costData.map(cost => {
            const row = [
                cost.name || 'N/A',
                formatCurrency(cost.amount),
                cost.frequency || 'N/A',
                formatDate(cost.startDate),
                formatDate(cost.endDate)
            ];
            if (isCouple) row.push(cost.owner ? cost.owner.toUpperCase() : (language === 'fr' ? 'PARTAGÉ' : 'SHARED'));
            return row;
        });

        const costHead = [[
            language === 'fr' ? 'Nom' : 'Name',
            language === 'fr' ? 'Montant' : 'Amount',
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
            headStyles: { fillColor: [231, 76, 60], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 8 },
            columnStyles: {
                1: { halign: 'right' }
            },
            margin: { left: 15, right: 15 }
        });

        yPos = pdf.lastAutoTable.finalY + 15;
    } else {
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(150, 150, 150);
        pdf.text(language === 'fr' ? 'Aucune dépense définie' : 'No costs defined', 20, yPos);
        yPos += 15;
    }

    // Debts section
    yPos = checkPageBreak(pdf, yPos, 60);

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(language === 'fr' ? 'Dettes' : 'Debts', 15, yPos);
    yPos += 8;

    if (debtData && debtData.length > 0) {
        const debtBody = debtData.map(debt => {
            const row = [
                debt.name || 'N/A',
                formatCurrency(debt.amount),
                debt.frequency || 'N/A',
                formatDate(debt.startDate),
                formatDate(debt.endDate)
            ];
            if (isCouple) row.push(debt.owner ? debt.owner.toUpperCase() : (language === 'fr' ? 'PARTAGÉ' : 'SHARED'));
            return row;
        });

        const debtHead = [[
            language === 'fr' ? 'Nom' : 'Name',
            language === 'fr' ? 'Montant' : 'Amount',
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
            headStyles: { fillColor: [192, 57, 43], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 8 },
            columnStyles: {
                1: { halign: 'right' }
            },
            margin: { left: 15, right: 15 }
        });
    } else {
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(150, 150, 150);
        pdf.text(language === 'fr' ? 'Aucune dette définie' : 'No debts defined', 20, yPos);
    }

    addPageNumber(pdf, pageNum, totalPages, language);
};

export default {
    generatePersonalInfo,
    generateIncomeAssets,
    generateCostDebts
};
