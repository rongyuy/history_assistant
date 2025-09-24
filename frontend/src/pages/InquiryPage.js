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
  Modal,
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
          <Button type="primary" onClick={handleSearch} style={{ marginLeft: 8 }}>开始探究</Button>
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
              <CoreExplorer topic={topic} addNodeToMap={addNodeToMap} />
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

function CoreExplorer({ topic, addNodeToMap }) {
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

  const [selectedTextForMenu, setSelectedTextForMenu] = useState('');
  const [contextMenu, setContextMenu] = useState(null);

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
      }).catch(err => {
        console.error("模块二加载失败:", err);
      }).finally(() => {
        setLoadingStates(prev => ({ ...prev, viewpoints: false }));
      });

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
      case '模块四：因果链分析':
        context = '用户正在进行因果链分析阶段。';
        break;
      default:
        context = '';
    }
    setAiContext(context);
  };

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
            defaultActiveKey={["facts", "views", "sources", "causality"]}
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
                label: <ModuleHeader icon={<BulbOutlined />} title="模块二：观点辨析" hint="不同阵营作用、A/B立场、讨论页观点" onActivate={handleActivateModule} />,
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
                key: "causality",
                label: <ModuleHeader icon={<BulbOutlined />} title="模块四：因果链分析" hint="梳理事件的来龙去脉" onActivate={handleActivateModule} />,
                children: <CausalityChainSection />,
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
      />
    </div>
  );
}

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

    useEffect(() => {
        setFullContent(initialFullContent);
    }, [initialFullContent]);

    useEffect(() => {
        if (data && data.timeline) {
            const itemsWithId = data.timeline.map((item, index) => ({
                ...item,
                id: `timeline-${index}-${Math.random()}`
            }));
            setTimelineItems(itemsWithId);
        }
    }, [data.timeline]);

    const handleToggleOriginal = () => {
        setIsExpanded(!isExpanded);
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

function CausalityChainSection() {
  const initialCards = [
    { id: 1, title: '直接原因', content: '', placeholder: '导致事件发生的直接因素是什么？' },
    { id: 2, title: '深层原因', content: '', placeholder: '背后有哪些长期存在的、根本性的原因？' },
    { id: 3, title: '触发事件', content: '', placeholder: '点燃导火索的具体事件是什么？' },
    { id: 4, title: '过程', content: '', placeholder: '事件发展的关键阶段和转折点有哪些？' },
    { id: 5, title: '结果/影响', content: '', placeholder: '事件带来了哪些短期和长期的影响？' },
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
  };

  const handleClear = () => {
    setCards(initialCards.map(c => ({...c, content: ''}))); 
    message.info('所有卡片内容已清空。');
  };

  return (
    <Card size="small" bordered style={{ borderStyle: 'dashed' }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Paragraph type="secondary">
          请从多个角度（如经济、政治、文化、社会等）思考事件的因果关系。您可以自由编辑、增加或删除下方的分析卡片。
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
        </Space>
      </Space>
    </Card>
  );
}

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
  setEdges
}) {

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
      <Text type="secondary">支持自由笔记、论证图谱</Text>
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