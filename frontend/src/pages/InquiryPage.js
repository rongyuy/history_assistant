import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  App as AntdApp, 
  message,
  Spin, 
  Menu
} from 'antd';
import {
  BookOutlined,
  BulbOutlined,
  MessageOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { getWikiData, getViewpointAnalysis, postChatMessage, getSourcesComparison, getWikiFullContent, getStructuredOutline, getDiscussionDetails } from '../api';

const { Header, Sider, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

/**
 * 页面：InquiryPage
 */
export default function InquiryPage() {
  const [topic, setTopic] = useState('鸦片战争');
  const [inputValue, setInputValue] = useState('鸦片战争');
  const [savedConclusion, setSavedConclusion] = useState(''); 

  const handleSearch = () => {
    setTopic(inputValue);
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
            placeholder="输入要探究的主题"
          />
          <Button type="primary" onClick={handleSearch} style={{marginLeft: 8}}>开始探究</Button>
        </Header>

        <Layout style={{ height: 'calc(100vh - 64px)' }}>
          <Content
            style={{
              padding: 24,
              paddingBottom: 120,
              overflowY: 'auto', 
              height:'100%' 
            }}
          >
            <CoreExplorer topic={topic} onSaveConclusion={setSavedConclusion} />
          </Content>

          <Sider
            width={420}
            theme="light"
            style={{
              padding: 24,
              borderLeft: '1px dashed #eaeaea',
              overflowY: 'auto', 
              height: '100%',
            }}
          >
            <NotesWorkspace topic={topic} savedConclusion={savedConclusion} />
          </Sider>
        </Layout>

        <FloatButton.BackTop />
      </Layout>
    </AntdApp>
  );
}

/** 左侧 70%：核心探究区 */
function CoreExplorer({ topic, onSaveConclusion }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [coreData, setCoreData] = useState({
    wikiSummary: { summary: '', timeline: [] },
    viewpoints: { viewpoints: [], debates: [] },
    sources: { sources: [] },
    wikiFullContent: null,
  });
  const [chatValue, setChatValue] = useState('');
  
  const { message } = AntdApp.useApp();
  const [contextMenu, setContextMenu] = useState(null);
  const [currentModule, setCurrentModule] = useState('模块一：史实认知');
  const [isChatOpen, setChatOpen] = useState(false);
  const [aiContext, setAiContext] = useState('');

  const handleContextMenu = (e) => {
    e.preventDefault();
    const selectedText = window.getSelection().toString().trim();

    if (selectedText) {
      setContextMenu(
        contextMenu === null
          ? {
              mouseX: e.clientX + 2,
              mouseY: e.clientY - 6,
              selectedText: selectedText,
            }
          : null,
      );
    } else {
      setContextMenu(null);
    }
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleAskAiAboutSelection = () => {
    if (contextMenu && contextMenu.selectedText) {
      setChatValue(`针对“${contextMenu.selectedText}”我想问：`);
      setChatOpen(true);
      message.info('请针对选中内容开始提问');
    }
    setContextMenu(null);
  };

  useEffect(() => {
    if (!topic) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setContextMenu(null);
      message.loading({ content: `正在加载“${topic}”的探究资料...`, key: 'data' });

      try {
        const [wikiRes, viewpointsRes, sourcesRes, fullContentRes] = await Promise.all([
          getWikiData(topic),
          getViewpointAnalysis(topic),
          getSourcesComparison(topic),
          getWikiFullContent(topic),
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
  }, [topic,message]);

    const handleActivateModule = (moduleName) => {
    setCurrentModule(moduleName);
    setChatOpen(true); 
    message.info(`AI 引导已切换到【${moduleName}】模块`);

    let context = '';
    switch(moduleName) {
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
    <div onContextMenu={handleContextMenu} onClick={handleCloseContextMenu} style={{ cursor: 'default' }}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Title level={3} style={{ marginBottom: 0 }}>{topic}</Title>
      
      <Collapse
        bordered={false}
        defaultActiveKey={["facts", "views", "sources", "reflection"]}
        style={{ background: "transparent" }}
        items={[
          {
            key: "facts",
            label: <ModuleHeader icon={<BookOutlined />} title="模块一：史实认知" hint="维基百科摘要、关键时间线" onActivate={handleActivateModule} />,
            children: <WikiSummaryCard data={coreData.wikiSummary} topic={topic} />,
          },
          {
            key: "views",
            label: <ModuleHeader icon={<BulbOutlined />} title="模块二：观点辨析" hint="A/B 立场与讨论页观点" onActivate={handleActivateModule} />,
            children: <ViewpointAnalysis data={coreData.viewpoints} topic={topic} />,
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

      {contextMenu !== null && (
        <Menu
          onClick={handleAskAiAboutSelection}
          style={{
            position: 'fixed',
            top: contextMenu.mouseY,
            left: contextMenu.mouseX,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            borderRadius: '8px',
          }}
          items={[{ key: 'ask-ai', label: '问问AI这段内容...' }]}
        />
      )}

      <AIChatDock
        topic={topic}
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

function ModuleHeader({ icon, title, hint, onActivate  }) {
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

/** 史实认知：维基摘要/时间线 */
function WikiSummaryCard({ data, topic, initialFullContent }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [fullContent, setFullContent] = useState(null);
    const [loading, setLoading] = useState(false);
    const { message } = AntdApp.useApp();

    const handleReadOriginal = async () => {
        if (fullContent) {
            setIsExpanded(!isExpanded);
            return;
        }

        setLoading(true);
        try {
            const response = await getWikiFullContent(topic);
            setFullContent(response.data);
            setIsExpanded(true);
            message.success('原文加载成功！');
        } catch (error) {
            console.error('获取原文失败:', error);
            message.error('获取原文失败，请稍后重试');
        } finally {
            setLoading(false);
        }
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
                        loading={loading}
                        onClick={handleReadOriginal}
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
  

/** 反思总结*/
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

/** 底部 AI 引导 */
function AIChatDock({ topic, currentModule, open, setOpen, chatValue, setChatValue }) {
    const CONTENT_PADDING = 24;
    const SIDER_WIDTH = 420;
    const RIGHT_OFFSET = SIDER_WIDTH + CONTENT_PADDING;
  
    const [drawerHeight, setDrawerHeight] = useState(360);
    const isResizing = useRef(false);

    const [msgs, setMsgs] = useState([
      { role: 'ai', text: '你好！在探究过程中有任何想法或疑问，都可以和我交流。' },
    ]);
    const [loading, setLoading] = useState(false);
    const { message } = AntdApp.useApp();
    
    const messagesEndRef = useRef(null);

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
        history: newMsgs.map(m => ({
          role: m.role === 'ai' ? 'assistant' : 'user',
          content: m.text
        })),
        topic: topic,
        current_module: currentModule,
        context_text: "此处可以将来传入用户正在阅读的史料文本"
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
      <>
  
        <Drawer
          placement="bottom"
          height={drawerHeight}
          open={open}
          onClose={() => setOpen(false)}
          mask={false}
          zIndex={1300}
          title={<Space><BulbOutlined /> <span>AI 引导（苏格拉底式）</span></Space>}
          rootStyle={{ left: CONTENT_PADDING, right: RIGHT_OFFSET, }}
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
            <div style={{width: '40px', height: '4px', backgroundColor: '#ccc', borderRadius: '2px'}} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <List
                  size="small"
                  split={false} 
                  dataSource={msgs}
                  renderItem={(m, idx) => (
                      <List.Item key={idx} 
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
                              <div style={{ background: '#f5f5f5', padding: '8px 12px', borderRadius: '10px' }}>
                                <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
                              </div>
                            </>
                          )}
                          {m.role === 'user' && (
                            <>
                              <div style={{ background: '#e6f7ff', padding: '8px 12px', borderRadius: '10px' }}>
                                <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
                              </div>
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
              <Input
                placeholder={loading ? "AI正在思考..." : "输入你的想法/问题，Enter 发送"}
                value={chatValue}
                onChange={(e) => setChatValue(e.target.value)}
                onPressEnter={send}
                disabled={loading}
              />
              <Button type="primary" onClick={send} loading={loading}>发送</Button>
            </Space.Compact>
          </div>
        </Drawer>
      </>
    );
  }

/** 右侧 30%：笔记工作区 */
function NotesWorkspace({ topic, savedConclusion }) {
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
      label: '自由笔记',
      children: <FreeNote />,
    },
    {
      key: 'outline',
      label: '指引大纲',
      children: (
        <OutlineTemplate
          data={outlineData}
          loading={outlineLoading}
          onSave={saveOutlineItem}
        />
      ),
    },
  ];

  return (
    <Space direction="vertical" size={8} style={{ width: '100%' }}>
      <Title level={5} style={{ marginBottom: 0 }}>
        笔记工作区
      </Title>
      <Text type="secondary">支持拖拽、指引大纲、自由笔记</Text>
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