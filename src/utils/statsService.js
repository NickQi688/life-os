/**
 * 统计服务 - 计算各项数据指标
 */

const STATUS = {
  INBOX: "收件箱",
  TODO: "待办",
  DOING: "进行中",
  DONE: "已完成"
};

const TYPE = {
  IDEA: "灵感",
  TASK: "任务",
  NOTE: "笔记",
  JOURNAL: "日记"
};

const PRIORITY = {
  HIGH: "紧急",
  NORMAL: "普通",
  LOW: "不急"
};

/**
 * 计算整体统计数据
 */
export const calculateOverallStats = (records) => {
  if (!records || records.length === 0) {
    return {
      total: 0,
      inbox: 0,
      todo: 0,
      doing: 0,
      done: 0,
      completionRate: 0,
      ideaCount: 0,
      taskCount: 0,
      noteCount: 0,
      journalCount: 0
    };
  }

  const inbox = records.filter(r => r.fields["状态"] === STATUS.INBOX).length;
  const todo = records.filter(r => r.fields["状态"] === STATUS.TODO).length;
  const doing = records.filter(r => r.fields["状态"] === STATUS.DOING).length;
  const done = records.filter(r => r.fields["状态"] === STATUS.DONE).length;

  const ideaCount = records.filter(r => r.fields["类型"] === TYPE.IDEA).length;
  const taskCount = records.filter(r => r.fields["类型"] === TYPE.TASK).length;
  const noteCount = records.filter(r => r.fields["类型"] === TYPE.NOTE).length;
  const journalCount = records.filter(r => r.fields["类型"] === TYPE.JOURNAL).length;

  const totalRecords = records.length;
  const taskRecords = records.filter(r => r.fields["类型"] === TYPE.TASK);
  const completedTasks = taskRecords.filter(r => r.fields["状态"] === STATUS.DONE).length;
  const completionRate = taskRecords.length > 0
    ? Math.round((completedTasks / taskRecords.length) * 100)
    : 0;

  return {
    total: totalRecords,
    inbox,
    todo,
    doing,
    done,
    completionRate,
    ideaCount,
    taskCount,
    noteCount,
    journalCount
  };
};

/**
 * 计算最近7天的每日数据
 */
export const calculateDailyStats = (records) => {
  if (!records || records.length === 0) return [];

  const days = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const dayRecords = records.filter(r => {
      const recordDate = new Date(r.fields["记录日期"]);
      return recordDate >= date && recordDate < nextDate;
    });

    const dayTasks = dayRecords.filter(r => r.fields["类型"] === TYPE.TASK);
    const completedDayTasks = dayTasks.filter(r => r.fields["状态"] === STATUS.DONE);

    days.push({
      date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      fullDate: date.toISOString().split('T')[0],
      total: dayRecords.length,
      tasks: dayTasks.length,
      completed: completedDayTasks.length,
      ideas: dayRecords.filter(r => r.fields["类型"] === TYPE.IDEA).length,
      notes: dayRecords.filter(r => r.fields["类型"] === TYPE.NOTE).length,
      journals: dayRecords.filter(r => r.fields["类型"] === TYPE.JOURNAL).length
    });
  }

  return days;
};

/**
 * 计算内容方向分布
 */
export const calculateDirectionStats = (records) => {
  if (!records || records.length === 0) return [];

  const directionMap = {};

  records.forEach(r => {
    const direction = r.fields["内容方向"] || "未分类";
    if (!directionMap[direction]) {
      directionMap[direction] = 0;
    }
    directionMap[direction]++;
  });

  return Object.entries(directionMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

/**
 * 计算优先级分布
 */
export const calculatePriorityStats = (records) => {
  if (!records || records.length === 0) {
    return [
      { name: PRIORITY.HIGH, value: 0 },
      { name: PRIORITY.NORMAL, value: 0 },
      { name: PRIORITY.LOW, value: 0 }
    ];
  }

  const tasks = records.filter(r => r.fields["类型"] === TYPE.TASK);

  return [
    {
      name: PRIORITY.HIGH,
      value: tasks.filter(r => r.fields["优先级"] === PRIORITY.HIGH).length
    },
    {
      name: PRIORITY.NORMAL,
      value: tasks.filter(r => r.fields["优先级"] === PRIORITY.NORMAL).length
    },
    {
      name: PRIORITY.LOW,
      value: tasks.filter(r => r.fields["优先级"] === PRIORITY.LOW).length
    }
  ];
};

/**
 * 计算来源分布
 */
export const calculateSourceStats = (records) => {
  if (!records || records.length === 0) return [];

  const sourceMap = {};

  records.forEach(r => {
    const source = r.fields["来源"] || "未知";
    if (!sourceMap[source]) {
      sourceMap[source] = 0;
    }
    sourceMap[source]++;
  });

  return Object.entries(sourceMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

/**
 * 计算类型分布
 */
export const calculateTypeStats = (records) => {
  if (!records || records.length === 0) {
    return [
      { name: TYPE.IDEA, value: 0 },
      { name: TYPE.TASK, value: 0 },
      { name: TYPE.NOTE, value: 0 },
      { name: TYPE.JOURNAL, value: 0 }
    ];
  }

  return [
    {
      name: TYPE.IDEA,
      value: records.filter(r => r.fields["类型"] === TYPE.IDEA).length
    },
    {
      name: TYPE.TASK,
      value: records.filter(r => r.fields["类型"] === TYPE.TASK).length
    },
    {
      name: TYPE.NOTE,
      value: records.filter(r => r.fields["类型"] === TYPE.NOTE).length
    },
    {
      name: TYPE.JOURNAL,
      value: records.filter(r => r.fields["类型"] === TYPE.JOURNAL).length
    }
  ];
};

/**
 * 计算活跃时间分布（按小时）
 */
export const calculateHourlyActivity = (records) => {
  if (!records || records.length === 0) return [];

  const hourMap = {};

  // 初始化24小时
  for (let i = 0; i < 24; i++) {
    hourMap[i] = 0;
  }

  records.forEach(r => {
    const date = new Date(r.fields["记录日期"]);
    const hour = date.getHours();
    hourMap[hour]++;
  });

  return Object.entries(hourMap).map(([hour, count]) => ({
    hour: parseInt(hour),
    count
  }));
};

/**
 * 获取所有统计信息
 */
export const getAllStats = (records) => {
  return {
    overall: calculateOverallStats(records),
    daily: calculateDailyStats(records),
    directions: calculateDirectionStats(records),
    priorities: calculatePriorityStats(records),
    sources: calculateSourceStats(records),
    types: calculateTypeStats(records),
    hourlyActivity: calculateHourlyActivity(records)
  };
};
