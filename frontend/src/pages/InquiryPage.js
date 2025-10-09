// src/pages/InquiryPage.js

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
} from '@ant-design/icons';
import { getWikiData, getViewpointAnalysis, postChatMessageStream, getSourcesComparison, getWikiHtmlContent, getDiscussionDetails, getWikiPreview, getWikiDiscussionHtmlContent} from '../api';
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
                                4. <strong>因果链分析</strong> - 形成你的历史判断
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

function CoreExplorer({ topic, setTopic,addNodeToMap, questProgress, setQuestProgress }) {
  const [msgs, setMsgs] = useState([
        { role: 'ai', text: '🏛️ 欢迎，历史探索者！我是你的AI导师助手。让我们开始这次激动人心的历史调查之旅吧！\n\n你的任务是完成四个维度的探索，最终形成一份完整的历史调查报告。准备好开始了吗？' },
    ]);
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
  const [chatValue, setChatValue] = useState('');
  const [activeModule, setActiveModule] = useState(null);
  const [showChatDrawer, setShowChatDrawer] = useState(false);
  const [initialAiPrompt, setInitialAiPrompt] = useState('');
  const [chatTaskType, setChatTaskType] = useState('');
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

      getViewpointAnalysis(topic).then(res => {
        setCoreData(prev => ({ ...prev, viewpoints: res.data }));
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
        setQuestProgress(prev => ({
          ...prev,
          moduleStates: {
            ...prev.moduleStates,
            '史料分析': 'active',
            '历史批判思维训练': 'active'
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

  const handleActivateModule = async (moduleName) => {
    if (activeModule === moduleName || loadingStates.summary || loadingStates.viewpoints || loadingStates.sources) {
        setChatOpen(true);
        return;
    }
    setCurrentModule(moduleName);
    setChatOpen(true);
    setActiveModule(moduleName);

    const welcomeMessages = {
        '任务一：史实认知': '我们已进入【史实认知】模块。请先阅读上方的摘要和时间线，然后可以点击“智能阅读”深入探索原文。准备好后，我们就可以开始提问式学习了。',
        '任务二：观点辨析': '现在是【观点辨析】模块。这里列出了关于此事件的不同阵营作用和主要争议点，让我们一同分析其来源与立场。',
        '任务三：史料分析': '欢迎来到【史料分析】模块。这里展示了从不同来源搜集到的史料片段，我将协助您进行对比与质询。',
    };

    const welcomeText = welcomeMessages[moduleName] || `已激活【${moduleName}】模块。`;
    const moduleWelcomeMessage = { role: 'ai', text: welcomeText, };
    setMsgs(prevMsgs => [...prevMsgs, moduleWelcomeMessage]);

    let taskType = '';
    let context = '';
    let aiPrompt = '';

    switch (moduleName) {
      case '任务一：史实认知':
        taskType = '史实认知';
        const htmlContent = await ensureFullContentFetched();
        if (htmlContent && htmlContent.content) {
          const plainText = htmlContent.content.map(section => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = DOMPurify.sanitize(section.html_content || '');
            return `${section.title}\n${tempDiv.textContent || tempDiv.innerText || ''}`;
          }).join('\n\n');
          context = `维基百科正文内容:\n${plainText}`;
          aiPrompt = '你现在正在指导学生完成"史实认知"任务。请利用苏格拉底教育法，通过提问，一步一步帮助学生建立历史事件的基本框架，包括时间线、关键人物、主要事件等。当学生完成学习后，请询问他们是否已经理解并准备好进入下一个任务。';
        } else {
          context = `维基百科摘要:\n${coreData.wikiSummary?.summary || ''}`;
          aiPrompt = '由于原文加载失败，我们先基于摘要进行学习。请根据以上摘要，提出你的第一个问题。';
        }
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
      default:
        context = '';
        aiPrompt = '';
    }
    setAiContext(context);
    setShowChatDrawer(true);
    setInitialAiPrompt(aiPrompt);
    setChatTaskType(taskType);
    if (questProgress.moduleStates[taskType] === 'completed') {
      message.info(`✅ 【${moduleName}】已完成！你可以继续学习或进入下一个任务。`);
    } else {
      message.info(`🎯 AI 引导已切换到【${moduleName}】模块`);
    }

    setAiContext(`${aiPrompt}\n\n学习材料:\n${context}`);
  };

  const completeTask = (taskType) => {
    setQuestProgress(prev => {
      const newCompletedModules = [...prev.completedModules, taskType];
      const newModuleStates = {
        ...prev.moduleStates,
        [taskType]: 'completed'
      };
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

    const badgeMessages = {
      '史实认知': '🎉 恭喜！你已完成"史实认知"任务，获得"历史记录员"徽章！',
      '观点辨析': '🎉 恭喜！你已完成"观点辨析"任务，获得"辩论大师"徽章！',
      '史料分析': '🎉 恭喜！你已完成"史料分析"任务，获得"证据收集者"徽章！',
      '历史批判思维训练': '🎉 恭喜！你已完成"历史批判思维训练"任务，获得"历史批判思想家"徽章！'
    };
    message.success(badgeMessages[taskType]);
  };

  useEffect(() => {
    if (questProgress.completedModules.length === questProgress.totalTasks) {
      message.success('🎉 恭喜！你已完成所有探索任务！现在可以生成最终的历史调查报告了！');
      setQuestProgress(prev => ({
        ...prev,
        achievements: [...prev.achievements, '历史探索大师']
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
                    <WikiSummaryCard
                      data={coreData.wikiSummary}
                      setTopic={setTopic}
                      topic={topic}
                      fullHtmlContent={fullHtmlContent}
                      isFullContentLoading={isFullContentLoading}
                      ensureFullContentFetched={ensureFullContentFetched}
                    />
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

function WikiSummaryCard({ data, topic, fullHtmlContent, isFullContentLoading, ensureFullContentFetched }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef(null);
  const { message } = AntdApp.useApp();

  const [popover, setPopover] = useState({ visible: false, content: null, title: '', top: 0, left: 0 });
  const hideTimer = useRef(null);
  const currentTargetRef = useRef(null);
  const summaryCache = useRef(new Map()).current;

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(-1);
  const [timelineItems, setTimelineItems] = useState([]);

  useEffect(() => {
    if (data && data.timeline) {
      setTimelineItems(data.timeline.map((item, index) => ({ ...item, id: `timeline-${index}` })));
    }
  }, [data]);

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
  const handleTimelineChange = (id, field, value) => { setTimelineItems(items => items.map(item => item.id === id ? { ...item, [field]: value } : item)); };
  const handleAddTimelineItem = () => { setTimelineItems(items => [...items, { id: `timeline-new-${Date.now()}`, year: '', event: '' }]); };
  const handleDeleteTimelineItem = (id) => { setTimelineItems(items => items.filter(item => item.id !== id)); };
  const handleSaveNotes = () => { message.success('笔记已保存！(模拟)'); };
  const handleExport = () => { if (timelineItems.length === 0) { message.warning('没有可导出的时间线内容。'); return; } const content = timelineItems.map(item => `${item.year}: ${item.event}`).join('\n'); const blob = new Blob([content], { type: 'text/plain;charset=utf-8' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${topic || '未命名主题'}-时间线.txt`; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(link.href); message.success('时间线已导出为 .txt 文件！'); };
  const handleClearTimeline = () => { Modal.confirm({ title: '您确定要清空所有时间线吗？', icon: <ExclamationCircleFilled />, content: '这个操作无法撤销。', okText: '确认清空', okType: 'danger', cancelText: '取消', onOk() { setTimelineItems([]); message.info('时间线已清空。'); }, }); };

  const toggleExpand = useCallback(async () => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);
    if (nextState && !fullHtmlContent) {
      await ensureFullContentFetched();
    }
    setSearchTerm('');
    setSearchResults([]);
    setCurrentResultIndex(-1);
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
    const sanitizedSections = fullHtmlContent.content.map(section => ({
      ...section,
      html_content: DOMPurify.sanitize(section.html_content || '')
    }));
    if (!searchTerm) {
      return sanitizedSections;
    }
    try {
      const safeRegex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      return sanitizedSections.map(section => {
        const placeholders = [];
        let placeholderId = 0;
        let cleanHtml = section.html_content.replace(/<span class="search-highlight[^"]*">(.*?)<\/span>/gi, '$1');
        const textOnly = cleanHtml.replace(/<[^>]*>/g, (match) => {
          placeholders.push(match);
          return `__HTML_PLACEHOLDER_${placeholderId++}__`;
        });
        const highlightedText = textOnly.replace(safeRegex, (match, offset) => {
          return `<span class="search-highlight" data-offset="${offset}">${match}</span>`;
        });
        let finalHtml = highlightedText;
        for (let i = 0; i < placeholders.length; i++) {
          finalHtml = finalHtml.replace(`__HTML_PLACEHOLDER_${i}__`, placeholders[i]);
        }
        return { ...section, html_content: finalHtml };
      });
    } catch (e) {
      console.error("高亮处理失败:", e);
      return sanitizedSections;
    }
  }, [searchTerm, fullHtmlContent, isExpanded]);

  useLayoutEffect(() => {
    if (searchResults.length > 0 && currentResultIndex >= 0) {
      searchResults.forEach(el => el.classList.remove('search-highlight-active'));
      const currentElement = searchResults[currentResultIndex];
      if (currentElement) {
        currentElement.classList.add('search-highlight-active');
        currentElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
    }
  }, [currentResultIndex, searchResults]);

  const handleSearchExecution = (value) => {
    const term = value.trim();
    setSearchTerm(term);
    setCurrentResultIndex(-1);
    setSearchResults([]);

    if (!term) {
      return;
    }

    setTimeout(() => {
      if (contentRef.current) {
        const results = Array.from(contentRef.current.querySelectorAll('.search-highlight'));
        setSearchResults(results);
        if (results.length > 0) {
          setCurrentResultIndex(0);
          message.success(`找到了 ${results.length} 个匹配项。`);
        } else {
          message.info('在正文中未找到匹配项。');
        }
      }
    }, 100);
  };

  const handleNavigateResult = (direction) => {
    if (searchResults.length === 0) return;
    setCurrentResultIndex(prevIndex => {
      const newIndex = prevIndex + direction;
      if (newIndex >= searchResults.length) return 0;
      if (newIndex < 0) return searchResults.length - 1;
      return newIndex;
    });
  };

  const handleSearchChange = (e) => {
    if (e.target.value.trim() === '') {
      setSearchTerm('');
      setSearchResults([]);
      setCurrentResultIndex(-1);
    }
  };

  const menuItems = buildTree(fullHtmlContent?.content);
  const aiSummary = data?.summary || "暂无AI摘要";

  return (
    <>
      <style>{`
        .search-highlight { background-color: yellow; transition: background-color 0.3s ease; }
        .search-highlight-active { background-color: orange; color: white; border-radius: 3px; }
      `}</style>

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
          <div style={{ flexShrink: 0, marginBottom: '16px' }}>
            <Space.Compact style={{ width: '100%' }}>
              <Input.Search
                placeholder="在正文中搜索..."
                allowClear
                onSearch={handleSearchExecution}
                onChange={handleSearchChange}
                enterButton="搜索"
              />
              {searchResults.length > 0 && (
                <Space.Compact>
                  <Button disabled style={{minWidth: 70, color: 'rgba(0,0,0,0.88)'}}>{currentResultIndex + 1} / {searchResults.length}</Button>
                  <Button icon={<UpOutlined />} onClick={() => handleNavigateResult(-1)} />
                  <Button icon={<DownOutlined />} onClick={() => handleNavigateResult(1)} />
                </Space.Compact>
              )}
              {fullHtmlContent.url && <Button icon={<LinkOutlined />} href={fullHtmlContent.url} target="_blank" rel="noopener noreferrer">查看原文</Button>}
            </Space.Compact>
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
                      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(section.html_content || '') }} />
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
          <Text strong>关键时间线</Text>
          <Space>
            <Button icon={<SaveOutlined />} size="small" onClick={handleSaveNotes}>保存</Button>
            <Button icon={<DownloadOutlined />} size="small" onClick={handleExport}>导出</Button>
            <Button icon={<ClearOutlined />} size="small" danger onClick={handleClearTimeline}>清空</Button>
          </Space>
        </div>
        <div style={{ border: '1px solid #f0f0f0', borderRadius: '8px', padding: '12px' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {timelineItems.length > 0 ? (
              timelineItems.map(item => ( <EditableTimelineItem key={item.id} item={item} onChange={handleTimelineChange} onDelete={handleDeleteTimelineItem}/> ))
            ) : ( <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="AI未能生成时间线，或您可以手动添加" /> )}
            <Button type="dashed" onClick={handleAddTimelineItem} block icon={<PlusOutlined />} style={{ marginTop: 8 }}>添加时间点</Button>
          </Space>
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
      <style>{`@keyframes fadeInScale { to { transform: scale(1); opacity: 1; } }`}</style>
    </>
  );
}

function FactionRolesDisplay({ rolesData }) {
    if (!rolesData || rolesData.length === 0) {
        return null;
    }

    return (
        <div style={{ marginBottom: 16 }}>
            <div style={{ textAlign: 'left' }}>
              <Text strong>不同阵营在此事件中的作用分析</Text>
            </div>
            <div style={{ marginTop: 8 }}>
                {rolesData.map(faction => (
                    <div key={faction.faction_name} style={{ backgroundColor: '#fafafa', padding: '12px', borderRadius: '6px', marginBottom: '12px',textAlign: 'left' }}>
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
    const [discussionHtmlContent, setDiscussionHtmlContent] = useState(null);
    const [isDiscussionHtmlLoading, setIsDiscussionHtmlLoading] = useState(false);
    const contentRef = useRef(null);

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
        } catch (error) {
            console.error('获取讨论详情失败:', error);
            message.error('获取讨论详情失败，请稍后重试');
            setDetailedViewpoints([]);
        } finally {
            setLoading(false);
        }
    };

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
    
    // --- ▼▼▼ 核心修改 1：替换为与模块一相同的 handleScrollTo 函数 ▼▼▼ ---
    const handleScrollTo = (key) => {
        const element = document.getElementById(key); // `key` 直接就是章节的 id
        if (element && contentRef.current) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // --- ▼▼▼ 核心修改 2：替换为与模块一相同的 buildTree 函数 ▼▼▼ ---
    const buildTree = (list) => {
        if (!list || list.length === 0) return [];
        const mapToMenuItems = (nodes) => nodes.map(node => {
          const hasChildren = node.children && node.children.length > 0;
          // 注意：我们将 onClick 事件直接绑定在 span 上
          const label = (
            <span onClick={(e) => { e.stopPropagation(); handleScrollTo(node.id); }}>
              {node.title}
            </span>
          );
          const menuItem = { 
            key: node.id, // 使用章节的 id 作为 key
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

    // --- ▼▼▼ 核心修改 3：让目录数据源于 content 数组，与模块一保持一致 ▼▼▼ ---
    const menuItems = buildTree(discussionHtmlContent?.content);

    return (
        <Card size="small" variant="bordered" style={{ borderStyle: "dashed", textAlign: 'left' }}>
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
                                loading={isDiscussionHtmlLoading}
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
                                <Tag color={selectedDebate === debateItem ? "processing" : "default"}>{index + 1}</Tag>
                                <Text style={{ flex: 1 }}>{debateItem}</Text>
                                {selectedDebate === debateItem && loading && <Spin size="small" />}
                            </Space>
                        </List.Item>
                    )}
                />
                
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
                                                {/* --- ▼▼▼ 核心修改 4：移除 Menu 上的 onClick ▼▼▼ --- */}
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
    <Card size="small" variant="bordered" style={{ borderStyle: "dashed" }}>
      <Space direction="vertical" style={{ width: "100%" }} size="middle">

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ textAlign: 'left' }}>
            <Text strong>多史料片段对读</Text>
          </div>
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
          <Empty description="未能找到可供对比的史料" />
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

function EditableCard({ card, onChange, onDelete }) {
  const { isListening, startListening } = useSpeechRecognition(
    (transcript) => {
      const newContent = card.content ? `${card.content}\n${transcript}` : transcript;
      onChange(card.id, 'content', newContent);
      message.success('语音输入已完成');
    }
  );

  return (
    <Card
      size="small"
      style={{ width: '100%', marginBottom: 12, borderLeft: '3px solid #1677ff' }}
      styles={{ body: { padding: '12px' } }}
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
        <div style={{ position: 'relative', width: '100%' }}>
          <TextArea
            variant="filled"
            rows={3}
            value={card.content}
            onChange={(e) => onChange(card.id, 'content', e.target.value)}
            placeholder={card.placeholder || '请输入内容...'}
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
      </Space>
    </Card>
  );
}

function HistoricalCriticalThinkingSection({ questProgress, onCompleteAllTasks }) {
  const initialCards = [
    { id: 1, title: '我的历史视角', content: '', placeholder: '基于前面的学习，请简述您对该历史事件形成的整体看法和判断。' },
    { id: 2, title: '事件的直接原因', content: '', placeholder: '分析并列出导致该事件发生的直接因素或导火索是什么？' },
    { id: 3, title: '事件的深层原因', content: '', placeholder: '探讨事件背后更深层次的政治、经济、社会或文化原因。' },
    { id: 4, title: '触发事件', content: '', placeholder: '是哪个具体的事件或行动最终引爆了整个事态？' },
    { id: 5, title: '历史影响', content: '', placeholder: '该事件对当时及后来的历史发展产生了哪些短期和长期的影响？' },
    { id: 6, title: '历史意义反思', content: '', placeholder: '这个事件在历史长河中的真正意义是什么？对今天有什么启示？' },
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
    <Card size="small" variant="bordered"  style={{ borderStyle: 'dashed' }}>
      <Space direction="vertical" style={{ width: '100%', textAlign: 'left' }} size="middle">
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
                        placeholder={isListening ? "正在聆听..." : (loading ? "AI正在思考..." : "输入你的想法/问题，Enter 发送 (Shift+Enter换行)")}
                        value={chatValue}
                        onChange={(e) => setChatValue(e.target.value)}
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
      <Text type="secondary">支持历史批判思维训练、论证图谱</Text>
      <Tabs defaultActiveKey="note" items={items} />
    </Space>
  );
}