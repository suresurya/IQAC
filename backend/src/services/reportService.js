import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";

/**
 * Professional PDF Builder for IQAC Academic Intelligence System
 * Generates formal institutional documents suitable for NBA/NAAC audits.
 */
export const buildPdfBuffer = async (title, rows, reportMeta = {}) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      bufferPages: true,
    });

    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));

    const {
      subtitle,
      columns,
      summaryRows,
      aiAnalysis
    } = reportMeta;

    // --- Page Header Block ---
    doc.rect(0, 0, doc.page.width, 70).fill("#1e3a5f");
    // Institution Name
    doc.fillColor("white").fontSize(14).font("Helvetica-Bold")
      .text("IQAC Academic Intelligence System", 0, 20, { align: "center", width: doc.page.width });
    // Report Title
    doc.fillColor("white").fontSize(11).font("Helvetica")
      .text(title, 0, 42, { align: "center", width: doc.page.width });
    
    // Date
    const dateStr = new Date().toLocaleString();
    doc.fontSize(9).text(dateStr, 0, 44, { align: "right", width: doc.page.width - 50 });

    doc.y = 90;

    // --- Subtitle Line ---
    if (subtitle) {
      doc.fillColor("#555555").fontSize(10).font("Helvetica")
        .text(subtitle, 50, doc.y);
      doc.moveDown(1.5);
    }

    // --- Summary Section ---
    if (summaryRows && summaryRows.length > 0) {
      const startY = doc.y;
      // Background for summary
      doc.rect(50, startY - 8, doc.page.width - 100, 20 + summaryRows.length * 16 + 10).fill("#f9f9f9");
      
      doc.fillColor("#1e3a5f").fontSize(11).font("Helvetica-Bold")
        .text("Report Summary", 60, startY);
      doc.moveDown(0.5);

      summaryRows.forEach((item, idx) => {
        const y = doc.y;
        if (idx % 2 === 1) {
          doc.rect(55, y - 2, doc.page.width - 110, 16).fill("#f0f4f8");
        }
        doc.fillColor("#333333").fontSize(10).font("Helvetica-Bold").text(item.label, 65, y);
        doc.font("Helvetica").text(String(item.value), 250, y);
        doc.moveDown(0.6);
      });
      doc.moveDown(1.5);
    }

    // --- AI Analysis Section ---
    if (aiAnalysis) {
      doc.moveDown();
      const yA = doc.y;
      
      // Calculate height approximation for rect
      const aiHeight = doc.heightOfString(aiAnalysis, { width: doc.page.width - 110, align: "justify", lineGap: 4.5 }) + 30;
      doc.rect(50, yA, 4, aiHeight).fill("#7c3aed");
      
      doc.fillColor("#7c3aed").fontSize(10).font("Helvetica-Bold").text("AI Generated Analysis", 65, yA + 5);
      doc.moveDown(0.8);
      
      doc.fillColor("#444444").fontSize(9).font("Helvetica").text(aiAnalysis, 65, doc.y, {
        align: "justify",
        lineGap: 4.5,
        width: doc.page.width - 110
      });
      doc.moveDown(2);
    }

    // --- Data Table ---
    if (columns && columns.length > 0 && rows && rows.length > 0) {
      // Very basic distribution logic depending on string lengths, or equal
      let usableWidth = doc.page.width - 100;
      const colWidths = columns.map(() => usableWidth / columns.length);

      const drawTableHeader = (yPos) => {
        doc.rect(50, yPos, usableWidth, 20).fill("#1e3a5f");
        doc.fillColor("white").fontSize(9).font("Helvetica-Bold");
        let cx = 55;
        columns.forEach((col, i) => {
          doc.text(col.header, cx, yPos + 6, { width: colWidths[i] - 5, ellipsis: true });
          cx += colWidths[i];
        });
        return yPos + 20;
      };

      let currentY = drawTableHeader(doc.y);

      rows.forEach((row, rowIdx) => {
        // Form page break near bottom
        if (currentY > doc.page.height - 60) {
          doc.addPage();
          
          doc.fillColor("#555555").fontSize(9).font("Helvetica-Bold")
             .text(`${title} (Continued)`, 50, 40);
          
          currentY = 60;
          currentY = drawTableHeader(currentY);
        }

        if (rowIdx % 2 === 1) {
          doc.rect(50, currentY, usableWidth, 16).fill("#f8f9fa");
        } else {
          doc.rect(50, currentY, usableWidth, 16).fill("white");
        }

        doc.fillColor("#333333").fontSize(9).font("Helvetica");
        let cx = 55;
        columns.forEach((col, i) => {
          let val = String(row[col.key] || "");
          if (row[col.key] === 0) val = "0";
          doc.text(val, cx, currentY + 4, { width: colWidths[i] - 5, ellipsis: true });
          cx += colWidths[i];
        });

        currentY += 16;
        doc.y = currentY;
      });
    }

    // --- Footer ---
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      const footerY = doc.page.height - 35;
      
      doc.moveTo(50, footerY).lineTo(doc.page.width - 50, footerY).lineWidth(1).stroke("#cccccc");
      
      doc.fillColor("gray").fontSize(8).font("Helvetica");
      doc.text("CONFIDENTIAL — IQAC Internal Document", 50, footerY + 10);
      
      // Try to determine reportType directly if needed, for now just use main title or known report name
      let rTypeStr = "Report Generation";
      if (title.toUpperCase().includes("STUDENT")) rTypeStr = "STUDENT_PROGRESS";
      if (title.toUpperCase().includes("DEPARTMENT")) rTypeStr = "DEPARTMENT_PERFORMANCE";
      if (title.toUpperCase().includes("CGPA")) rTypeStr = "CGPA_DISTRIBUTION";
      if (title.toUpperCase().includes("BACKLOG")) rTypeStr = "BACKLOG_ANALYSIS";
      if (title.toUpperCase().includes("PLACEMENT")) rTypeStr = "PLACEMENT";
      if (title.toUpperCase().includes("FACULTY")) rTypeStr = "FACULTY_CONTRIBUTION";

      doc.text(rTypeStr, 0, footerY + 10, { align: "center", width: doc.page.width });
      doc.text(`Page ${i + 1}`, 0, footerY + 10, { align: "right", width: doc.page.width - 50 });
    }

    doc.end();
  });
};

