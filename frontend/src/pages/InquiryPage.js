import React, { useEffect, useState, useCallback, useRef } from 'react';
import { addEdge, applyNodeChanges, applyEdgeChanges } from 'reactflow';
import { Dropdown, Menu } from 'antd'; // 导入 Ant Design 的下拉菜单组件
import { ReactFlowProvider } from 'reactflow';
import {
  Layout,
  Typography,
  Divider,
  Drawer,
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
  App as AntdApp, // antd 的应用级组件, 用于全局 message, Modal 等
  message,
  Spin, // 引入加载动画
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
import ArgumentMap from '../ArgumentMap'
// 导入我们创建的API函数
import { getWikiData, getViewpointAnalysis, postChatMessage, getSourcesComparison, getWikiFullContent, getStructuredOutline } from '../api';

const { Header, Sider, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

/**
 * 页面：InquiryPage
 * (整体结构保持不变)
 */
export default function InquiryPage() {
  const [topic, setTopic] = useState('鸦片战争');
  const [inputValue, setInputValue] = useState('鸦片战争');
  const [savedConclusion, setSavedConclusion] = useState(''); // 新增状态，用于保存结论文本


  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  // --- 新增：处理图谱内部变化的函数 ---
  const onNodesChange = (changes) => setNodes((nds) => applyNodeChanges(changes, nds));
  const onEdgesChange = (changes) => setEdges((eds) => applyEdgeChanges(changes, eds));
  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);

  // --- 新增：从外部添加新卡片（节点）的函数 ---
  const addNodeToMap = (text) => {
    const newNode = {
      id: `node-${Date.now()}`, // 使用时间戳确保ID唯一
      type: 'textUpdater',
      position: {
        x: Math.random() * 400, // 随机位置
        y: Math.random() * 400,
      },
      data: { label: text },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const addBlankNode = () => {
    const newNode = {
      id: `node-${Date.now()}`,
      type: 'textUpdater', // <-- 同样指定类型
      position: {
        x: Math.random() * 400,
        y: Math.random() * 400,
      },
      data: { label: '双击编辑' },
    };
    setNodes((nds) => [...nds, newNode]);
  }

  const handleSearch = () => {
    setTopic(inputValue);
  };

  return (
    // 使用 AntdApp 包裹，以便在任何地方调用 message, Modal 等
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
            placeholder="输入要探究的主题"
          />
          <Button type="primary" onClick={handleSearch} style={{ marginLeft: 8 }}>开始探究</Button>
        </Header>

        <Layout style={{ height: 'calc(100vh - 64px)' }}>
          <Content
            style={{
              padding: 24,
              paddingBottom: 120,
              overflowY: 'auto', // 关键修改点
              height: '100%'
            }}
          >
            <CoreExplorer topic={topic} onSaveConclusion={setSavedConclusion} addNodeToMap={addNodeToMap} />
          </Content>

          <Sider
            width={'35%'}
            theme="light"
            style={{
              padding: 24,
              borderLeft: '1px dashed #eaeaea',
              overflowY: 'auto',
              height: '100%', // 新增：确保Sider高度占满父容器，使其overflow生效
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

/** * 左侧 65%：核心探究区 (融合修改后) 
 * 1. 引入了AI聊天框的状态管理 (isChatOpen, currentModule, etc.)
 * 2. 融合了右键菜单功能
 * 3. 引入了新的 ModuleHeader 和 AIChatDock
 */
function CoreExplorer({ topic, onSaveConclusion, addNodeToMap }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [coreData, setCoreData] = useState({
    wikiSummary: { summary: '', timeline: [] },
    viewpoints: { viewpoints: [], debates: [] },
    sources: { sources: [] },
    wikiFullContent: null, // 新增，用于缓存原文
  });

  // --- AI 聊天框相关状态 ---
  const [isChatOpen, setChatOpen] = useState(false);
  const [currentModule, setCurrentModule] = useState('模块一：史实认知');
  const [aiContext, setAiContext] = useState('');
  const [chatValue, setChatValue] = useState(''); // 用于从右键菜单预设问题

  // --- 右键菜单相关状态 ---
  const [selectedTextForMenu, setSelectedTextForMenu] = useState('');

  // 通过 AntdApp.useApp() 这个钩子来获取 antd 的全局API实例
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

  // useEffect 在 topic 变化时从后端获取数据
  useEffect(() => {
    if (!topic) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      message.loading({ content: `正在加载“${topic}”的探究资料...`, key: 'data' });

      try {
        const [wikiRes, viewpointsRes, sourcesRes, fullContentRes] = await Promise.all([
          getWikiData(topic),
          getViewpointAnalysis(topic),
          getSourcesComparison(topic),
          getWikiFullContent(topic), // 预加载原文
        ]);

        if (!wikiRes || !wikiRes.data) {
          throw new Error("后端没有返回有效数据。");
        }

        const newCoreData = {
          wikiSummary: wikiRes.data,
          viewpoints: viewpointsRes.data || { viewpoints: [], debates: [] },
          sources: sourcesRes.data,
          wikiFullContent: fullContentRes.data,
        };

        setCoreData(newCoreData);

        // 设置初始AI上下文
        const initialContext = `维基百科正文内容:\n${newCoreData.wikiFullContent.content}`;
        setAiContext(initialContext);

        message.success({ content: '资料加载成功!', key: 'data', duration: 2 });
      } catch (err) {
        let errorMessage = '加载数据失败，请检查网络连接和后端服务。';
        if (err.response && err.response.data && err.response.data.detail) {
          errorMessage = `后端数据验证失败: ${JSON.stringify(err.response.data.detail)}`;
          console.error("后端返回的详细错误:", err.response.data.detail);
        } else {
          console.error("获取核心数据失败:", err);
        }

        setError(errorMessage);
        message.error({ content: '资料加载失败!', key: 'data', duration: 4 });

      } finally {
        setLoading(false);
      }
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


  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: 48 }}><Spin size="large" tip="正在加载核心资料..." /></div>;
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
                children: <WikiSummaryCard data={coreData.wikiSummary} initialFullContent={coreData.wikiFullContent} />,
              },
              {
                key: "views",
                label: <ModuleHeader icon={<BulbOutlined />} title="模块二：观点辨析" hint="A/B 立场与讨论页观点" onActivate={handleActivateModule} />,
                children: <ViewpointAnalysis data={coreData.viewpoints} />,
              },
              {
                key: "sources",
                label: <ModuleHeader icon={<BookOutlined />} title="模块三：史料分析" hint="多史料片段对读" onActivate={handleActivateModule} />,
                children: <SourcesComparisonCard data={coreData.sources} />,
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
      // 阻止点击按钮时触发 Collapse 的展开/收起
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


/** 史实认知：维基摘要/时间线 (修改后，接收预加载的原文) */
function WikiSummaryCard({ data, initialFullContent }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [fullContent, setFullContent] = useState(null);
    const { message } = AntdApp.useApp();

    useEffect(() => {
        // 当 initialFullContent 变化时（例如，主题切换），更新内部状态
        setFullContent(initialFullContent);
        // 如果之前是展开状态，可以选择在主题切换后自动收起
        // setIsExpanded(false); 
    }, [initialFullContent]);


    const handleToggleOriginal = () => {
        setIsExpanded(!isExpanded);
    };

    return (
        <Card
            size="small"
            bordered
            style={{
                borderStyle: "dashed",
                height: isExpanded ? 'auto' : 'auto', // 展开时高度自适应
                minHeight: isExpanded ? '600px' : 'auto' // 展开时最小高度增加一倍
            }}
        >
            <Space direction="vertical" style={{ width: "100%" }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Paragraph style={{ marginBottom: 0, flex: 1 }}>{data.summary || "暂无摘要"}</Paragraph>
                    <Button
                        type="link"
                        size="small"
                        onClick={handleToggleOriginal}
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

/** 观点辨析：(与原文件相同) */
function ViewpointAnalysis({ data }) {
    return (
      <Card size="small" bordered style={{ borderStyle: "dashed" }}>
        <Space direction="vertical" style={{ width: "100%" }}>
          <List
            size="small"
            header={<Text strong>对立观点（A/B）</Text>}
            dataSource={data.viewpoints || []}
            renderItem={(it) => (
              <List.Item>
                <Space align="start">
                  <Tag color="processing">{it.side}</Tag>
                  <Text>{it.text}</Text>
                </Space>
              </List.Item>
            )}
          />
          <Divider dashed style={{ margin: "8px 0" }} />
          <List
            size="small"
            header={<Text strong>维基讨论页摘录（要点）</Text>}
            dataSource={data.debates || []}
            renderItem={(t) => <List.Item>{t}</List.Item>}
          />
        </Space>
      </Card>
    );
}
  
/** 史料对比卡片 (与原文件相同) */
function SourcesComparisonCard({ data }) {
    if (!data || !data.sources || data.sources.length === 0) {
        return (
            <Card size="small" bordered style={{ borderStyle: "dashed" }}>
                <Empty description="未能找到可供对比的史料。" />
            </Card>
        );
    }
  
    return (
      <Card size="small" bordered style={{ borderStyle: "dashed" }}>
        <Space direction="vertical" style={{ width: "100%" }} size={16}>
          {data.sources.map((source, index) => (
            <div key={index}>
              <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>
                史料{index + 1}：{source.title}
              </Title>
              <Paragraph type="secondary" style={{ marginBottom: 8 }}>
                视角：{source.viewpoint}
              </Paragraph>
              <div style={{ padding: '8px 12px', border: '1px solid #f0f0f0', borderRadius: 6, backgroundColor: '#fafafa' }}>
                <Paragraph style={{ marginBottom: 0 }}>
                  {source.snippet}
                </Paragraph>
              </div>
              <a href={source.url} target="_blank" rel="noopener noreferrer">
                查看原始链接
              </a>
            </div>
          ))}
        </Space>
      </Card>
    );
  }
  
/** 反思总结 (与原文件相同) */
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
 * 1. 从底部弹出，可拖拽高度
 * 2. 消息可以右键添加到论证图谱
 * 3. 使用更详细的 API 请求
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
        const newMsgs = [...msgs, userMessage];
        setMsgs(newMsgs);
        setChatValue('');
        setLoading(true);

        const chatRequest = {
            history: newMsgs.slice(-10).map(m => ({
                role: m.role === 'ai' ? 'assistant' : 'user',
                content: m.text
            })),
            topic: topic,
            current_module: currentModule,
            context_text: aiContext,
        };

        try {
            const response = await postChatMessage(chatRequest);
            const aiResponse = { role: 'ai', text: response.data.content };
            setMsgs(currentMsgs => [...currentMsgs, aiResponse]);
        } catch (error) {
            console.error("AI聊天请求失败:", error);
            const errorResponse = { role: 'ai', text: '抱歉，AI服务暂时不可用，请稍后再试。' };
            setMsgs(currentMsgs => [...currentMsgs, errorResponse]);
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

// --- 后续的子组件 FreeNote, EditableItem, FormattedConclusion, OutlineTemplate 均与原文件相同，故省略以保持简洁 ---

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
  useEffect(() => setValue(initialValue), [initialValue]);

  const handleSave = () => {
    onSave(value);
  };

  const handleChange = (e) => {
    setValue(e.target.value);
  };

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

// 解析并格式化“反思结论”到结构化展示
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

  useEffect(() => {
    setLocalData(data);
  }, [data]);

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