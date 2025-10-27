import { useEffect, useState, useCallback, useRef, useMemo, useLayoutEffect } from 'react';
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
  Modal,
  Row,
  Col,
  Popover,
  Menu,
} from 'antd';
import {
  BookOutlined,
  BulbOutlined,
  MessageOutlined,
  DeleteOutlined,
  OrderedListOutlined,
  ApartmentOutlined,
  PlusOutlined,
  SaveOutlined,
  DownloadOutlined,
  ClearOutlined,
  ExclamationCircleFilled,
  LinkOutlined,
  UpOutlined, DownOutlined,
  AudioOutlined,
  HolderOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getWikiData, getViewpointAnalysis, postChatMessageStream, getSourcesComparison, getWikiHtmlContent, getDiscussionDetails, getWikiPreview, getWikiDiscussionHtmlContent, postComparePair,  refreshDebatePoints, postCreateTimelineEvent, getAIHints } from '../api';
import ArgumentMap from '../ArgumentMap'
import DOMPurify from 'dompurify'
import { useSpeechRecognition } from './useSpeechRecognition';

const { Header, Sider, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

DOMPurify.addHook('afterSanitizeAttributes', function (node) {
  if (node.tagName === 'A' && node.hasAttribute('href')) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export default function InquiryPage() {
  const [topic, setTopic] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [questProgress, setQuestProgress] = useState({
    completedModules: [],
    currentTask: '史实认知',
    totalTasks: 4,
    achievements: [],
    moduleStates: {
      '史实认知': 'pending',
      '观点辨析': 'pending',
      '史料分析': 'pending',
      '历史批判思维训练': 'pending'
    }
  });

  const initialCards = useMemo(() => [
    { id: 1, title: '我的历史视角', content: '', placeholder: '基于前面的学习，请简述您对该历史事件形成的整体看法和判断。' },
    { id: 2, title: '事件的直接原因', content: '', placeholder: '分析并列出导致该事件发生的直接因素或导火索是什么？' },
    { id: 3, title: '事件的深层原因', content: '', placeholder: '探讨事件背后更深层次的政治、经济、社会或文化原因。' },
    { id: 4, title: '触发事件', content: '', placeholder: '是哪个具体的事件或行动最终引爆了整个事态？' },
    { id: 5, title: '历史影响', content: '', placeholder: '该事件对当时及后来的历史发展产生了哪些短期和长期的影响？' },
    { id: 6, title: '历史意义反思', content: '', placeholder: '这个事件在历史长河中的真正意义是什么？对今天的生活有什么启示？' },
  ], []);
  const [cards, setCards] = useState(initialCards);
  const [chatTrigger, setChatTrigger] = useState(null);
  const [chatValue, setChatValue] = useState('');

  const completeTask = (taskType) => {
    
    if (questProgress.completedModules.includes(taskType)) {
      return; 
    }

    setQuestProgress(prev => {
      const taskOrder = ['史实认知', '观点辨析', '史料分析', '历史批判思维训练'];
      const newCompletedSet = new Set([...prev.completedModules, taskType]);
      const newCompletedModules = Array.from(newCompletedSet);
      const newModuleStates = {
        ...prev.moduleStates,
        [taskType]: 'completed'
      };
      const nextTask = taskOrder.find(task => !newCompletedSet.has(task));

      if (nextTask && newModuleStates[nextTask] !== 'completed') {
        newModuleStates[nextTask] = 'active'; 
        if (nextTask === '历史批判思维训练') {
            message.success('🎯 任务四：历史批判思维训练已激活！请在笔记工作区进行最终补充完善。');
        }
      }

      return { 
        ...prev, 
        completedModules: newCompletedModules, 
        currentTask: nextTask || '完成', 
        moduleStates: newModuleStates 
      };
    });

    const badgeMessages = {
      '史实认知': '🎉 恭喜！你已完成"史实认知"任务！',
      '观点辨析': '🎉 恭喜！你已完成"观点辨析"任务！',
      '史料分析': '🎉 恭喜！你已完成"史料分析"任务！',
    };

    if (badgeMessages[taskType]) {
      message.success(badgeMessages[taskType]);
    }
  };

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
          <Button type="primary" onClick={handleSearch} style={{ marginLeft: 8 }}>开始探索</Button>
          <Button onClick={handleClear} style={{ marginLeft: 8 }}>清空</Button>
        </Header>

        <Layout style={{ height: 'calc(100vh - 64px)' }}>
          <Content
            id="main-content-area"
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
                setTopic={setTopic}
                addNodeToMap={addNodeToMap}
                questProgress={questProgress}
                setQuestProgress={setQuestProgress}
                completeTask={completeTask} 
                cards={cards} 
                chatTrigger={chatTrigger} 
                setChatTrigger={setChatTrigger}
                chatValue={chatValue}
                setChatValue={setChatValue}
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
              addNodeToMap={addNodeToMap} 
              setNodes={setNodes}
              setEdges={setEdges}
              questProgress={questProgress}
              onCompleteAllTasks={() => completeTask('历史批判思维训练')}
              cards={cards} 
              setCards={setCards}
              initialCards={initialCards}
              setChatTrigger={setChatTrigger}
              setChatValue={setChatValue}
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
                        <Title level={3}>🏛️ 历史探索者工作室</Title>
                        <Paragraph type="secondary" style={{ fontSize: '16px', marginBottom: '24px' }}>
                            欢迎，未来的历史探索者！你将接受来自历史研究院的任务，通过四个维度的深度探索，完成一份完整的历史调查报告。
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
                                4. <strong>历史批评思维训练</strong> - 形成你的历史判断
                            </Paragraph>
                        </div>
                        <Paragraph type="secondary">
                            请在上方输入您感兴趣的历史主题（例如："西安事变"），然后点击"开始探索"按钮，开启您的历史调查之旅。
                        </Paragraph>
                    </>
                }
            />
        </div>
    );
}

function CoreExplorer({ topic, setTopic,addNodeToMap, questProgress, setQuestProgress, completeTask, cards, chatTrigger, setChatTrigger, chatValue, setChatValue }) {

  const initialWelcomeMessages = useMemo(() => ({
    '任务一：史实认知': '我们已进入【史实认知】模块。请先阅读下方的摘要和时间线，然后可以点击“智能阅读”深入探索原文。准备好后，我们就可以开始提问式学习了。',
    '任务二：观点辨析': '现在是【观点辨析】模块。这里列出了关于此事件的不同阵营作用和主要争议点，让我们一同分析其来源与立场。',
    '任务三：史料分析': '欢迎来到【史料分析】模块。这里展示了从不同来源搜集到的史料片段，我将协助您进行对比与质询。',
    '任务四：历史批判思维训练': '我们已进入【历史批判思维训练】模块。这项任务在右侧的“笔记工作区”完成。我将在这里引导你进行更高层次的反思。',
    'generic': '🏛️ 欢迎，历史探索者！我是你的AI导师助手。让我们开始这次激动人心的历史调查之旅吧！\n\n你的任务是完成四个维度的探索，最终形成一份完整的历史调查报告。准备好开始了吗？'
  }), []); 

  const chatHistoriesRef = useRef({
    '任务一：史实认知': [{ role: 'ai', text: initialWelcomeMessages['任务一：史实认知'] }],
    '任务二：观点辨析': [{ role: 'ai', text: initialWelcomeMessages['任务二：观点辨析'] }],
    '任务三：史料分析': [{ role: 'ai', text: initialWelcomeMessages['任务三：史料分析'] }],
    '任务四：历史批判思维训练': [{ role: 'ai', text: initialWelcomeMessages['任务四：历史批判思维训练'] }],
  });

  const [msgs, setMsgs] = useState([{ role: 'ai', text: initialWelcomeMessages['generic'] }]);
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
  });
  const [fullHtmlContent, setFullHtmlContent] = useState('');
  const [isFullContentLoading, setIsFullContentLoading] = useState(false);
  const [aiContext, setAiContext] = useState('');
  const [isChatOpen, setChatOpen] = useState(false); 
  const [currentModule, setCurrentModule] = useState('模块一：史实认知');
  const [activeModule, setActiveModule] = useState(null);
  const [selectedTextForMenu, setSelectedTextForMenu] = useState('');
  const [activeCollapseKeys, setActiveCollapseKeys] = useState([]);
  const [textForTimeline, setTextForTimeline] = useState(null);
  const [isShuffling, setIsShuffling] = useState(false);

  // ▼▼▼ 核心修改 1/3：新增状态存储动态生成的菜单项 ▼▼▼
  const [contextMenuItems, setContextMenuItems] = useState([]);
  // ▲▲▲ 修改结束 ▲▲▲

  const { message } = AntdApp.useApp();

  // ▼▼▼ 核心修改 2/3：修改 handleMenuOpenChange 以动态生成菜单 ▼▼▼
  const handleMenuOpenChange = (isOpen) => {
    if (isOpen) {
      const currentSelectedText = window.getSelection().toString().trim();
      setSelectedTextForMenu(currentSelectedText);

      // 基本菜单项
      const baseItems = [
        {
          key: 'add-to-map',
          label: '添加到论证图谱',
          onClick: () => {
            if (currentSelectedText) {
              addNodeToMap(currentSelectedText);
              message.success(`“${currentSelectedText.substring(0, 10)}...”已添加到图谱`);
            } else {
              message.warning('请先选择一段文本再右键操作');
            }
          },
        },
        {
          key: 'ask-ai',
          label: '问问AI这段内容...',
          onClick: () => {
            if (currentSelectedText) {
                setChatValue(`针对“${currentSelectedText}”我想问：`);
                // 触发聊天框时不再直接设置模块，而是用 chatTrigger
                setChatTrigger('针对选中内容提问');
                // setChatOpen(true); // 让 chatTrigger 的 useEffect 去打开
                message.info('请针对选中内容继续提问');
            } else {
              message.warning('请先选择一段文本再右键操作');
            }
          }
        },
      ];

      // 检查当前激活的 Collapse key 是否是模块一 ('facts')
      const isModuleOneActive = activeCollapseKeys.includes('facts');

      // 如果是模块一，添加 "添加为时间点"
      if (isModuleOneActive) {
        baseItems.push({
          key: 'add-to-timeline',
          label: '添加为时间点',
          onClick: () => {
            if (currentSelectedText) {
              setTextForTimeline(currentSelectedText);
            } else {
              message.warning('请先选择一段文本再右键操作');
            }
          },
        });
      }
      
      // 更新状态
      setContextMenuItems(baseItems);
    }
  };
  // ▲▲▲ 修改结束 ▲▲▲

  // 移除静态的 menuItems 定义
  // const menuItems = [...] 

  useEffect(() => {
    if (!topic) return;

    const fetchData = () => {
      setInitialLoading(true);
      setError(null);
      setCoreData({
        wikiSummary: { summary: '', timeline: [] },
        viewpoints: { faction_roles: [], viewpoints: [], debates: [] },
        sources: { sources: [] },
      });
      setLoadingStates({ summary: true, viewpoints: true, sources: true });
      setActiveModule(null);
      setChatOpen(false); 
      setActiveCollapseKeys([]); 

      message.loading({ content: `正在为您准备关于“${topic}”的探究模块...`, key: 'data', duration: 1 });

      setInitialLoading(false);

      getWikiData(topic).then(res => {
        setCoreData(prev => ({ ...prev, wikiSummary: res.data }));
        setQuestProgress(prev => ({ ...prev, moduleStates: { ...prev.moduleStates, '史实认知': 'active' }}));
        message.info('📚 史实认知任务已激活！');
      }).catch(err => {
        console.error("模块一加载失败:", err);
      }).finally(() => {
        setLoadingStates(prev => ({ ...prev, summary: false }));
      });

      getViewpointAnalysis(topic).then(res => {
        setCoreData(prev => ({ ...prev, viewpoints: res.data }));
        setQuestProgress(prev => ({ ...prev, moduleStates: { ...prev.moduleStates, '观点辨析': 'active' }}));
      }).catch(err => {
        console.error("模块二加载失败:", err);
      }).finally(() => {
        setLoadingStates(prev => ({ ...prev, viewpoints: false }));
      });

      getSourcesComparison(topic).then(res => {
        setCoreData(prev => ({ ...prev, sources: res.data }));
        setQuestProgress(prev => ({ ...prev, moduleStates: { ...prev.moduleStates, '史料分析': 'active', '历史批判思维训练': 'active' }}));
      }).catch(err => {
        console.error("模块三加载失败:", err);
      }).finally(() => {
        setLoadingStates(prev => ({ ...prev, sources: false }));
      });
    };

    fetchData();
  }, [topic, setQuestProgress]);

  const ensureFullContentFetched = async () => {
    if (fullHtmlContent && fullHtmlContent.content) {
      return fullHtmlContent;
    }
    if (isFullContentLoading) {
      message.info("正在加载原文，请稍候...");
      return;
    }

    setIsFullContentLoading(true);
    try {
      const res = await getWikiHtmlContent(topic);
      if (res.data && res.data.content) {
        setFullHtmlContent(res.data);
        return res.data;
      } else {
        throw new Error('返回的数据格式不正确或内容为空');
      }
    } catch (error) {
      console.error("加载维基百科内容失败:", error);
      message.error('加载原文失败');
      setFullHtmlContent({ content: [] });
      return null;
    } finally {
      setIsFullContentLoading(false);
    }
  };

  const handleActivateModule = useCallback(async (moduleName) => {
    if (moduleName === '针对选中内容提问') {
        setCurrentModule('针对选中内容提问');
        setActiveModule('针对选中内容提问');
        setAiContext('你现在正在指导学生【针对选中内容提问】。');
        setChatOpen(true);
        return; 
    }
    
    if (activeModule === moduleName && isChatOpen) {
      return; 
    }

    setCurrentModule(moduleName);
    setActiveModule(moduleName);

    if (chatHistoriesRef.current[moduleName]) {
      setMsgs(chatHistoriesRef.current[moduleName]);
    } else {
      const newWelcome = { role: 'ai', text: `已激活【${moduleName}】模块。` };
      setMsgs([newWelcome]);
      chatHistoriesRef.current[moduleName] = [newWelcome];
    }

    let context = '';
    let aiPrompt = '';
    let taskType = '';

    switch (moduleName) {
      case '任务一：史实认知':
        taskType = '史实认知';
        context = `维基百科摘要:\n${coreData.wikiSummary?.summary || ''}`;
        aiPrompt = '你现在正在指导学生完成"史实认知"任务。请利用苏格拉底教育法，通过提问，一步一步帮助学生建立历史事件的基本框架。';
        break;
      case '任务二：观点辨析':
        taskType = '观点辨析';
        context = `对立观点:\n${coreData.viewpoints.viewpoints.map(vp => `${vp.side}: ${vp.text}`).join('\n\n')}`;
        aiPrompt = '你现在正在指导学生完成"观点辨析"任务。请利用苏格拉底教育法，通过提问，帮助学生分析不同立场和争议。';
        break;
      case '任务三：史料分析':
        taskType = '史料分析';
        context = `史料对比:\n${coreData.sources.sources.map(src => `标题: ${src.title}\n视角: ${src.viewpoint}\n片段: "${src.snippet}"`).join('\n\n')}`;
        aiPrompt = '你现在正在指导学生完成"史料分析"任务。请利用苏格拉底教育法，通过提问，帮助学生对比多方史料证据。';
        break;
      case '任务四：历史批判思维训练':
        taskType = '历史批判思维训练';
        context = cards.map(card => `【${card.title}】:\n${card.content || '未填写'}`).join('\n\n');
        aiPrompt = '你现在正在指导学生完成"历史批判思维训练"任务。请利用苏格拉底教育法，引导学生进行更高层次的反思，融合偶然性、复杂性、历史之重要性和伦理维度。';
        break;
    }

    setAiContext(`${aiPrompt}\n\n学习材料:\n${context}`);
    setChatOpen(true);
  }, [activeModule, isChatOpen, coreData, cards, setAiContext, setChatOpen, setCurrentModule, setActiveModule, setMsgs, chatHistoriesRef]);

  useEffect(() => {
    if (chatTrigger) {
      handleActivateModule(chatTrigger); 
      setChatTrigger(null); 
    }
  }, [chatTrigger, setChatTrigger, handleActivateModule]); 
  
  const handleCollapseChange = (keys) => {
    const expandedKey = keys.find(key => !activeCollapseKeys.includes(key));
    
    if (expandedKey) {
      const keyToModuleMap = {
        'facts': '任务一：史实认知',
        'views': '任务二：观点辨析',
        'sources': '任务三：史料分析',
      };
      const moduleNameToActivate = keyToModuleMap[expandedKey];
      
      if (moduleNameToActivate) {
        handleActivateModule(moduleNameToActivate);
      }
    }
    
    // 始终更新 activeCollapseKeys，以便 handleMenuOpenChange 能获取最新状态
    setActiveCollapseKeys(keys);
  };

  useEffect(() => {
    if (activeModule && chatHistoriesRef.current[activeModule]) {
      chatHistoriesRef.current[activeModule] = msgs;
    }
  }, [msgs, activeModule]); 

  const handleRefreshSources = () => {
    message.loading({ content: `正在获取新一组对比史料...`, key: 'refresh_sources' });
    setLoadingStates(prev => ({ ...prev, sources: true }));

    getSourcesComparison(topic)
      .then(res => {
        setCoreData(prev => ({ ...prev, sources: res.data }));
        message.success({ content: `已成功更换一组史料！`, key: 'refresh_sources' });
      })
      .catch(err => {
        console.error("更换史料失败:", err);
        message.error({ content: `更换史料失败，请稍后再试。`, key: 'refresh_sources' });
      })
      .finally(() => {
        setLoadingStates(prev => ({ ...prev, sources: false }));
      });
  };

   const handleShuffleSources = () => {
    const { references } = coreData.sources;
    if (!references || references.length < 2) {
      message.info('当前可用史料不足2篇，无法进行更换。');
      return;
    }

    setIsShuffling(true);
    message.loading({ content: '正在为您生成新的史料对读...', key: 'shuffle_sources' });

    const shuffled = [...references].sort(() => 0.5 - Math.random());
    const selectedPair = shuffled.slice(0, 2);

    const cleanSelectedPair = selectedPair.map(ref => ({
      title: ref.title,
      url: ref.url,
      content: ref.content
    }));

    postComparePair(topic, cleanSelectedPair)
      .then(res => {
        setCoreData(prev => ({
          ...prev,
          sources: {
            ...prev.sources, 
            sources: res.data.sources 
          }
        }));
        message.success({ content: '已成功生成新的史料对读！', key: 'shuffle_sources' });
      })
      .catch(err => {
        console.error("更换史料对读失败:", err);
        message.error({ content: '生成失败，请稍后再试。', key: 'shuffle_sources' });
      })
      .finally(() => {
        setIsShuffling(false);
      });
  };

  return (
    <div>
      {/* ▼▼▼ 核心修改 3/3：让主 Dropdown 使用动态生成的 contextMenuItems ▼▼▼ */}
      <Dropdown
        menu={{ items: contextMenuItems }}
        trigger={['contextMenu']}
        onOpenChange={handleMenuOpenChange}
      >
      {/* ▲▲▲ 修改结束 ▲▲▲ */}
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={3} style={{ marginBottom: 0 }}>
              🏛️ {topic}
            </Title>
            <QuestProgress questProgress={questProgress} />
          </div>

          <Collapse
            bordered={false}
            activeKey={activeCollapseKeys}
            onChange={handleCollapseChange}
            style={{ background: "transparent" }}
            items={[
              {
                key: "facts", // 模块一的 key
                label: <ModuleHeader
                  icon={<BookOutlined />}
                  title="任务一：史实认知"
                  hint="建立历史事件的基本框架"
                  onActivate={handleActivateModule}
                  isCompleted={questProgress.completedModules.includes('史实认知')}
                  taskState={questProgress.moduleStates['史实认知']}
                />,
                children: (
                  loadingStates.summary ? <div style={{ textAlign: 'center', padding: '40px 0' }}><Spin tip="AI正在生成摘要与时间线..." /></div> : 
                  <WikiSummaryCard
                    data={coreData.wikiSummary}
                    topic={topic}
                    fullHtmlContent={fullHtmlContent}
                    isFullContentLoading={isFullContentLoading}
                    ensureFullContentFetched={ensureFullContentFetched}
                    textForTimeline={textForTimeline}
                    onTimelineActionComplete={() => setTextForTimeline(null)}
                  />
                ),
              },
              {
                key: "views", // 模块二的 key
                label: <ModuleHeader
                  icon={<BulbOutlined />}
                  title="任务二：观点辨析"
                  hint="分析不同立场和争议"
                  onActivate={handleActivateModule}
                  isCompleted={questProgress.completedModules.includes('观点辨析')}
                  taskState={questProgress.moduleStates['观点辨析']}
                />,
                children: (
                  loadingStates.viewpoints ? <div style={{ textAlign: 'center', padding: '40px 0' }}><Spin tip="AI正在分析不同观点..." /></div> : 
                  <ViewpointAnalysis 
                    data={coreData.viewpoints} 
                    topic={topic} 
                    isActive={activeCollapseKeys.includes('views')}
                  />
                ),
              },
              {
                key: "sources", // 模块三的 key
                label: <ModuleHeader
                  icon={<BookOutlined />}
                  title="任务三：史料分析"
                  hint="对比多方史料证据"
                  onActivate={handleActivateModule}
                  isCompleted={questProgress.completedModules.includes('史料分析')}
                  taskState={questProgress.moduleStates['史料分析']}
                />,
                children: (
                  loadingStates.sources ? <div style={{ textAlign: 'center', padding: '40px 0' }}><Spin tip="正在抓取和对比多方史料..." /></div> : 
                  <SourcesComparisonCard 
                    data={coreData.sources} 
                    onRefresh={handleRefreshSources} 
                    isLoading={loadingStates.sources}
                    onShuffle={handleShuffleSources} 
                    isShuffling={isShuffling} 
                  />
                ),
              },
            ]}
          />
        </Space>
      </Dropdown> {/* 主 Dropdown 结束 */}

       <AIChatDock
         topic={topic}
         msgs={msgs}
         setMsgs={setMsgs}
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
        <Text strong style={{ color: 'white' }}>探索进度</Text>
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

function EditableTimelineItem({ item, onChange, onDelete, onClick, onSort }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({id: item.id});

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: 'none',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div 
        onClick={onClick}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          marginBottom: 8, 
          width: '100%', 
          padding: '4px',
          borderRadius: '6px',
          cursor: 'pointer',
          transition: 'background-color 0.2s ease',
        }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0f0f0'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <Button 
          type="text" 
          icon={<HolderOutlined />} 
          {...listeners} 
          style={{ cursor: 'grab', marginRight: 8 }}
          onMouseDown={e => e.stopPropagation()} 
        />
        <Input
          value={item.year}
          onChange={(e) => onChange(item.id, 'year', e.target.value)}
          onBlur={onSort} 
          onPressEnter={onSort} 
          placeholder="年份/日期"
          style={{ width: 120, marginRight: 8 }}
        />
        <Input
          value={item.event}
          onChange={(e) => onChange(item.id, 'event', e.target.value)}
          placeholder="关键事件描述"
          style={{ flex: 1, marginRight: 8 }}
        />
        {item.source_text && (
          <Popover content={<div style={{ maxWidth: 300, maxHeight: 200, overflowY: 'auto' }}>{item.source_text}</div>} title="关联的原文" trigger="hover">
            <LinkOutlined style={{ color: '#1677ff', margin: '0 8px' }} />
          </Popover>
        )}
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
          }}
        />
      </div>
    </div>
  );
}

