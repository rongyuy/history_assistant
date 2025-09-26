import React, { useEffect, useState, useCallback, useRef } from 'react';
import { addEdge, applyNodeChanges, applyEdgeChanges, ReactFlowProvider  } from 'reactflow';
import {
  Layout,
  Typography,
  Divider,
  Drawer,
  Dropdown,
  Collapse,
  Card,
  Space,
  Tag,
  List,
  Button,
  Input,
  Tabs,
  Empty,
  FloatButton,
  App as AntdApp, 
  message,
  Spin, 
} from 'antd';
import {
  BookOutlined,
  BulbOutlined,
  MessageOutlined,
  DeleteOutlined,
  EditOutlined,
  OrderedListOutlined,
  ApartmentOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { getWikiData, getViewpointAnalysis, postChatMessageStream, getSourcesComparison, getWikiFullContent, getDiscussionDetails } from '../api';
import ArgumentMap from '../ArgumentMap'

const { Header, Sider, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;


export default function InquiryPage() {
  const [topic, setTopic] = useState('');
  const [inputValue, setInputValue] = useState('');

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  // 任务进度状态 - 提升到主组件
  const [questProgress, setQuestProgress] = useState({
    completedModules: [],
    currentTask: '史实认知',
    totalTasks: 4,
    achievements: [],
    moduleStates: {
      '史实认知': 'pending', // pending, active, completed
      '观点辨析': 'pending',
      '史料分析': 'pending',
      '历史批判思维训练': 'pending'
    }
  });

  const onNodesChange = (changes) => setNodes((nds) => applyNodeChanges(changes, nds));
  const onEdgesChange = (changes) => setEdges((eds) => applyEdgeChanges(changes, eds));
  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);

  const addNodeToMap = (text) => {
    const newNode = {
      id: `node-${Date.now()}`,
      type: 'textUpdater',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { label: text },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const addBlankNode = () => {
    const newNode = {
      id: `node-${Date.now()}`,
      type: 'textUpdater',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { label: '双击编辑' },
    };
    setNodes((nds) => [...nds, newNode]);
  }

  const handleSearch = () => {
    if (inputValue && inputValue.trim()) {
        setTopic(inputValue.trim());
    } else {
        message.warning('请输入一个有效的主题。');
    }
  };

  const handleClear = () => {
    setTopic('');
    setInputValue('');
  };

  return (
    <AntdApp>
      <Layout style={{ height: '100vh', background: '#fff', overflow: 'hidden' }}>
        <Header
          style={{
            background: '#fff',
            borderBottom: '1px dashed #eaeaea',
            display: 'flex',
            alignItems: 'center',
            paddingInline: 24,
            position: 'sticky',
            top: 0,
            zIndex: 5,
          }}
        >
          <Title level={4} style={{ margin: 0 }}>
            历史探究学习平台
          </Title>
          <Divider type="vertical" />
          <Text type="secondary">主题：</Text>
          <Input
            variant="filled"
            size="middle"
            style={{ width: 240 }}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onPressEnter={handleSearch}
            placeholder="请输入您想探究的历史主题"
            allowClear
          />
          <Button type="primary" onClick={handleSearch} style={{ marginLeft: 8 }}>开始探险</Button>
          <Button onClick={handleClear} style={{ marginLeft: 8 }}>清空</Button>
        </Header>

        <Layout style={{ height: 'calc(100vh - 64px)' }}>
          <Content
            style={{
              padding: 24,
              paddingBottom: 120,
              overflowY: 'auto',
              height: '100%'
            }}
          >
            {topic ? (
              <CoreExplorer 
                topic={topic} 
                addNodeToMap={addNodeToMap}
                questProgress={questProgress}
                setQuestProgress={setQuestProgress}
              />
            ) : (
              <WelcomePage />
            )}
          </Content>

          <Sider
            width={'35%'}
            theme="light"
            style={{
              padding: 24,
              borderLeft: '1px dashed #eaeaea',
              overflowY: 'auto',
              height: '100%',
            }}
          >
            <NotesWorkspace
              topic={topic}
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              addBlankNode={addBlankNode}
              setNodes={setNodes}
              setEdges={setEdges}
              questProgress={questProgress}
              onCompleteAllTasks={() => {
                setQuestProgress(prev => ({
                  ...prev,
                  completedModules: [...prev.completedModules, '历史批判思维训练'],
                  achievements: [...prev.achievements, '历史批判思想家']
                }));
                message.success('🎉 恭喜！你已完成"历史批判思维训练"任务，获得"历史批判思想家"徽章！');
              }}
            />
          </Sider>
        </Layout>

        <FloatButton.BackTop />
      </Layout>
    </AntdApp>
  );
}

function WelcomePage() {
    return (
        <div style={{ textAlign: 'center', paddingTop: '10vh' }}>
            <Empty
                image={<BookOutlined style={{ fontSize: 64, color: '#1677ff' }} />}
                imageStyle={{ height: 80 }}
                description={
                    <>
                        <Title level={3}>🏛️ 历史探险家工作室</Title>
                        <Paragraph type="secondary" style={{ fontSize: '16px', marginBottom: '24px' }}>
                            欢迎，未来的历史探险家！你将接受来自历史研究院的任务，通过四个维度的深度探索，完成一份完整的历史调查报告。
                        </Paragraph>
                        <div style={{ 
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                            padding: '20px', 
                            borderRadius: '12px', 
                            color: 'white',
                            margin: '20px 0',
                            textAlign: 'left'
                        }}>
                            <Title level={4} style={{ color: 'white', marginBottom: '16px' }}>🎯 你的任务</Title>
                            <Paragraph style={{ color: 'white', marginBottom: '8px' }}>
                                1. <strong>史实认知</strong> - 建立历史事件的基本框架
                            </Paragraph>
                            <Paragraph style={{ color: 'white', marginBottom: '8px' }}>
                                2. <strong>观点辨析</strong> - 分析不同立场和争议
                            </Paragraph>
                            <Paragraph style={{ color: 'white', marginBottom: '8px' }}>
                                3. <strong>史料分析</strong> - 对比多方史料证据
                            </Paragraph>
                            <Paragraph style={{ color: 'white', marginBottom: '0' }}>
                                4. <strong>因果链分析</strong> - 形成你的历史判断
                            </Paragraph>
                        </div>
                        <Paragraph type="secondary">
                            请在上方输入您感兴趣的历史主题（例如："西安事变"），然后点击"开始探险"按钮，开启您的历史调查之旅。
                        </Paragraph>
                    </>
                }
            />
        </div>
    );
}

function CoreExplorer({ topic, addNodeToMap, questProgress, setQuestProgress }) {
  const [loadingStates, setLoadingStates] = useState({
    summary: true,
    viewpoints: true,
    sources: true,
  });

  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [coreData, setCoreData] = useState({
    wikiSummary: { summary: '', timeline: [] },
    viewpoints: { faction_roles: [], viewpoints: [], debates: [] },
    sources: { sources: [] },
    wikiFullContent: null,
  });

  const [isChatOpen, setChatOpen] = useState(false);
  const [currentModule, setCurrentModule] = useState('模块一：史实认知');
  const [aiContext, setAiContext] = useState('');
  const [chatValue, setChatValue] = useState('');

  // 任务进度状态现在从父组件传入

  const [selectedTextForMenu, setSelectedTextForMenu] = useState('');

  const { message } = AntdApp.useApp();

  const handleMenuVisibleChange = (visible) => {
    if (visible) {
      const currentSelectedText = window.getSelection().toString().trim();
      setSelectedTextForMenu(currentSelectedText);
    }
  };
  
  const menuItems = [
    {
      key: 'add-to-map',
      label: '添加到论证图谱',
      onClick: () => {
        if (selectedTextForMenu) {
          addNodeToMap(selectedTextForMenu);
          message.success(`“${selectedTextForMenu.substring(0, 10)}...”已添加到图谱`);
        } else {
          message.warning('无法获取选中文本，请重试');
        }
      },
    },
    {
      key: 'ask-ai',
      label: '问问AI这段内容...',
      onClick: () => {
        if (selectedTextForMenu) {
            setChatValue(`针对“${selectedTextForMenu}”我想问：`);
            setChatOpen(true);
            message.info('请针对选中内容继续提问');
        }
      }
    }
  ];

  useEffect(() => {
    if (!topic) return;

    const fetchData = async () => {
      setInitialLoading(true);
      setError(null);
      setLoadingStates({
        summary: true,
        viewpoints: true,
        sources: true,
      });
      setCoreData({
        wikiSummary: { summary: '', timeline: [] },
        viewpoints: { faction_roles: [], viewpoints: [], debates: [] },
        sources: { sources: [] },
        wikiFullContent: null,
      });

      message.loading({ content: `正在为您准备关于“${topic}”的探究模块...`, key: 'data', duration: 1 });
      
      setInitialLoading(false);

      getWikiData(topic).then(res => {
        setCoreData(prev => ({ ...prev, wikiSummary: res.data }));
        // 激活史实认知任务
        setQuestProgress(prev => ({
          ...prev,
          moduleStates: {
            ...prev.moduleStates,
            '史实认知': 'active'
          }
        }));
        message.info('📚 史实认知任务已激活！请仔细阅读内容，完成后点击"AI引导"进行下一步。');
      }).catch(err => {
        console.error("模块一加载失败:", err);
      }).finally(() => {
        setLoadingStates(prev => ({ ...prev, summary: false }));
      });
      
      getWikiFullContent(topic).then(res => {
        setCoreData(prev => ({ ...prev, wikiFullContent: res.data }));
        setAiContext(`维基百科正文内容:\n${res.data.content}`);
      }).catch(err => console.error("维基全文加载失败:", err));

      getViewpointAnalysis(topic).then(res => {
        setCoreData(prev => ({ ...prev, viewpoints: res.data }));
        // 激活观点辨析任务
        setQuestProgress(prev => ({
          ...prev,
          moduleStates: {
            ...prev.moduleStates,
            '观点辨析': 'active'
          }
        }));
        message.info('💭 观点辨析任务已激活！请分析不同立场，完成后点击"AI引导"进行下一步。');
      }).catch(err => {
        console.error("模块二加载失败:", err);
      }).finally(() => {
        setLoadingStates(prev => ({ ...prev, viewpoints: false }));
      });

      getSourcesComparison(topic).then(res => {
        setCoreData(prev => ({ ...prev, sources: res.data }));
        // 激活史料分析任务
        setQuestProgress(prev => ({
          ...prev,
          moduleStates: {
            ...prev.moduleStates,
            '史料分析': 'active',
            '历史批判思维训练': 'active' // 同时激活历史批判思维训练任务
          }
        }));
        message.info('📖 史料分析任务已激活！请对比多方史料，完成后可以进入笔记工作区进行历史批判思维训练。');
      }).catch(err => {
        console.error("模块三加载失败:", err);
      }).finally(() => {
        setLoadingStates(prev => ({ ...prev, sources: false }));
      });
    };

    fetchData();
  }, [topic, message]);

  const handleActivateModule = (moduleName) => {
    setCurrentModule(moduleName);
    setChatOpen(true);
    
    // 根据模块名称确定任务类型
    let taskType = '';
    let context = '';
    let aiPrompt = '';
    
    switch (moduleName) {
      case '任务一：史实认知':
        taskType = '史实认知';
        context = `维基百科正文内容:\n${coreData.wikiFullContent?.content || ''}`;
        aiPrompt = '你现在正在指导学生完成"史实认知"任务。请利用苏格拉底教育法，通过提问，一步一步帮助学生建立历史事件的基本框架，包括时间线、关键人物、主要事件等。当学生完成学习后，请询问他们是否已经理解并准备好进入下一个任务。';
        break;
      case '任务二：观点辨析':
        taskType = '观点辨析';
        context = `对立观点:\n${coreData.viewpoints.viewpoints.map(vp => `${vp.side}: ${vp.text}`).join('\n\n')}\n\n讨论页要点:\n${coreData.viewpoints.debates.join('\n')}`;
        aiPrompt = '你现在正在指导学生完成"观点辨析"任务。请利用苏格拉底教育法，通过提问，一步一步帮助学生分析不同立场和争议，培养批判性思维。当学生完成学习后，请询问他们是否已经理解并准备好进入下一个任务。';
        break;
      case '任务三：史料分析':
        taskType = '史料分析';
        context = `史料对比:\n${coreData.sources.sources.map(src => `标题: ${src.title}\n视角: ${src.viewpoint}\n片段: "${src.snippet}"`).join('\n\n---\n\n')}`;
        aiPrompt = '你现在正在指导学生完成"史料分析"任务。请利用苏格拉底教育法，通过提问，一步一步帮助学生对比多方史料证据，学会史料批判。当学生完成学习后，请引导他们进入笔记工作区进行历史批判思维训练。';
        break;
      case '任务四：历史批判思维训练':
        taskType = '历史批判思维训练';
        context = '用户正在进行历史批判思维训练阶段，需要形成独特的历史视角。';
        aiPrompt = '你现在正在指导学生完成"历史批判思维训练"任务。请利用苏格拉底教育法，通过深度提问帮助学生：1) 形成对历史事件的独特视角和判断；2) 培养历史批判思维能力；3) 学会从多个角度分析历史问题；4) 形成自己的历史观点并为之辩护。请通过连续的问题引导学生深入思考，最终帮助他们完成一份具有历史批判思维的历史调查报告。';
        break;
      default:
        context = '';
        aiPrompt = '';
    }
    
    // 如果任务已完成，显示完成状态
    if (questProgress.moduleStates[taskType] === 'completed') {
      message.info(`✅ 【${moduleName}】已完成！你可以继续学习或进入下一个任务。`);
    } else {
      message.info(`🎯 AI 引导已切换到【${moduleName}】模块`);
    }
    
    setAiContext(`${aiPrompt}\n\n学习材料:\n${context}`);
  };

  // 完成任务函数
  const completeTask = (taskType) => {
    setQuestProgress(prev => {
      const newCompletedModules = [...prev.completedModules, taskType];
      const newModuleStates = {
        ...prev.moduleStates,
        [taskType]: 'completed'
      };
      
      // 确定下一个任务
      let nextTask = '';
      if (taskType === '史实认知') nextTask = '观点辨析';
      else if (taskType === '观点辨析') nextTask = '史料分析';
      else if (taskType === '史料分析') nextTask = '历史批判思维训练（在笔记工作区）';
      else if (taskType === '历史批判思维训练') nextTask = '完成';
      
      return {
        ...prev,
        completedModules: newCompletedModules,
        currentTask: nextTask,
        moduleStates: newModuleStates
      };
    });
    
    // 显示完成消息和徽章
    const badgeMessages = {
      '史实认知': '🎉 恭喜！你已完成"史实认知"任务，获得"历史记录员"徽章！',
      '观点辨析': '🎉 恭喜！你已完成"观点辨析"任务，获得"辩论大师"徽章！',
      '史料分析': '🎉 恭喜！你已完成"史料分析"任务，获得"证据收集者"徽章！',
      '历史批判思维训练': '🎉 恭喜！你已完成"历史批判思维训练"任务，获得"历史批判思想家"徽章！'
    };
    
    message.success(badgeMessages[taskType]);
  };

  // 检查是否完成所有任务
  useEffect(() => {
    if (questProgress.completedModules.length === questProgress.totalTasks) {
      message.success('🎉 恭喜！你已完成所有探险任务！现在可以生成最终的历史调查报告了！');
      setQuestProgress(prev => ({
        ...prev,
        achievements: [...prev.achievements, '历史探险家大师']
      }));
    }
  }, [questProgress.completedModules.length, questProgress.totalTasks, message]);

  if (initialLoading) {
    return <div style={{ textAlign: 'center', marginTop: 48 }}><Spin size="large" tip="正在初始化探究模块..." /></div>;
  }

  if (error) {
    return <div style={{ textAlign: 'center', marginTop: 48 }}><Text type="danger">{error}</Text></div>;
  }

  return (
    <div>
      <Dropdown
         menu={{ items: menuItems.filter(item => selectedTextForMenu || (item.key !== 'ask-ai' && item.key !== 'add-to-map')) }}
        trigger={['contextMenu']}
        onOpenChange={handleMenuVisibleChange}
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={3} style={{ marginBottom: 0 }}>
              🏛️ {topic}
            </Title>
            <QuestProgress questProgress={questProgress} />
          </div>

          <Collapse
            bordered={false}
            defaultActiveKey={["facts", "views", "sources", "causality"]}
            style={{ background: "transparent" }}
            items={[
              {
                key: "facts",
                label: <ModuleHeader 
                  icon={<BookOutlined />} 
                  title="任务一：史实认知" 
                  hint="建立历史事件的基本框架" 
                  onActivate={handleActivateModule}
                  isCompleted={questProgress.completedModules.includes('史实认知')}
                  taskState={questProgress.moduleStates['史实认知']}
                />,
                children: (
                  loadingStates.summary ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <Spin tip="AI正在生成摘要与时间线..." />
                    </div>
                  ) : (
                    <WikiSummaryCard data={coreData.wikiSummary} initialFullContent={coreData.wikiFullContent} />
                  )
                ),
              },
              {
                key: "views",
                label: <ModuleHeader 
                  icon={<BulbOutlined />} 
                  title="任务二：观点辨析" 
                  hint="分析不同立场和争议" 
                  onActivate={handleActivateModule}
                  isCompleted={questProgress.completedModules.includes('观点辨析')}
                  taskState={questProgress.moduleStates['观点辨析']}
                />,
                children: (
                  loadingStates.viewpoints ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <Spin tip="AI正在分析不同观点..." />
                    </div>
                  ) : (
                    <ViewpointAnalysis data={coreData.viewpoints} topic={topic} />
                  )
                ),
              },
              {
                key: "sources",
                label: <ModuleHeader 
                  icon={<BookOutlined />} 
                  title="任务三：史料分析" 
                  hint="对比多方史料证据" 
                  onActivate={handleActivateModule}
                  isCompleted={questProgress.completedModules.includes('史料分析')}
                  taskState={questProgress.moduleStates['史料分析']}
                />,
                children: (
                  loadingStates.sources ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <Spin tip="正在抓取和对比多方史料，请耐心等待..." />
                    </div>
                  ) : (
                    <SourcesComparisonCard data={coreData.sources} />
                  )
                ),
              },
            ]}
          />
        </Space>
      </Dropdown>
      
       <AIChatDock
         topic={topic}
         addNodeToMap={addNodeToMap}
         currentModule={currentModule}
         aiContext={aiContext}
         open={isChatOpen}
         setOpen={setChatOpen}
         chatValue={chatValue}
         setChatValue={setChatValue}
         questProgress={questProgress}
         completeTask={completeTask}
       />
    </div>
  );
}

