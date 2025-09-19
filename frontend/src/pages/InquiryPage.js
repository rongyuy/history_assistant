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
  Checkbox,
  App as AntdApp, 
  message,
  Modal,
  Spin, 
} from 'antd';
import {
  BookOutlined,
  BulbOutlined,
  MessageOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  OrderedListOutlined,
  ApartmentOutlined,
} from '@ant-design/icons';
import { getWikiData, getViewpointAnalysis, postChatMessageStream, getSourcesComparison, getWikiFullContent, getStructuredOutline, getDiscussionDetails } from '../api';
import ArgumentMap from '../ArgumentMap'

const { Header, Sider, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;


export default function InquiryPage() {
  // --- 核心修改点 1: topic 初始状态为空 ---
  const [topic, setTopic] = useState('');
  // --- 核心修改点 2: inputValue 用于受控输入框 ---
  const [inputValue, setInputValue] = useState('');

  // ... (其他状态保持不变)
  const [savedConclusion, setSavedConclusion] = useState(''); 
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

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

  // --- 核心修改点 3: 正确的 handleSearch 函数 ---
  const handleSearch = () => {
    if (inputValue && inputValue.trim()) {
        setTopic(inputValue.trim());
    } else {
        message.warning('请输入一个有效的主题。');
    }
  };

  // --- 核心修改点 4: 提供一个清空函数 ---
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
          <Button type="primary" onClick={handleSearch} style={{ marginLeft: 8 }}>开始探究</Button>
          {/* 添加一个清空按钮，方便重新开始 */}
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
            {/* 只有在有主题时才渲染核心区域，否则显示欢迎页 */}
            {topic ? (
              <CoreExplorer topic={topic} onSaveConclusion={setSavedConclusion} addNodeToMap={addNodeToMap} />
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
              savedConclusion={savedConclusion}
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              addBlankNode={addBlankNode}
              setNodes={setNodes}
              setEdges={setEdges}
            />
          </Sider>
        </Layout>

        <FloatButton.BackTop />
      </Layout>
    </AntdApp>
  );
}

// 新增：一个简单的欢迎/引导组件
function WelcomePage() {
    return (
        <div style={{ textAlign: 'center', paddingTop: '10vh' }}>
            <Empty
                image={<BookOutlined style={{ fontSize: 64, color: '#1677ff' }} />}
                imageStyle={{ height: 80 }}
                description={
                    <>
                        <Title level={3}>欢迎来到历史探究学习平台</Title>
                        <Paragraph type="secondary">
                            请在上方输入您感兴趣的历史主题（例如：“西安事变”），然后点击“开始探究”按钮，开启您的学习之旅。
                        </Paragraph>
                    </>
                }
            />
        </div>
    );
}

/** * 左侧 65%：核心探究区
 */
function CoreExplorer({ topic, onSaveConclusion, addNodeToMap }) {
  // 1. 使用对象来管理每个卡片的加载状态
  const [loadingStates, setLoadingStates] = useState({
    summary: true,
    viewpoints: true,
    sources: true,
  });

  // 这个 state 用于页面初次加载时的整体 Spin
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [coreData, setCoreData] = useState({
    wikiSummary: { summary: '', timeline: [] },
    viewpoints: { viewpoints: [], debates: [] },
    sources: { sources: [] },
    wikiFullContent: null,
  });

  // --- AI 聊天框相关状态 ---
  const [isChatOpen, setChatOpen] = useState(false);
  const [currentModule, setCurrentModule] = useState('模块一：史实认知');
  const [aiContext, setAiContext] = useState('');
  const [chatValue, setChatValue] = useState(''); // 用于从右键菜单预设问题

  // --- 右键菜单相关状态 ---
  const [selectedTextForMenu, setSelectedTextForMenu] = useState('');
  const [contextMenu, setContextMenu] = useState(null);

  const { message } = AntdApp.useApp();

  // 当菜单即将显示时，捕获当前选中的文本
  const handleMenuVisibleChange = (visible) => {
    if (visible) {
      const currentSelectedText = window.getSelection().toString().trim();
      setSelectedTextForMenu(currentSelectedText);
    }
  };
  
  // --- 融合后的菜单项 ---
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
            // 预设问题并打开AI聊天框
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
      // 开始时，重置所有卡片的加载状态为 true
      setLoadingStates({
        summary: true,
        viewpoints: true,
        sources: true,
      });
      // 重置数据结构，可以保留旧数据直到新数据返回，或者清空
      setCoreData({
        wikiSummary: { summary: '', timeline: [] },
        viewpoints: { viewpoints: [], debates: [] },
        sources: { sources: [] },
        wikiFullContent: null,
      });

      message.loading({ content: `正在为您准备关于“${topic}”的探究模块...`, key: 'data', duration: 1 });
      
      // 初始化完成后，立刻结束全局 loading，显示卡片骨架
      setInitialLoading(false);

      // --- 分别请求各个模块的数据 ---

      // 模块一：史实认知
      getWikiData(topic).then(res => {
        setCoreData(prev => ({ ...prev, wikiSummary: res.data }));
      }).catch(err => {
        console.error("模块一加载失败:", err);
        // 可以在这里设置错误状态
      }).finally(() => {
        // 无论成功或失败，都结束该模块的加载状态
        setLoadingStates(prev => ({ ...prev, summary: false }));
      });
      
      // 维基百科全文 (这个没有独立的卡片UI，所以不需要loading状态)
      getWikiFullContent(topic).then(res => {
        setCoreData(prev => ({ ...prev, wikiFullContent: res.data }));
        setAiContext(`维基百科正文内容:\n${res.data.content}`);
      }).catch(err => console.error("维基全文加载失败:", err));

      // 模块二：观点辨析
      getViewpointAnalysis(topic).then(res => {
        setCoreData(prev => ({ ...prev, viewpoints: res.data }));
      }).catch(err => {
        console.error("模块二加载失败:", err);
      }).finally(() => {
        setLoadingStates(prev => ({ ...prev, viewpoints: false }));
      });

      // 模块三：史料分析
      getSourcesComparison(topic).then(res => {
        setCoreData(prev => ({ ...prev, sources: res.data }));
      }).catch(err => {
        console.error("模块三加载失败:", err);
      }).finally(() => {
        setLoadingStates(prev => ({ ...prev, sources: false }));
      });
    };

    fetchData();
  }, [topic, message]);

  // 点击模块标题旁的"AI引导"按钮时触发
  const handleActivateModule = (moduleName) => {
    setCurrentModule(moduleName);
    setChatOpen(true);
    message.info(`AI 引导已切换到【${moduleName}】模块`);

    let context = '';
    switch (moduleName) {
      case '模块一：史实认知':
        context = `维基百科正文内容:\n${coreData.wikiFullContent.content}`;
        break;
      case '模块二：观点辨析':
        context = `对立观点:\n${coreData.viewpoints.viewpoints.map(vp => `${vp.side}: ${vp.text}`).join('\n\n')}\n\n讨论页要点:\n${coreData.viewpoints.debates.join('\n')}`;
        break;
      case '模块三：史料分析':
        context = `史料对比:\n${coreData.sources.sources.map(src => `标题: ${src.title}\n视角: ${src.viewpoint}\n片段: "${src.snippet}"`).join('\n\n---\n\n')}`;
        break;
      case '模块四：反思总结':
        context = '用户正在进行反思总结阶段。';
        break;
      default:
        context = '';
    }
    setAiContext(context);
  };

  // 3. 修改渲染逻辑
  if (initialLoading) {
    return <div style={{ textAlign: 'center', marginTop: 48 }}><Spin size="large" tip="正在初始化探究模块..." /></div>;
  }

  if (error) {
    return <div style={{ textAlign: 'center', marginTop: 48 }}><Text type="danger">{error}</Text></div>;
  }

  return (
    <div>
      <Dropdown
        menu={{ items: menuItems.filter(item => selectedTextForMenu || item.key !== 'ask-ai' && item.key !== 'add-to-map') }}
        trigger={['contextMenu']}
        onOpenChange={handleMenuVisibleChange}
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Title level={3} style={{ marginBottom: 0 }}>
            {topic}
          </Title>

          <Collapse
            bordered={false}
            defaultActiveKey={["facts", "views", "sources", "reflection"]}
            style={{ background: "transparent" }}
            items={[
              {
                key: "facts",
                label: <ModuleHeader icon={<BookOutlined />} title="模块一：史实认知" hint="维基百科摘要、关键时间线" onActivate={handleActivateModule} />,
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
                label: <ModuleHeader icon={<BulbOutlined />} title="模块二：观点辨析" hint="A/B 立场与讨论页观点" onActivate={handleActivateModule} />,
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
                label: <ModuleHeader icon={<BookOutlined />} title="模块三：史料分析" hint="多史料片段对读" onActivate={handleActivateModule} />,
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
              {
                key: "reflection",
                label: <ModuleHeader icon={<BulbOutlined />} title="模块四：反思总结" hint="引导用户回顾并形成结论" onActivate={handleActivateModule} />,
                children: <ReflectionSection onSaveReflection={onSaveConclusion} />,
              },
            ]}
          />
        </Space>
      </Dropdown>
      
      {/* 使用新的、从底部弹出的AI聊天组件 */}
      <AIChatDock
        topic={topic}
        addNodeToMap={addNodeToMap} // 传递交互函数
        currentModule={currentModule}
        aiContext={aiContext}
        open={isChatOpen}
        setOpen={setChatOpen}
        chatValue={chatValue}
        setChatValue={setChatValue}
      />
    </div>
  );
}

