import axios from 'axios';

// 创建一个axios实例，并设置基础URL
// 这样在每个请求中就不用重复写 "http://localhost:8000/api/v1" 了
const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api/v1', // 你的FastAPI后端地址
  timeout: 90000, // 请求超时时间
});

// 封装获取维基百科数据的API
export const getWikiData = (topic) => {
  return apiClient.get(`/topic/${topic}`);
};

// 封装获取观点辨析数据的API
export const getViewpointAnalysis = (topic) => {
  return apiClient.get(`/viewpoints/${topic}`);
};

// 封装AI聊天的API
export const postChatMessage = (chatRequest) => {
  // chatRequest 的结构需要匹配后端 AIChatRequest 模型
  return apiClient.post('/chat', chatRequest);
};

// 封装抓取网页内容的API
export const scrapeUrl = (url) => {
  return apiClient.post('/scrape', { url });
};

// 新增: 封装获取史料对比数据的API
export const getSourcesComparison = (topic) => {
  return apiClient.get(`/sources/${topic}`);
};