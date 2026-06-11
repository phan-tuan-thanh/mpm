const { parseSpecFile, buildTree } = require('./parser');
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

// ─── 4. Build Description JSON ───────────────────────────────────────────
function getDescription(title) {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: `Công việc chi tiết: ${title}. Triển khai và kiểm thử theo thiết kế của spec.`
          }
        ]
      }
    ]
  };
}

// ─── 5. Main Runner ───────────────────────────────────────────────────────
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
    
    // 1. Create Epic
    const epicDesc = getDescription(`Epic quản lý tất cả các câu chuyện người dùng và tác vụ liên quan đến ${spec.title}.`);
    const epicResponse = await apiRequest(`/api/projects/${PROJECT_ID}/tasks`, 'POST', {
      title: spec.title,
      type: 'epic',
      stateId: TODO_STATE_ID,
      priority: 'high',
      assigneeIds: [users.po],
      description: epicDesc
    });
    
    const epicId = epicResponse.id;
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
      const description = getDescription(node.title);
      
      if (node.isStory) {
        // Create Story
        const storyResponse = await apiRequest(`/api/projects/${PROJECT_ID}/tasks`, 'POST', {
          title: node.title,
          type: 'story',
          stateId,
          parentId: epicId,
          priority: 'medium',
          assigneeIds,
          description
        });
        
        const storyId = storyResponse.id;
        totalTasksCreated++;
        
        sprintAssignments[sprintId].push(storyId);
        moduleAssignments[moduleId].push(storyId);
        
        // Create Sub-Tasks
        for (const sub of node.tasks) {
          const subAssignee = getAssignee(sub.title);
          const subEstimate = getEstimateValue(sub.title);
          const subDesc = getDescription(sub.title);
          
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
            description: subDesc
          });
          
          totalTasksCreated++;
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
          description
        });
        
        const taskId = taskResponse.id;
        totalTasksCreated++;
        
        sprintAssignments[sprintId].push(taskId);
        moduleAssignments[moduleId].push(taskId);
      }
    }
  }
  
  // ─── 6. Epic 9: Collaboration & Threaded Comments (Manually seed future tasks) ─
  console.log('\nProcessing Custom Spec: Collaboration & Threaded Comments...');
  const epic9Desc = getDescription('Epic phát triển bình luận, phân luồng trả lời trực tiếp trong thẻ công việc.');
  const epic9Response = await apiRequest(`/api/projects/${PROJECT_ID}/tasks`, 'POST', {
    title: 'Collaboration & Threaded Comments',
    type: 'epic',
    stateId: TODO_STATE_ID,
    priority: 'low',
    assigneeIds: [users.qa1],
    description: epic9Desc
  });
  const epic9Id = epic9Response.id;
  
  const story9Desc = getDescription('Là QA, tôi muốn comment các lỗi và phản hồi lồng phẳng trong card trao đổi.');
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
    description: getDescription('Giao diện hiển thị timeline comments 1 cấp lồng nhau.')
  });
  totalTasksCreated++;
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
    description: getDescription('Thả emoji reactions lên comment.')
  });
  totalTasksCreated++;
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
}

run().catch(err => {
  console.error('[FATAL ERROR] Lỗi trong quá trình chạy script seeder:', err);
  process.exit(1);
});