function QuestProgress({ questProgress }) {
  const { completedModules, currentTask, totalTasks, moduleStates } = questProgress;
  const progress = (completedModules.length / totalTasks) * 100;
  
  // 计算激活的任务数量
  const activeTasks = Object.values(moduleStates).filter(state => state === 'active' || state === 'completed').length;
  
  return (
    <div style={{ 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
      padding: '12px 16px', 
      borderRadius: '8px',
      color: 'white',
      minWidth: '200px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <Text strong style={{ color: 'white' }}>探险进度</Text>
        <Text style={{ color: 'white' }}>{completedModules.length}/{totalTasks}</Text>
      </div>
      <div style={{ 
        background: 'rgba(255,255,255,0.3)', 
        borderRadius: '4px', 
        height: '6px',
        marginBottom: '8px'
      }}>
        <div style={{ 
          background: 'white', 
          height: '100%', 
          borderRadius: '4px', 
          width: `${progress}%`,
          transition: 'width 0.3s ease'
        }} />
      </div>
      <Text style={{ color: 'white', fontSize: '12px' }}>
        当前任务: {currentTask}
      </Text>
      <Text style={{ color: 'white', fontSize: '10px', opacity: 0.8 }}>
        激活任务: {activeTasks}/{totalTasks}
      </Text>
    </div>
  );
}

function ModuleHeader({ icon, title, hint, onActivate, isCompleted = false, taskState = 'pending' }) {
    const handleActivateClick = (e) => {
      e.stopPropagation(); 
      onActivate(title);
    }

    // 根据任务状态显示不同的图标和颜色
    const getStatusIcon = () => {
      if (isCompleted) return '✅';
      if (taskState === 'active') return '🎯';
      return icon;
    };

    const getStatusColor = () => {
      if (isCompleted) return '#52c41a';
      if (taskState === 'active') return '#1890ff';
      return 'inherit';
    };

    const getTagColor = () => {
      if (isCompleted) return 'success';
      if (taskState === 'active') return 'processing';
      return 'default';
    };

  return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <Space>
            {getStatusIcon()}
            <Text strong style={{ color: getStatusColor() }}>{title}</Text>
            <Tag color={getTagColor()}>{hint}</Tag>
        </Space>
        <Button
          type="text"
          size="small"
          icon={<MessageOutlined />}
          onClick={handleActivateClick}
        >
          {isCompleted ? '已完成' : 'AI引导'}
        </Button>
    </div>
  );
}

function EditableTimelineItem({ item, onChange, onDelete }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8, width: '100%' }}>
      <Input
        value={item.year}
        onChange={(e) => onChange(item.id, 'year', e.target.value)}
        placeholder="年份/日期"
        style={{ width: 120, marginRight: 8 }}
      />
      <Input
        value={item.event}
        onChange={(e) => onChange(item.id, 'event', e.target.value)}
        placeholder="关键事件描述"
        style={{ flex: 1, marginRight: 8 }}
      />
      <Button
        type="text"
        danger
        icon={<DeleteOutlined />}
        onClick={() => onDelete(item.id)}
      />
    </div>
  );
}