function WikiSummaryCard({ data, topic, fullHtmlContent, isFullContentLoading, ensureFullContentFetched, textForTimeline, onTimelineActionComplete }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef(null);
  const { message } = AntdApp.useApp();
  const [popover, setPopover] = useState({ visible: false, content: null, title: '', top: 0, left: 0 });
  const hideTimer = useRef(null);
  const currentTargetRef = useRef(null);
  const summaryCache = useRef(new Map()).current;
  const [timelineItems, setTimelineItems] = useState([]);
  
  const [highlightedSourceText, setHighlightedSourceText] = useState('');

  const parseYearMonth = (yearString) => {
    if (!yearString) return 0;
    
    const yearMatch = yearString.match(/(\d{4})/);
    if (!yearMatch) return 0;
    
    const year = parseInt(yearMatch[0], 10);
    let month = 0; 

    const monthMatch = yearString.match(/(\d{1,2})月/);
    if (monthMatch) {
      month = parseInt(monthMatch[1], 10);
    } else {
      if (yearString.includes('春')) {
        month = 3; 
      } else if (yearString.includes('夏')) {
        month = 6; 
      } else if (yearString.includes('秋')) {
        month = 9; 
      } else if (yearString.includes('冬')) {
        month = 12; 
      }
    }
    
    return year * 100 + month;
  };

  const handleAddNewTimelineItem = (newItem) => {
    setTimelineItems(prevItems => {
      const updatedItems = [...prevItems, newItem];
      updatedItems.sort((a, b) => parseYearMonth(a.year) - parseYearMonth(b.year));
      return updatedItems;
    });
  };

  useEffect(() => {
    if (data && data.timeline) {
      const sortedTimeline = [...data.timeline].sort((a, b) => {
        return parseYearMonth(a.year) - parseYearMonth(b.year);
      });
      setTimelineItems(sortedTimeline.map((item, index) => ({ ...item, id: `timeline-${index}` })));
    }
  }, [data]);

  useEffect(() => {
      if (textForTimeline) {
        const handleAICreate = async (text) => {
            message.loading({ content: 'AI正在分析并查找时间点...', key: 'timeline_ai' });
            try {
              const response = await postCreateTimelineEvent(topic, text);
              
              const aiGeneratedEvent = response.data;

              const newItem = {
                ...aiGeneratedEvent,
                source_text: text,
                id: `timeline-llm-${Date.now()}`
              };
              
              handleAddNewTimelineItem(newItem);

              message.success({ content: 'AI已成功生成并添加时间点！', key: 'timeline_ai' });
            } catch (error) {
              console.error("AI生成时间点失败:", error);
              message.error({ content: 'AI生成失败，请稍后再试。', key: 'timeline_ai' });
            } finally {
              onTimelineActionComplete();
            }
        };

        handleAICreate(textForTimeline);
      }
  }, [textForTimeline, onTimelineActionComplete, topic]);


  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event) => {
    const {active, over} = event;
    if (active.id !== over.id) {
      setTimelineItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const robustHighlight = (htmlString, textToHighlight) => {
    if (!textToHighlight || !htmlString) {
      return htmlString;
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;

    const normalizeText = (text) => text.trim();
    const normalizedHighlightText = normalizeText(textToHighlight);

    const textSegments = [];
    let fullText = '';
    const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while (node = walker.nextNode()) {
      if (node.nodeValue.trim() === '') continue;

      textSegments.push({
        node: node,
        start: fullText.length,
        end: fullText.length + node.nodeValue.length,
      });
      fullText += node.nodeValue;
    }

    const normalizedFullText = normalizeText(fullText);

    const matchStartIndex = normalizedFullText.indexOf(normalizedHighlightText);

    if (matchStartIndex === -1) {
      return htmlString;
    }
    const matchEndIndex = matchStartIndex + normalizedHighlightText.length;
    
    const findOriginalIndex = (rawText, normalizedIndex) => {
      let trimStartIndex = 0;
      while (trimStartIndex < rawText.length && /\s/.test(rawText[trimStartIndex])) {
        trimStartIndex++;
      }
      return trimStartIndex + normalizedIndex;
    };

    for (let i = textSegments.length - 1; i >= 0; i--) {
      const segment = textSegments[i];
      const { node, start, end } = segment;

      const effectiveStart = normalizeText(fullText.substring(0, start)).length;
      const effectiveEnd = normalizeText(fullText.substring(0, end)).length;
      
      if (effectiveStart < matchEndIndex && effectiveEnd > matchStartIndex) {
        const highlightStartInNode = Math.max(0, matchStartIndex - effectiveStart);
        const highlightEndInNode = Math.min(effectiveEnd, matchEndIndex) - effectiveStart;

        const originalHighlightStart = findOriginalIndex(node.nodeValue, highlightStartInNode);
        const originalHighlightEnd = findOriginalIndex(node.nodeValue, highlightEndInNode);

        if (originalHighlightStart < originalHighlightEnd) {
          try {
            const originalText = node.nodeValue;
            const parent = node.parentNode; 

            if (parent) {
              const beforeText = originalText.substring(0, originalHighlightStart); 
              const highlightedText = originalText.substring(originalHighlightStart, originalHighlightEnd); 
              const afterText = originalText.substring(originalHighlightEnd); 

              const highlightSpan = document.createElement('span');
              highlightSpan.className = 'timeline-highlight';
              highlightSpan.textContent = highlightedText;

              if (beforeText) {
                parent.insertBefore(document.createTextNode(beforeText), node);
              }
              parent.insertBefore(highlightSpan, node);
              if (afterText) {
                parent.insertBefore(document.createTextNode(afterText), node);
              }
              parent.removeChild(node);
            }
          } catch (e) {
            console.error("Highlighting error (manual node split):", e, node.nodeValue, originalHighlightStart, originalHighlightEnd);
          }
        }
      }
    }
    return tempDiv.innerHTML;
  };

  const handleTimelineClick = async (item) => { 
    const sourceText = item?.source_text?.trim();
    if (!sourceText) {
      if (!isExpanded) {
        setHighlightedSourceText('');
      }
      return;
    }
    if (!isExpanded) {
      await toggleExpand(); 
    }
    setHighlightedSourceText(sourceText);
    message.success('已在原文中定位到相关内容！');
  };

  const handleLinkMouseOver = useCallback(async (e) => {
    const target = e.target.closest('a[href^="https://zh.wikipedia.org/wiki/"]');
    clearTimeout(hideTimer.current);
    if (!target || target === currentTargetRef.current) return;
    currentTargetRef.current = target;
    const term = decodeURIComponent(target.getAttribute('href').split('/wiki/')[1]).replace(/_/g, ' ');
    if (!term || term === topic || term.includes(':')) return;
    const rect = target.getBoundingClientRect();
    setPopover(p => ({ ...p, visible: true, content: <Spin size="small" />, title: `加载中: ${term}`, top: rect.bottom + 15, left: rect.left, }));
    let summaryText = summaryCache.get(term);
    if (!summaryText) {
      try {
        const response = await getWikiPreview(term);
        summaryText = response.data.summary || '此词条暂无可用预览。';
        summaryCache.set(term, summaryText);
      } catch (error) { console.error("加载维基百科预览失败:", error); summaryText = '加载预览失败。'; }
    }
    const POPOVER_WIDTH = 350, POPOVER_HEIGHT = 150, GAP = 15;
    let top = 0, left = 0;
    if (window.innerHeight - rect.bottom > POPOVER_HEIGHT + GAP) { top = rect.bottom + GAP; left = rect.left; }
    else { top = rect.top - POPOVER_HEIGHT - GAP; left = rect.left; }
    if (left + POPOVER_WIDTH > window.innerWidth) { left = window.innerWidth - POPOVER_WIDTH - GAP; }
    if (left < 0) { left = GAP; }
    if (target === currentTargetRef.current) { setPopover({ visible: true, content: summaryText, title: term, top, left }); }
  }, [topic, summaryCache]);

  const handleLinkMouseOut = useCallback(() => { currentTargetRef.current = null; hideTimer.current = setTimeout(() => { setPopover(p => ({ ...p, visible: false })); }, 200); }, []);
  const handleTimelineChange = (id, field, value) => { 
    setTimelineItems(items => 
      items.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    ); 
  };
  const handleTimelineSort = () => {
    setTimelineItems(items => {
      const sortedItems = [...items]; 
      sortedItems.sort((a, b) => parseYearMonth(a.year) - parseYearMonth(b.year));
      return sortedItems;
    });
  };
  const handleAddTimelineItem = () => { setTimelineItems(items => [...items, { id: `timeline-new-${Date.now()}`, year: '', event: '' }]); };
  
  const handleDeleteTimelineItem = (id) => { setTimelineItems(items => items.filter(item => item.id !== id)); };
  const handleSaveNotes = () => { message.success('笔记已保存！(模拟)'); };
  const handleExport = () => { if (timelineItems.length === 0) { message.warning('没有可导出的时间线内容。'); return; } const content = timelineItems.map(item => `${item.year}: ${item.event}`).join('\n'); const blob = new Blob([content], { type: 'text/plain;charset=utf-8' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${topic || '未命名主题'}-时间线.txt`; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(link.href); message.success('时间线已导出为 .txt 文件！'); };
  const handleClearTimeline = () => { Modal.confirm({ title: '您确定要清空所有时间线吗？', icon: <ExclamationCircleFilled />, content: '这个操作无法撤销。', okText: '确认清空', okType: 'danger', cancelText: '取消', onOk() { setTimelineItems([]); message.info('时间线已清空。'); }, }); };

  const toggleExpand = useCallback(async () => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);
    if (!nextState) {
      setHighlightedSourceText('');
    }
    if (nextState && !fullHtmlContent) {
      await ensureFullContentFetched();
    }
  }, [isExpanded, fullHtmlContent, ensureFullContentFetched]);

  const handleScrollTo = (key) => {
    const element = document.getElementById(key);
    if (element && contentRef.current) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const buildTree = (list) => {
    if (!list || list.length === 0) return [];
    const mapToMenuItems = (nodes) => nodes.map(node => {
      const hasChildren = node.children && node.children.length > 0;
      const label = (
        <span onClick={(e) => { e.stopPropagation(); handleScrollTo(node.id); }}>
          {node.title}
        </span>
      );
      const menuItem = { key: node.id, label: label, };
      if (hasChildren) {
        menuItem.children = mapToMenuItems(node.children);
      }
      return menuItem;
    });
    const tree = [];
    const path = [];
    list.forEach(item => {
        const node = { ...item, children: [] };
        while (path.length > 0 && path[path.length - 1].level >= node.level) { path.pop(); }
        if (path.length > 0) { path[path.length - 1].children.push(node); }
        else { tree.push(node); }
        path.push(node);
    });
    return mapToMenuItems(tree);
  };

   const displayedContent = useMemo(() => {
    if (!isExpanded || !fullHtmlContent?.content) return [];
    
    const sanitizedContent = fullHtmlContent.content.map(section => ({
        ...section,
        html_content: DOMPurify.sanitize(section.html_content || '')
    }));

    if (!highlightedSourceText) {
      return sanitizedContent;
    }

    return sanitizedContent.map(section => {
      const newHtml = robustHighlight(section.html_content, highlightedSourceText);
      return { ...section, html_content: newHtml };
    });

  }, [isExpanded, fullHtmlContent, highlightedSourceText]);


  useEffect(() => {
    if (highlightedSourceText && isExpanded) {
      const timer = setTimeout(() => {
        const highlightedElement = contentRef.current?.querySelector('.timeline-highlight');
        if (highlightedElement) {
          highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          highlightedElement.style.animation = 'highlight-pulse 1.5s';
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [displayedContent, highlightedSourceText, isExpanded]);

  const menuItems = buildTree(fullHtmlContent?.content);
  const aiSummary = data?.summary || "暂无AI摘要";

  return (
    <>
      <Card variant="bordered" style={{ borderStyle: "dashed", background: "#fafafa", textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, marginRight: 16, background: '#e6f7ff', padding: '16px', borderRadius: '8px', border: '1px solid #91d5ff' }}>
            <Title level={5} style={{ margin: 0, color: '#1890ff', marginBottom: '8px' }}>🤖 AI智能摘要</Title>
            <Paragraph style={{ margin: 0 }}>{aiSummary}</Paragraph>
          </div>
          <Button type="primary" size="small" onClick={toggleExpand} icon={<BookOutlined />} loading={isFullContentLoading}>
            {isExpanded ? '收起原文' : '智能阅读'}
          </Button>
        </div>
      </Card>

      {isExpanded && (
        <Card
          variant="bordered"
          style={{ marginTop: '16px', borderStyle: "dashed", background: "#fafafa", height: '85vh', display: 'flex', flexDirection: 'column', textAlign: 'left' }}
          styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 } }}
        >
           <div style={{ flexShrink: 0, marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
             {fullHtmlContent?.url && <Button icon={<LinkOutlined />} href={fullHtmlContent.url} target="_blank" rel="noopener noreferrer">查看原文</Button>}
          </div>

          <Row gutter={24} style={{ flex: 1, minHeight: 0 }}>
            <Col span={6} style={{ height: '100%' }}>
              <div style={{ height: '100%', border: '1px solid #f0f0f0', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column' }}>
                <Title level={5} style={{ marginTop: 0, flexShrink: 0 }}>目录</Title>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {isFullContentLoading ? <Spin /> : (menuItems && menuItems.length > 0) ? (
                    <Menu mode="inline" items={menuItems} onClick={({ key }) => handleScrollTo(key)} style={{ borderRight: 0, background: 'transparent' }} />
                  ) : <Empty description='暂无目录' image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                </div>
              </div>
            </Col>
            <Col span={18} style={{ height: '100%' }}>
              <div
                ref={contentRef}
                onMouseOver={handleLinkMouseOver}
                onMouseOut={handleLinkMouseOut}
                style={{ height: '100%', overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: '8px', padding: '16px', position: 'relative' }}>
                {isFullContentLoading ? <div style={{textAlign: 'center', padding: 48}}><Spin tip="原文加载中..."/></div> : ((displayedContent && displayedContent.length > 0) ? (
                  displayedContent.map((section) => (
                    <div key={section.id} id={section.id}>
                      <Title level={section.level === 1 ? 4 : Math.min(section.level + 2, 5)} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: '8px', marginTop: 24 }}>
                        {section.title}
                      </Title>
                      <div dangerouslySetInnerHTML={{ __html: section.html_content }} />
                    </div>
                  ))
                ) : ( <Empty description="暂无正文内容" image={Empty.PRESENTED_IMAGE_SIMPLE} /> ))}
              </div>
            </Col>
          </Row>
        </Card>
      )}

      <div style={{ marginTop: '16px' }}>
        <Divider dashed style={{ margin: "0 0 8px 0" }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <Text strong>关键时间线 (点击条目可在原文中定位)</Text>
          <Space>
            <Button icon={<SaveOutlined />} size="small" onClick={handleSaveNotes}>保存</Button>
            <Button icon={<DownloadOutlined />} size="small" onClick={handleExport}>导出</Button>
            <Button icon={<ClearOutlined />} size="small" danger onClick={handleClearTimeline}>清空</Button>
          </Space>
        </div>
        <div style={{ border: '1px solid #f0f0f0', borderRadius: '8px', padding: '12px' }}>
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={timelineItems.map(item => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                {timelineItems.length > 0 ? (
                  timelineItems.map(item => ( 
                    <EditableTimelineItem 
                      key={item.id} 
                      item={item} 
                      onChange={handleTimelineChange} 
                      onDelete={handleDeleteTimelineItem}
                      onClick={() => handleTimelineClick(item)}
                      onSort={handleTimelineSort} 
                    /> 
                  ))
                ) : ( 
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="AI未能生成时间线，或您可以手动添加" /> 
                )}
                <Button type="dashed" onClick={handleAddTimelineItem} block icon={<PlusOutlined />} style={{ marginTop: 8 }}>直接添加时间点（或选中原文段右键添加）</Button>
              </Space>
            </SortableContext>
          </DndContext>
        </div>
      </div>

      {popover.visible && (
        <div style={{ textAlign: 'left', position: 'fixed', top: `${popover.top}px`, left: `${popover.left}px`, zIndex: 2000, width: 350, boxShadow: '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #f0f0f0', transition: 'opacity 0.2s, transform 0.2s', transform: 'scale(0.95)', opacity: 0, animation: 'fadeInScale 0.2s forwards' }} onMouseOver={() => clearTimeout(hideTimer.current)} onMouseOut={handleLinkMouseOut}>
          <div style={{ padding: '12px 16px' }}>
            <Title level={5} style={{margin: '0 0 8px 0'}}>{popover.title}</Title>
            <div style={{maxHeight: '150px', overflowY: 'auto', fontSize: '13px'}}>{popover.content}</div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes fadeInScale { to { transform: scale(1); opacity: 1; } }
        .timeline-highlight {
          background-color: #ffe7ba;
          border-radius: 4px;
          padding: 2px 4px;
          transition: background-color 0.5s ease;
          box-shadow: 0 0 8px rgba(255, 192, 105, 0.5);
        }
        @keyframes highlight-pulse {
          0% { box-shadow: 0 0 0 0 rgba(255, 192, 105, 0.7); }
          70% { box-shadow: 0 0 0 12px rgba(255, 192, 105, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 192, 105, 0); }
        }
      `}</style>
    </>
  );
}

function ViewpointAnalysis({ data, topic, isActive }) {
    const [selectedDebate, setSelectedDebate] = useState(null);
    const [detailedViewpoints, setDetailedViewpoints] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showFullDiscussion, setShowFullDiscussion] = useState(false);
    const [discussionHtmlContent, setDiscussionHtmlContent] = useState(null);
    const [isDiscussionHtmlLoading, setIsDiscussionHtmlLoading] = useState(false);
    const [highlightedTocItems, setHighlightedTocItems] = useState([]);
    const [scrollToSectionTitle, setScrollToSectionTitle] = useState(null);
    const [displayDebates, setDisplayDebates] = useState(data.debates || []);
    const [isRefreshingDebates, setIsRefreshingDebates] = useState(false);
    const contentRef = useRef(null);
    
    const { message } = AntdApp.useApp();

    useEffect(() => {
      if (!isActive) {
        setSelectedDebate(null);
        setDetailedViewpoints([]);
        setHighlightedTocItems([]);
        setScrollToSectionTitle(null);
      }
    }, [isActive]); 

  const handleRefreshDebates = async (e) => {
      e.stopPropagation();

      setIsRefreshingDebates(true);
      message.loading({ content: '正在获取新一组讨论要点...', key: 'refresh_debates' });

      try {
          const response = await refreshDebatePoints(topic, displayDebates);
          const newDebates = response.data.debates || [];

          setDisplayDebates(newDebates);

          setSelectedDebate(null);
          setDetailedViewpoints([]);
          setHighlightedTocItems([]);
          setScrollToSectionTitle(null);

          message.success({ content: '讨论要点已更新！', key: 'refresh_debates' });
      } catch (error) {
          console.error('刷新讨论要点失败:', error);
          message.error({ content: '刷新失败，请稍后重试。', key: 'refresh_debates' });
      } finally {
          setIsRefreshingDebates(false);
      }
  };

  const handleDebateClick = async (debateItem, isRefresh = false) => {
      if (selectedDebate === debateItem && !isRefresh) { 
          setSelectedDebate(null);
          setDetailedViewpoints([]);
          setHighlightedTocItems([]); 
          setScrollToSectionTitle(null);

          return;
      }

      setLoading(true);
      setSelectedDebate(debateItem);
      setHighlightedTocItems([]); 
      setScrollToSectionTitle(null); 

      try {
          const response = await getDiscussionDetails(topic, debateItem);
          const detailedData = response.data;
          setDetailedViewpoints(detailedData.detailed_viewpoints || []);
          setHighlightedTocItems(detailedData.source_sections || []);

          const firstSectionTitle = detailedData.source_sections?.[0];

          if (firstSectionTitle) {
              if (!showFullDiscussion) {
                  handleShowFullDiscussion();
              }
              setScrollToSectionTitle(firstSectionTitle);
          }

      } catch (error) {
          console.error('获取讨论详情失败:', error);
          message.error('获取讨论详情失败，请稍后重试');
          setDetailedViewpoints([]);
      } finally {
          setLoading(false);
      }
  };

    useEffect(() => {
      if (scrollToSectionTitle && discussionHtmlContent?.content) {
        
        const sectionToScrollTo = discussionHtmlContent.content.find(
          (s) => s.title === scrollToSectionTitle
        );

        if (sectionToScrollTo) {
          setTimeout(() => {
            handleScrollTo(sectionToScrollTo.id);
            setScrollToSectionTitle(null);
          }, 100); 
        } else {
          setScrollToSectionTitle(null);
        }
      }
    }, [scrollToSectionTitle, discussionHtmlContent]); 

    const handleShowFullDiscussion = async () => {
        const nextState = !showFullDiscussion;
        setShowFullDiscussion(nextState);
        if (nextState && !discussionHtmlContent) {
            setIsDiscussionHtmlLoading(true);
            try {
                const res = await getWikiDiscussionHtmlContent(topic);
                if (res.data && (res.data.content || res.data.toc)) {
                    setDiscussionHtmlContent(res.data);
                } else {
                    throw new Error('返回的讨论页数据格式不正确或内容为空');
                }
            } catch (error) {
                console.error("加载维基百科讨论页内容失败:", error);
                message.error('加载讨论页原文失败');
                setDiscussionHtmlContent({ content: [], toc: [], title: "加载失败", url: '' });
            } finally {
                setIsDiscussionHtmlLoading(false);
            }
        }
    };
    
    const handleScrollTo = (key) => {
        const element = document.getElementById(key);
        if (element && contentRef.current) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const buildTree = (list,highlightedItems = []) => {
        if (!list || list.length === 0) return [];
        const mapToMenuItems = (nodes) => nodes.map(node => {
          const hasChildren = node.children && node.children.length > 0;
          const isHighlighted = highlightedItems.includes(node.title);
          const label = (
            <span onClick={(e) => { e.stopPropagation(); handleScrollTo(node.id); }}
              style={{
                fontWeight: isHighlighted ? 'bold' : 'normal',
                color: isHighlighted ? '#1677ff' : 'inherit',
                display: 'inline-block',
                padding: '2px 4px',
                borderRadius: '4px',
                background: isHighlighted ? 'rgba(22, 119, 255, 0.1)' : 'transparent',
                transition: 'all 0.3s'
              }}
            >
              {node.title}
            </span>
          );
          const menuItem = { 
            key: node.id,
            label: label, 
          };
          if (hasChildren) {
            menuItem.children = mapToMenuItems(node.children);
          }
          return menuItem;
        });

        const tree = [];
        const path = [];
        list.forEach(item => {
            const node = { ...item, children: [] };
            while (path.length > 0 && path[path.length - 1].level >= node.level) { path.pop(); }
            if (path.length > 0) { path[path.length - 1].children.push(node); }
            else { tree.push(node); }
            path.push(node);
        });
        return mapToMenuItems(tree);
    };

    const menuItems = buildTree(discussionHtmlContent?.content, highlightedTocItems);

    return (
        <Card size="small" variant="bordered" style={{ borderStyle: "dashed", textAlign: 'left' }}>
            <Space direction="vertical" style={{ width: "100%" }}>
                <List
                    size="small"
                    header={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text strong>维基讨论页摘录（要点）</Text>
                            <Space>
                                <Button
                                    type="primary"
                                    ghost
                                    size="small"
                                    icon={<SyncOutlined />}
                                    loading={isRefreshingDebates}
                                    onClick={handleRefreshDebates}
                                >
                                    更新
                                </Button>
                                <Button
                                    type="link"
                                    size="small"
                                    loading={isDiscussionHtmlLoading}
                                    onClick={handleShowFullDiscussion}
                                    style={{ padding: 0 }}
                                >
                                    {showFullDiscussion ? '收起完整讨论页' : '阅读完整讨论页'}
                                </Button>
                            </Space>
                        </div>
                    }
                    dataSource={displayDebates || []}
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
                                <Tag color={selectedDebate === debateItem ? "processing" : "default"}>{index + 1}</Tag>
                                <Text style={{ flex: 1 }}>{debateItem}</Text>
                                {selectedDebate === debateItem && !loading && (
                                    <Button
                                        type="text"
                                        icon={<SyncOutlined />}
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation(); 
                                            handleDebateClick(debateItem,true);
                                        }}
                                        title="使用最新的阵营列表重新分析"
                                    />
                                )}

                                {selectedDebate === debateItem && loading && <Spin size="small" />}
                            </Space>
                        </List.Item>
                    )}
                />

                {selectedDebate && detailedViewpoints.length > 0 && !loading && (
                  <>
                      <Divider dashed style={{ margin: "8px 0" }} />
                      <Card 
                          size="small"
                          title={<Text strong>关于“{selectedDebate}”的详细分析</Text>}
                          style={{ backgroundColor: '#e6f7ff', border: '1px solid #91d5ff' }}
                      >
                          <List
                              dataSource={detailedViewpoints}
                              renderItem={(view) => (
                                  <List.Item style={{ padding: '8px 0' }}>
                                      <div style={{ width: '100%' }}>
                                          <Tag color="blue" style={{ marginBottom: '4px' }}>{view.side}</Tag>
                                          <Paragraph style={{ margin: 0 }}>{view.text}</Paragraph>
                                          {view.evidence && (
                                              <Paragraph type="secondary" style={{ fontSize: '12px', marginTop: '4px', paddingLeft: '8px', borderLeft: '2px solid #ccc' }}>
                                                  <strong>证据:</strong> {view.evidence}
                                              </Paragraph>
                                          )}
                                      </div>
                                  </List.Item>
                              )}
                          />
                      </Card>
                  </>
              )}
                
                {showFullDiscussion && (
                     <Card
                        variant="bordered"
                        style={{ marginTop: '16px', borderStyle: "dashed", background: "#fafafa", height: '85vh', display: 'flex', flexDirection: 'column', textAlign: 'left' }}
                        styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 } }}
                    >
                        {isDiscussionHtmlLoading ? (
                             <div style={{textAlign: 'center', padding: 48}}><Spin tip="讨论页原文加载中..."/></div>
                        ) : discussionHtmlContent ? (
                            <>
                                <div style={{ flexShrink: 0, marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Title level={5} style={{ margin: 0 }}>
                                      <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(discussionHtmlContent.title || '') }} />
                                    </Title>
                                    {discussionHtmlContent.url && <Button icon={<LinkOutlined />} href={discussionHtmlContent.url} target="_blank" rel="noopener noreferrer">在维基百科中查看</Button>}
                                </div>
                                <Row gutter={24} style={{ flex: 1, minHeight: 0 }}>
                                    <Col span={6} style={{ height: '100%' }}>
                                        <div style={{ height: '100%', border: '1px solid #f0f0f0', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column' }}>
                                            <Title level={5} style={{ marginTop: 0, flexShrink: 0 }}>目录</Title>
                                            <div style={{ overflowY: 'auto', flex: 1 }}>
                                                {(menuItems && menuItems.length > 0) ? (
                                                    <Menu mode="inline" items={menuItems} style={{ borderRight: 0, background: 'transparent' }} />
                                                ) : <Empty description='暂无目录' image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                                            </div>
                                        </div>
                                    </Col>
                                    <Col span={18} style={{ height: '100%' }}>
                                        <div ref={contentRef} style={{ height: '100%', overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: '8px', padding: '16px', position: 'relative' }}>
                                            {(discussionHtmlContent.content && discussionHtmlContent.content.length > 0) ? (
                                                discussionHtmlContent.content.map((section) => (
                                                    <div key={section.id} id={section.id}>
                                                        <Title level={Math.min(section.level + 2, 5)} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: '8px', marginTop: 24 }}>
                                                            {section.title}
                                                        </Title>
                                                        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(section.html_content || '') }} />
                                                    </div>
                                                ))
                                            ) : <Empty description="暂无正文内容" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                                        </div>
                                    </Col>
                                </Row>
                             </>
                        ) : (
                             <Empty description="未能加载讨论页内容" />
                        )}
                    </Card>
                )}

                {selectedDebate && detailedViewpoints.length === 0 && !loading && (
                    <>
                        <Divider dashed style={{ margin: "8px 0" }} />
                        <div style={{ backgroundColor: '#fff7e6', padding: '12px', borderRadius: '6px', border: '1px solid #ffd591', textAlign: 'center' }}>
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


function SourcesComparisonCard({ data, onRefresh, isLoading, onShuffle, isShuffling }) {
  const [showReferences, setShowReferences] = useState(false);
  const { Paragraph, Title, Text } = Typography; 

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
    <Card size="small" variant="bordered" style={{ borderStyle: "dashed" }}>
      <Space direction="vertical" style={{ width: "100%" }} size="middle">

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ textAlign: 'left' }}>
            <Text strong>多史料片段对读</Text>
          </div>
          
          <Space>
            <Button
              type="primary"
              size="small"
              ghost
              onClick={onShuffle}      
              loading={isShuffling}   
            >
              更换一组
            </Button>

            <Button
              type="primary"
              size="small"
              onClick={onRefresh}       
              loading={isLoading}       
              icon={<i className="anticon"><svg viewBox="64 64 896 896" focusable="false" data-icon="sync" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M913.2 210.3l-50.8-31.7c-3.1-1.9-7.2-1.9-10.2 0l-50.8 31.7c-3.1 1.9-4.1 5.9-2.2 9l50.8 81.1c1.9 3.1 5.9 4.1 9 2.2l50.8-31.7c3.1-1.9 4.1-5.9 2.2-9l-50.8-81.1zM512 1024c-282.8 0-512-229.2-512-512S229.2 0 512 0s512 229.2 512 512-229.2 512-512 512zm0-896c-229.7 0-416 186.3-416 416s186.3 416 416 416 416-186.3 416-416-186.3-416-416-416z"></path><path d="M790.2 320.8c-3.1-1.9-7.2-1.9-10.2 0l-50.8 31.7c-3.1 1.9-4.1 5.9-2.2 9l50.8 81.1c1.9 3.1 5.9 4.1 9 2.2l50.8-31.7c3.1-1.9 4.1-5.9 2.2-9l-50.8-81.1zM342.1 790.2c-3.1-1.9-7.2-1.9-10.2 0l-50.8 31.7c-3.1 1.9-4.1 5.9-2.2 9l50.8 81.1c1.9 3.1 5.9 4.1 9 2.2l50.8-31.7c3.1-1.9 4.1-5.9 2.2-9l-50.8-81.1z"></path></svg></i>}
            >
              更新列表
            </Button>
            
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
          </Space>
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
                <List.Item key={index} style={{padding: '8px 0', textAlign: 'left'}}>
                  <List.Item.Meta
                    title={<a href={item.url} target="_blank" rel="noopener noreferrer" style={{fontSize: '13px'}}>{item.title || item.url}</a>}
                    description={`来源: ${getHostname(item.url)}`}
                  />
                  <Paragraph style={{fontSize: '12px', margin: 0, textAlign: 'left'}}>
                    {item.content ? `${item.content.substring(0, 150)}...` : (item.message || '内容抓取失败或为空。')}
                  </Paragraph>
                </List.Item>
              )}
            />
          </div>
        )}

        {showReferences && <Divider dashed style={{margin: '8px 0'}} />}

        {isEmpty ? (
          <Empty description="本次未能找到可供对比的史料，请更新列表重试" />
        ) : (
          sources.map((source, index) => (
            <div key={index} style={{ textAlign: 'left' }}>
              <Title level={5} style={{ marginTop: 0, marginBottom: 8, textAlign: 'left' }}>
                史料{index + 1}：{source.title}
              </Title>
              <Paragraph type="secondary" style={{ marginBottom: 8, fontSize: '12px', textAlign: 'left'}}>
                视角：{source.viewpoint}
              </Paragraph>
              <div style={{ padding: '8px 12px', border: '1px solid #f0f0f0', borderRadius: 6, backgroundColor: '#fafafa',textAlign: 'left' }}>
                <Paragraph style={{ marginBottom: 0 }}>
                  {source.snippet}
                </Paragraph>
              </div>
              <a href={source.url} target="_blank" rel="noopener noreferrer" style={{fontSize: '12px', marginTop: '4px', display: 'inline-block' }}>
                查看原始链接
              </a>
            </div>
          ))
        )}
      </Space>
    </Card>
  );
}

