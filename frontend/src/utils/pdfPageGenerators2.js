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
 * Page 4: Personal Information and Life Expectancy
 */
export const generatePersonalInfo = (pdf, userData, scenarioData, language, pageNum, totalPages) => {
    pdf.addPage();

    let yPos = addPageHeader(
        pdf,
        language === 'fr' ? 'Informations Personnelles' : 'Personal Information',
        null,
        20
    );

    yPos += 5;

    // Personal details
    const personalData = [
        [language === 'fr' ? 'Nom' : 'Name', userData.name || 'N/A'],
        [language === 'fr' ? 'Date de Naissance' : 'Birth Date', formatDate(userData.birthDate)],
        [language === 'fr' ? 'Âge Actuel' : 'Current Age', userData.currentAge || 'N/A'],
        [language === 'fr' ? 'Sexe' : 'Gender', userData.gender || 'N/A']
    ];

    autoTable(pdf, {
        startY: yPos,
        head: [[language === 'fr' ? 'Champ' : 'Field', language === 'fr' ? 'Valeur' : 'Value']],
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

    const retirementData = [
        [language === 'fr' ? 'Âge Légal de Retraite' : 'Legal Retirement Age', scenarioData.legalRetirementAge || '65'],
        [language === 'fr' ? 'Date Légale de Retraite' : 'Legal Retirement Date', formatDate(scenarioData.legalRetirementDate)],
        [language === 'fr' ? 'Espérance de Vie' : 'Life Expectancy', `${scenarioData.lifeExpectancy || 'N/A'} ${language === 'fr' ? 'ans' : 'years'}`],
        [language === 'fr' ? 'Date de Décès Théorique' : 'Theoretical Death Date', formatDate(userData.theoreticalDeathDate)]
    ];

    autoTable(pdf, {
        startY: yPos,
        head: [[language === 'fr' ? 'Champ' : 'Field', language === 'fr' ? 'Valeur' : 'Value']],
        body: retirementData,
        theme: 'grid',
        headStyles: { fillColor: [52, 152, 219], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10 },
        margin: { left: 15, right: 15 }
    });

    addPageNumber(pdf, pageNum, totalPages, language);
};

/**
 * Page 5: Income and Assets
 */
export const generateIncomeAssets = (pdf, incomeData, assetData, language, pageNum, totalPages) => {
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
        const incomeBody = incomeData.map(income => [
            income.name || 'N/A',
            formatCurrency(income.amount),
            income.frequency || 'N/A',
            formatDate(income.startDate),
            formatDate(income.endDate)
        ]);

        autoTable(pdf, {
            startY: yPos,
            head: [[
                language === 'fr' ? 'Nom' : 'Name',
                language === 'fr' ? 'Montant' : 'Amount',
                language === 'fr' ? 'Fréquence' : 'Frequency',
                language === 'fr' ? 'Début' : 'Start',
                language === 'fr' ? 'Fin' : 'End'
            ]],
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
        const assetBody = assetData.map(asset => [
            asset.name || 'N/A',
            formatCurrency(asset.amount),
            asset.category || 'N/A',
            asset.strategy || 'N/A',
            asset.availabilityType || 'N/A'
        ]);

        autoTable(pdf, {
            startY: yPos,
            head: [[
                language === 'fr' ? 'Nom' : 'Name',
                language === 'fr' ? 'Montant' : 'Amount',
                language === 'fr' ? 'Catégorie' : 'Category',
                language === 'fr' ? 'Stratégie' : 'Strategy',
                language === 'fr' ? 'Disponibilité' : 'Availability'
            ]],
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
export const generateCostDebts = (pdf, costData, debtData, language, pageNum, totalPages) => {
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
        const costBody = costData.map(cost => [
            cost.name || 'N/A',
            formatCurrency(cost.amount),
            cost.frequency || 'N/A',
            formatDate(cost.startDate),
            formatDate(cost.endDate)
        ]);

        autoTable(pdf, {
            startY: yPos,
            head: [[
                language === 'fr' ? 'Nom' : 'Name',
                language === 'fr' ? 'Montant' : 'Amount',
                language === 'fr' ? 'Fréquence' : 'Frequency',
                language === 'fr' ? 'Début' : 'Start',
                language === 'fr' ? 'Fin' : 'End'
            ]],
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
        const debtBody = debtData.map(debt => [
            debt.name || 'N/A',
            formatCurrency(debt.amount),
            debt.frequency || 'N/A',
            formatDate(debt.startDate),
            formatDate(debt.endDate)
        ]);

        autoTable(pdf, {
            startY: yPos,
            head: [[
                language === 'fr' ? 'Nom' : 'Name',
                language === 'fr' ? 'Montant' : 'Amount',
                language === 'fr' ? 'Fréquence' : 'Frequency',
                language === 'fr' ? 'Début' : 'Start',
                language === 'fr' ? 'Fin' : 'End'
            ]],
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