/**
 * Excel Builder (XLSX)
 */
export const buildExcelBuffer = async (sheetName, rows, columns = []) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Report Output", {
    views: [{ showGridLines: false }]
  });

  // Basic styling params
  const NAVY = "FF1E3A5F";
  const LIGHT_BLUE = "FFE8F0FE";
  const WHITE = "FFFFFFFF";

  let colKeys = columns.length > 0 ? columns.map(c => c.key) : (rows.length > 0 ? Object.keys(rows[0]) : []);
  let colHeaders = columns.length > 0 ? columns.map(c => c.header) : colKeys;

  // Row 1: Merge across all
  const endColStr = sheet.getColumn(Math.max(colHeaders.length, 1)).letter;
  sheet.mergeCells(`A1:${endColStr}1`);
  const headerRow = sheet.getRow(1);
  headerRow.height = 30;
  const headerCell = sheet.getCell("A1");
  headerCell.value = sheetName.toUpperCase();
  headerCell.font = { size: 14, bold: true, color: { argb: NAVY } };
  headerCell.alignment = { vertical: "middle", horizontal: "center" };

  // Row 2: Empty Space
  // Row 3: Column Headers
  const titleRow = sheet.getRow(3);
  colHeaders.forEach((hName, idx) => {
    const cell = titleRow.getCell(idx + 1);
    cell.value = hName;
    cell.font = { bold: true, color: { argb: WHITE }, size: 11 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: NAVY }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Calculate widths based on content
  const columnWidths = colHeaders.map((_, i) => ({ width: 15 }));
  
  // Data Rows start at Row 4
  let currentRowNum = 4;
  rows.forEach((rowData, idx) => {
    const row = sheet.getRow(currentRowNum);
    
    const isAlternate = idx % 2 !== 0;

    colKeys.forEach((key, colIdx) => {
      let cellVal = rowData[key];
      if (cellVal === undefined || cellVal === null) cellVal = "";
      const cell = row.getCell(colIdx + 1);
      cell.value = cellVal;
      
      // Update max width based on content length
      const contentLen = String(cellVal).length + 2;
      if (contentLen > columnWidths[colIdx].width) {
         columnWidths[colIdx].width = Math.min(contentLen, 50); // cap max width
      }

      cell.font = { size: 10 };
      if (typeof cellVal === 'number') {
        cell.alignment = { horizontal: 'center' };
      } else {
        cell.alignment = { horizontal: 'right' };
      }

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isAlternate ? LIGHT_BLUE : WHITE }
      };

      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E5E5' } },
        left: { style: 'thin', color: { argb: 'FFE5E5E5' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E5E5' } },
        right: { style: 'thin', color: { argb: 'FFE5E5E5' } }
      };
    });
    
    // adjust row height gently
    row.height = 18;
    currentRowNum++;
  });

  // Apply calculated widths
  colHeaders.forEach((_, idx) => {
    sheet.getColumn(idx + 1).width = Math.max(columnWidths[idx].width, 15);
  });

  // Add generation footer
  currentRowNum++;
  sheet.mergeCells(`A${currentRowNum}:${endColStr}${currentRowNum}`);
  const footCell = sheet.getCell(`A${currentRowNum}`);
  footCell.value = `Generated: ${new Date().toLocaleString()} (IQAC Academic Intelligence System)`;
  footCell.font = { italic: true, size: 9, color: { argb: "FF888888" } };
  footCell.alignment = { horizontal: "right" };

  return await workbook.xlsx.writeBuffer();
};
