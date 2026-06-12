const { parseSpecFile, buildTree, parseRequirementsFile } = require('./parser');
const { apiRequest, chunkArray } = require('./api');

// ─── 1. Validate environment variables ─────────────────────────────────────
const PROJECT_ID = process.env.PROJECT_ID;
if (!PROJECT_ID) {
  console.error('[ERROR] PROJECT_ID environment variable must be set.');
  process.exit(1);
}

// State IDs
const TODO_STATE_ID = process.env.TODO_STATE_ID;
const IN_PROGRESS_STATE_ID = process.env.IN_PROGRESS_STATE_ID;
const DONE_STATE_ID = process.env.DONE_STATE_ID;

if (!TODO_STATE_ID || !IN_PROGRESS_STATE_ID || !DONE_STATE_ID) {
  console.error('[ERROR] State IDs (TODO, IN_PROGRESS, DONE) must be set in environment.');
  process.exit(1);
}

// Module IDs
const MODULE_IDS = {
  MODULE_AUTH_ID: process.env.MODULE_AUTH_ID,
  MODULE_TASK_ID: process.env.MODULE_TASK_ID,
  MODULE_MEMBER_ID: process.env.MODULE_MEMBER_ID,
  MODULE_BACKLOG_ID: process.env.MODULE_BACKLOG_ID,
  MODULE_STATE_ID: process.env.MODULE_STATE_ID,
  MODULE_MODULE_ID: process.env.MODULE_MODULE_ID,
  MODULE_SPRINT_ID: process.env.MODULE_SPRINT_ID,
  MODULE_COLLAB_ID: process.env.MODULE_COLLAB_ID,
};

// Sprint IDs
const SPRINT_IDS = {
  SPRINT1_ID: process.env.SPRINT1_ID,
  SPRINT2_ID: process.env.SPRINT2_ID,
  SPRINT3_ID: process.env.SPRINT3_ID,
  SPRINT4_ID: process.env.SPRINT4_ID,
  SPRINT5_ID: process.env.SPRINT5_ID,
  SPRINT6_ID: process.env.SPRINT6_ID,
  SPRINT7_ID: process.env.SPRINT7_ID,
  SPRINT8_ID: process.env.SPRINT8_ID,
  SPRINT9_ID: process.env.SPRINT9_ID,
};

// User IDs for Assignees
const users = {
  sm: process.env.SM_USER_ID,
  po: process.env.PO_USER_ID,
  ba1: process.env.BA1_USER_ID,
  ba2: process.env.BA2_USER_ID,
  ba3: process.env.BA3_USER_ID,
  dev1: process.env.DEV1_USER_ID,
  dev2: process.env.DEV2_USER_ID,
  dev3: process.env.DEV3_USER_ID,
  qa1: process.env.QA1_USER_ID,
  qa2: process.env.QA2_USER_ID,
  stakeholder1: process.env.STAKEHOLDER1_USER_ID,
};

// ─── 2. Assignee & Estimate Helpers ───────────────────────────────────────
let baIndex = 0;
let devIndex = 0;
let qaIndex = 0;

function getAssignee(title) {
  const lower = title.toLowerCase();
  
  if (lower.includes('test') || lower.includes('verify') || lower.includes('checkpoint') || lower.includes('qa')) {
    const qas = [users.qa1, users.qa2].filter(Boolean);
    if (qas.length === 0) return [users.sm];
    const res = qas[qaIndex % qas.length];
    qaIndex++;
    return [res];
  }
  
  if (lower.includes('design') || lower.includes('requirements') || lower.includes('product') || lower.includes('epic')) {
    return [users.po];
  }
  
  if (lower.includes('ba') || lower.includes('business analyst') || lower.includes('use case') || lower.includes('user story mapping')) {
    const bas = [users.ba1, users.ba2, users.ba3].filter(Boolean);
    if (bas.length === 0) return [users.po];
    const res = bas[baIndex % bas.length];
    baIndex++;
    return [res];
  }
  
  if (lower.includes('setup') || lower.includes('admin') || lower.includes('management') || lower.includes('migration') || lower.includes('docker') || lower.includes('cron') || lower.includes('script')) {
    return [users.sm];
  }
  
  // Default: Developer round-robin
  const devs = [users.dev1, users.dev2, users.dev3].filter(Boolean);
  if (devs.length === 0) return [users.sm];
  const res = devs[devIndex % devs.length];
  devIndex++;
  return [res];
}