// ▼▼▼ 11. 修改 EditableCard 签名，接收 addNodeToMap, setChatTrigger, setChatValue ▼▼▼
function EditableCard({ card, onChange, onDelete, topic, addNodeToMap, setChatTrigger, setChatValue }) {
  const { isListening, startListening } = useSpeechRecognition(
    (transcript) => {
      const newContent = card.content ? `${card.content}\n${transcript}` : transcript;
      onChange(card.id, 'content', newContent);
      message.success('语音输入已完成');
    }
  );

  const [hints, setHints] = useState([]);
  const [isHintLoading, setIsHintLoading] = useState(false);
  const hintsFetched = useRef(false); 
  const [showHints, setShowHints] = useState(false);
  
  // ▼▼▼ 12. 为 Input 和 TextArea 添加状态和处理函数 ▼▼▼
  const [selectedText, setSelectedText] = useState('');

  const handleMenuOpen = (isOpen) => {
    if (isOpen) {
      // 从全局获取高亮的文本
      const text = window.getSelection().toString().trim();
      setSelectedText(text);
    }
  };

  // 菜单项 (用于 Input 和 TextArea)
  const cardMenuItems = [
    {
      key: 'add-to-map',
      label: '添加到论证图谱',
      onClick: () => {
        if (selectedText) {
          addNodeToMap(selectedText);
          message.success(`“${selectedText.substring(0, 10)}...”已添加到图谱`);
        } else {
          message.warning('没有选中文本');
        }
      },
    },
    {
      key: 'ask-ai',
      label: '问问AI这段内容...',
      onClick: () => {
        if (selectedText) {
          setChatValue(`针对“${selectedText}”我想问：`);
          setChatTrigger('针对选中内容提问'); // 触发 CoreExplorer 中的聊天框
        } else {
          message.warning('没有选中文本');
        }
      }
    }
  ];

  // 菜单项 (用于 Hint Tags)
  const hintMenuItems = (hintText) => [
    {
      key: 'add-to-map',
      label: '添加到论证图谱',
      onClick: () => {
        addNodeToMap(hintText);
        message.success(`“${hintText.substring(0, 10)}...”已添加到图谱`);
      },
    },
    {
      key: 'ask-ai',
      label: '问问AI这段内容...',
      onClick: () => {
        setChatValue(`针对“${hintText}”我想问：`);
        setChatTrigger('针对选中内容提问'); // 触发 CoreExplorer 中的聊天框
      }
    }
  ];
  // ▲▲▲ 新增菜单逻辑结束 ▲▲▲


  const fetchHints = async () => {
    if (isHintLoading) return; 

    setIsHintLoading(true);
    try {
      const response = await getAIHints(topic, card.title);
      const fetchedHints = response.data.hints || [];
      setHints(fetchedHints);
      hintsFetched.current = true; 
    } catch (error) {
      console.error("Failed to fetch hints:", error);
      setHints(["获取提示失败"]);
    } finally {
      setIsHintLoading(false);
    }
  };

  const handleHintButtonClick = () => {
    const nextShowState = !showHints;
    setShowHints(nextShowState); 

    if (nextShowState && !hintsFetched.current) {
      fetchHints();
    }
  };
  
  const handleRefreshHints = (e) => {
    e.stopPropagation(); 
    fetchHints(); 
  };


  return (
    <Card
      size="small"
      style={{ width: '100%', marginBottom: 12, borderLeft: '3px solid #1677ff' }}
      styles={{ body: { padding: '12px' } }}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* ▼▼▼ 13. 包裹卡片标题 Input ▼▼▼ */}
          <Dropdown menu={{ items: cardMenuItems }} trigger={['contextMenu']} onOpenChange={handleMenuOpen}>
            <Input
              variant="borderless"
              value={card.title}
              onChange={(e) => onChange(card.id, 'title', e.target.value)}
              style={{ fontWeight: 'bold', fontSize: '16px', padding: 0, cursor: 'text' }}
            />
          </Dropdown>
          {/* ▲▲▲ 包裹结束 ▲▲▲ */}
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => onDelete(card.id)}
          />
        </div>
        
        {/* ▼▼▼ 14. 包裹 TextArea 及其容器 ▼▼▼ */}
        <Dropdown menu={{ items: cardMenuItems }} trigger={['contextMenu']} onOpenChange={handleMenuOpen}>
          <div style={{ position: 'relative', width: '100%' }}>
            <TextArea
              variant="filled"
              rows={3}
              value={card.content}
              onChange={(e) => onChange(card.id, 'content', e.target.value)}
              placeholder={card.placeholder || '请输入内容...'}
              style={{ cursor: 'text' }}
            />
            <Button
              type="text"
              icon={<AudioOutlined />}
              onClick={startListening}
              loading={isListening}
              style={{
                position: 'absolute',
                right: 8,
                bottom: 8,
                zIndex: 10,
                color: isListening ? '#1677ff' : 'rgba(0, 0, 0, 0.45)',
              }}
              title="点击开始语音输入"
            />
          </div>
        </Dropdown>
        {/* ▲▲▲ 包裹结束 ▲▲▲ */}


        <div style={{ width: '100%', marginTop: '4px', textAlign: 'left' }}>
          
          <Space> 
            <Button
              type="link"
              size="small"
              icon={<BulbOutlined />}
              onClick={handleHintButtonClick}
              style={{ paddingLeft: 0, color: 'rgba(0, 0, 0, 0.65)' }}
              loading={isHintLoading && !hintsFetched.current} 
            >
              {showHints ? '隐藏提示' : '思考提示'}
            </Button>
            
            {showHints && (
              <Button
                type="text"
                size="small"
                icon={<SyncOutlined />}
                onClick={handleRefreshHints}
                loading={isHintLoading && hintsFetched.current} 
                style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: '12px', marginLeft: '-8px' }}
                title="刷新提示"
              />
            )}
          </Space>

          {showHints && (
            <div style={{ marginTop: '8px' }}>
              {isHintLoading ? (
                <div style={{ padding: '8px 0' }}>
                  <Spin size="small" />
                </div>
              ) : (
                <Space wrap>
                  {/* ▼▼▼ 15. 包裹 Hint Tags ▼▼▼ */}
                  {hints.map((hint, index) => (
                    <Dropdown 
                      menu={{ items: hintMenuItems(hint) }} // 使用特定于 hint 的菜单
                      trigger={['contextMenu']} 
                      key={index}
                    >
                      <Tag color="blue" style={{ cursor: 'pointer' }}>
                        {hint}
                      </Tag>
                    </Dropdown>
                  ))}
                  {/* ▲▲▲ 包裹结束 ▲▲▲ */}
                </Space>
              )}
            </div>
          )}
        </div>
      </Space>
    </Card>
  );
}

