/**
 * Google Apps Script for Daily Tracker
 * 
 * Setup Instructions:
 * 1. Create a new Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Delete the default code and paste this entire file
 * 4. Save the project
 * 5. Click "Deploy" > "New deployment"
 * 6. Select "Web app" as the type
 * 7. Set "Execute as" to "Me"
 * 8. Set "Who has access" to "Anyone"
 * 9. Click "Deploy" and copy the Web App URL
 * 10. Paste the URL in config.js GOOGLE_SCRIPT_URL
 * 
 * Sheet Structure (Auto-created):
 * Column A: date (YYYY-MM-DD)
 * Column B: title
 * Column C: level (1-4)
 * Column D: content (markdown)
 * Column E: updatedAt (timestamp)
 */

const SHEET_NAME = 'DailyRecords';

function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'getAll') {
    return getAllRecords();
  } else if (action === 'get') {
    const date = e.parameter.date;
    return getRecord(date);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    return saveRecord(data);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: error.message 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // Add headers
    sheet.getRange('A1:E1').setValues([['date', 'title', 'level', 'content', 'updatedAt']]);
    sheet.getRange('A1:E1').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  
  return sheet;
}

function getAllRecords() {
  const sheet = getOrCreateSheet();
  const data = sheet.getDataRange().getValues();
  
  // Skip header row
  const records = {};
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) {
      // Convert Date object to YYYY-MM-DD string if needed
      let dateKey = row[0];
      if (dateKey instanceof Date) {
        const year = dateKey.getFullYear();
        const month = String(dateKey.getMonth() + 1).padStart(2, '0');
        const day = String(dateKey.getDate()).padStart(2, '0');
        dateKey = `${year}-${month}-${day}`;
      } else if (typeof dateKey !== 'string') {
        dateKey = String(dateKey);
      }
      
      records[dateKey] = {
        title: row[1] || '',
        level: parseInt(row[2]) || 0,
        content: row[3] || '',
        updatedAt: row[4] || ''
      };
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    data: records
  })).setMimeType(ContentService.MimeType.JSON);
}

function getRecord(date) {
  const sheet = getOrCreateSheet();
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    // Convert Date object to YYYY-MM-DD string if needed
    let rowDate = data[i][0];
    if (rowDate instanceof Date) {
      const year = rowDate.getFullYear();
      const month = String(rowDate.getMonth() + 1).padStart(2, '0');
      const day = String(rowDate.getDate()).padStart(2, '0');
      rowDate = `${year}-${month}-${day}`;
    }
    
    if (rowDate === date) {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        data: {
          date: rowDate,
          title: data[i][1] || '',
          level: parseInt(data[i][2]) || 0,
          content: data[i][3] || '',
          updatedAt: data[i][4] || ''
        }
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    data: null
  })).setMimeType(ContentService.MimeType.JSON);
}

function saveRecord(data) {
  const sheet = getOrCreateSheet();
  const allData = sheet.getDataRange().getValues();
  const timestamp = new Date().toISOString();
  
  // Find existing row
  let rowIndex = -1;
  for (let i = 1; i < allData.length; i++) {
    // Convert Date object to YYYY-MM-DD string if needed
    let rowDate = allData[i][0];
    if (rowDate instanceof Date) {
      const year = rowDate.getFullYear();
      const month = String(rowDate.getMonth() + 1).padStart(2, '0');
      const day = String(rowDate.getDate()).padStart(2, '0');
      rowDate = `${year}-${month}-${day}`;
    }
    
    if (rowDate === data.date) {
      rowIndex = i + 1; // 1-indexed for sheet
      break;
    }
  }
  
  const rowData = [data.date, data.title, data.level, data.content, timestamp];
  
  if (rowIndex > 0) {
    // Update existing row
    sheet.getRange(rowIndex, 1, 1, 5).setValues([rowData]);
  } else {
    // Append new row
    sheet.appendRow(rowData);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'Record saved successfully',
    data: {
      date: data.date,
      title: data.title,
      level: data.level,
      content: data.content,
      updatedAt: timestamp
    }
  })).setMimeType(ContentService.MimeType.JSON);
}