function getEstimateValue(title) {
  const lower = title.toLowerCase();
  if (lower.includes('e2e') || lower.includes('drag & drop') || lower.includes('burndown') || lower.includes('collaboration')) {
    return 5;
  }
  if (lower.includes('service') || lower.includes('controller') || lower.includes('guard') || lower.includes('form') || lower.includes('page')) {
    return 3;
  }
  if (lower.includes('migration') || lower.includes('schema') || lower.includes('dto') || lower.includes('constant') || lower.includes('checkpoint') || lower.includes('verify')) {
    return 1;
  }
  return 2; // default estimate
}

// ─── 3. Sprint & Module Historical Mapping Logic ─────────────────────────
function getSprintAndModule(specName, treeNode, parentSprintContext) {
  const sprintContext = treeNode.sprintContext || parentSprintContext || '';
  
  let sprintId = SPRINT_IDS.SPRINT7_ID; // Default active
  let moduleId = MODULE_IDS.MODULE_TASK_ID; // Default
  
  if (specName === 'user-authentication') {
    sprintId = SPRINT_IDS.SPRINT1_ID;
    moduleId = MODULE_IDS.MODULE_AUTH_ID;
  } else if (specName === 'task-management') {
    sprintId = SPRINT_IDS.SPRINT2_ID;
    moduleId = MODULE_IDS.MODULE_TASK_ID;
  } else if (specName === 'project-management') {
    sprintId = SPRINT_IDS.SPRINT3_ID;
    moduleId = MODULE_IDS.MODULE_MEMBER_ID;
  } else if (specName === 'member-management') {
    sprintId = SPRINT_IDS.SPRINT3_ID;
    moduleId = MODULE_IDS.MODULE_MEMBER_ID;
  } else if (specName === 'backlog-enhancements') {
    if (sprintContext.includes('Sprint 1') || sprintContext.includes('Sprint 2')) {
      sprintId = SPRINT_IDS.SPRINT4_ID;
      moduleId = MODULE_IDS.MODULE_BACKLOG_ID;
    } else if (sprintContext.includes('Sprint 3')) {
      sprintId = SPRINT_IDS.SPRINT5_ID;
      moduleId = MODULE_IDS.MODULE_STATE_ID;
    } else if (sprintContext.includes('Sprint 4')) {
      sprintId = SPRINT_IDS.SPRINT6_ID;
      moduleId = MODULE_IDS.MODULE_MODULE_ID;
    } else {
      sprintId = SPRINT_IDS.SPRINT4_ID;
      moduleId = MODULE_IDS.MODULE_BACKLOG_ID;
    }
  } else if (specName === 'project-settings' || specName === 'project-settings-tab-ui-consistency') {
    sprintId = SPRINT_IDS.SPRINT5_ID;
    moduleId = MODULE_IDS.MODULE_STATE_ID;
  } else if (specName === 'module-lifecycle-states') {
    sprintId = SPRINT_IDS.SPRINT6_ID;
    moduleId = MODULE_IDS.MODULE_MODULE_ID;
  } else if (specName === 'task-detail-ui-optimization') {
    sprintId = SPRINT_IDS.SPRINT7_ID;
    moduleId = MODULE_IDS.MODULE_TASK_ID;
  } else if (specName === 'sprints-cycles') {
    moduleId = MODULE_IDS.MODULE_SPRINT_ID;
    
    // Parse task major number to divide Sprint 7 vs 8
    const numMatch = treeNode.title.match(/^(\d+)(?:\.(\d+))?\b/);
    if (numMatch) {
      const major = parseInt(numMatch[1], 10);
      const minor = numMatch[2] ? parseInt(numMatch[2], 10) : null;
      
      const isSprint8 = (major === 8 || major === 9 || major === 10 || major === 17 || major === 18 || major === 19 || (major === 14 && minor === 2));
      sprintId = isSprint8 ? SPRINT_IDS.SPRINT8_ID : SPRINT_IDS.SPRINT7_ID;
    } else {
      sprintId = SPRINT_IDS.SPRINT7_ID;
    }
  }
  
  return { sprintId, moduleId };
}

