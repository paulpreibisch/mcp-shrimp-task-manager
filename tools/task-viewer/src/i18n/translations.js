export const translations = {
  en: {
    // Header
    appTitle: "🦐 Shrimp Task Manager Viewer",
    version: "Version",
    releaseNotes: "Release Notes",
    help: "Help",
    language: "Language",
    
    // Navigation tabs
    tasks: "Tasks",
    templates: "Templates",
    projects: "Projects",
    
    // Template Management
    templateManagement: "🎨 Template Management",
    templateManagementDesc: "Manage prompt templates for all task manager functions. Edit, duplicate, or reset templates to customize AI behavior.",
    exportTemplates: "📤 Export Templates",
    exportTemplatesDesc: "Export your template configurations to share with your team or backup for later use",
    
    // Template columns
    function: "Function",
    description: "Description",
    status: "Status",
    actions: "Actions",
    
    // Template statuses
    statusDefault: "Default",
    statusCustom: "Custom",
    statusCustomAppend: "Custom+Append",
    
    // Template actions
    edit: "Edit",
    editTemplate: "✏️ Edit Template",
    preview: "Preview",
    previewTemplate: "Preview: {name}",
    duplicate: "Duplicate",
    duplicateTemplate: "📋 Duplicate Template",
    activate: "Activate",
    activateTemplate: "🚀 Activate Template",
    reset: "Reset",
    resetToDefault: "Reset to default template",
    
    // Common actions
    save: "Save",
    cancel: "Cancel",
    back: "Back",
    backToTemplates: "← Back to Templates",
    close: "Close",
    
    // Duplicate Template View
    whyDuplicate: "📚 Why Duplicate Templates?",
    duplicateExplanation: "Duplicating templates allows you to create specialized versions of existing templates for different use cases:",
    createVariations: "🎯 Creating Variations",
    createVariationsDesc: "Make specialized versions for different contexts:",
    safeExperimentation: "🧪 Safe Experimentation",
    safeExperimentationDesc: "Test changes without affecting your working template:",
    templateLibraries: "📂 Template Libraries",
    templateLibrariesDesc: "Build collections of related templates:",
    versionManagement: "💾 Version Management",
    versionManagementDesc: "Keep different versions for different needs:",
    
    // Duplicate form
    createDuplicate: "📝 Create Duplicate",
    originalTemplate: "Original Template",
    newTemplateName: "New Template Name",
    required: "*",
    nameHint: "Choose a descriptive name that indicates the purpose or variation of this duplicate",
    whatWillHappen: "📋 What will happen:",
    createNewTemplate: "Create new template",
    copyContent: "Copy content",
    independentEditing: "Independent editing",
    readyToUse: "Ready to use",
    
    // Export Templates
    exportTemplateConfigurations: "Export Template Configurations",
    exportFormat: "Export Format:",
    exportOnlyModified: "Export only modified templates (recommended)",
    exportHint: "When checked, only exports templates that have been customized or overridden",
    
    // Activation Dialog
    whatIsEnvVar: "📋 What is an Environment Variable?",
    envVarExplanation: "Environment variables are settings that programs can read when they start. The MCP server checks for custom template variables to override its default prompts. By setting {envVar}, you're telling the MCP server to use your edited template instead of the built-in one.",
    whyNeedThis: "Why do we need this?",
    whyNeedThisExplanation: "When Claude starts the MCP server, it reads these environment variables to customize how it responds. Without setting this variable, your template edits won't be used.",
    howToSetVariable: "🚀 How to Set This Variable",
    chooseCommand: "Choose the appropriate command below based on your setup. These commands will export the variable to your shell configuration file (like ~/.bashrc or ~/.zshrc) so it's available when Claude starts.",
    
    // Messages
    loading: "Loading...",
    error: "Error",
    success: "Success",
    noTemplatesFound: "No templates found",
    failedToLoad: "Failed to load",
    
    // Pagination
    showing: "Showing",
    to: "to",
    of: "of",
    page: "Page",
    filteredFrom: "filtered from",
    total: "total",
    
    // Statistics
    totalTemplates: "Total Templates",
    totalNumberOfTemplates: "Total number of templates",
    numberOfDefaultTemplates: "Number of default templates",
    numberOfCustomTemplates: "Number of custom templates",
    numberOfEnvOverrideTemplates: "Number of environment overridden templates",
    default: "Default",
    custom: "Custom", 
    envOverride: "Env Override",
    
    // Project management
    readme: "Readme",
    addTab: "Add Project",
    history: "History",
    viewProjectHistory: "View project history",
    totalTasks: "Total Tasks",
    completed: "Completed",
    inProgress: "In Progress",
    pending: "Pending",
    autoRefresh: "Auto-refresh",
    
    // History management
    backToTasks: "Back to Tasks",
    backToHistory: "Back to History",
    projectHistory: "Project History",
    dateTime: "Date/Time",
    taskCount: "Task Count",
    notes: "Notes",
    statusSummary: "Status Summary",
    viewTasks: "View Tasks",
    noHistoryFound: "No History Found",
    noHistoryDescription: "No historical task snapshots are available for this project",
    historyRowTitle: "History entry - click View Tasks to see details",
    historyEntries: "history entries",
    tasksFrom: "Tasks from",
    taskName: "Task Name",
    noDependencies: "None",
    created: "Created",
    noTasksFound: "No Tasks Found",
    noTasksMessage: "The tasks.json file hasn't been created yet. Run shrimp in this folder to generate tasks.",
    noTasksInHistory: "This history snapshot contains no tasks",
    taskRowTitle: "Task details from historical snapshot",
    
    // Search and UI
    searchTemplatesPlaceholder: "🔍 Search templates...",
    searchTemplatesTitle: "Search and filter templates by function name or description",
    refreshTemplateData: "Refresh template data",
    searchTasksPlaceholder: "🔍 Search tasks...",
    searchTasksTitle: "Search and filter tasks by any text content",
    refreshCurrentProfile: "Refresh current project data - reload tasks from file",
    
    // Project management
    editProjectSettings: "Edit Project Settings",
    chooseProfileTitle: "Choose a project from the dropdown above",
    selectProfileToViewTasks: "Select a project to view tasks",
    noProfilesAvailable: "No projects available",
    noProfilesClickAddTab: "No projects available. Click \"Add Project\" to create one.",
    loadingTasksFromFile: "Loading tasks from file",
    loadingTasks: "Loading tasks... ⏳",
    
    // Add/Edit Project forms
    addNewProfile: "Add New Project",
    profileName: "Project Name",
    profileNamePlaceholder: "e.g., Team Alpha Tasks",
    profileNameTitle: "Enter a descriptive name for this project",
    taskFolderPath: "Task Folder Path",
    taskFolderPathPlaceholder: "/path/to/shrimp_data_folder",
    taskFolderPathTitle: "Enter the path to your shrimp data folder containing tasks.json",
    tip: "Tip",
    navigateToFolder: "Navigate to your shrimp data folder in terminal and",
    typePwd: "type pwd to get the full path",
    example: "Example",
    projectRootPath: "Project Root Path",
    projectRootPlaceholder: "e.g., /home/user/my-project",
    projectRootTitle: "Enter the absolute path to the project root directory",
    projectRootHint: "This enables clickable file links that open in VS Code",
    optional: "optional",
    addProfile: "Add Project",
    cancelAndCloseDialog: "Cancel and close this dialog",
    addProject: "Add Project",
    
    // Edit Project specific
    projectRoot: "Project Root",
    taskPath: "Task Path",
    editProfileNameTitle: "Edit the project name",
    projectRootEditPlaceholder: "e.g., /home/user/projects/my-project",
    projectRootEditTitle: "Set the project root path to enable VS Code file links",
    projectRootEditHint: "Set this to enable clickable VS Code links for task files",
    taskPathPlaceholder: "/path/to/shrimp_data_folder/tasks.json",
    taskPathTitle: "Edit the path to the tasks.json file for this project",
    taskPathHint: "Path to the tasks.json file containing the project's task data",
    saveChanges: "Save Changes",
    
    // Toast messages with parameters
    profileAddedSuccess: "Project \"{name}\" added successfully!",
    profileRemovedSuccess: "Project \"{name}\" removed successfully!",
    templateSavedSuccess: "Template \"{name}\" saved successfully!",
    templateResetSuccess: "Template \"{name}\" reset to default!",
    templateDuplicatedSuccess: "Template duplicated as \"{name}\"!",
    rememberToRestartClaude: "💡 Remember to restart Claude Code after setting environment variables",
    
    // Confirmation dialogs
    confirmRemoveProfile: "Are you sure you want to remove this project? This action cannot be undone.",
    confirmResetTemplate: "Are you sure you want to reset {name} to default? This will remove any customizations.",
    
    // Template activation
    defaultTemplateAlreadyActive: "Default template is already active - no activation needed",
    
    // Duplicate Template View additional keys
    noTemplateSelected: "No template selected",
    pleaseEnterDuplicateName: "Please enter a name for the duplicate template",
    duplicateNameMustBeDifferent: "Duplicate name must be different from the original",
    failedToDuplicateTemplate: "Failed to duplicate template",
    backToTemplateList: "Back to template list",
    creatingDuplicate: "Creating Duplicate...",
    
    // Task Table
    task: "TASK",
    taskName: "Task Name",
    created: "Created",
    updated: "Updated",
    dependencies: "Dependencies",
    noTasksFound: "No tasks found in this project",
    noDescriptionProvided: "No description provided",
    viewTask: "View task",
    clickToCopyUuid: "Click to copy UUID to clipboard",
    copyTaskInstruction: "Copy the following to the clipboard: Use task manager to complete this shrimp task",
    useTaskManager: "Use task manager to complete this shrimp task",
    clickToViewTaskDetails: "Click to view task details",
    
    // Template Editor
    saving: "Saving...",
    saveTemplate: "Save Template",
    
    // Project Settings
    projectSettings: "Project Settings",
    settingsSaved: "Settings saved successfully",
    settings: "Settings",
    
    // Global Settings
    globalSettings: "Global Settings",
    claudeFolderPath: "Claude Folder Path",
    claudeFolderPathDesc: "If you specify your Claude folder path, you will have access to sub-agent and hook settings",
    claudeFolderPathPlaceholder: "e.g., ~/.config/claude",
    
    // Task messages
    taskSavedSuccess: "Task saved successfully",
    confirmDeleteTask: "Are you sure you want to delete this task?",
    taskDeletedSuccess: "Task deleted successfully",
    deleteTask: "Delete task",
    
    // Agent functionality
    subAgents: "Sub-Agents",
    agents: "Agents", 
    agentName: "Agent Name",
    type: "Type",
    viewAgent: "View Agent",
    editAgent: "Edit Agent",
    noAgentsFound: "No agents found",
    agentSavedSuccess: "Agent saved successfully"
  },
  
  zh: {
    // Header
    appTitle: "🦐 虾米任务管理器查看器",
    version: "版本",
    releaseNotes: "发布说明",
    help: "帮助",
    language: "语言",
    
    // Navigation tabs
    tasks: "任务",
    templates: "模板",
    projects: "项目",
    
    // Template Management
    templateManagement: "🎨 模板管理",
    templateManagementDesc: "管理所有任务管理器功能的提示模板。编辑、复制或重置模板以自定义 AI 行为。",
    exportTemplates: "📤 导出模板",
    exportTemplatesDesc: "导出您的模板配置以与团队共享或备份以供日后使用",
    
    // Template columns
    function: "功能",
    description: "描述",
    status: "状态",
    actions: "操作",
    
    // Template statuses
    statusDefault: "默认",
    statusCustom: "自定义",
    statusCustomAppend: "自定义+追加",
    
    // Template actions
    edit: "编辑",
    editTemplate: "✏️ 编辑模板",
    preview: "预览",
    previewTemplate: "预览：{name}",
    duplicate: "复制",
    duplicateTemplate: "📋 复制模板",
    activate: "激活",
    activateTemplate: "🚀 激活模板",
    reset: "重置",
    resetToDefault: "重置为默认模板",
    
    // Common actions
    save: "保存",
    cancel: "取消",
    back: "返回",
    backToTemplates: "← 返回模板列表",
    close: "关闭",
    
    // Duplicate Template View
    whyDuplicate: "📚 为什么要复制模板？",
    duplicateExplanation: "复制模板允许您为不同的用例创建现有模板的专门版本：",
    createVariations: "🎯 创建变体",
    createVariationsDesc: "为不同上下文制作专门版本：",
    safeExperimentation: "🧪 安全实验",
    safeExperimentationDesc: "在不影响工作模板的情况下测试更改：",
    templateLibraries: "📂 模板库",
    templateLibrariesDesc: "构建相关模板的集合：",
    versionManagement: "💾 版本管理",
    versionManagementDesc: "根据不同需求保留不同版本：",
    
    // Duplicate form
    createDuplicate: "📝 创建副本",
    originalTemplate: "原始模板",
    newTemplateName: "新模板名称",
    required: "*",
    nameHint: "选择一个能说明此副本用途或变体的描述性名称",
    whatWillHappen: "📋 将会发生什么：",
    createNewTemplate: "创建新模板",
    copyContent: "复制内容",
    independentEditing: "独立编辑",
    readyToUse: "准备使用",
    
    // Export Templates
    exportTemplateConfigurations: "导出模板配置",
    exportFormat: "导出格式：",
    exportOnlyModified: "仅导出修改过的模板（推荐）",
    exportHint: "选中后，仅导出已自定义或覆盖的模板",
    
    // Activation Dialog
    whatIsEnvVar: "📋 什么是环境变量？",
    envVarExplanation: "环境变量是程序启动时可以读取的设置。MCP 服务器会检查自定义模板变量以覆盖其默认提示。通过设置 {envVar}，您告诉 MCP 服务器使用您编辑的模板而不是内置模板。",
    whyNeedThis: "为什么需要这个？",
    whyNeedThisExplanation: "当 Claude 启动 MCP 服务器时，它会读取这些环境变量来自定义响应方式。如果不设置此变量，您的模板编辑将不会被使用。",
    howToSetVariable: "🚀 如何设置此变量",
    chooseCommand: "根据您的设置选择下面的适当命令。这些命令会将变量导出到您的 shell 配置文件（如 ~/.bashrc 或 ~/.zshrc），以便在 Claude 启动时可用。",
    
    // Messages
    loading: "加载中...",
    error: "错误",
    success: "成功",
    noTemplatesFound: "未找到模板",
    failedToLoad: "加载失败",
    
    // Pagination
    showing: "显示",
    to: "至",
    of: "共",
    page: "页",
    filteredFrom: "筛选自",
    total: "总计",
    
    // Statistics
    totalTemplates: "模板总数",
    totalNumberOfTemplates: "模板总数",
    numberOfDefaultTemplates: "默认模板数量",
    numberOfCustomTemplates: "自定义模板数量",
    numberOfEnvOverrideTemplates: "环境覆盖模板数量",
    default: "默认",
    custom: "自定义", 
    envOverride: "环境覆盖",
    
    // Project management
    readme: "说明文档",
    addTab: "添加项目",
    history: "历史记录",
    viewProjectHistory: "查看项目历史记录",
    totalTasks: "任务总数",
    completed: "已完成",
    inProgress: "进行中",
    pending: "待处理",
    autoRefresh: "自动刷新",
    
    // History management
    backToTasks: "返回任务",
    backToHistory: "返回历史记录",
    projectHistory: "项目历史",
    dateTime: "日期/时间",
    taskCount: "任务数量",
    notes: "备注",
    statusSummary: "状态摘要",
    viewTasks: "查看任务",
    noHistoryFound: "未找到历史记录",
    noHistoryDescription: "此项目没有可用的历史任务快照",
    historyRowTitle: "历史条目 - 点击查看任务查看详情",
    historyEntries: "历史条目",
    tasksFrom: "任务来自",
    taskName: "任务名称",
    noDependencies: "无",
    created: "创建时间",
    noTasksFound: "未找到任务",
    noTasksInHistory: "此历史快照不包含任务",
    taskRowTitle: "来自历史快照的任务详情",
    
    // Search and UI
    searchTemplatesPlaceholder: "🔍 搜索模板...",
    searchTemplatesTitle: "按功能名称或描述搜索和筛选模板",
    refreshTemplateData: "刷新模板数据",
    searchTasksPlaceholder: "🔍 搜索任务...",
    searchTasksTitle: "按任何文本内容搜索和筛选任务",
    refreshCurrentProfile: "刷新当前项目数据 - 从文件重新加载任务",
    
    // Project management
    editProjectSettings: "编辑项目设置",
    chooseProfileTitle: "从上面的下拉菜单中选择项目",
    selectProfileToViewTasks: "选择项目以查看任务",
    noProfilesAvailable: "没有可用的项目",
    noProfilesClickAddTab: "没有可用的项目。点击\"添加项目\"创建一个。",
    loadingTasksFromFile: "从文件加载任务",
    loadingTasks: "加载任务中... ⏳",
    
    // Add/Edit Project forms
    addNewProfile: "添加新项目",
    profileName: "项目名称",
    profileNamePlaceholder: "例如，团队 Alpha 任务",
    profileNameTitle: "为此项目输入描述性名称",
    taskFolderPath: "任务文件夹路径",
    taskFolderPathPlaceholder: "/path/to/shrimp_data_folder",
    taskFolderPathTitle: "输入包含 tasks.json 的虾米数据文件夹路径",
    tip: "提示",
    navigateToFolder: "在终端中导航到您的虾米数据文件夹并",
    typePwd: "输入 pwd 获取完整路径",
    example: "示例",
    projectRootPath: "项目根路径",
    projectRootPlaceholder: "例如，/home/user/my-project",
    projectRootTitle: "输入项目根目录的绝对路径",
    projectRootHint: "这启用了在 VS Code 中打开的可点击文件链接",
    optional: "可选",
    addProfile: "添加项目",
    cancelAndCloseDialog: "取消并关闭对话框",
    addProject: "添加项目",
    
    // Edit Project specific
    projectRoot: "项目根目录",
    taskPath: "任务路径",
    editProfileNameTitle: "编辑项目名称",
    projectRootEditPlaceholder: "例如，/home/user/projects/my-project",
    projectRootEditTitle: "设置项目根路径以启用 VS Code 文件链接",
    projectRootEditHint: "设置此项以启用任务文件的可点击 VS Code 链接",
    taskPathPlaceholder: "/path/to/shrimp_data_folder/tasks.json",
    taskPathTitle: "编辑此项目的 tasks.json 文件路径",
    taskPathHint: "包含项目任务数据的 tasks.json 文件路径",
    saveChanges: "保存更改",
    
    // Toast messages with parameters
    profileAddedSuccess: "项目\"{name}\"添加成功！",
    profileRemovedSuccess: "项目\"{name}\"删除成功！",
    templateSavedSuccess: "模板\"{name}\"保存成功！",
    templateResetSuccess: "模板\"{name}\"重置为默认！",
    templateDuplicatedSuccess: "模板复制为\"{name}\"！",
    rememberToRestartClaude: "💡 记住在设置环境变量后重启 Claude Code",
    
    // Confirmation dialogs
    confirmRemoveProfile: "您确定要删除此项目吗？此操作无法撤消。",
    confirmResetTemplate: "您确定要将 {name} 重置为默认吗？这将删除任何自定义设置。",
    
    // Template activation
    defaultTemplateAlreadyActive: "默认模板已经激活 - 无需激活",
    
    // Duplicate Template View additional keys
    noTemplateSelected: "未选择模板",
    pleaseEnterDuplicateName: "请为复制模板输入名称",
    duplicateNameMustBeDifferent: "复制名称必须与原始名称不同",
    failedToDuplicateTemplate: "复制模板失败",
    backToTemplateList: "返回模板列表",
    creatingDuplicate: "正在创建副本...",
    
    // Task Table
    task: "任务",
    taskName: "任务名称",
    created: "创建时间",
    updated: "更新时间",
    dependencies: "依赖项",
    noTasksFound: "此项目中未找到任务",
    noDescriptionProvided: "未提供描述",
    viewTask: "查看任务",
    clickToCopyUuid: "点击复制 UUID 到剪贴板",
    copyTaskInstruction: "复制以下内容到剪贴板：使用任务管理器完成此虾米任务",
    useTaskManager: "使用任务管理器完成此虾米任务",
    clickToViewTaskDetails: "点击查看任务详情",
    
    // Template Editor
    saving: "保存中...",
    saveTemplate: "保存模板",
    
    // Project Settings
    projectSettings: "项目设置",
    settingsSaved: "设置保存成功",
    settings: "设置",
    
    // Global Settings
    globalSettings: "全局设置",
    claudeFolderPath: "Claude 文件夹路径",
    claudeFolderPathDesc: "如果您指定 Claude 文件夹路径，您将能够访问子代理和钩子设置",
    claudeFolderPathPlaceholder: "例如：~/.config/claude",
    
    // Task messages
    taskSavedSuccess: "任务保存成功",
    confirmDeleteTask: "您确定要删除此任务吗？",
    taskDeletedSuccess: "任务删除成功",
    deleteTask: "删除任务",
    
    // Agent functionality
    subAgents: "子代理",
    agents: "代理",
    agentName: "代理名称", 
    type: "类型",
    viewAgent: "查看代理",
    editAgent: "编辑代理",
    noAgentsFound: "未找到代理",
    agentSavedSuccess: "代理保存成功"
  },
  
  es: {
    // Header
    appTitle: "🦐 Visor del Gestor de Tareas Shrimp",
    version: "Versión",
    releaseNotes: "Notas de la versión",
    help: "Ayuda",
    language: "Idioma",
    
    // Navigation tabs
    tasks: "Tareas",
    templates: "Plantillas",
    projects: "Proyectos",
    
    // Template Management
    templateManagement: "🎨 Gestión de Plantillas",
    templateManagementDesc: "Gestiona las plantillas de prompts para todas las funciones del gestor de tareas. Edita, duplica o restablece plantillas para personalizar el comportamiento de la IA.",
    exportTemplates: "📤 Exportar Plantillas",
    exportTemplatesDesc: "Exporta tus configuraciones de plantillas para compartir con tu equipo o hacer copias de seguridad",
    
    // Template columns
    function: "Función",
    description: "Descripción",
    status: "Estado",
    actions: "Acciones",
    
    // Template statuses
    statusDefault: "Predeterminado",
    statusCustom: "Personalizado",
    statusCustomAppend: "Personalizado+Añadir",
    
    // Template actions
    edit: "Editar",
    editTemplate: "✏️ Editar Plantilla",
    preview: "Vista previa",
    previewTemplate: "Vista previa: {name}",
    duplicate: "Duplicar",
    duplicateTemplate: "📋 Duplicar Plantilla",
    activate: "Activar",
    activateTemplate: "🚀 Activar Plantilla",
    reset: "Restablecer",
    resetToDefault: "Restablecer a plantilla predeterminada",
    
    // Common actions
    save: "Guardar",
    cancel: "Cancelar",
    back: "Atrás",
    backToTemplates: "← Volver a Plantillas",
    close: "Cerrar",
    
    // Duplicate Template View
    whyDuplicate: "📚 ¿Por qué duplicar plantillas?",
    duplicateExplanation: "Duplicar plantillas te permite crear versiones especializadas de plantillas existentes para diferentes casos de uso:",
    createVariations: "🎯 Crear Variaciones",
    createVariationsDesc: "Crea versiones especializadas para diferentes contextos:",
    safeExperimentation: "🧪 Experimentación Segura",
    safeExperimentationDesc: "Prueba cambios sin afectar tu plantilla de trabajo:",
    templateLibraries: "📂 Bibliotecas de Plantillas",
    templateLibrariesDesc: "Construye colecciones de plantillas relacionadas:",
    versionManagement: "💾 Gestión de Versiones",
    versionManagementDesc: "Mantén diferentes versiones para diferentes necesidades:",
    
    // Duplicate form
    createDuplicate: "📝 Crear Duplicado",
    originalTemplate: "Plantilla Original",
    newTemplateName: "Nombre de la Nueva Plantilla",
    required: "*",
    nameHint: "Elige un nombre descriptivo que indique el propósito o variación de este duplicado",
    whatWillHappen: "📋 ¿Qué sucederá?",
    createNewTemplate: "Crear nueva plantilla",
    copyContent: "Copiar contenido",
    independentEditing: "Edición independiente",
    readyToUse: "Lista para usar",
    
    // Export Templates
    exportTemplateConfigurations: "Exportar Configuraciones de Plantillas",
    exportFormat: "Formato de exportación:",
    exportOnlyModified: "Exportar solo plantillas modificadas (recomendado)",
    exportHint: "Cuando está marcado, solo exporta plantillas que han sido personalizadas o sobrescritas",
    
    // Activation Dialog
    whatIsEnvVar: "📋 ¿Qué es una Variable de Entorno?",
    envVarExplanation: "Las variables de entorno son configuraciones que los programas pueden leer cuando se inician. El servidor MCP verifica las variables de plantilla personalizadas para sobrescribir sus prompts predeterminados. Al establecer {envVar}, le estás diciendo al servidor MCP que use tu plantilla editada en lugar de la incorporada.",
    whyNeedThis: "¿Por qué necesitamos esto?",
    whyNeedThisExplanation: "Cuando Claude inicia el servidor MCP, lee estas variables de entorno para personalizar cómo responde. Sin establecer esta variable, tus ediciones de plantilla no se utilizarán.",
    howToSetVariable: "🚀 Cómo Establecer Esta Variable",
    chooseCommand: "Elige el comando apropiado a continuación según tu configuración. Estos comandos exportarán la variable a tu archivo de configuración del shell (como ~/.bashrc o ~/.zshrc) para que esté disponible cuando Claude se inicie.",
    
    // Messages
    loading: "Cargando...",
    error: "Error",
    success: "Éxito",
    noTemplatesFound: "No se encontraron plantillas",
    failedToLoad: "Error al cargar",
    
    // Pagination
    showing: "Mostrando",
    to: "a",
    of: "de",
    page: "Página",
    filteredFrom: "filtrado de",
    total: "total",
    
    // Statistics
    totalTemplates: "Total de Plantillas",
    totalNumberOfTemplates: "Número total de plantillas",
    numberOfDefaultTemplates: "Número de plantillas predeterminadas",
    numberOfCustomTemplates: "Número de plantillas personalizadas",
    numberOfEnvOverrideTemplates: "Número de plantillas sobrescritas por el entorno",
    default: "Predeterminado",
    custom: "Personalizado", 
    envOverride: "Sobrescrito por Entorno",
    
    // Project management
    readme: "Léeme",
    addTab: "Agregar Proyecto",
    history: "Historial",
    viewProjectHistory: "Ver historial del proyecto",
    totalTasks: "Total de Tareas",
    completed: "Completadas",
    inProgress: "En Progreso",
    pending: "Pendientes",
    autoRefresh: "Actualización automática",
    
    // History management
    backToTasks: "Volver a Tareas",
    backToHistory: "Volver al Historial",
    projectHistory: "Historial del Proyecto",
    dateTime: "Fecha/Hora",
    taskCount: "Cantidad de Tareas",
    notes: "Notas",
    statusSummary: "Resumen de Estado",
    viewTasks: "Ver Tareas",
    noHistoryFound: "No se Encontró Historial",
    noHistoryDescription: "No hay instantáneas históricas de tareas disponibles para este proyecto",
    historyRowTitle: "Entrada de historial - haz clic en Ver Tareas para ver detalles",
    historyEntries: "entradas de historial",
    tasksFrom: "Tareas de",
    taskName: "Nombre de Tarea",
    noDependencies: "Ninguna",
    created: "Creado",
    noTasksFound: "No se Encontraron Tareas",
    noTasksInHistory: "Esta instantánea histórica no contiene tareas",
    taskRowTitle: "Detalles de tareas de instantánea histórica",
    
    // Search and UI
    searchTemplatesPlaceholder: "🔍 Buscar plantillas...",
    searchTemplatesTitle: "Buscar y filtrar plantillas por nombre de función o descripción",
    refreshTemplateData: "Actualizar datos de plantillas",
    searchTasksPlaceholder: "🔍 Buscar tareas...",
    searchTasksTitle: "Buscar y filtrar tareas por cualquier contenido de texto",
    refreshCurrentProfile: "Actualizar datos del proyecto actual - recargar tareas desde archivo",
    
    // Project management
    editProjectSettings: "Editar Configuración del Proyecto",
    chooseProfileTitle: "Elige un proyecto del menú desplegable de arriba",
    selectProfileToViewTasks: "Selecciona un proyecto para ver las tareas",
    noProfilesAvailable: "No hay proyectos disponibles",
    noProfilesClickAddTab: "No hay proyectos disponibles. Haz clic en \"Agregar Proyecto\" para crear uno.",
    loadingTasksFromFile: "Cargando tareas desde archivo",
    loadingTasks: "Cargando tareas... ⏳",
    
    // Add/Edit Project forms
    addNewProfile: "Agregar Nuevo Proyecto",
    profileName: "Nombre del Proyecto",
    profileNamePlaceholder: "ej., Tareas del Equipo Alpha",
    profileNameTitle: "Ingresa un nombre descriptivo para este proyecto",
    taskFolderPath: "Ruta de la Carpeta de Tareas",
    taskFolderPathPlaceholder: "/ruta/a/carpeta_datos_shrimp",
    taskFolderPathTitle: "Ingresa la ruta a tu carpeta de datos shrimp que contiene tasks.json",
    tip: "Consejo",
    navigateToFolder: "Navega a tu carpeta de datos shrimp en terminal y",
    typePwd: "escribe pwd para obtener la ruta completa",
    example: "Ejemplo",
    projectRootPath: "Ruta Raíz del Proyecto",
    projectRootPlaceholder: "ej., /home/usuario/mi-proyecto",
    projectRootTitle: "Ingresa la ruta absoluta al directorio raíz del proyecto",
    projectRootHint: "Esto habilita enlaces de archivos clicables que se abren en VS Code",
    optional: "opcional",
    addProfile: "Agregar Proyecto",
    cancelAndCloseDialog: "Cancelar y cerrar diálogo",
    addProject: "Agregar Proyecto",
    
    // Edit Project specific
    projectRoot: "Raíz del Proyecto",
    taskPath: "Ruta de Tareas",
    editProfileNameTitle: "Editar el nombre del proyecto",
    projectRootEditPlaceholder: "ej., /home/usuario/proyectos/mi-proyecto",
    projectRootEditTitle: "Establece la ruta raíz del proyecto para habilitar enlaces de archivos VS Code",
    projectRootEditHint: "Establece esto para habilitar enlaces VS Code clicables para archivos de tareas",
    taskPathPlaceholder: "/ruta/a/carpeta_datos_shrimp/tasks.json",
    taskPathTitle: "Editar la ruta al archivo tasks.json para este proyecto",
    taskPathHint: "Ruta al archivo tasks.json que contiene los datos de tareas del proyecto",
    saveChanges: "Guardar Cambios",
    
    // Toast messages with parameters
    profileAddedSuccess: "¡Proyecto \"{name}\" agregado exitosamente!",
    profileRemovedSuccess: "¡Proyecto \"{name}\" eliminado exitosamente!",
    templateSavedSuccess: "¡Plantilla \"{name}\" guardada exitosamente!",
    templateResetSuccess: "¡Plantilla \"{name}\" restablecida a predeterminada!",
    templateDuplicatedSuccess: "¡Plantilla duplicada como \"{name}\"!",
    rememberToRestartClaude: "💡 Recuerda reiniciar Claude Code después de establecer variables de entorno",
    
    // Confirmation dialogs
    confirmRemoveProfile: "¿Estás seguro de que quieres eliminar este proyecto? Esta acción no se puede deshacer.",
    confirmResetTemplate: "¿Estás seguro de que quieres restablecer {name} a predeterminado? Esto eliminará cualquier personalización.",
    
    // Template activation
    defaultTemplateAlreadyActive: "La plantilla predeterminada ya está activa - no necesita activación",
    
    // Duplicate Template View additional keys
    noTemplateSelected: "Ninguna plantilla seleccionada",
    pleaseEnterDuplicateName: "Por favor ingresa un nombre para la plantilla duplicada",
    duplicateNameMustBeDifferent: "El nombre del duplicado debe ser diferente del original",
    failedToDuplicateTemplate: "Error al duplicar plantilla",
    backToTemplateList: "Volver a la lista de plantillas",
    creatingDuplicate: "Creando Duplicado...",
    
    // Task Table
    task: "TAREA",
    taskName: "Nombre de Tarea",
    created: "Creado",
    updated: "Actualizado",
    dependencies: "Dependencias",
    noTasksFound: "No se encontraron tareas en este proyecto",
    noDescriptionProvided: "No se proporcionó descripción",
    viewTask: "Ver tarea",
    clickToCopyUuid: "Haz clic para copiar UUID al portapapeles",
    copyTaskInstruction: "Copiar lo siguiente al portapapeles: Usa el gestor de tareas para completar esta tarea shrimp",
    useTaskManager: "Usa el gestor de tareas para completar esta tarea shrimp",
    clickToViewTaskDetails: "Haz clic para ver detalles de la tarea",
    
    // Template Editor
    saving: "Guardando...",
    saveTemplate: "Guardar Plantilla",
    
    // Project Settings
    projectSettings: "Configuración del Proyecto",
    settingsSaved: "Configuración guardada exitosamente",
    settings: "Configuración",
    
    // Global Settings
    globalSettings: "Configuración Global",
    claudeFolderPath: "Ruta de la Carpeta Claude",
    claudeFolderPathDesc: "Si especifica la ruta de su carpeta Claude, tendrá acceso a la configuración de sub-agentes y hooks",
    claudeFolderPathPlaceholder: "p.ej., ~/.config/claude",
    
    // Task messages
    taskSavedSuccess: "Tarea guardada exitosamente",
    confirmDeleteTask: "¿Está seguro de que desea eliminar esta tarea?",
    taskDeletedSuccess: "Tarea eliminada exitosamente",
    deleteTask: "Eliminar tarea",
    
    // Agent functionality
    subAgents: "Sub-Agentes",
    agents: "Agentes",
    agentName: "Nombre del Agente",
    type: "Tipo", 
    viewAgent: "Ver Agente",
    editAgent: "Editar Agente",
    noAgentsFound: "No se encontraron agentes",
    agentSavedSuccess: "Agente guardado exitosamente"
  }
};

export const getTranslation = (lang, key, params = {}) => {
  const keys = key.split('.');
  let value = translations[lang] || translations.en;
  
  for (const k of keys) {
    value = value?.[k];
  }
  
  if (!value) {
    console.warn(`Translation missing for key: ${key}`);
    return key;
  }
  
  // Replace parameters like {name} with actual values
  let result = value;
  Object.entries(params).forEach(([param, val]) => {
    result = result.replace(`{${param}}`, val);
  });
  
  return result;
};