/** * 新版模块头，带 "AI 引导" 按钮 
 */
function ModuleHeader({ icon, title, hint, onActivate }) {
    const handleActivateClick = (e) => {
      e.stopPropagation(); 
      onActivate(title);
    }

  return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <Space>
            {icon}
            <Text strong>{title}</Text>
            <Tag color="default">{hint}</Tag>
        </Space>
        <Button
          type="text"
          size="small"
          icon={<MessageOutlined />}
          onClick={handleActivateClick}
        >
          AI引导
        </Button>
    </div>
  );
}

/** 史实了解 */
function WikiSummaryCard({ data, initialFullContent }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [fullContent, setFullContent] = useState(null);

    const handleToggleOriginal = () => {
        setIsExpanded(!isExpanded);
    };

    useEffect(() => {
        setFullContent(initialFullContent);
    }, [initialFullContent]);

    return (
        <Card
            size="small"
            bordered
            style={{
                borderStyle: "dashed",
                height: isExpanded ? 'auto' : 'auto', 
                minHeight: isExpanded ? '600px' : 'auto' 
            }}
        >
            <Space direction="vertical" style={{ width: "100%" }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Paragraph style={{ marginBottom: 0, flex: 1 }}>{data.summary || "暂无摘要"}</Paragraph>
                    <Button
                        type="link"
                        size="small"
                        onClick={handleToggleOriginal} // 逻辑保持不变
                        style={{ marginLeft: 8, flexShrink: 0 }}
                    >
                        {isExpanded ? '收起原文' : '阅读原文'}
                    </Button>
                </div>

                {isExpanded && fullContent && (
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
                                {fullContent.title}
                            </Title>
                            <div style={{
                                whiteSpace: 'pre-wrap',
                                fontSize: '13px',
                                lineHeight: '1.6',
                                color: '#495057'
                            }}>
                                {fullContent.content}
                            </div>
                            {fullContent.url && (
                                <div style={{ marginTop: 8, textAlign: 'right' }}>
                                    <a href={fullContent.url} target="_blank" rel="noopener noreferrer">
                                        在维基百科中查看完整页面
                                    </a>
                                </div>
                            )}
                        </div>
                    </>
                )}

                <Divider dashed style={{ margin: "8px 0" }} />

                <List
                    size="small"
                    header={<Text type="secondary">关键时间线</Text>}
                    bordered
                    dataSource={data.timeline}
                    renderItem={(it) => (
                        <List.Item>
                            <Space>
                                <Tag>{it.year}</Tag>
                                <Text>{it.event}</Text>
                            </Space>
                        </List.Item>
                    )}
                />
            </Space>
        </Card>
    );
}

  
/** 观点辨析 */
function ViewpointAnalysis({ data, topic }) {
    const [selectedDebate, setSelectedDebate] = useState(null);
    const [detailedViewpoints, setDetailedViewpoints] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showFullDiscussion, setShowFullDiscussion] = useState(false);

    const { message } = AntdApp.useApp();

    const handleDebateClick = async (debateItem) => {
        if (selectedDebate === debateItem) {
            // 如果点击的是已选中的项目，则取消选择
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
          {/* 维基讨论页摘录（要点） */}
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
          {/* 完整讨论页内容 */}
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

          {/* 详细观点分析 - 基于讨论页的多方观点 */}
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

          {/* 当没有找到相关观点时的提示 */}
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
  
/** 史料对比卡片 */
function SourcesComparisonCard({ data }) {
  const [showReferences, setShowReferences] = useState(false);
  const { Paragraph, Title } = Typography;

  // 从后端获取的数据现在应该同时包含 sources 和 references
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
        
        {/* --- 核心修改：创建一个和模块二风格一致的“标题栏” --- */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong>多史料片段对读</Text>
          <Button
            type="link" // 样式改为链接
            size="small"
            onClick={() => setShowReferences(!showReferences)}
            disabled={!references || references.length === 0}
            style={{ padding: 0 }} // 移除内边距，使其更像普通链接
            icon={<OrderedListOutlined />}
          >
            {showReferences ? '收起所有参考文献' : `查看所有参考文献 (${references.length})`}
          </Button>
        </div>
        
        {/* 2. 参考文献的展示框 (根据 showReferences 状态显示或隐藏) */}
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

        {/* 仅在展开参考文献时显示分割线，UI更整洁 */}
        {showReferences && <Divider dashed style={{margin: '8px 0'}} />}

        {/* 3. 史料对比布局 */}
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

  
/** 反思总结 */
function ReflectionSection({ onSaveReflection }) {
  const items = [
    '我能陈述冲突的直接起因与深层原因',
    '我能举出至少两条支持 A/B 观点的证据',
    '我能形成自己的判断并用证据支撑',
    '我能思考历史事件的意义、与当下的联系'
  ];

  const [reflections, setReflections] = useState(() =>
    items.reduce((acc, _, index) => {
      acc[index] = { checked: false, content: '' };
      return acc;
    }, {})
  );
  const [otherThoughts, setOtherThoughts] = useState('');

  const handleCheckChange = (index) => (e) => {
    const isChecked = e.target.checked;
    setReflections(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        checked: isChecked,
        content: isChecked ? prev[index].content : ''
      }
    }));
  };

  const handleContentChange = (index) => (e) => {
    setReflections(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        content: e.target.value
      }
    }));
  };

  const handleSave = () => {
    let conclusionText = '';
    items.forEach((label, index) => {
      if (reflections[index].checked) {
        conclusionText += `- ${label}\n`;
        if (reflections[index].content) {
          conclusionText += `  - ${reflections[index].content}\n`;
        }
      }
    });

    if (otherThoughts) {
      conclusionText += `\n其他思考：\n${otherThoughts}`;
    }
    onSaveReflection(conclusionText);
    message.success('反思内容已保存到笔记大纲！');
  };

  const handleClear = () => {
    const initialReflections = items.reduce((acc, _, index) => {
      acc[index] = { checked: false, content: '' };
      return acc;
    }, {});
    setReflections(initialReflections);
    setOtherThoughts('');
  };

  return (
    <Card size="small" bordered style={{ borderStyle: 'dashed' }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        {items.map((label, index) => (
          <div key={index}>
            <Checkbox
              checked={reflections[index]?.checked}
              onChange={handleCheckChange(index)}
            >
              {label}
            </Checkbox>
            {reflections[index]?.checked && (
              <div style={{ marginTop: 8, paddingLeft: 24 }}>
                <TextArea
                  rows={2}
                  placeholder={`请填写你对“${label}”的具体思考...`}
                  value={reflections[index]?.content}
                  onChange={handleContentChange(index)}
                />
              </div>
            )}
          </div>
        ))}

        <Divider dashed style={{ margin: '8px 0' }} />

        <Space direction="vertical" style={{ width: '100%' }}>
          <Text strong>其他思考</Text>
          <TextArea
            rows={4}
            placeholder="在这里自由地记录你的任何其他想法或疑问..."
            value={otherThoughts}
            onChange={(e) => setOtherThoughts(e.target.value)}
          />
        </Space>

        <Space style={{ marginTop: 8 }}>
          <Button type="primary" onClick={handleSave}>
            保存所有反思
          </Button>
          <Button onClick={handleClear}>
            清空
          </Button>
        </Space>
      </Space>
    </Card>
  );
}