// ─── 4. Build Description JSON (TipTap doc) ───────────────────────────────
// Nội dung phân tích được trích từ requirements.md + bullet chi tiết trong
// tasks.md (đã loại bỏ code formatting) — chỉ văn bản phân tích, không kèm code.
const MAX_DETAILS = 8;
const MAX_CRITERIA = 6;

function textNode(text, marks) {
  const node = { type: 'text', text };
  if (marks) node.marks = marks;
  return node;
}

function paragraph(...nodes) {
  return { type: 'paragraph', content: nodes };
}

function heading(text, level = 3) {
  return { type: 'heading', attrs: { level }, content: [textNode(text)] };
}

function bulletList(items) {
  return {
    type: 'bulletList',
    content: items.map(text => ({
      type: 'listItem',
      content: [paragraph(textNode(text))]
    }))
  };
}

function docOf(content) {
  return { type: 'doc', content };
}

// Tra cứu các tham chiếu "3.1" sang User Story + Acceptance Criteria trong requirements.md
function resolveRefs(refs, reqDoc) {
  const stories = [];
  const criteria = [];
  if (!reqDoc || !refs || refs.length === 0) return { stories, criteria };

  const seenStories = new Set();
  const seenCriteria = new Set();
  for (const ref of refs) {
    const [majorStr, minorStr] = String(ref).split('.');
    const req = reqDoc.requirements[parseInt(majorStr, 10)];
    if (!req) continue;
    if (req.userStory && !seenStories.has(req.number)) {
      seenStories.add(req.number);
      stories.push(req.userStory);
    }
    if (minorStr) {
      const crit = req.criteria[parseInt(minorStr, 10) - 1];
      if (crit && !seenCriteria.has(ref)) {
        seenCriteria.add(ref);
        criteria.push({ ref, text: crit });
      }
    }
  }
  return { stories, criteria };
}

// Mô tả Epic: tổng quan phân tích (Introduction) + phạm vi yêu cầu của spec
function buildEpicDescription(specTitle, reqDoc) {
  const content = [heading('Tổng quan phân tích', 3)];
  if (reqDoc && reqDoc.introduction) {
    content.push(paragraph(textNode(reqDoc.introduction)));
  } else {
    content.push(paragraph(textNode(`Epic quản lý toàn bộ user story và tác vụ thuộc phạm vi ${specTitle}.`)));
  }

  const reqs = reqDoc ? Object.values(reqDoc.requirements) : [];
  if (reqs.length > 0) {
    content.push(heading('Phạm vi yêu cầu', 3));
    content.push(bulletList(reqs.map(r =>
      `Yêu cầu ${r.number}: ${r.title}${r.criteria.length ? ` — ${r.criteria.length} tiêu chí chấp nhận` : ''}`
    )));
  }
  return docOf(content);
}

// Mô tả Story/Task: User Story liên quan + phân tích công việc + tiêu chí chấp nhận
function buildItemDescription(node, reqDoc, extraRefs = []) {
  const content = [];
  const ownRefs = node.requirementRefs || [];
  const combined = resolveRefs([...ownRefs, ...extraRefs], reqDoc);
  const own = resolveRefs(ownRefs, reqDoc);

  if (combined.stories.length > 0) {
    content.push(paragraph(textNode('User Story liên quan: ', [{ type: 'bold' }]), textNode(combined.stories[0])));
  } else {
    content.push(paragraph(textNode(`Phân tích nghiệp vụ cho hạng mục: ${node.title}. Triển khai và kiểm thử theo thiết kế của spec.`)));
  }

  const details = (node.details || []).slice(0, MAX_DETAILS);
  if (details.length > 0) {
    content.push(heading('Phân tích công việc', 4));
    content.push(bulletList(details));
  }

  const crits = own.criteria.slice(0, MAX_CRITERIA);
  if (crits.length > 0) {
    content.push(heading('Tiêu chí chấp nhận liên quan', 4));
    content.push(bulletList(crits.map(c => `(${c.ref}) ${c.text}`)));
  }

  return docOf(content);
}