// 16. 修改 HistoricalCriticalThinkingSection 签名，接收并传递 addNodeToMap 和 setChatValue
function HistoricalCriticalThinkingSection({ 
  questProgress, 
  onCompleteAllTasks,
  cards,
  setCards,
  topic,
  initialCards,
  setChatTrigger, 
  addNodeToMap, 
  setChatValue, 
  setNodes, // <-- 【新增】接收 setNodes
  setEdges, // <-- 【新增】接收 setEdges
}) {
  const { message } = AntdApp.useApp();

  useEffect(() => {
    setCards(initialCards.map(c => ({ ...c, content: '' })));
  }, [topic, setCards, initialCards]);

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
历史批判思维训练
==================

${content.trim()}
    `;

    const blob = new Blob([fullContent.trim()], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${topic}-历史批判思维训练.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('已导出为 TXT 文件！');
  };

  const handleSave = () => {
    
    // ▼▼▼ 【核心修改】在这里执行清除操作 ▼▼▼
    setNodes(currentNodes => 
        currentNodes.filter(node => 
            // 保留所有“非”卡片节点（即保留核心节点和手动添加的节点）
            !node.id.startsWith('card-node-')
        )
    );
    setEdges(currentEdges =>
        currentEdges.filter(edge =>
            // 保留所有“非”卡片连线
            !edge.id.startsWith('edge-to-card-node-')
        )
    );
    // ▲▲▲ 修改结束 ▲▲▲

    message.success('内容已保存，旧图谱卡片已清除！'); // 修改提示信息
    
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
## 研究主题：${topic}
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
    link.download = `${topic}-历史批判思维调查报告.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onCompleteAllTasks && onCompleteAllTasks();
    message.success('🎉 历史批判思维调查报告已生成！恭喜你完成了批判性思维训练！');
  };

  return (
    <Card size="small" variant="bordered"  style={{ borderStyle: 'dashed' }}>
      <Space direction="vertical" style={{ width: '100%', textAlign: 'left' }} size="middle">
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Paragraph type="secondary" style={{ flex: 1, margin: 0 }}>
            请运用批判性思维，形成您对历史事件的独特视角和判断。通过深度思考，培养历史批判思维能力，最终完成一份具有独立思考的历史调查报告。您可以自由编辑、增加或删除下方的思考卡片。
          </Paragraph>
          <Button
            type="primary"
            ghost
            size="small"
            icon={<MessageOutlined />}
            onClick={() => setChatTrigger('任务四：历史批判思维训练')} 
            style={{ marginLeft: 16 }}
          >
            AI引导
          </Button>
        </div>

        {cards.map(card => (
          <EditableCard
            key={card.id}
            card={card}
            onChange={handleCardChange}
            onDelete={handleDeleteCard}
            topic={topic}
            // ▼▼▼ 17. 传递 props 到 EditableCard ▼▼▼
            addNodeToMap={addNodeToMap}
            setChatTrigger={setChatTrigger}
            setChatValue={setChatValue}
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

// 18. 修改 AIChatDock 签名，接收 chatValue 和 setChatValue
function AIChatDock({ topic, addNodeToMap, currentModule, aiContext, open, setOpen, chatValue, setChatValue, questProgress, completeTask,msgs, setMsgs }) {
    const CONTENT_PADDING = 24;
    const SIDER_WIDTH_PERCENT = '35%';
    const RIGHT_OFFSET = `calc(${SIDER_WIDTH_PERCENT} + ${CONTENT_PADDING}px)`;

    const [drawerHeight, setDrawerHeight] = useState(360);
    const isResizing = useRef(false);
    const messagesEndRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const { message } = AntdApp.useApp();
    const [selectedMenuText, setSelectedMenuText] = useState('');

    const { isListening, startListening } = useSpeechRecognition(
      (transcript) => {
        setChatValue(prev => prev + transcript);
      }
    );

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
        setChatValue(''); // 清空提升后的状态
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
                        placeholder={isListening ? "正在聆听..." : (loading ? "AI正在思考..." : "输入你的想法/问题，Enter 发送 (Shift+Enter换行)")}
                        value={chatValue} // 19. 使用提升后的 chatValue
                        onChange={(e) => setChatValue(e.target.value)} // 20. 使用提升后的 setChatValue
                        onPressEnter={(e) => {
                            if (!e.shiftKey && !loading) {
                              e.preventDefault();
                              send();
                            }
                        }}
                        disabled={loading || isListening}
                        autoSize={{ minRows: 1, maxRows: 5 }}
                    />
                     <Button
                        icon={<AudioOutlined />}
                        onClick={startListening}
                        loading={isListening}
                        disabled={loading}
                        title="点击开始语音输入"
                     />
                     <Button type="primary" onClick={send} loading={loading}>发送</Button>
                 </Space.Compact>

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

// 21. 修改 NotesWorkspace 签名，接收并传递 addNodeToMap 和 setChatValue
function NotesWorkspace({
  topic,
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  addNodeToMap, // 接收
  setNodes,
  setEdges,
  questProgress,
  onCompleteAllTasks,
  cards, 
  setCards, 
  initialCards, 
  setChatTrigger,
  setChatValue, // 接收
}) {

  const items = [
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
        cards={cards}
        setCards={setCards}
        topic={topic}
        initialCards={initialCards} 
        setChatTrigger={setChatTrigger}
        addNodeToMap={addNodeToMap} // 传递
        setChatValue={setChatValue} // 传递
        setNodes={setNodes} // <-- 【新增】把 setNodes 传进去
        setEdges={setEdges} // <-- 【新增】把 setEdges 传进去
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
            setNodes={setNodes}
            setEdges={setEdges}
            cards={cards} 
            topic={topic}
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
      <Text type="secondary">支持历史批判思维训练、论证图谱</Text>
      <Tabs defaultActiveKey="causality" items={items} forceRender />
    </Space>
  );
}