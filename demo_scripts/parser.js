const fs = require('fs');
const path = require('path');

/**
 * Loại bỏ định dạng code/markdown (inline backtick, bold, italic) khỏi văn bản
 * để nội dung phân tích đưa vào description chỉ là văn bản thuần, không kèm code.
 */
function stripInlineCode(text) {
  return text
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/^_+|_+$/g, '')
    .trim();
}

/**
 * Đọc và parse file Markdown spec thành danh sách các dòng checklist (tasks).
 * Mỗi item kèm theo:
 *  - details: các bullet mô tả chi tiết bên dưới (đã loại bỏ code formatting)
 *  - requirementRefs: các tham chiếu yêu cầu dạng "3.1" từ dòng `_Requirements:` / `Validates:`
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
  let lastItem = null;
  let inCodeFence = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Bỏ qua toàn bộ nội dung nằm trong code fence (``` ... ```)
    if (/^\s*```/.test(line)) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

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

      lastItem = {
        indent,
        checked,
        title: stripInlineCode(content),
        sprintContext: currentSprintName,
        details: [],
        requirementRefs: [],
      };
      items.push(lastItem);
      continue;
    }

    // Bullet mô tả chi tiết (không phải checkbox) nằm dưới checklist item gần nhất
    const detailMatch = line.match(/^\s+-\s+(?!\[)(.*)$/);
    if (detailMatch && lastItem) {
      const text = detailMatch[1].trim();

      // Dòng tham chiếu yêu cầu: `_Requirements: 1.1, 2.3_` hoặc `**Validates: Requirements 3.1**`
      if (/^[_*]*(?:Validates:\s*)?Requirements?\b[:\s]/i.test(text)) {
        const refs = text.match(/\d+(?:\.\d+)?/g) || [];
        lastItem.requirementRefs.push(...refs);
        continue;
      }

      // Bỏ các dòng meta không phải nội dung phân tích
      if (/^_?(Leverage|Prompt|Note)s?\s*:/i.test(text)) continue;

      // Bỏ bullet nặng code: phần trong backtick chiếm quá nửa dòng,
      // hoặc phần văn xuôi còn lại quá ngắn để là nội dung phân tích
      const codeLen = (text.match(/`[^`]*`/g) || []).join('').length;
      const proseLetters = text.replace(/`[^`]*`/g, '').replace(/[^\p{L}]/gu, '');
      if (codeLen > text.length * 0.5 || proseLetters.length < 12) continue;

      const clean = stripInlineCode(text);
      if (clean) lastItem.details.push(clean);
    }
  }
  return items;
}

/**
 * Parse file requirements.md (tài liệu phân tích) của một spec.
 * Trả về { introduction, requirements: { [số yêu cầu]: { number, title, userStory, criteria[] } } }
 * hoặc null nếu file không tồn tại. Mọi code block đều bị bỏ qua.
 */
function parseRequirementsFile(filePath) {
  if (!fs.existsSync(filePath)) return null;

  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  const result = { introduction: '', requirements: {} };
  let section = '';
  let currentReq = null;
  let inCriteria = false;
  let inCodeFence = false;

  for (const raw of lines) {
    if (/^\s*```/.test(raw)) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    const line = raw.trimEnd();

    if (/^##\s+Introduction\b/i.test(line)) {
      section = 'intro';
      continue;
    }

    // Chấp nhận các biến thể heading: `### Requirement 1:`, `## Requirement 1:`, `### REQ-1:`
    const reqMatch = line.match(/^#{2,3}\s+(?:Requirement\s+(\d+)|REQ-(\d+))\s*[:.—-]?\s*(.*)$/i);
    if (reqMatch) {
      currentReq = {
        number: parseInt(reqMatch[1] || reqMatch[2], 10),
        title: stripInlineCode(reqMatch[3]),
        userStory: '',
        criteria: [],
      };
      result.requirements[currentReq.number] = currentReq;
      section = 'req';
      inCriteria = false;
      continue;
    }

    if (/^##\s+/.test(line)) {
      section = '';
      currentReq = null;
      continue;
    }

    if (section === 'intro') {
      if (line.trim()) {
        result.introduction += (result.introduction ? ' ' : '') + stripInlineCode(line.trim());
      }
      continue;
    }

    if (section === 'req' && currentReq) {
      const usMatch = line.match(/^\*\*User Story\s*:?\*\*\s*(.*)$/i);
      if (usMatch) {
        currentReq.userStory = stripInlineCode(usMatch[1]);
        continue;
      }
      if (/^#{3,4}\s+Acceptance Criteria\b/i.test(line)) {
        inCriteria = true;
        continue;
      }
      if (inCriteria) {
        const critMatch = line.match(/^\s*\d+\.\s+(.*)$/);
        if (critMatch) currentReq.criteria.push(stripInlineCode(critMatch[1]));
      }
    }
  }
  return result;
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
          details: item.details,
          requirementRefs: item.requirementRefs,
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
          details: item.details,
          requirementRefs: item.requirementRefs,
          isStory: false
        });
      }
    } else {
      // Build a Subtask under the current Story
      if (currentStory) {
        currentStory.tasks.push({
          title: item.title,
          checked: item.checked,
          sprintContext: item.sprintContext,
          details: item.details,
          requirementRefs: item.requirementRefs
        });
      } else {
        tree.push({
          title: item.title,
          checked: item.checked,
          sprintContext: item.sprintContext,
          details: item.details,
          requirementRefs: item.requirementRefs,
          isStory: false
        });
      }
    }
  }
  return tree;
}

module.exports = {
  parseSpecFile,
  buildTree,
  parseRequirementsFile
};