// Item có nội dung phân tích thực sự (khác fallback generic) hay không — dùng cho báo cáo
function hasAnalysis(node, reqDoc, extraRefs = []) {
  if (node.details && node.details.length > 0) return true;
  const { stories, criteria } = resolveRefs([...(node.requirementRefs || []), ...extraRefs], reqDoc);
  return stories.length > 0 || criteria.length > 0;
}

// ─── 5. Seeding Statistics (báo cáo phân tích cuối phiên import) ──────────
const SPRINT_LABELS = {};
for (const key in SPRINT_IDS) {
  SPRINT_LABELS[SPRINT_IDS[key]] = key.replace('SPRINT', 'Sprint ').replace('_ID', '');
}

const MODULE_LABELS = {};
const MODULE_LABEL_BY_KEY = {
  MODULE_AUTH_ID: 'Core & Authentication',
  MODULE_TASK_ID: 'Task Management & Details',
  MODULE_MEMBER_ID: 'Project & Members',
  MODULE_BACKLOG_ID: 'Backlog & Labels',
  MODULE_STATE_ID: 'State Templates & Settings',
  MODULE_MODULE_ID: 'Modules & Lifecycle',
  MODULE_SPRINT_ID: 'Sprints, Cycles & Velocity',
  MODULE_COLLAB_ID: 'Collaboration & Comments',
};
for (const key in MODULE_IDS) {
  MODULE_LABELS[MODULE_IDS[key]] = MODULE_LABEL_BY_KEY[key] || key;
}

const stats = {
  epics: 0,
  stories: 0,
  tasks: 0,
  points: 0,
  enriched: 0,
  totalItems: 0,
  bySprint: {},   // sprintId -> { count, points }
  byModule: {},   // moduleId -> { count, points }
  byState: { todo: 0, inProgress: 0, done: 0 },
};

function trackItem({ sprintId, moduleId, stateId, points = 0, enriched = false }) {
  stats.totalItems++;
  stats.points += points;
  if (enriched) stats.enriched++;

  if (sprintId) {
    stats.bySprint[sprintId] = stats.bySprint[sprintId] || { count: 0, points: 0 };
    stats.bySprint[sprintId].count++;
    stats.bySprint[sprintId].points += points;
  }
  if (moduleId) {
    stats.byModule[moduleId] = stats.byModule[moduleId] || { count: 0, points: 0 };
    stats.byModule[moduleId].count++;
    stats.byModule[moduleId].points += points;
  }
  if (stateId === DONE_STATE_ID) stats.byState.done++;
  else if (stateId === IN_PROGRESS_STATE_ID) stats.byState.inProgress++;
  else stats.byState.todo++;
}

function printAnalysisReport() {
  const pad = (s, n) => String(s).padEnd(n);
  console.log('\n══════════════ BÁO CÁO PHÂN TÍCH DỮ LIỆU DEMO ══════════════');
  console.log(`Khối lượng:  ${stats.epics} Epics, ${stats.stories} Stories, ${stats.tasks} Tasks — tổng ${stats.points} story points.`);

  console.log('\nPhân bố theo Sprint (items / points):');
  for (const key in SPRINT_IDS) {
    const id = SPRINT_IDS[key];
    const s = stats.bySprint[id];
    if (s) console.log(`  - ${pad(SPRINT_LABELS[id], 10)} ${s.count} items / ${s.points} pts`);
  }

  console.log('\nPhân bố theo Module (items / points):');
  for (const key in MODULE_IDS) {
    const id = MODULE_IDS[key];
    const m = stats.byModule[id];
    if (m) console.log(`  - ${pad(MODULE_LABELS[id], 30)} ${m.count} items / ${m.points} pts`);
  }

  const { todo, inProgress, done } = stats.byState;
  const donePct = stats.totalItems ? Math.round((done / stats.totalItems) * 100) : 0;
  console.log('\nPhân bố theo trạng thái:');
  console.log(`  - Done:        ${done} (${donePct}%)`);
  console.log(`  - In Progress: ${inProgress}`);
  console.log(`  - Todo:        ${todo}`);

  const coverage = stats.totalItems ? Math.round((stats.enriched / stats.totalItems) * 100) : 0;
  console.log(`\nĐộ phủ phân tích: ${stats.enriched}/${stats.totalItems} items (${coverage}%) có mô tả trích từ tài liệu`);
  console.log('phân tích (User Story, Acceptance Criteria, phân tích công việc) — không kèm code.');
  console.log('═════════════════════════════════════════════════════════════');
}