function WikiSummaryCard({ data, initialFullContent }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [fullContent, setFullContent] = useState(null);
    const [timelineItems, setTimelineItems] = useState([]);
    const [contentChunks, setContentChunks] = useState([]);
    const [activeChunk, setActiveChunk] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedChunks, setHighlightedChunks] = useState([]);
    const [readChunks, setReadChunks] = useState(new Set());
    const [bookmarkedChunks, setBookmarkedChunks] = useState(new Set());
    const [readingMode, setReadingMode] = useState('chunked'); // 'chunked' or 'full'

    useEffect(() => {
        setFullContent(initialFullContent);
        if (initialFullContent?.content) {
            // 智能分块处理
            const chunks = smartContentChunking(initialFullContent.content);
            setContentChunks(chunks);
        }
    }, [initialFullContent]);

    useEffect(() => {
        if (data && data.timeline) {
            const itemsWithId = data.timeline.map((item, index) => ({
                ...item,
                id: `timeline-${index}-${Math.random()}`
            }));
            setTimelineItems(itemsWithId);
        }
    }, [data]);

    // 智能内容分块函数
    const smartContentChunking = (content) => {
        if (!content) return [];
        
        // 按段落分割
        const paragraphs = content.split('\n\n').filter(p => p.trim().length > 50);
        
        // 为每个段落生成摘要和关键词
        return paragraphs.map((paragraph, index) => {
            const words = paragraph.split(' ');
            const summary = words.length > 100 
                ? words.slice(0, 100).join(' ') + '...' 
                : paragraph;
            
            // 提取关键词（简单实现）
            const keywords = extractKeywords(paragraph);
            
            return {
                id: index,
                title: generateChunkTitle(paragraph),
                summary: summary,
                fullContent: paragraph,
                keywords: keywords,
                wordCount: words.length
            };
        });
    };

    // 提取关键词
    const extractKeywords = (text) => {
        // 简单的关键词提取，可以后续优化
        const commonWords = ['的', '了', '在', '是', '有', '和', '与', '或', '但', '而', '这', '那', '一个', '一些', '各种', '不同', '重要', '主要', '基本', '一般', '通常', '经常', '总是', '从不', '已经', '正在', '将要', '可能', '应该', '必须', '可以', '能够', '需要', '想要', '希望', '认为', '觉得', '知道', '了解', '理解', '明白', '清楚', '明显', '显然', '当然', '自然', '当然', '确实', '真的', '非常', '很', '特别', '尤其', '更加', '比较', '相当', '十分', '完全', '全部', '所有', '每个', '任何', '一些', '许多', '大量', '少数', '多数', '大部分', '小部分', '一半', '全部', '整个', '部分', '方面', '角度', '观点', '看法', '意见', '想法', '建议', '方法', '方式', '手段', '途径', '渠道', '来源', '原因', '结果', '影响', '作用', '功能', '特点', '特征', '性质', '本质', '实质', '内容', '形式', '结构', '组织', '系统', '体系', '框架', '模式', '类型', '种类', '分类', '等级', '层次', '阶段', '步骤', '过程', '程序', '流程', '顺序', '排列', '组合', '联系', '关系', '关联', '连接', '结合', '融合', '整合', '统一', '协调', '配合', '合作', '协作', '共同', '一起', '同时', '先后', '前后', '左右', '上下', '内外', '中间', '中心', '核心', '重点', '关键', '主要', '次要', '重要', '必要', '必须', '需要', '要求', '条件', '前提', '基础', '根本', '基本', '主要', '核心', '关键', '重要', '必要', '必须', '需要', '要求', '条件', '前提', '基础', '根本', '基本'];
        const words = text.split(/[\s\n\r\t，。！？；：""''（）【】《》〈〉、]/)
            .filter(word => word.length > 1 && !commonWords.includes(word))
            .slice(0, 5);
        return [...new Set(words)];
    };

    // 生成段落标题
    const generateChunkTitle = (paragraph) => {
        const firstSentence = paragraph.split('。')[0];
        if (firstSentence.length > 30) {
            return firstSentence.substring(0, 30) + '...';
        }
        return firstSentence;
    };

    const handleToggleOriginal = () => {
        setIsExpanded(!isExpanded);
    };

    // 搜索功能
    const handleSearch = (term) => {
        setSearchTerm(term);
        if (!term.trim()) {
            setHighlightedChunks([]);
            return;
        }
        
        const highlighted = contentChunks
            .map((chunk, index) => ({
                ...chunk,
                index,
                matches: chunk.fullContent.toLowerCase().includes(term.toLowerCase())
            }))
            .filter(chunk => chunk.matches);
        
        setHighlightedChunks(highlighted);
    };

    // 标记为已读
    const markAsRead = (chunkIndex) => {
        setReadChunks(prev => new Set([...prev, chunkIndex]));
    };

    // 切换收藏状态
    const toggleBookmark = (chunkIndex) => {
        setBookmarkedChunks(prev => {
            const newSet = new Set(prev);
            if (newSet.has(chunkIndex)) {
                newSet.delete(chunkIndex);
            } else {
                newSet.add(chunkIndex);
            }
            return newSet;
        });
    };

    // 计算阅读进度
    const readingProgress = contentChunks.length > 0 ? (readChunks.size / contentChunks.length) * 100 : 0;

    // 切换到下一个未读段落
    const goToNextUnread = () => {
        const unreadChunks = contentChunks
            .map((chunk, index) => ({ chunk, index }))
            .filter(({ index }) => !readChunks.has(index));
        
        if (unreadChunks.length > 0) {
            setActiveChunk(unreadChunks[0].index);
        }
    };

    const handleTimelineChange = (id, field, value) => {
        setTimelineItems(currentItems =>
            currentItems.map(item =>
                item.id === id ? { ...item, [field]: value } : item
            )
        );
    };

    const handleAddTimelineItem = () => {
        const newItem = {
            id: `timeline-new-${Date.now()}`,
            year: '',
            event: ''
        };
        setTimelineItems(currentItems => [...currentItems, newItem]);
    };

    const handleDeleteTimelineItem = (id) => {
        setTimelineItems(currentItems => currentItems.filter(item => item.id !== id));
    };
    
    const handleSaveTimeline = () => {
        message.success('时间线已保存！');
    };

    const handleExportTimeline = () => {
        if (timelineItems.every(item => !item.year.trim() && !item.event.trim())) {
            message.warning('没有可导出的时间线内容。');
            return;
        }

        const content = timelineItems
            .map(item => `${item.year || '未指定年份'}: ${item.event || '未描述事件'}`)
            .join('\n');

        const fullContent = `关键时间线\n==================\n\n${content.trim()}`;

        const blob = new Blob([fullContent.trim()], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = '关键时间线.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        message.success('时间线已导出为 TXT 文件！');
    };

    const handleClearTimeline = () => {
        setTimelineItems([]);
        message.info('时间线已清空。');
    };


    return (
        <Card
            size="small"
            bordered
            style={{ borderStyle: "dashed" }}
        >
            <Space direction="vertical" style={{ width: "100%" }}>
                {/* AI生成的摘要部分 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ 
                            background: 'linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%)', 
                            padding: '16px', 
                            borderRadius: '8px',
                            border: '1px solid #bae7ff',
                            marginBottom: '12px'
                        }}>
                            <Title level={5} style={{ margin: 0, color: '#1890ff', marginBottom: '8px' }}>
                                🤖 AI智能摘要
                            </Title>
                            <Paragraph style={{ margin: 0, fontSize: '14px', lineHeight: '1.6' }}>
                                {data.summary || "暂无摘要"}
                            </Paragraph>
                        </div>
                    </div>
                    <Button
                        type="primary"
                        size="small"
                        onClick={handleToggleOriginal}
                        style={{ marginLeft: 8, flexShrink: 0 }}
                        icon={<BookOutlined />}
                    >
                        {isExpanded ? '收起原文' : '智能阅读'}
                    </Button>
                </div>

                {/* 智能阅读模式 */}
                {isExpanded && contentChunks.length > 0 && (
                    <>
                        <Divider dashed style={{ margin: "8px 0" }} />
                        
                        {/* 搜索和导航栏 */}
                        <div style={{ 
                            background: '#fafafa', 
                            padding: '12px', 
                            borderRadius: '6px',
                            border: '1px solid #f0f0f0',
                            marginBottom: '12px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <Title level={5} style={{ margin: 0, color: '#1890ff' }}>
                                    📚 智能阅读模式
                                </Title>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                        共 {contentChunks.length} 个段落
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                        已读 {readChunks.size} 个
                                    </Text>
                                </div>
                            </div>
                            
                            {/* 阅读进度条 */}
                            <div style={{ marginBottom: '12px' }}>
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    marginBottom: '4px'
                                }}>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>阅读进度</Text>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                        {Math.round(readingProgress)}%
                                    </Text>
                                </div>
                                <div style={{ 
                                    background: '#e8e8e8', 
                                    borderRadius: '4px', 
                                    height: '6px',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{ 
                                        background: 'linear-gradient(90deg, #52c41a 0%, #73d13d 100%)', 
                                        height: '100%', 
                                        width: `${readingProgress}%`,
                                        transition: 'width 0.3s ease'
                                    }} />
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <Input.Search
                                    placeholder="搜索关键词..."
                                    value={searchTerm}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    style={{ flex: 1, minWidth: '200px' }}
                                    size="small"
                                />
                                <Button 
                                    size="small" 
                                    onClick={() => setActiveChunk(Math.max(0, activeChunk - 1))}
                                    disabled={activeChunk === 0}
                                >
                                    上一段
                                </Button>
                                <Button 
                                    size="small" 
                                    onClick={() => setActiveChunk(Math.min(contentChunks.length - 1, activeChunk + 1))}
                                    disabled={activeChunk === contentChunks.length - 1}
                                >
                                    下一段
                                </Button>
                                <Button 
                                    size="small" 
                                    onClick={goToNextUnread}
                                    disabled={readChunks.size === contentChunks.length}
                                    type="dashed"
                                >
                                    下一个未读
                                </Button>
                                <Button 
                                    size="small" 
                                    onClick={() => setReadingMode(readingMode === 'chunked' ? 'full' : 'chunked')}
                                    type="text"
                                >
                                    {readingMode === 'chunked' ? '全文模式' : '分段模式'}
                                </Button>
                            </div>
                            
                            {/* 搜索结果显示 */}
                            {highlightedChunks.length > 0 && (
                                <div style={{ marginTop: '8px' }}>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                        找到 {highlightedChunks.length} 个匹配段落
                                    </Text>
                                </div>
                            )}
                        </div>

                        {/* 内容展示区域 */}
                        <div style={{
                            backgroundColor: '#f8f9fa', 
                            padding: '16px', 
                            borderRadius: '8px',
                            border: '1px solid #e9ecef', 
                            maxHeight: '500px', 
                            overflowY: 'auto'
                        }}>
                            <Title level={5} style={{ marginTop: 0, marginBottom: 12, color: '#1890ff' }}>
                                {fullContent?.title || '维基百科内容'}
                            </Title>
                            
                            {/* 段落导航 */}
                            <div style={{ 
                                display: 'flex', 
                                flexWrap: 'wrap', 
                                gap: '4px', 
                                marginBottom: '16px',
                                padding: '8px',
                                background: '#fff',
                                borderRadius: '4px',
                                border: '1px solid #e8e8e8'
                            }}>
                                {contentChunks.map((chunk, index) => {
                                    const isRead = readChunks.has(index);
                                    const isBookmarked = bookmarkedChunks.has(index);
                                    const isActive = index === activeChunk;
                                    
                                    return (
                                        <Button
                                            key={chunk.id}
                                            size="small"
                                            type={isActive ? 'primary' : 'default'}
                                            onClick={() => setActiveChunk(index)}
                                            style={{ 
                                                fontSize: '11px',
                                                height: '24px',
                                                padding: '0 8px',
                                                position: 'relative',
                                                opacity: isRead ? 0.7 : 1,
                                                border: isBookmarked ? '2px solid #faad14' : undefined
                                            }}
                                        >
                                            <span style={{ 
                                                textDecoration: isRead ? 'line-through' : 'none',
                                                color: isRead ? '#8c8c8c' : undefined
                                            }}>
                                                {index + 1}. {chunk.title}
                                            </span>
                                            {isBookmarked && (
                                                <span style={{ marginLeft: '4px' }}>⭐</span>
                                            )}
                                        </Button>
                                    );
                                })}
                            </div>

                            {/* 当前段落内容 */}
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    marginBottom: '8px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Text strong style={{ color: '#1890ff' }}>
                                            第 {activeChunk + 1} 段：{contentChunks[activeChunk]?.title}
                                        </Text>
                                        {readChunks.has(activeChunk) && (
                                            <Tag color="green" size="small">已读</Tag>
                                        )}
                                        {bookmarkedChunks.has(activeChunk) && (
                                            <Tag color="gold" size="small">⭐ 已收藏</Tag>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                            {contentChunks[activeChunk]?.wordCount} 字
                                        </Text>
                                        <Button
                                            size="small"
                                            type={readChunks.has(activeChunk) ? 'default' : 'primary'}
                                            onClick={() => markAsRead(activeChunk)}
                                            style={{ fontSize: '11px' }}
                                        >
                                            {readChunks.has(activeChunk) ? '✓ 已读' : '标记已读'}
                                        </Button>
                                        <Button
                                            size="small"
                                            type={bookmarkedChunks.has(activeChunk) ? 'primary' : 'default'}
                                            onClick={() => toggleBookmark(activeChunk)}
                                            style={{ fontSize: '11px' }}
                                        >
                                            {bookmarkedChunks.has(activeChunk) ? '⭐ 已收藏' : '⭐ 收藏'}
                                        </Button>
                                    </div>
                                </div>
                                
                                <div style={{ 
                                    whiteSpace: 'pre-wrap', 
                                    fontSize: '14px', 
                                    lineHeight: '1.7', 
                                    color: '#2c3e50',
                                    background: '#fff',
                                    padding: '12px',
                                    borderRadius: '6px',
                                    border: '1px solid #e8e8e8',
                                    position: 'relative'
                                }}>
                                    {contentChunks[activeChunk]?.fullContent}
                                    
                                    {/* 阅读完成提示 */}
                                    {!readChunks.has(activeChunk) && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '8px',
                                            right: '8px',
                                            background: '#fff7e6',
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            border: '1px solid #ffd591',
                                            fontSize: '11px',
                                            color: '#d46b08'
                                        }}>
                                            点击"标记已读"完成此段
                                        </div>
                                    )}
                                </div>
                                
                                {/* 关键词标签 */}
                                {contentChunks[activeChunk]?.keywords?.length > 0 && (
                                    <div style={{ marginTop: '8px' }}>
                                        <Text type="secondary" style={{ fontSize: '12px', marginRight: '8px' }}>关键词：</Text>
                                        {contentChunks[activeChunk].keywords.map((keyword, idx) => (
                                            <Tag key={idx} size="small" color="blue" style={{ margin: '2px' }}>
                                                {keyword}
                                            </Tag>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 原始链接 */}
                            {fullContent?.url && (
                                <div style={{ 
                                    textAlign: 'right', 
                                    paddingTop: '12px',
                                    borderTop: '1px solid #e8e8e8'
                                }}>
                                    <a 
                                        href={fullContent.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        style={{ 
                                            color: '#1890ff',
                                            textDecoration: 'none',
                                            fontSize: '12px'
                                        }}
                                    >
                                        🔗 在维基百科中查看完整页面
                                    </a>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* 传统阅读模式（备用） */}
                {isExpanded && contentChunks.length === 0 && fullContent && (
                    <>
                        <Divider dashed style={{ margin: "8px 0" }} />
                        <div style={{
                            backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '6px',
                            border: '1px solid #e9ecef', maxHeight: '400px', overflowY: 'auto'
                        }}>
                            <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>{fullContent.title}</Title>
                            <div style={{ whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: '1.6', color: '#495057' }}>
                                {fullContent.content}
                            </div>
                            {fullContent.url && (
                                <div style={{ marginTop: 8, textAlign: 'right' }}>
                                    <a href={fullContent.url} target="_blank" rel="noopener noreferrer">在维基百科中查看完整页面</a>
                                </div>
                            )}
                        </div>
                    </>
                )}

                <Divider dashed style={{ margin: "8px 0" }} />

                <Text type="secondary">关键时间线</Text>
                <div style={{ border: '1px solid #f0f0f0', borderRadius: '8px', padding: '12px' }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                        {timelineItems.length > 0 ? (
                            timelineItems.map(item => (
                                <EditableTimelineItem
                                    key={item.id}
                                    item={item}
                                    onChange={handleTimelineChange}
                                    onDelete={handleDeleteTimelineItem}
                                />
                            ))
                        ) : (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无时间线，请点击下方按钮添加" />
                        )}
                        <Button
                            type="dashed"
                            onClick={handleAddTimelineItem}
                            block
                            icon={<PlusOutlined />}
                            style={{ marginTop: 8 }}
                        >
                            添加时间点
                        </Button>
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', paddingTop: '12px', borderTop: '1px solid #f0f0f0', marginTop: '12px' }}>
                            <Space>
                                <Button type="primary" size="small" onClick={handleSaveTimeline}>保存</Button>
                                <Button size="small" onClick={handleExportTimeline}>导出</Button>
                                <Button size="small" onClick={handleClearTimeline}>清空</Button>
                            </Space>
                        </div>
                    </Space>
                </div>
            </Space>
        </Card>
    );
}

// --- 核心修改：调整 FactionRolesDisplay 组件的样式 ---
function FactionRolesDisplay({ rolesData }) {
    if (!rolesData || rolesData.length === 0) {
        return null;
    }

    return (
        <div style={{ marginBottom: 16 }}>
            <Text strong>不同阵营在此事件中的作用分析</Text>
            <div style={{ marginTop: 8 }}>
                {rolesData.map(faction => (
                    <div key={faction.faction_name} style={{ backgroundColor: '#fafafa', padding: '12px', borderRadius: '6px', marginBottom: '12px' }}>
                        <Text strong>{faction.faction_name}</Text>
                        <div style={{ marginTop: '8px' }}>
                            {faction.roles.map(role => (
                                <div key={role.type} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '8px' }}>
                                    <Tag color={role.type === '正面作用' ? 'success' : 'error'} style={{ flexShrink: 0, marginRight: 8, marginTop: 4 }}>
                                        {role.type}
                                    </Tag>
                                    <Paragraph type="secondary" style={{ margin: 0, textAlign: 'left' }}>
                                        {role.description}
                                    </Paragraph>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <Divider dashed />
        </div>
    );
}

function ViewpointAnalysis({ data, topic }) {
    const [selectedDebate, setSelectedDebate] = useState(null);
    const [detailedViewpoints, setDetailedViewpoints] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showFullDiscussion, setShowFullDiscussion] = useState(false);

    const { message } = AntdApp.useApp();

    const handleDebateClick = async (debateItem) => {
        if (selectedDebate === debateItem) {
            setSelectedDebate(null);
            setDetailedViewpoints([]);
            return;
        }

        setLoading(true);
        setSelectedDebate(debateItem);
        
        try {
            const response = await getDiscussionDetails(topic, debateItem);
            setDetailedViewpoints(response.data.detailed_viewpoints || []);
            message.success('讨论详情加载成功！');
        } catch (error) {
            console.error('获取讨论详情失败:', error);
            message.error('获取讨论详情失败，请稍后重试');
            setDetailedViewpoints([]);
        } finally {
            setLoading(false);
        }
    };

    const handleShowFullDiscussion = () => {
        setShowFullDiscussion(!showFullDiscussion);
    };

    return (
      <Card size="small" bordered style={{ borderStyle: "dashed" }}>
        <Space direction="vertical" style={{ width: "100%" }}>
          <FactionRolesDisplay rolesData={data.faction_roles} />

          <List
            size="small"
            header={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong>维基讨论页摘录（要点）</Text>
                <Button 
                  type="link" 
                  size="small" 
                  loading={loading}
                  onClick={handleShowFullDiscussion}
                  style={{ padding: 0 }}
                >
                  {showFullDiscussion ? '收起完整讨论页' : '阅读完整讨论页'}
                </Button>
              </div>
            }
            dataSource={data.debates || []}
            renderItem={(debateItem, index) => (
              <List.Item 
                style={{ 
                  cursor: 'pointer',
                  backgroundColor: selectedDebate === debateItem ? '#e6f7ff' : 'transparent',
                  borderRadius: '4px',
                  padding: '8px',
                  margin: '2px 0',
                  border: selectedDebate === debateItem ? '1px solid #1890ff' : '1px solid transparent'
                }}
                onClick={() => handleDebateClick(debateItem)}
              >
                <Space align="start" style={{ width: '100%' }}>
                  <Tag color={selectedDebate === debateItem ? "processing" : "default"}>
                    {index + 1}
                  </Tag>
                  <Text style={{ flex: 1 }}>{debateItem}</Text>
                  {selectedDebate === debateItem && loading && <Spin size="small" />}
                </Space>
              </List.Item>
            )}
          />
          {showFullDiscussion && data.full_discussion && (
            <>
              <Divider dashed style={{ margin: "8px 0" }} />
              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '12px', 
                borderRadius: '6px',
                border: '1px solid #e9ecef',
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>
                  维基百科讨论页完整内容
                </Title>
                <div style={{ 
                  whiteSpace: 'pre-wrap', 
                  fontSize: '13px',
                  lineHeight: '1.6',
                  color: '#495057'
                }}>
                  {data.full_discussion}
                </div>
                <div style={{ marginTop: 8, textAlign: 'right' }}>
                  <a href={`https://zh.wikipedia.org/wiki/讨论:${topic}`} target="_blank" rel="noopener noreferrer">
                    在维基百科中查看完整讨论页
                  </a>
                </div>
              </div>
            </>
          )}

          {selectedDebate && detailedViewpoints.length > 0 && (
            <>
              <Divider dashed style={{ margin: "8px 0" }} />
              <div style={{ 
                backgroundColor: '#f0f9ff', 
                padding: '12px', 
                borderRadius: '6px',
                border: '1px solid #bae7ff'
              }}>
                <Title level={5} style={{ marginTop: 0, marginBottom: 8, color: '#1890ff' }}>
                  关于"{selectedDebate}"的详细观点分析（基于维基讨论页）
                </Title>
                <List
                  size="small"
                  dataSource={detailedViewpoints}
                  renderItem={(viewpoint) => (
                    <List.Item style={{ borderBottom: '1px solid #e6f7ff', padding: '8px 0' }}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Space align="start">
                          <Tag color="blue">{viewpoint.side}</Tag>
                          <Text strong>{viewpoint.text}</Text>
                        </Space>
                        {viewpoint.evidence && (
                          <Text type="secondary" style={{ marginLeft: 24, fontSize: '12px' }}>
                            支撑证据：{viewpoint.evidence}
                          </Text>
                        )}
                      </Space>
                    </List.Item>
                  )}
                />
              </div>
            </>
          )}

          {selectedDebate && detailedViewpoints.length === 0 && !loading && (
            <>
              <Divider dashed style={{ margin: "8px 0" }} />
              <div style={{ 
                backgroundColor: '#fff7e6', 
                padding: '12px', 
                borderRadius: '6px',
                border: '1px solid #ffd591',
                textAlign: 'center'
              }}>
                <Text type="secondary">
                  在维基百科讨论页中未找到与"{selectedDebate}"直接相关的详细观点分析
                </Text>
              </div>
            </>
          )}
        </Space>
      </Card>
    );
}

function SourcesComparisonCard({ data }) {
  const [showReferences, setShowReferences] = useState(false);
  const { Paragraph, Title } = Typography;

  const { sources = [], references = [] } = data || {};

  const isEmpty = !sources || sources.length === 0;

  const getHostname = (url) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch (e) {
      return '未知来源';
    }
  };

  return (
    <Card size="small" bordered style={{ borderStyle: "dashed" }}>
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong>多史料片段对读</Text>
          <Button
            type="link"
            size="small"
            onClick={() => setShowReferences(!showReferences)}
            disabled={!references || references.length === 0}
            style={{ padding: 0 }}
            icon={<OrderedListOutlined />}
          >
            {showReferences ? '收起所有参考文献' : `查看所有参考文献 (${references.length})`}
          </Button>
        </div>
        
        {showReferences && (
          <div style={{
              backgroundColor: '#f8f9fa',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid #e9ecef',
              maxHeight: '300px',
              overflowY: 'auto'
          }}>
            <List
              itemLayout="vertical"
              dataSource={references}
              renderItem={(item, index) => (
                <List.Item key={index} style={{padding: '8px 0'}}>
                  <List.Item.Meta
                    title={<a href={item.url} target="_blank" rel="noopener noreferrer" style={{fontSize: '13px'}}>{item.title || item.url}</a>}
                    description={`来源: ${getHostname(item.url)}`}
                  />
                  <Paragraph style={{fontSize: '12px', margin: 0}}>
                    {item.content ? `${item.content.substring(0, 150)}...` : (item.message || '内容抓取失败或为空。')}
                  </Paragraph>
                </List.Item>
              )}
            />
          </div>
        )}

        {showReferences && <Divider dashed style={{margin: '8px 0'}} />}

        {isEmpty ? (
          <Empty description="未能找到可供对比的史料" />
        ) : (
          sources.map((source, index) => (
            <div key={index}>
              <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>
                史料{index + 1}：{source.title}
              </Title>
              <Paragraph type="secondary" style={{ marginBottom: 8, fontSize: '12px' }}>
                视角：{source.viewpoint}
              </Paragraph>
              <div style={{ padding: '8px 12px', border: '1px solid #f0f0f0', borderRadius: 6, backgroundColor: '#fafafa' }}>
                <Paragraph style={{ marginBottom: 0 }}>
                  {source.snippet}
                </Paragraph>
              </div>
              <a href={source.url} target="_blank" rel="noopener noreferrer" style={{fontSize: '12px', marginTop: '4px', display: 'inline-block'}}>
                查看原始链接
              </a>
            </div>
          ))
        )}
      </Space>
    </Card>
  );
}

function EditableCard({ card, onChange, onDelete }) {
  return (
    <Card 
      size="small" 
      style={{ width: '100%', marginBottom: 12, borderLeft: '3px solid #1677ff' }} 
      bodyStyle={{padding: '12px'}}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Input
            variant="borderless"
            value={card.title}
            onChange={(e) => onChange(card.id, 'title', e.target.value)}
            style={{ fontWeight: 'bold', fontSize: '16px', padding: 0 }}
          />
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => onDelete(card.id)}
          />
        </div>
        <TextArea
          variant="filled"
          rows={3}
          value={card.content}
          onChange={(e) => onChange(card.id, 'content', e.target.value)}
          placeholder={card.placeholder || '请输入内容...'}
        />
      </Space>
    </Card>
  );
}

function HistoricalCriticalThinkingSection({ questProgress, onCompleteAllTasks }) {
  const initialCards = [
    { id: 1, title: '我的历史视角', content: '', placeholder: '基于前面的学习，我对这个历史事件形成了什么独特的观点和判断？' },
    { id: 2, title: '关键证据分析', content: '', placeholder: '哪些证据最能支持我的观点？这些证据的可靠性如何？' },
    { id: 3, title: '反对观点思考', content: '', placeholder: '如果有人反对我的观点，他们会提出什么论据？我如何回应？' },
    { id: 4, title: '历史意义反思', content: '', placeholder: '这个事件在历史长河中的真正意义是什么？对今天有什么启示？' },
    { id: 5, title: '批判性结论', content: '', placeholder: '基于批判性思维，我的最终历史判断是什么？为什么？' },
  ];
  
  const [cards, setCards] = useState(initialCards);

  const handleCardChange = (id, field, value) => {
    setCards(currentCards =>
      currentCards.map(card =>
        card.id === id ? { ...card, [field]: value } : card
      )
    );
  };

  const handleAddCard = () => {
    const newCard = {
      id: Date.now(),
      title: '自定义事件',
      content: '',
      placeholder: '请描述这个自定义事件或原因...'
    };
    setCards(currentCards => [...currentCards, newCard]);
    message.success('已添加新卡片');
  };

  const handleDeleteCard = (id) => {
    setCards(currentCards => currentCards.filter(card => card.id !== id));
    message.info('卡片已删除');
  };

  const handleExport = () => {
    if (cards.every(card => !card.content.trim())) {
      message.warning('没有可导出的内容。');
      return;
    }
    const content = cards.map(card =>
      `【${card.title}】\n${card.content || '未填写'}`
    ).join('\n\n---\n\n');

    const fullContent = `
因果链分析
==================

${content.trim()}
    `;

    const blob = new Blob([fullContent.trim()], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '因果链分析.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('已导出为 TXT 文件！');
  };
  
  const handleSave = () => {
    message.success('内容已保存！');
    // 检查是否完成因果链分析任务
    if (cards.some(card => card.content.trim())) {
      onCompleteAllTasks && onCompleteAllTasks();
    }
  };

  const handleClear = () => {
    setCards(initialCards.map(c => ({...c, content: ''}))); 
    message.info('所有卡片内容已清空。');
  };

  const handleGenerateFinalReport = () => {
    const reportContent = `
# 历史批判思维调查报告
## 研究者：历史学习者
## 研究主题：${window.location.pathname.split('/').pop() || '历史事件'}
## 完成时间：${new Date().toLocaleDateString()}

## 学习任务完成情况
${questProgress?.completedModules?.map(module => `✅ ${module}`).join('\n') || ''}

## 我的历史批判思维分析
${cards.map(card => `### ${card.title}\n${card.content || '未填写'}`).join('\n\n')}

## 批判性思考总结
通过四个维度的深度学习和批判性思维训练，我形成了对历史事件的独特视角和独立思考。这份报告记录了我的批判性分析过程和最终判断。

---
*此报告体现了历史批判思维训练成果*
    `;

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '历史批判思维调查报告.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('🎉 历史批判思维调查报告已生成！恭喜你完成了批判性思维训练！');
  };

  return (
    <Card size="small" bordered style={{ borderStyle: 'dashed' }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Paragraph type="secondary">
          请运用批判性思维，形成您对历史事件的独特视角和判断。通过深度思考，培养历史批判思维能力，最终完成一份具有独立思考的历史调查报告。您可以自由编辑、增加或删除下方的思考卡片。
        </Paragraph>
        
        {cards.map(card => (
          <EditableCard
            key={card.id}
            card={card}
            onChange={handleCardChange}
            onDelete={handleDeleteCard}
          />
        ))}

        <Button
          type="dashed"
          onClick={handleAddCard}
          block
          icon={<PlusOutlined />}
        >
          添加新卡片
        </Button>

        <Divider style={{ margin: '16px 0 8px 0' }} />

        <Space>
          <Button type="primary" onClick={handleSave}>
            保存
          </Button>
          <Button onClick={handleExport}>
            导出
          </Button>
          <Button onClick={handleClear}>
            清空
          </Button>
          {questProgress?.completedModules?.length >= 3 && (
            <Button 
              type="primary" 
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}
              onClick={handleGenerateFinalReport}
            >
              🎯 生成最终报告
            </Button>
          )}
        </Space>
      </Space>
    </Card>
  );
}

function AIChatDock({ topic, addNodeToMap, currentModule, aiContext, open, setOpen, chatValue, setChatValue, questProgress, completeTask }) {
    const CONTENT_PADDING = 24;
    const SIDER_WIDTH_PERCENT = '35%';
    const RIGHT_OFFSET = `calc(${SIDER_WIDTH_PERCENT} + ${CONTENT_PADDING}px)`;

    const [drawerHeight, setDrawerHeight] = useState(360);
    const isResizing = useRef(false);
    const messagesEndRef = useRef(null);

    const [msgs, setMsgs] = useState([
        { role: 'ai', text: '🏛️ 欢迎，历史探险家！我是你的AI导师助手。让我们开始这次激动人心的历史调查之旅吧！\n\n你的任务是完成四个维度的探索，最终形成一份完整的历史调查报告。准备好开始第一个任务了吗？' },
    ]);
    const [loading, setLoading] = useState(false);
    const { message } = AntdApp.useApp();
    const [selectedMenuText, setSelectedMenuText] = useState('');

    const menuItemsForAIMessage = (fullText) => [
        {
            key: 'add-to-map',
            label: '添加到论证图谱',
            onClick: () => {
                const textToAdd = selectedMenuText || fullText;
                if (textToAdd) {
                    addNodeToMap(textToAdd);
                    message.success(`“${textToAdd.substring(0, 15)}...”已添加到图谱`);
                }
            },
        },
    ];

    useEffect(() => {
        if (open) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [msgs, open]);

    const handleMouseMove = useCallback((e) => {
        if (!isResizing.current) return;
        const newHeight = window.innerHeight - e.clientY;
        if (newHeight > 200 && newHeight < window.innerHeight - 100) {
            setDrawerHeight(newHeight);
        }
    }, []);
    
    const handleMouseUp = useCallback(() => {
      isResizing.current = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseMove]);

    const handleMouseDown = useCallback((e) => {
        isResizing.current = true;
        document.body.style.cursor = 'ns-resize'; 
        document.body.style.userSelect = 'none'; 
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, [handleMouseMove, handleMouseUp]);

    const send = async () => {
        if (!chatValue.trim() || loading) return;

        const userMessage = { role: 'user', text: chatValue };
        const newMsgs = [...msgs, userMessage, { role: 'ai', text: '' }];
        setMsgs(newMsgs);
        setChatValue('');
        setLoading(true);

        const chatRequest = {
            history: newMsgs.slice(0, -1).map(m => ({
                role: m.role === 'ai' ? 'assistant' : 'user',
                content: m.text
            })),
            topic: topic,
            current_module: currentModule,
            context_text: aiContext,
        };

        try {
            await postChatMessageStream(chatRequest, (chunk) => {
                setMsgs(currentMsgs => {
                    const lastMsgIndex = currentMsgs.length - 1;
                    const updatedLastMsg = {
                        ...currentMsgs[lastMsgIndex],
                        text: currentMsgs[lastMsgIndex].text + chunk,
                    };
                    return [...currentMsgs.slice(0, lastMsgIndex), updatedLastMsg];
                });
            });
        } catch (error) {
            console.error("AI聊天请求失败:", error);
            setMsgs(currentMsgs => {
                const lastMsgIndex = currentMsgs.length - 1;
                const updatedLastMsg = {
                    ...currentMsgs[lastMsgIndex],
                    text: '抱歉，AI服务暂时不可用，请稍后再试。',
                };
                return [...currentMsgs.slice(0, lastMsgIndex), updatedLastMsg];
            });
            message.error("AI响应失败，请检查后端服务。");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Drawer
            placement="bottom"
            height={drawerHeight}
            open={open}
            onClose={() => setOpen(false)}
            mask={false}
            zIndex={1300}
            title={<Space><BulbOutlined /> <span>AI 引导</span></Space>}
            rootStyle={{ left: CONTENT_PADDING, right: RIGHT_OFFSET }}
            styles={{ body: { paddingTop: 8, paddingBottom: 8, display: 'flex', flexDirection: 'column' } }}
            headerStyle={{ cursor: 'default' }}
        >
            <div
                onMouseDown={handleMouseDown}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '8px',
                    cursor: 'ns-resize',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <div style={{ width: '40px', height: '4px', backgroundColor: '#ccc', borderRadius: '2px' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
                    <List
                        size="small"
                        split={false}
                        dataSource={msgs}
                        renderItem={(m, index) => (
                            <List.Item
                                key={index}
                                style={{
                                    display: 'flex',
                                    justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                                    padding: '4px 0',
                                }}
                            >
                                <Space align="start" style={{ maxWidth: '85%' }}>
                                    {m.role === 'ai' && (
                                        <>
                                            <Tag color="processing">AI</Tag>
                                            <Dropdown
                                                menu={{ items: menuItemsForAIMessage(m.text) }}
                                                trigger={['contextMenu']}
                                                onOpenChange={(isOpen) => {
                                                    if (isOpen) {
                                                        const selection = window.getSelection().toString().trim();
                                                        setSelectedMenuText(selection);
                                                    }
                                                }}
                                            >
                                                <div style={{ background: '#f5f5f5', padding: '8px 12px', borderRadius: '10px', userSelect: 'text', cursor: 'text' }}>
                                                    <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
                                                </div>
                                            </Dropdown>
                                        </>
                                    )}
                                    {m.role === 'user' && (
                                        <>
                                            <Dropdown
                                                menu={{ items: menuItemsForAIMessage(m.text) }}
                                                trigger={['contextMenu']}
                                                onOpenChange={(isOpen) => {
                                                    if (isOpen) {
                                                        const selection = window.getSelection().toString().trim();
                                                        setSelectedMenuText(selection);
                                                    }
                                                }}
                                            >
                                                <div style={{ background: '#e6f7ff', padding: '8px 12px', borderRadius: '10px', userSelect: 'text', cursor: 'text' }}>
                                                    <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
                                                </div>
                                            </Dropdown>
                                            <Tag color="default">你</Tag>
                                        </>
                                    )}
                                </Space>
                            </List.Item>
                        )}
                    />
                    <div ref={messagesEndRef} />
                </div>
                <Space.Compact style={{ width: "100%", marginTop: 8 }}>
                    <Input.TextArea
                        placeholder={loading ? "AI正在思考..." : "输入你的想法/问题，Enter 发送 (Shift+Enter换行)"}
                        value={chatValue}
                        onChange={(e) => setChatValue(e.target.value)}
                        onPressEnter={(e) => {
                            if (!e.shiftKey && !loading) {
                              e.preventDefault();
                              send();
                            }
                        }}
                        disabled={loading}
                        autoSize={{ minRows: 1, maxRows: 5 }}
                    />
                     <Button type="primary" onClick={send} loading={loading}>发送</Button>
                 </Space.Compact>
                 
                 {/* 完成任务按钮 */}
                 {currentModule && !questProgress.completedModules.includes(currentModule.replace('任务一：', '').replace('任务二：', '').replace('任务三：', '').replace('任务四：', '')) && (
                     <div style={{ marginTop: 8, textAlign: 'center' }}>
                         <Button 
                             type="primary" 
                             style={{ 
                                 background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)', 
                                 border: 'none',
                                 borderRadius: '6px'
                             }}
                             onClick={() => {
                                 const taskType = currentModule.replace('任务一：', '').replace('任务二：', '').replace('任务三：', '').replace('任务四：', '');
                                 completeTask(taskType);
                             }}
                         >
                             ✅ 标记任务完成
                         </Button>
                         {currentModule === '任务三：史料分析' && (
                             <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
                                 完成后请进入右侧笔记工作区进行历史批判思维训练
                             </div>
                         )}
                     </div>
                 )}
             </div>
         </Drawer>
     );
 }

function NotesWorkspace({
  topic,
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  addBlankNode,
  setNodes,
  setEdges,
  questProgress,
  onCompleteAllTasks
}) {
  const [noteContent, setNoteContent] = useState('');
  const [isGeneratingMap, setIsGeneratingMap] = useState(false);
  const { message } = AntdApp.useApp();

  const items = [
    {
      key: 'note',
      label: (
        <Space>
          <EditOutlined />
          自由笔记
        </Space>
      ),
      children: <FreeNote noteContent={noteContent} setNoteContent={setNoteContent} />,
    },
    {
      key: 'causality',
      label: (
        <Space>
          <BulbOutlined />
          任务四：历史批判思维训练
        </Space>
      ),
      children: <HistoricalCriticalThinkingSection 
        questProgress={questProgress}
        onCompleteAllTasks={onCompleteAllTasks}
      />,
    },
    {
      key: 'argument-map',
      label: (
        <Space>
          <ApartmentOutlined />
          论证图谱
        </Space>
      ),
      children: (
        <ReactFlowProvider>
          <ArgumentMap
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            addBlankNode={addBlankNode}
            setNodes={setNodes}
            setEdges={setEdges}
            noteContent={noteContent}
            isGeneratingMap={isGeneratingMap}
            setIsGeneratingMap={setIsGeneratingMap}
          />
        </ReactFlowProvider>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={8} style={{ width: '100%' }}>
      <Title level={5} style={{ marginBottom: 0 }}>
        笔记工作区
      </Title>
      <Text type="secondary">支持自由笔记、历史批判思维训练、论证图谱</Text>
      <Tabs defaultActiveKey="note" items={items} />
    </Space>
  );
}

function FreeNote({ noteContent, setNoteContent }) {
  const { message } = AntdApp.useApp();
  
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <TextArea
        rows={12}
        placeholder="随手记录要点、证据与疑问……"
        value={noteContent}
        onChange={(e) => setNoteContent(e.target.value)}
      />
      <Space>
        <Button type="primary" onClick={() => message.success('已保存到本地（示例）')}>
          保存
        </Button>
        <Button onClick={() => setNoteContent('')}>清空</Button>
      </Space>
    </Space>
  );
}