import React, { useMemo, useState } from "react";
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
  Tooltip,
  Checkbox,
  message,
} from "antd";
import {
  BookOutlined,
  BulbOutlined,
  MessageOutlined,
  CommentDiscussion as CommentDiscussionIcon,
} from "@ant-design/icons";

const { Header, Sider, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { TextArea } = Input;

/**
 * 页面：InquiryPage
 * - 顶部 Header（站点标题/导航）
 * - 主体：左侧 70% 核心探究区 + 右侧 30% 笔记工作区
 * - 左侧包含四大模块（史实认知、观点辨析、史料分析、反思总结）与底部 AI 引导区
 */
export default function InquiryPage() {
  const [topic, setTopic] = useState("鸦片战争");

  return (
    <Layout style={{ minHeight: "100vh", background: "#fff" }}>
      <Header
        style={{
          background: "#fff",
          borderBottom: "1px dashed #eaeaea",
          display: "flex",
          alignItems: "center",
          paddingInline: 24,
          position: "sticky",
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
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="输入要探究的主题"
        />
      </Header>

      {/* 主体区域：70/30 布局 */}
      <Layout>
        <Content style={{ padding: 24, paddingBottom: 120 }}>
          <CoreExplorer topic={topic} />
        </Content>

        <Sider width={420} theme="light" style={{ padding: 24, borderLeft: "1px dashed #eaeaea" }}>
          <NotesWorkspace topic={topic} />
        </Sider>
      </Layout>

      <FloatButton.BackTop />
    </Layout>
  );
}

/** 左侧 70%：核心探究区 */
function CoreExplorer({ topic }) {
  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Title level={3} style={{ marginBottom: 0 }}>
        {topic}
      </Title>
      <Text type="secondary">左侧：核心探究区（约 70% 宽度）</Text>

      {/* 四大模块用 Collapse 分区展示，可折叠，支持引导式阅读 */}
      <Collapse
        bordered={false}
        defaultActiveKey={["facts", "views", "sources", "reflection"]}
        style={{ background: "transparent" }}
        items={[
          {
            key: "facts",
            label: (
              <ModuleHeader icon={<BookOutlined />} title="模块一：史实认知" hint="维基百科摘要、关键时间线" />
            ),
            children: <WikiSummaryCard topic={topic} />,
          },
          {
            key: "views",
            label: (
              <ModuleHeader icon={<BulbOutlined />} title="模块二：观点辨析" hint="A/B 立场与讨论页观点" />
            ),
            children: <ViewpointAnalysis />,
          },
          {
            key: "sources",
            label: (
              <ModuleHeader icon={<BookOutlined />} title="模块三：史料分析" hint="多史料片段对读" />
            ),
            children: <SourcesAnalysis />,
          },
          {
            key: "reflection",
            label: (
              <ModuleHeader icon={<BulbOutlined />} title="模块四：反思总结" hint="引导用户回顾并形成结论" />
            ),
            children: <ReflectionSection />,
          },
        ]}
      />

      {/* 底部 AI 引导区：苏格拉底式问答 */}
      <AIChatDock topic={topic} />
    </Space>
  );
}

function ModuleHeader({ icon, title, hint }) {
  return (
    <Space>
      {icon}
      <Text strong>{title}</Text>
      <Tag color="default">{hint}</Tag>
    </Space>
  );
}

/** 史实认知：维基摘要/时间线（示例静态数据） */
function WikiSummaryCard({ topic }) {
  const summary = useMemo(
    () =>
      `鸦片战争是1840年至1842年英国与清朝之间的战争，通常被视为近代中国历史的开端之一。本模块可展示来自百科与教材的简要概述、关键人物与时间线等。`,
    [topic]
  );

  const timeline = [
    { year: "1839", event: "林则徐赴粤查禁鸦片" },
    { year: "1840", event: "英舰到达珠江口，战争爆发" },
    { year: "1842", event: "签订《南京条约》" },
  ];

  return (
    <Card size="small" bordered style={{ borderStyle: "dashed" }}>
      <Space direction="vertical" style={{ width: "100%" }}>
        <Paragraph style={{ marginBottom: 0 }}>{summary}</Paragraph>
        <Divider dashed style={{ margin: "8px 0" }} />
        <List
          size="small"
          header={<Text type="secondary">关键时间线</Text>}
          bordered
          dataSource={timeline}
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

/** 观点辨析：A/B 立场 & 维基讨论摘录（示例静态数据） */
function ViewpointAnalysis() {
  const points = [
    { side: "A（英方观点）", text: "强调自由贸易与商业权益。" },
    { side: "B（清方观点）", text: "强调禁绝鸦片与国家主权。" },
  ];

  const debates = [
    "关于战争命名的不同表述与价值判断",
    "对条约不平等性的历史评价",
  ];

  return (
    <Card size="small" bordered style={{ borderStyle: "dashed" }}>
      <Space direction="vertical" style={{ width: "100%" }}>
        <List
          size="small"
          header={<Text strong>对立观点（A/B）</Text>}
          dataSource={points}
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
          dataSource={debates}
          renderItem={(t) => <List.Item>{t}</List.Item>}
        />
      </Space>
    </Card>
  );
}

/** 史料分析：多史料片段对读（示例静态数据） */
function SourcesAnalysis() {
  const sources = [
    { title: "《林则徐奏折》（片段）", excerpt: "……坚决查禁鸦片，维护国计民生……" },
    { title: "《英国商人日记》（片段）", excerpt: "……贸易受阻，英方诉求得不到满足……" },
  ];

  return (
    <Card size="small" bordered style={{ borderStyle: "dashed" }}>
      <List
        itemLayout="vertical"
        dataSource={sources}
        renderItem={(it) => (
          <List.Item key={it.title}>
            <List.Item.Meta title={<Text strong>{it.title}</Text>} />
            <Paragraph style={{ marginBottom: 0 }}>{it.excerpt}</Paragraph>
          </List.Item>
        )}
      />
    </Card>
  );
}

/** 反思总结：勾选式要点 + 自由总结输入 */
function ReflectionSection() {
  const [checks, setChecks] = useState([false, false, false]);
  const [conclusion, setConclusion] = useState("");

  const items = [
    "我能陈述冲突的直接起因与深层原因",
    "我能举出至少两条支持 A/B 观点的证据",
    "我能形成自己的判断并用证据支撑",
  ];

  const update = (i) => (e) => {
    const next = [...checks];
    next[i] = e.target.checked;
    setChecks(next);
  };

  const done = checks.every(Boolean);

  return (
    <Card size="small" bordered style={{ borderStyle: "dashed" }}>
      <Space direction="vertical" style={{ width: "100%" }}>
        <Space direction="vertical">
          {items.map((label, i) => (
            <Checkbox key={i} checked={checks[i]} onChange={update(i)}>
              {label}
            </Checkbox>
          ))}
        </Space>
        <Divider dashed style={{ margin: "8px 0" }} />
        <TextArea
          rows={4}
          placeholder="写下你的结论（要点式/短文均可）"
          value={conclusion}
          onChange={(e) => setConclusion(e.target.value)}
        />
        <Space>
          <Tooltip title={done ? "勾选项已完成" : "建议先完成上面的要点勾选"}>
            <Button type="primary" onClick={() => message.success("已保存总结（示例）")}>保存总结</Button>
          </Tooltip>
          <Button onClick={() => setConclusion("")}>清空</Button>
        </Space>
      </Space>
    </Card>
  );
}

/** 底部 AI 引导（苏格拉底式对话 Dock） */
function AIChatDock({ topic }) {
  // 和你的布局保持同步：Sider 宽 420 + Content 左右内边距 24
  const CONTENT_PADDING = 24;
  const SIDER_WIDTH = 420;
  const RIGHT_OFFSET = SIDER_WIDTH + CONTENT_PADDING; // = 444

  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [msgs, setMsgs] = React.useState([
    { role: "ai", text: "你认为两份史料对战争起因的描述主要分歧在哪里？各举一处依据。" },
  ]);

  const send = () => {
    if (!value.trim()) return;
    setMsgs((m) => [...m, { role: "user", text: value }]);
    setValue("");
    setTimeout(() => {
      setMsgs((m) => [
        ...m,
        { role: "ai", text: `收到（主题：${topic}）。试着分别写出直接原因/深层原因/关键人物动机各一条。` },
      ]);
    }, 300);
  };

  return (
    <>
      {/* 侧边小标识（浮动按钮），贴在左侧区域和 Sider 的分界处 */}
      <div
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          right: RIGHT_OFFSET, // 让按钮停在分界线左边
          bottom: 96,
          zIndex: 1100,
          background: "#1677ff",
          color: "#fff",
          padding: "8px 12px",
          borderRadius: 14,
          cursor: "pointer",
          boxShadow: "0 6px 16px rgba(0,0,0,.15)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          userSelect: "none",
        }}
      >
        <MessageOutlined />
        <span>AI 引导</span>
      </div>

      {/* 只占左侧 70% 的“底部抽屉” */}
      <Drawer
        placement="bottom"
        height={360}
        open={open}
        onClose={() => setOpen(false)}
        mask={false}               // 不加遮罩，和页面并存
        zIndex={1300}
        title={
          <Space>
            <BulbOutlined /> <span>AI 引导（苏格拉底式）</span>
          </Space>
        }
        // 关键：限制抽屉的左右边界，只覆盖左侧内容区
        rootStyle={{
          left: CONTENT_PADDING,   // 与 Content 左内边距对齐
          right: RIGHT_OFFSET,     // 留出右侧 Sider 的宽度
        }}
        styles={{ body: { paddingTop: 8, paddingBottom: 8 } }}
      >
        <List
          size="small"
          dataSource={msgs}
          style={{ maxHeight: 280, overflow: "auto", marginBottom: 8 }}
          renderItem={(m, idx) => (
            <List.Item>
              <Space align="start">
                <Tag color={m.role === "ai" ? "processing" : "default"}>
                  {m.role === "ai" ? "AI" : "User"}
                </Tag>
                <span>{m.text}</span>
              </Space>
            </List.Item>
          )}
        />

        <Space.Compact style={{ width: "100%" }}>
          <Input
            placeholder="输入你的想法/问题，Enter 发送"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onPressEnter={send}
          />
          <Button type="primary" onClick={send}>发送</Button>
        </Space.Compact>
      </Drawer>
    </>
  );
}

/** 右侧 30%：笔记工作区（拖拽、结构化模板、思维导图占位） */
function NotesWorkspace({ topic }) {
  const items = [
    {
      key: "note",
      label: "自由笔记",
      children: <FreeNote />,
    },
    {
      key: "outline",
      label: "结构化模板",
      children: <OutlineTemplate />,
    },
    {
      key: "mindmap",
      label: "思维导图（占位）",
      children: <Empty description="后续可接入思维导图组件，如 react-flow / xmind sdk" />,
    },
  ];

  return (
    <Space direction="vertical" size={8} style={{ width: "100%" }}>
      <Title level={5} style={{ marginBottom: 0 }}>
        右侧：笔记工作区（约 30% 宽度）
      </Title>
      <Text type="secondary">支持拖拽、思维导图、结构化模板（本示例提供基础形态）</Text>
      <Tabs defaultActiveKey="note" items={items} />
    </Space>
  );
}

function FreeNote() {
  const [val, setVal] = useState("");
  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <TextArea
        rows={12}
        placeholder="随手记录要点、证据与疑问……"
        value={val}
        onChange={(e) => setVal(e.target.value)}
      />
      <Space>
        <Button type="primary" onClick={() => message.success("已保存到本地（示例）")}>保存</Button>
        <Button onClick={() => setVal("")}>清空</Button>
      </Space>
    </Space>
  );
}

function OutlineTemplate() {
  const [data, setData] = useState({
    cause: "",
    evidenceA: "",
    evidenceB: "",
    conclusion: "",
  });
  const onChange = (k) => (e) => setData({ ...data, [k]: e.target.value });

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <Text strong>模板：因果—证据—结论</Text>
      <Input
        placeholder="直接原因 / 深层原因"
        value={data.cause}
        onChange={onChange("cause")}
      />
      <Input placeholder="证据（支持 A）" value={data.evidenceA} onChange={onChange("evidenceA")} />
      <Input placeholder="证据（支持 B）" value={data.evidenceB} onChange={onChange("evidenceB")} />
      <TextArea rows={4} placeholder="初步结论" value={data.conclusion} onChange={onChange("conclusion")} />
      <Space>
        <Button type="primary" onClick={() => message.success("模板已保存（示例）")}>保存</Button>
        <Button onClick={() => setData({ cause: "", evidenceA: "", evidenceB: "", conclusion: "" })}>重置</Button>
      </Space>
    </Space>
  );
}
