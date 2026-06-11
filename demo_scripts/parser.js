const fs = require('fs');
const path = require('path');

/**
 * Đọc và parse file Markdown spec thành danh sách các dòng checklist (tasks).
 */
function parseSpecFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[WARN] File not found: ${filePath}`);
    return [];
  }
  
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const lines = fileContent.split('\n');
  const items = [];
  let currentSprintName = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check H2 headings: e.g. ## Sprint 1 — Backlog UI Improvements
    const sprintMatch = line.match(/^##\s+(Sprint\s+\d+|Phase\s+\d+|Checklist|Tasks)\b(.*)$/i);
    if (sprintMatch) {
      currentSprintName = line.replace(/^##\s+/, '').trim();
      continue;
    }
    
    // Check checklist items: e.g. - [ ] 1. Title or - [x] 1. Title
    const taskMatch = line.match(/^(\s*)-\s*\[([ xX])\](?:\*?)\s*(.*)$/);
    if (taskMatch) {
      const indent = taskMatch[1].length;
      const checked = taskMatch[2].toLowerCase() === 'x';
      let content = taskMatch[3].trim();
      
      // Clean leading characters
      if (content.startsWith('*')) {
        content = content.substring(1).trim();
      }
      
      items.push({
        indent,
        checked,
        title: content,
        sprintContext: currentSprintName,
      });
    }
  }
  return items;
}

/**
 * Xây dựng cấu trúc cây User Story -> Subtask dựa trên độ thụt dòng (indent).
 */
function buildTree(parsedItems) {
  const tree = [];
  let currentStory = null;
  
  for (let i = 0; i < parsedItems.length; i++) {
    const item = parsedItems[i];
    const isMainItem = item.indent === 0;
    
    if (isMainItem) {
      // Check ahead to see if it has sub-items
      let hasSubItems = false;
      for (let j = i + 1; j < parsedItems.length; j++) {
        if (parsedItems[j].indent === 0) break;
        if (parsedItems[j].indent > 0) {
          hasSubItems = true;
          break;
        }
      }
      
      if (hasSubItems) {
        // Build a User Story
        currentStory = {
          title: item.title,
          checked: item.checked,
          sprintContext: item.sprintContext,
          tasks: [],
          isStory: true
        };
        tree.push(currentStory);
      } else {
        // Build a flat Task directly under Epic
        currentStory = null;
        tree.push({
          title: item.title,
          checked: item.checked,
          sprintContext: item.sprintContext,
          isStory: false
        });
      }
    } else {
      // Build a Subtask under the current Story
      if (currentStory) {
        currentStory.tasks.push({
          title: item.title,
          checked: item.checked,
          sprintContext: item.sprintContext
        });
      } else {
        tree.push({
          title: item.title,
          checked: item.checked,
          sprintContext: item.sprintContext,
          isStory: false
        });
      }
    }
  }
  return tree;
}

module.exports = {
  parseSpecFile,
  buildTree
};
