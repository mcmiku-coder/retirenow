/**
 * PDF Helper Utilities
 * Shared functions for generating professional PDF reports
 */

/**
 * Add page number footer to PDF
 * @param {jsPDF} pdf - The PDF document
 * @param {number} pageNum - Current page number
 * @param {number} totalPages - Total number of pages
 * @param {string} language - Current language ('en' or 'fr')
 */
export const addPageNumber = (pdf, pageNum, totalPages, language = 'en') => {
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pageWidth = pdf.internal.pageSize.getWidth();

    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.setFont('helvetica', 'normal');

    const text = language === 'fr'
        ? `Page ${pageNum} sur ${totalPages}`
        : `Page ${pageNum} of ${totalPages}`;

    const textWidth = pdf.getTextWidth(text);
    pdf.text(text, pageWidth - textWidth - 15, pageHeight - 10);
};

/**
 * Add consistent header to PDF page
 * @param {jsPDF} pdf - The PDF document
 * @param {string} title - Main title
 * @param {string} subtitle - Optional subtitle
 * @param {number} yPosition - Starting Y position (default: 20)
 * @returns {number} - New Y position after header
 */
export const addPageHeader = (pdf, title, subtitle = null, yPosition = 20) => {
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(title, 15, yPosition);

    let newY = yPosition + 10;

    if (subtitle) {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 100, 100);
        pdf.text(subtitle, 15, newY);
        newY += 8;
    }

    return newY;
};

/**
 * Format currency value for display
 * @param {number} value - Numeric value
 * @param {string} currency - Currency symbol (default: 'CHF')
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (value, currency = 'CHF') => {
    if (value === null || value === undefined || isNaN(value)) {
        return `${currency} 0`;
    }

    const formatted = Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
    return `${currency} ${formatted}`;
};

/**
 * Format number with thousand separators
 * @param {number} value - Numeric value
 * @returns {string} - Formatted number string
 */
export const formatNumber = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
        return '0';
    }

    return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
};

/**
 * Format date for display
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted date string (DD.MM.YYYY)
 */
export const formatDate = (date) => {
    if (!date) return 'N/A';

    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}.${month}.${year}`;
};

/**
 * Get verdict image path based on simulation result
 * @param {boolean} canQuit - Whether user can quit
 * @returns {string} - Image path
 */
export const getVerdictImage = (canQuit) => {
    // Return paths to the retro-style verdict posters
    if (canQuit) {
        return '/verdict-success.png'; // "YES YOU CAN! QUIT!"
    } else {
        return '/verdict-failure.png'; // "NO YOU CANNOT QUIT YET!"
    }
};

/**
 * Get logo image as base64 data URI
 * @returns {string} - Base64 data URI
 */
export const getLogoImage = () => {
    // Return the path to the local cover image
    // This will be loaded from the public folder
    return '/cover-image.jpg';
};

/**
 * Wrap text to fit within specified width
 * @param {jsPDF} pdf - The PDF document
 * @param {string} text - Text to wrap
 * @param {number} maxWidth - Maximum width in PDF units
 * @returns {string[]} - Array of text lines
 */
export const wrapText = (pdf, text, maxWidth) => {
    if (!text) return [];

    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach(word => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = pdf.getTextWidth(testLine);

        if (testWidth > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    });

    if (currentLine) {
        lines.push(currentLine);
    }

    return lines;
};

/**
 * Add a horizontal line separator
 * @param {jsPDF} pdf - The PDF document
 * @param {number} yPosition - Y position for the line
 * @param {number} leftMargin - Left margin (default: 15)
 * @param {number} rightMargin - Right margin (default: 15)
 * @returns {number} - New Y position after line
 */
export const addSeparatorLine = (pdf, yPosition, leftMargin = 15, rightMargin = 15) => {
    const pageWidth = pdf.internal.pageSize.getWidth();

    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.5);
    pdf.line(leftMargin, yPosition, pageWidth - rightMargin, yPosition);

    return yPosition + 5;
};

/**
 * Check if content will fit on current page, add new page if needed
 * @param {jsPDF} pdf - The PDF document
 * @param {number} currentY - Current Y position
 * @param {number} requiredSpace - Required space for content
 * @param {number} bottomMargin - Bottom margin (default: 40)
 * @returns {number} - New Y position (20 if new page added, currentY otherwise)
 */
export const checkPageBreak = (pdf, currentY, requiredSpace, bottomMargin = 40) => {
    const pageHeight = pdf.internal.pageSize.getHeight();

    if (currentY + requiredSpace > pageHeight - bottomMargin) {
        pdf.addPage();
        return 20;
    }

    return currentY;
};

/**
 * Apply conditional color formatting to table cell
 * @param {number} value - Numeric value
 * @returns {number[]} - RGB color array [r, g, b]
 */
export const getValueColor = (value) => {
    if (value >= 0) {
        return [34, 197, 94]; // Green
    } else {
        return [239, 68, 68]; // Red
    }
};