/** * 底部 AI 引导 (融合修改版) 
 */
function AIChatDock({ topic, addNodeToMap, currentModule, aiContext, open, setOpen, chatValue, setChatValue }) {
    const CONTENT_PADDING = 24;
    const SIDER_WIDTH_PERCENT = '35%';
    const RIGHT_OFFSET = `calc(${SIDER_WIDTH_PERCENT} + ${CONTENT_PADDING}px)`;

    const [drawerHeight, setDrawerHeight] = useState(360);
    const isResizing = useRef(false);
    const messagesEndRef = useRef(null);

    const [msgs, setMsgs] = useState([
        { role: 'ai', text: '你好！在探究过程中有任何想法或疑问，都可以和我交流。' },
    ]);
    const [loading, setLoading] = useState(false);
    const { message } = AntdApp.useApp();

    // 使用 state 来暂存右键菜单选中的文本
    const [selectedMenuText, setSelectedMenuText] = useState('');

    // 为AI消息添加右键菜单项 (这个函数现在对AI和用户消息通用)
    const menuItemsForAIMessage = (fullText) => [
        {
            key: 'add-to-map',
            label: '添加到论证图谱',
            onClick: () => {
                // 优先使用暂存的选中文本，否则使用完整文本
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
    

    useEffect(() => {
      if (open) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }, [msgs, open]);

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
        // 先把用户消息和一条空的AI消息放进去
        const newMsgs = [...msgs, userMessage, { role: 'ai', text: '' }];
        setMsgs(newMsgs);
        setChatValue('');
        setLoading(true);

        const chatRequest = {
            history: newMsgs.slice(0, -1).map(m => ({ // 注意这里-1，不把空消息发给后端
                role: m.role === 'ai' ? 'assistant' : 'user',
                content: m.text
            })),
            topic: topic,
            current_module: currentModule,
            context_text: aiContext,
        };

        try {
            // **核心修改：调用新的流式API**
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
                                            {/* --- 这是为用户消息新增/修改的功能块 --- */}
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
            </div>
        </Drawer>
    );
}

/** 右侧 35%：笔记工作区 (与原文件相同) */
function NotesWorkspace({
  topic,
  savedConclusion,
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  addBlankNode,
  setNodes,
  setEdges
}) {
  const [outlineData, setOutlineData] = useState({
    topic: '',
    timeline: [],
    causality: [],
    figures: [],
    viewpoints: [],
    evidence: [],
    conclusion: '',
  });
  const [outlineLoading, setOutlineLoading] = useState(false);

  const { message } = AntdApp.useApp();

  const splitStringToArray = (str) => {
    return str ? str.split(/[\n;；]/).map(item => item.trim()).filter(item => item) : [];
  };

  const saveOutlineItem = (key, value) => {
    setOutlineData(prev => ({ ...prev, [key]: value }));
    message.success(`${key} 已保存！`);
  };

  const items = [
    {
      key: 'note',
      label: (
        <Space>
          <EditOutlined />
          自由笔记
        </Space>
      ),
      children: <FreeNote />,
    },
    {
      key: 'outline',
      label: (
        <Space>
          <OrderedListOutlined />
          指引大纲
        </Space>
      ),
      children: (
        <OutlineTemplate
          data={outlineData}
          loading={outlineLoading}
          onSave={saveOutlineItem}
        />
      ),
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
          />
        </ReactFlowProvider>
      ),
    },
  ];

  useEffect(() => {
    if (!topic) return;

    const fetchOutline = async () => {
      setOutlineLoading(true);
      try {
        const response = await getStructuredOutline(topic);
        if (response && response.data) {
          const processedData = {
            topic: response.data.topic || '',
            timeline: splitStringToArray(response.data.timeline),
            causality: splitStringToArray(response.data.causality),
            figures: splitStringToArray(response.data.figures),
            viewpoints: [],
            evidence: [
              'Jack Beeching的《中国鸦片战争》',
              'Harry G. Gelber的《鸦片、士兵与福音派》',
              'W. Travis Hanes和Frank Sanello的《鸦片战争》'
            ],
            conclusion: '',
          };
          setOutlineData(processedData);
          message.success('大纲加载成功！');
        } else {
          message.warning('未获取到完整大纲数据。');
        }
      } catch (error) {
        console.error("Failed to fetch structured outline:", error);
        message.error('加载大纲失败，请检查网络或后端服务。');
      } finally {
        setOutlineLoading(false);
      }
    };

    fetchOutline();
  }, [topic, message]);

  useEffect(() => {
    setOutlineData(prev => ({ ...prev, conclusion: savedConclusion }));
  }, [savedConclusion]);

  return (
    <Space direction="vertical" size={8} style={{ width: '100%' }}>
      <Title level={5} style={{ marginBottom: 0 }}>
        笔记工作区
      </Title>
      <Text type="secondary">支持拖拽、自由笔记、指引大纲、论证图谱</Text>
      <Tabs defaultActiveKey="note" items={items} />
    </Space>
  );
}

function FreeNote() {
  const [val, setVal] = useState('');
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <TextArea
        rows={12}
        placeholder="随手记录要点、证据与疑问……"
        value={val}
        onChange={(e) => setVal(e.target.value)}
      />
      <Space>
        <Button type="primary" onClick={() => message.success('已保存到本地（示例）')}>
          保存
        </Button>
        <Button onClick={() => setVal('')}>清空</Button>
      </Space>
    </Space>
  );
}

function EditableItem({ initialValue, onSave, onDelete }) {
  const [value, setValue] = useState(initialValue);

  const handleSave = () => {
    onSave(value);
  };

  const handleChange = (e) => {
    setValue(e.target.value);
  };

  useEffect(() => setValue(initialValue), [initialValue]);

  return (
    <Card
      size="small"
      style={{ marginBottom: 8, borderLeft: '2px solid #52c41a' }}
      actions={[
        <Button type="text" onClick={handleSave} key="save">
          保存
        </Button>,
        <Button type="text" danger icon={<DeleteOutlined />} onClick={onDelete} key="delete" />
      ]}
    >
      <TextArea
        rows={2}
        value={value}
        onChange={handleChange}
        style={{ width: '100%' }}
        autoSize
      />
    </Card>
  );
}

function FormattedConclusion({ rawConclusion }) {
  if (!rawConclusion) {
    return (
      <Empty
        description="这里将显示你从模块四生成的反思总结内容。"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  const mainAndOtherThoughts = rawConclusion.split(/\n其他思考：\n/);
  const mainPointsText = mainAndOtherThoughts[0] || '';
  const otherThoughtsPart = mainAndOtherThoughts[1] || '';

  const formattedPoints = mainPointsText
    .split('\n- ')
    .filter(Boolean)
    .map((pointText) => {
      const lines = pointText.trim().split('\n');
      const title = lines[0].trim().replace('-', '').trim();
      const subPoints = lines.slice(1).map((line) => line.trim().replace('-', '').trim()).filter(Boolean);
      return { title, subPoints };
    });

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <List
        size="small"
        dataSource={formattedPoints}
        renderItem={(item) => (
          <List.Item style={{ borderBottom: 'none', padding: '4px 0' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong style={{ color: '#1890ff' }}>
                {item.title}
              </Text>
              <List
                size="small"
                dataSource={item.subPoints}
                renderItem={(subItem) => (
                  <List.Item style={{ borderBottom: 'none', padding: '0 0 4px 16px' }}>
                    <Text style={{ whiteSpace: 'pre-wrap' }}>{subItem}</Text>
                  </List.Item>
                )}
              />
            </Space>
          </List.Item>
        )}
      />
      {otherThoughtsPart && (
        <>
          <Divider dashed style={{ margin: '8px 0' }} />
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text strong style={{ color: '#1890ff' }}>
              其他思考
            </Text>
            <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
              {otherThoughtsPart.trim()}
            </Paragraph>
          </Space>
        </>
      )}
    </Space>
  );
}

function OutlineTemplate({ data, loading, onSave }) {
  const [localData, setLocalData] = useState(data);

  const handleSaveItem = (key, value) => {
    onSave(key, value);
  };

  const renderEditableList = (key, listData) => (
    <Space direction="vertical" style={{ width: '100%' }}>
      {listData.map((item, index) => (
        <EditableItem
          key={`${key}-${index}`}
          initialValue={item}
          onSave={(value) => {
            const newList = [...listData];
            newList[index] = value;
            handleSaveItem(key, newList);
          }}
          onDelete={() => {
            const newList = listData.filter((_, i) => i !== index);
            handleSaveItem(key, newList);
          }}
        />
      ))}
      <Button
        type="dashed"
        onClick={() => {
          const newList = [...listData, ''];
          setLocalData({ ...localData, [key]: newList });
        }}
        block
        icon={<PlusOutlined />}
      >
        添加新条目
      </Button>
    </Space>
  );

  const renderCard = (title, content) => {
    return (
      <Card
        size="small"
        title={<Text strong>{title}</Text>}
        style={{ marginBottom: 16, borderLeft: '3px solid #1677ff' }}
      >
        {content}
      </Card>
    );
  };

  useEffect(() => {
    setLocalData(data);
  }, [data]);

  return (
    <Spin spinning={loading} tip="正在生成大纲..." size="large">
      <Space direction="vertical" style={{ width: '100%', paddingBottom: 20 }}>

        {renderCard(
          '主题（研究问题/课题）',
          <Space direction="vertical" style={{ width: '100%' }}>
            <Input
              value={localData.topic}
              onChange={(e) => setLocalData({ ...localData, topic: e.target.value })}
              style={{ width: '100%' }}
            />
            <Button
              type="primary"
              size="small"
              onClick={() => handleSaveItem('topic', localData.topic)}
              style={{ alignSelf: 'flex-end' }}
            >
              保存此项
            </Button>
          </Space>
        )}

        {renderCard(
          '时间线（关键事件：时间、地点、人物、简述）',
          renderEditableList('timeline', localData.timeline)
        )}

        {renderCard(
          '因果链（直接原因/深层原因/触发事件 → 过程 → 结果/影响）',
          renderEditableList('causality', localData.causality)
        )}

        {renderCard(
          '人物/势力（立场、目标、行动、相互关系）',
          renderEditableList('figures', localData.figures)
        )}

        {renderCard(
          '观点与史学争鸣（不同史家/学派观点 + 论据）',
          renderEditableList('viewpoints', localData.viewpoints)
        )}

        {renderCard(
          '证据节点（摘录/数据/图表，指向原始史料或二手文献）',
          renderEditableList('evidence', localData.evidence)
        )}

        {renderCard(
          '结论/反思（你的判断、局限性、未解问题）',
          <FormattedConclusion rawConclusion={localData.conclusion} />
        )}
        
      </Space>
    </Spin>
  );
}