// ─── 6. Main Runner ───────────────────────────────────────────────────────
async function run() {
  console.log('[INFO] Bắt đầu nạp dữ liệu từ các file specifications...');
  
  const specs = [
    { name: 'user-authentication', path: '.kiro/specs/_completed/user-authentication/tasks.md', title: 'User Authentication & Security' },
    { name: 'task-management', path: '.kiro/specs/_completed/task-management/tasks.md', title: 'Task Management Core' },
    { name: 'project-management', path: '.kiro/specs/_completed/project-management/tasks.md', title: 'Project Management & Workspace Layout' },
    { name: 'member-management', path: '.kiro/specs/_completed/member-management/tasks.md', title: 'Member Management & Access Settings' },
    { name: 'backlog-enhancements', path: '.kiro/specs/_completed/backlog-enhancements/tasks.md', title: 'Backlog Enhancements & Display Properties' },
    { name: 'project-settings', path: '.kiro/specs/_completed/project-settings/tasks.md', title: 'Project States & Custom Estimates' },
    { name: 'project-settings-tab-ui-consistency', path: '.kiro/specs/project-settings-tab-ui-consistency/tasks.md', title: 'Project Settings UI Consistency & Styling' },
    { name: 'module-lifecycle-states', path: '.kiro/specs/_completed/module-lifecycle-states/tasks.md', title: 'Modules Lifecycle & Change Transitions' },
    { name: 'task-detail-ui-optimization', path: '.kiro/specs/_completed/task-detail-ui-optimization/tasks.md', title: 'Task Detail UI Optimization' },
    { name: 'sprints-cycles', path: '.kiro/specs/sprints-cycles/tasks.md', title: 'Sprints & Cycles Management' }
  ];
  
  // Track assignments to avoid separate API calls
  const sprintAssignments = {};
  const moduleAssignments = {};
  
  for (const sprintKey in SPRINT_IDS) {
    sprintAssignments[SPRINT_IDS[sprintKey]] = [];
  }
  for (const moduleKey in MODULE_IDS) {
    moduleAssignments[MODULE_IDS[moduleKey]] = [];
  }
  
  let totalTasksCreated = 0;
  let hasActiveInProgress = false;
  
  for (const spec of specs) {
    console.log(`\nProcessing Spec: ${spec.title}...`);

    // 0. Load tài liệu phân tích (requirements.md) cùng thư mục với tasks.md
    const reqDoc = parseRequirementsFile(spec.path.replace(/tasks\.md$/, 'requirements.md'));
    if (reqDoc) {
      const reqCount = Object.keys(reqDoc.requirements).length;
      console.log(`  Analysis doc loaded: ${reqCount} requirements (User Story + Acceptance Criteria).`);
    } else {
      console.log('  Analysis doc not found — dùng mô tả mặc định.');
    }

    // 1. Create Epic
    const epicDesc = buildEpicDescription(spec.title, reqDoc);
    const epicResponse = await apiRequest(`/api/projects/${PROJECT_ID}/tasks`, 'POST', {
      title: spec.title,
      type: 'epic',
      stateId: TODO_STATE_ID,
      priority: 'high',
      assigneeIds: [users.po],
      description: epicDesc
    });

    const epicId = epicResponse.id;
    stats.epics++;
    console.log(`  Epic Created: ${spec.title} (ID: ${epicId})`);
    
    // 2. Parse & Build Tree
    const parsedItems = parseSpecFile(spec.path);
    const tree = buildTree(parsedItems);
    
    // 3. Import Tree
    for (const node of tree) {
      const { sprintId, moduleId } = getSprintAndModule(spec.name, node, null);
      
      // Determine state ID based on Sprint
      let stateId = TODO_STATE_ID;
      const isHistorical = sprintId !== SPRINT_IDS.SPRINT7_ID && sprintId !== SPRINT_IDS.SPRINT8_ID && sprintId !== SPRINT_IDS.SPRINT9_ID;
      
      if (isHistorical) {
        stateId = DONE_STATE_ID;
      } else if (sprintId === SPRINT_IDS.SPRINT7_ID) {
        if (node.checked) {
          stateId = DONE_STATE_ID;
        } else if (!hasActiveInProgress) {
          stateId = IN_PROGRESS_STATE_ID;
          hasActiveInProgress = true; // Make one active item In Progress
        } else {
          stateId = TODO_STATE_ID;
        }
      } else {
        stateId = TODO_STATE_ID;
      }
      
      const assigneeIds = getAssignee(node.title);
      const estimateValue = getEstimateValue(node.title);

      if (node.isStory) {
        // Create Story — gom thêm refs của các subtask để hiển thị User Story liên quan
        const childRefs = node.tasks.flatMap(t => t.requirementRefs || []);
        const storyResponse = await apiRequest(`/api/projects/${PROJECT_ID}/tasks`, 'POST', {
          title: node.title,
          type: 'story',
          stateId,
          parentId: epicId,
          priority: 'medium',
          assigneeIds,
          description: buildItemDescription(node, reqDoc, childRefs)
        });

        const storyId = storyResponse.id;
        totalTasksCreated++;
        stats.stories++;
        trackItem({ sprintId, moduleId, stateId, enriched: hasAnalysis(node, reqDoc, childRefs) });

        sprintAssignments[sprintId].push(storyId);
        moduleAssignments[moduleId].push(storyId);

        // Create Sub-Tasks
        for (const sub of node.tasks) {
          const subAssignee = getAssignee(sub.title);
          const subEstimate = getEstimateValue(sub.title);

          let subStateId = stateId;
          if (sprintId === SPRINT_IDS.SPRINT7_ID) {
            subStateId = sub.checked ? DONE_STATE_ID : TODO_STATE_ID;
          }

          const taskResponse = await apiRequest(`/api/projects/${PROJECT_ID}/tasks`, 'POST', {
            title: sub.title,
            type: 'task',
            stateId: subStateId,
            parentId: storyId,
            priority: 'medium',
            estimateValue: subEstimate,
            assigneeIds: subAssignee,
            description: buildItemDescription(sub, reqDoc)
          });

          totalTasksCreated++;
          stats.tasks++;
          trackItem({ sprintId, moduleId, stateId: subStateId, points: subEstimate, enriched: hasAnalysis(sub, reqDoc) });
          sprintAssignments[sprintId].push(taskResponse.id);
          moduleAssignments[moduleId].push(taskResponse.id);
        }
      } else {
        // Create Flat Task directly under Epic
        const taskResponse = await apiRequest(`/api/projects/${PROJECT_ID}/tasks`, 'POST', {
          title: node.title,
          type: 'task',
          stateId,
          parentId: epicId,
          priority: 'medium',
          estimateValue,
          assigneeIds,
          description: buildItemDescription(node, reqDoc)
        });

        const taskId = taskResponse.id;
        totalTasksCreated++;
        stats.tasks++;
        trackItem({ sprintId, moduleId, stateId, points: estimateValue, enriched: hasAnalysis(node, reqDoc) });

        sprintAssignments[sprintId].push(taskId);
        moduleAssignments[moduleId].push(taskId);
      }
    }
  }
  
  // ─── 6. Epic 9: Collaboration & Threaded Comments (Manually seed future tasks) ─
  console.log('\nProcessing Custom Spec: Collaboration & Threaded Comments...');
  const epic9Desc = docOf([
    heading('Tổng quan phân tích', 3),
    paragraph(textNode('Epic phát triển hệ thống bình luận trong thẻ công việc: phản hồi phân luồng 1 cấp và thả biểu cảm emoji, phục vụ trao đổi trực tiếp giữa QA và Developer trong quá trình kiểm thử.')),
    heading('Phạm vi yêu cầu', 3),
    bulletList([
      'Bình luận lồng nhau 1 cấp (thread reply) trên timeline của task',
      'Thả biểu cảm emoji với bộ emoji cố định trên từng bình luận',
      'Cập nhật bình luận theo thời gian thực giữa các thành viên đang mở task',
    ]),
  ]);
  const epic9Response = await apiRequest(`/api/projects/${PROJECT_ID}/tasks`, 'POST', {
    title: 'Collaboration & Threaded Comments',
    type: 'epic',
    stateId: TODO_STATE_ID,
    priority: 'low',
    assigneeIds: [users.qa1],
    description: epic9Desc
  });
  const epic9Id = epic9Response.id;
  stats.epics++;

  const story9Desc = docOf([
    paragraph(textNode('User Story liên quan: ', [{ type: 'bold' }]), textNode('Là QA, tôi muốn bình luận các lỗi và nhận phản hồi phân luồng ngay trong thẻ công việc, để trao đổi kiểm thử không bị phân mảnh qua kênh chat ngoài.')),
    heading('Tiêu chí chấp nhận liên quan', 4),
    bulletList([
      'WHEN người dùng trả lời một bình luận, THE hệ thống SHALL hiển thị phản hồi lồng 1 cấp dưới bình luận gốc',
      'WHEN người dùng thả emoji, THE hệ thống SHALL gộp số lượt theo từng loại emoji và highlight lựa chọn của chính họ',
    ]),
  ]);
  const story9Response = await apiRequest(`/api/projects/${PROJECT_ID}/tasks`, 'POST', {
    title: 'Linear Comments & Reactions',
    type: 'story',
    stateId: TODO_STATE_ID,
    parentId: epic9Id,
    priority: 'high',
    assigneeIds: [users.qa1],
    description: story9Desc
  });
  const story9Id = story9Response.id;
  totalTasksCreated++;
  stats.stories++;
  trackItem({ sprintId: SPRINT_IDS.SPRINT9_ID, moduleId: MODULE_IDS.MODULE_COLLAB_ID, stateId: TODO_STATE_ID, enriched: true });
  sprintAssignments[SPRINT_IDS.SPRINT9_ID].push(story9Id);
  moduleAssignments[MODULE_IDS.MODULE_COLLAB_ID].push(story9Id);

  const task9_1Response = await apiRequest(`/api/projects/${PROJECT_ID}/tasks`, 'POST', {
    title: 'Implement 1-level thread reply card layout',
    type: 'task',
    stateId: TODO_STATE_ID,
    parentId: story9Id,
    priority: 'high',
    estimateValue: 5,
    assigneeIds: [users.dev1],
    description: docOf([
      paragraph(textNode('Phân tích nghiệp vụ: giao diện timeline bình luận hiển thị phản hồi lồng 1 cấp, mỗi card gồm avatar, tên người gửi, thời gian tương đối và nội dung rich text.')),
      heading('Phân tích công việc', 4),
      bulletList([
        'Thiết kế layout card bình luận và vùng phản hồi thụt lề 1 cấp',
        'Sắp xếp bình luận gốc theo thời gian tăng dần, phản hồi nằm ngay dưới bình luận cha',
        'Hỗ trợ dark mode và trạng thái đang soạn thảo phản hồi',
      ]),
    ])
  });
  totalTasksCreated++;
  stats.tasks++;
  trackItem({ sprintId: SPRINT_IDS.SPRINT9_ID, moduleId: MODULE_IDS.MODULE_COLLAB_ID, stateId: TODO_STATE_ID, points: 5, enriched: true });
  sprintAssignments[SPRINT_IDS.SPRINT9_ID].push(task9_1Response.id);
  moduleAssignments[MODULE_IDS.MODULE_COLLAB_ID].push(task9_1Response.id);

  const task9_2Response = await apiRequest(`/api/projects/${PROJECT_ID}/tasks`, 'POST', {
    title: 'Support reaction with a fixed emoji set',
    type: 'task',
    stateId: TODO_STATE_ID,
    parentId: story9Id,
    priority: 'low',
    estimateValue: 2,
    assigneeIds: [users.dev2],
    description: docOf([
      paragraph(textNode('Phân tích nghiệp vụ: cho phép thả biểu cảm emoji trên từng bình luận với bộ emoji cố định, gộp số lượt thả theo loại.')),
      heading('Phân tích công việc', 4),
      bulletList([
        'Hiển thị popover chọn emoji từ bộ cố định khi hover/click vào bình luận',
        'Gộp và đếm lượt thả theo từng emoji, toggle khi người dùng thả lại cùng emoji',
      ]),
    ])
  });
  totalTasksCreated++;
  stats.tasks++;
  trackItem({ sprintId: SPRINT_IDS.SPRINT9_ID, moduleId: MODULE_IDS.MODULE_COLLAB_ID, stateId: TODO_STATE_ID, points: 2, enriched: true });
  sprintAssignments[SPRINT_IDS.SPRINT9_ID].push(task9_2Response.id);
  moduleAssignments[MODULE_IDS.MODULE_COLLAB_ID].push(task9_2Response.id);
  
  // ─── 7. Execute Batch Sprint & Module Assignments ────────────────────────
  console.log('\n[INFO] Đang thực hiện gán các Task/Story vào Sprints & Modules bằng Batch API...');
  
  for (const sprintId in sprintAssignments) {
    const taskIds = sprintAssignments[sprintId];
    if (taskIds.length > 0) {
      const chunks = chunkArray(taskIds, 100);
      for (let i = 0; i < chunks.length; i++) {
        console.log(`  Assigning chunk ${i + 1}/${chunks.length} of ${chunks[i].length} tasks to Sprint ID: ${sprintId}...`);
        await apiRequest(`/api/projects/${PROJECT_ID}/sprints/${sprintId}/tasks`, 'POST', { taskIds: chunks[i] });
      }
    }
  }
  
  for (const moduleId in moduleAssignments) {
    const taskIds = moduleAssignments[moduleId];
    if (taskIds.length > 0) {
      const chunks = chunkArray(taskIds, 100);
      for (let i = 0; i < chunks.length; i++) {
        console.log(`  Assigning chunk ${i + 1}/${chunks.length} of ${chunks[i].length} tasks to Module ID: ${moduleId}...`);
        await apiRequest(`/api/projects/${PROJECT_ID}/modules/${moduleId}/tasks`, 'POST', { taskIds: chunks[i] });
      }
    }
  }
  
  // ─── 8. Execute Sprint Lifecycles (Sprint 1 to 6 completed) ──────────────
  console.log('\n[INFO] Đang thực hiện mô phỏng chu kỳ hoạt động Sprint...');
  
  const sprintSequence = [
    SPRINT_IDS.SPRINT1_ID,
    SPRINT_IDS.SPRINT2_ID,
    SPRINT_IDS.SPRINT3_ID,
    SPRINT_IDS.SPRINT4_ID,
    SPRINT_IDS.SPRINT5_ID,
    SPRINT_IDS.SPRINT6_ID,
  ];
  
  for (let idx = 0; idx < sprintSequence.length; idx++) {
    const sId = sprintSequence[idx];
    console.log(`  - Kích hoạt và Hoàn thành Sprint ${idx + 1}...`);
    // Start sprint
    await apiRequest(`/api/projects/${PROJECT_ID}/sprints/${sId}/start`, 'POST');
    // Complete sprint
    await apiRequest(`/api/projects/${PROJECT_ID}/sprints/${sId}/complete`, 'POST', { moveToBacklog: true });
  }
  
  // Start Sprint 7 (leaving it Active)
  console.log('  - Kích hoạt Sprint 7 (Active)...');
  await apiRequest(`/api/projects/${PROJECT_ID}/sprints/${SPRINT_IDS.SPRINT7_ID}/start`, 'POST');
  
  console.log(`\n[OK] Đã import thành công tổng cộng ${totalTasksCreated} Tasks/Stories.`);
  console.log('[OK] Hoàn thành seeding spec.');

  printAnalysisReport();
}

run().catch(err => {
  console.error('[FATAL ERROR] Lỗi trong quá trình chạy script seeder:', err);
  process.exit(1);
});
